import httpx

from integrations import llm

PASSAGES = [{"title": "Quand semer le maïs", "body": "Semer en juin."}]


def test_claude_backend_calls_the_configured_local_server(settings, monkeypatch):
    settings.ANTHROPIC_BASE_URL = "http://192.168.1.20:8080/"
    settings.ANTHROPIC_API_KEY = "k-test"
    seen = {}

    def fake_post(url, **kw):
        seen["url"] = url
        return httpx.Response(200, json={"content": [{"type": "text", "text": "Semer en juin."}]},
                              request=httpx.Request("POST", url))

    monkeypatch.setattr(llm.httpx, "post", fake_post)
    assert llm.AnthropicBackend().answer("Quand semer ?", PASSAGES, {}) == "Semer en juin."
    assert seen["url"] == "http://192.168.1.20:8080/v1/messages"


def test_local_openai_gateway_needs_only_the_key(settings, monkeypatch):
    settings.LLM_BACKEND, settings.OPENAI_API_KEY, settings.OPENAI_MODEL = "auto", "sk-test", ""
    settings.OPENAI_BASE_URL = "http://gw:4000/v1"
    monkeypatch.setattr(llm.OpenAICompatibleBackend, "_model", None)
    calls = []

    def fake(method):
        def call(url, headers=None, **kw):
            if headers is None:  # sonde Ollama : hors sujet ici
                raise httpx.ConnectError("absent")
            calls.append((method, url, headers["Authorization"], kw.get("json", {}).get("model")))
            body = {"data": [{"id": "glm-4.6"}]} if url.endswith("/models") else \
                {"choices": [{"message": {"content": " Semer en juin. "}}]}
            return httpx.Response(200, json=body, request=httpx.Request(method, url))
        return call

    monkeypatch.setattr(llm.httpx, "get", fake("GET"))
    monkeypatch.setattr(llm.httpx, "post", fake("POST"))
    backend = llm.get_backend()
    assert backend.name == "openai"
    assert backend.answer("Quand semer ?", PASSAGES, {}) == "Semer en juin."
    backend.answer("Quand semer ?", PASSAGES, {})  # le modèle trouvé est gardé : /models une seule fois
    assert calls == [("GET", "http://gw:4000/v1/models", "Bearer sk-test", None),
                     ("POST", "http://gw:4000/v1/chat/completions", "Bearer sk-test", "glm-4.6"),
                     ("POST", "http://gw:4000/v1/chat/completions", "Bearer sk-test", "glm-4.6")]
    settings.OPENAI_API_KEY = ""
    assert llm.get_backend().name != "openai"  # sans clé, la passerelle n'est pas utilisée
