"""Génération des réponses de l'assistant. Ordre : passerelle OpenAI du réseau (clé), Ollama local, Anthropic (clé),
sinon extractif.
Le contexte transmis ne contient que la question, les fiches publiées, la filière, la commune, le stade, la saison."""
import time

import httpx
from django.conf import settings

_ollama_cache = {"t": 0.0, "ok": False}


def _ollama_up():
    if time.time() - _ollama_cache["t"] < 60:
        return _ollama_cache["ok"]
    try:
        ok = httpx.get(f"{settings.OLLAMA_URL}/api/tags", timeout=1.0).status_code == 200
    except httpx.HTTPError:
        ok = False
    _ollama_cache.update(t=time.time(), ok=ok)
    return ok


class LLMBackend:
    name = ""

    def answer(self, question, passages, context):
        raise NotImplementedError


class ExtractiveBackend(LLMBackend):
    name = "extractive"

    def answer(self, question, passages, context):
        sentences = [s.strip() for s in passages[0]["body"].replace("\n", " ").split(". ") if s.strip()]
        return ". ".join(sentences[:3]).rstrip(".") + "."


def _prompt(question, passages, context):
    ctx = ", ".join(f"{k}: {v}" for k, v in context.items() if v)
    docs = "\n\n".join(f"[{p['title']}]\n{p['body']}" for p in passages)
    return (f"Réponds en français, brièvement, uniquement à partir des fiches ci-dessous. Ne donne aucun dosage.\n"
            f"Contexte : {ctx}\nFiches :\n{docs}\n\nQuestion : {question}")


class OllamaBackend(LLMBackend):
    name = "ollama"

    def answer(self, question, passages, context):
        r = httpx.post(f"{settings.OLLAMA_URL}/api/generate", timeout=60,
                       json={"model": settings.OLLAMA_MODEL, "prompt": _prompt(question, passages, context),
                             "stream": False})
        r.raise_for_status()
        return r.json()["response"].strip()


class AnthropicBackend(LLMBackend):
    name = "anthropic"

    def answer(self, question, passages, context):
        r = httpx.post(f"{settings.ANTHROPIC_BASE_URL.rstrip('/')}/v1/messages", timeout=30,
                       headers={"x-api-key": settings.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01"},
                       json={"model": settings.ANTHROPIC_MODEL, "max_tokens": 400,
                             "messages": [{"role": "user", "content": _prompt(question, passages, context)}]})
        r.raise_for_status()
        return r.json()["content"][0]["text"].strip()


class OpenAICompatibleBackend(LLMBackend):
    """Passerelle au format OpenAI (LiteLLM, vLLM…) du réseau local : seule la clé est à renseigner."""
    name = "openai"
    _model = None  # trouvé une fois via /models si OPENAI_MODEL est vide

    def answer(self, question, passages, context):
        base, h = settings.OPENAI_BASE_URL.rstrip("/"), {"Authorization": f"Bearer {settings.OPENAI_API_KEY}"}
        model = settings.OPENAI_MODEL or OpenAICompatibleBackend._model
        if not model:
            r = httpx.get(f"{base}/models", headers=h, timeout=10)
            r.raise_for_status()
            model = OpenAICompatibleBackend._model = r.json()["data"][0]["id"]
        r = httpx.post(f"{base}/chat/completions", headers=h, timeout=60,
                       json={"model": model, "max_tokens": 400,
                             "messages": [{"role": "user", "content": _prompt(question, passages, context)}]})
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()


def get_backend() -> LLMBackend:
    mode = settings.LLM_BACKEND
    if mode in ("auto", "openai") and settings.OPENAI_API_KEY:
        return OpenAICompatibleBackend()
    if mode in ("auto", "ollama") and _ollama_up():
        return OllamaBackend()
    if mode in ("auto", "anthropic") and settings.ANTHROPIC_API_KEY:
        return AnthropicBackend()
    return ExtractiveBackend()
