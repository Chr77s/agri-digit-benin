import httpx

from conftest import client_for
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


def _glm(settings, **extra):
    settings.LLM_BACKEND, settings.OPENAI_API_KEY, settings.OPENAI_MODEL = "openai", "sk-test", "glm-4.6"
    settings.OPENAI_BASE_URL = "http://gw:4000/v1"
    for k, v in extra.items():
        setattr(settings, k, v)


def _chat(content, finish="stop"):
    return lambda url, **kw: httpx.Response(200, json={"choices": [{"message": {"content": content},
                                                                    "finish_reason": finish}]},
                                            request=httpx.Request("POST", url))


def test_glm_options_reach_the_request_and_cannot_replace_model_or_messages(settings, monkeypatch):
    _glm(settings, OPENAI_TIMEOUT=7, OPENAI_MAX_TOKENS=900,
         OPENAI_EXTRA_BODY={"thinking": {"type": "disabled"}, "model": "autre", "messages": []})
    seen = {}

    def fake_post(url, headers=None, timeout=None, json=None):
        seen.update(timeout=timeout, body=json)
        return _chat("Semer en juin.")(url)

    monkeypatch.setattr(llm.httpx, "post", fake_post)
    assert llm.OpenAICompatibleBackend().answer("Quand semer ?", PASSAGES, {}) == "Semer en juin."
    assert seen["timeout"] == 7 and seen["body"]["max_tokens"] == 900
    assert seen["body"]["thinking"] == {"type": "disabled"}
    assert seen["body"]["model"] == "glm-4.6" and seen["body"]["messages"][0]["role"] == "user"


def test_an_empty_answer_is_an_error_so_the_assistant_falls_back(settings, monkeypatch):
    import pytest

    _glm(settings)
    # vide, ou coupée (la réflexion d'un modèle à raisonnement peut tomber dans le texte) : jamais montrée au producteur
    for content, finish in ((None, "stop"), ("  ", "stop"), ("\n* Language: French.\n* Style: Brief", "length")):
        monkeypatch.setattr(llm.httpx, "post", _chat(content, finish))
        with pytest.raises(ValueError, match="OPENAI_MAX_TOKENS"):
            llm.OpenAICompatibleBackend().answer("Quand semer ?", PASSAGES, {})


def test_ask_sends_a_redacted_question_and_falls_back_when_the_llm_fails(db, monkeypatch):
    from apps.assistant import services

    doc = {"id": "d1", "title": "Quand semer", "body": "Semer en juin. Puis sarcler.", "source": "INRAB", "version": 1,
           "value_chain": "mais"}
    monkeypatch.setattr(services, "search", lambda q, vc, strict=True: [(3.0, doc)])
    sent = []

    class Panne(llm.LLMBackend):
        name = "panne"

        def answer(self, question, passages, context, history=(), system=""):
            sent.append(question)
            raise RuntimeError("http://adresse-privee")

    monkeypatch.setattr(services, "get_backend", lambda: Panne())
    r = services.ask(object(), "Quand semer ? Rappelez le 0197000001", None)
    assert sent == ["Quand semer ? Rappelez le [numéro retiré]"]
    assert r["status"] == "answered" and r["backend"] == "extractive" and r["answer"].startswith("Semer en juin")


def test_check_llm_reports_the_mode_and_never_prints_the_key(db, settings, monkeypatch, capsys):
    import pytest
    from django.core.management import CommandError, call_command

    _glm(settings)
    monkeypatch.setattr(llm.httpx, "post", _chat("Semer en juin."))
    call_command("check_llm")
    out = capsys.readouterr().out
    assert "« openai »" in out and "glm-4.6" in out and "Semer en juin." in out and "sk-test" not in out
    settings.LLM_BACKEND = "extractive"
    with pytest.raises(CommandError, match="extractif"):
        call_command("check_llm")


def test_assistant_context_carries_the_parcel_and_real_weather(producer, settings, monkeypatch):
    from apps.assistant.services import _field_context
    from apps.parcels.models import Campaign, Parcel

    settings.WEATHER_BACKEND = "open-meteo"
    daily = {"daily": {"time": ["2026-10-20"], "temperature_2m_max": [35.0], "temperature_2m_min": [24.0],
                       "precipitation_sum": [3.0], "precipitation_probability_max": [40]}}
    monkeypatch.setattr(httpx, "get", lambda url, **kw: httpx.Response(200, json=daily,
                                                                        request=httpx.Request("GET", url)))
    parcel = Parcel.objects.create(producer=producer, name="P", department="alibori", land_type="pluvial_plateau",
                                   tenure="coutumier", area_ha=1.5, geometry={"type": "Polygon", "coordinates": [
                                       [[2.43, 11.3], [2.44, 11.3], [2.44, 11.31], [2.43, 11.3]]]})
    Campaign.objects.create(parcel=parcel, value_chain="mais", season="2026-pluie-1", stage="floraison")
    ctx = _field_context(producer.user)
    assert ctx["parcelle"] == "pluvial_plateau, 1.5 ha, mais au stade floraison"
    assert ctx["meteo_3_jours"] == "2026-10-20 : 35 °C, pluie 3 mm (40 %)"
    settings.WEATHER_BACKEND = "demo"
    from django.core.cache import cache
    cache.clear()
    assert "meteo_3_jours" not in _field_context(producer.user)  # météo simulée : pas transmise au modèle


class Fake(llm.LLMBackend):
    """Faux modèle : garde ce qu'il a reçu pour que les tests le relisent."""
    name = "fake"

    def __init__(self, answer="Semer en juin.", rewrite="Quand semer le riz ?"):
        self._answer, self._rewrite, self.seen = answer, rewrite, {}

    def answer(self, question, passages, context, history=(), system=""):
        self.seen = {"question": question, "passages": passages, "history": list(history), "system": system}
        return self._answer

    def rewrite(self, question, history):
        return self._rewrite


DOC = {"id": "d1", "title": "Quand semer", "body": "Semer en juin. Puis sarcler.", "source": "INRAB", "version": 1,
       "value_chain": "mais"}
TALK = [{"role": "user", "content": "Quand semer le maïs ?"}, {"role": "assistant", "content": "En juin."}]


def test_a_follow_up_is_rewritten_before_the_search_and_the_model_sees_the_conversation(db, monkeypatch):
    from apps.assistant import services

    queries, fake = [], Fake()
    monkeypatch.setattr(services, "search", lambda q, vc, strict=True: queries.append(q) or [(3.0, DOC)])
    monkeypatch.setattr(services, "get_backend", lambda: fake)
    r = services.ask(object(), "Et pour le riz ?", None, "fr", TALK)
    assert queries == ["Quand semer le riz ?"]  # la relance cherche une question complète
    assert fake.seen["question"] == "Quand semer le riz ?" and fake.seen["history"] == TALK
    assert "Agri-Conseil" in fake.seen["system"] and "Règles absolues" in fake.seen["system"]
    assert r["status"] == "answered" and r["backend"] == "fake" and r["citations"][0]["title"] == "Quand semer"


def test_without_a_model_a_follow_up_glues_the_last_question(db, monkeypatch):
    from apps.assistant import services

    queries = []
    monkeypatch.setattr(services, "search", lambda q, vc, strict=True: queries.append(q) or [(3.0, DOC)])
    services.ask(object(), "Et pour le riz ?", None, "fr", TALK)  # sans clé ni service : extractif
    assert queries == ["Quand semer le maïs ? Et pour le riz ?"]


def test_small_talk_is_answered_by_the_persona_without_documents(db, monkeypatch):
    from apps.assistant import services

    fake = Fake(answer="Bonjour ! Je suis Agri-Conseil.")
    monkeypatch.setattr(services, "search", lambda q, vc, strict=True: (_ for _ in ()).throw(AssertionError("pas de recherche")))
    monkeypatch.setattr(services, "get_backend", lambda: fake)
    r = services.ask(object(), "Bonjour !", None, "fr", [])
    assert r["status"] == "answered" and r["backend"] == "fake" and r["citations"] == []
    assert fake.seen["passages"] == [] and "Règles absolues" in fake.seen["system"]
    assert services.is_smalltalk("Merci beaucoup") and services.is_smalltalk("Qui es-tu ?")
    assert not services.is_smalltalk("Bonjour, quand semer le maïs ?") and not services.is_smalltalk("Quand semer ?")
    # sans modèle : une réponse d'accueil, jamais un conseil
    monkeypatch.setattr(services, "get_backend", lambda: llm.ExtractiveBackend())
    assert "Agri-Conseil" in services.ask(object(), "Bonjour", None, "fr", [])["answer"]


def test_a_dose_in_the_models_answer_is_never_shown(db, monkeypatch):
    from apps.assistant import services

    monkeypatch.setattr(services, "search", lambda q, vc, strict=True: [(3.0, DOC)])
    monkeypatch.setattr(services, "get_backend", lambda: Fake(answer="Mélangez 20 ml par litre d'eau."))
    r = services.ask(object(), "Comment protéger mon champ ?", None)
    assert r["backend"] == "extractive" and "20 ml" not in r["answer"] and r["answer"].startswith("Semer en juin")
    assert services.contains_dose("Utilisez 2 l/ha") and not services.contains_dose("Semez 2 kg de graines au champ")


def test_a_dosage_follow_up_is_escalated_once_rewritten(db, monkeypatch):
    from apps.assistant import services

    monkeypatch.setattr(services, "get_backend", lambda: Fake(rewrite="Quelle dose d'insecticide pour la chenille ?"))
    monkeypatch.setattr(services, "search", lambda q, vc, strict=True: [(3.0, DOC)])
    r = services.ask(object(), "Et la quantité ?", None, "fr", TALK)
    assert r["status"] == "escalated" and r["citations"] == []


def test_history_is_bounded_redacted_and_validated(db, users):
    from apps.assistant import services

    long = [{"role": "user", "content": f"message {i} 0197000001"} for i in range(10)]
    clean = services._clean_history(long + [{"role": "system", "content": "x"}, {"role": "user", "content": " "}])
    assert len(clean) == 6 and clean[-1]["content"] == "message 9 [numéro retiré]"
    c = client_for(users["agent"])
    r = c.post("/api/v1/assistant/ask", {"question": "Bonjour", "history": [{"role": "system", "content": "x"}]},
               format="json")
    assert r.status_code == 400  # seul « user » ou « assistant » est accepté


def test_profile_is_set_by_the_admin_only_and_shapes_the_prompt(users, db):
    from apps.assistant import services

    admin, agent = client_for(users["admin"]), client_for(users["agent"])
    assert agent.get("/api/v1/assistant/profile").json() == {"name": "Agri-Conseil"}  # le nom, pas la personnalité
    assert agent.put("/api/v1/assistant/profile", {"name": "X", "persona": "Y"}, format="json").status_code == 403
    r = admin.put("/api/v1/assistant/profile", {"name": "Kossi", "persona": "Tu es drôle et bref."}, format="json")
    assert r.status_code == 200 and r.json()["persona"] == "Tu es drôle et bref." and r.json()["default_persona"]
    assert admin.put("/api/v1/assistant/profile", {"name": "", "persona": "Y"}, format="json").status_code == 400
    assert agent.get("/api/v1/assistant/profile").json() == {"name": "Kossi"}
    system = llm.system_prompt(*services.get_profile())
    assert "« Kossi »" in system and "Tu es drôle et bref." in system and "Règles absolues" in system  # règles non retirables


def test_a_short_follow_up_with_four_useful_words_is_still_rewritten(db, monkeypatch):
    from apps.assistant import services

    queries = []
    monkeypatch.setattr(services, "search", lambda q, vc, strict=True: queries.append(q) or [(3.0, DOC)])
    monkeypatch.setattr(services, "get_backend", lambda: Fake(rewrite="Combien de temps se garde le niébé stocké ?"))
    services.ask(object(), "Et combien de temps ça se garde ?", None, "fr", TALK)
    assert queries == ["Combien de temps se garde le niébé stocké ?"]  # sans cela la recherche partait sans le sujet
    queries.clear()
    services.ask(object(), "Quels sont les meilleurs moments de la journée pour semer le maïs au nord ?", None, "fr", TALK)
    assert len(queries) == 1 and queries[0].startswith("Quels sont")  # une question longue se suffit


def test_the_dose_filter_sees_products_with_words_in_between_and_markdown_is_stripped():
    from apps.assistant import services

    assert services.contains_dose("La note recommande 50\u202fml de produit par litre d'eau.")
    assert services.contains_dose("Utilisez 2 kg d'insecticide sur la parcelle.")
    assert services.contains_dose("Mettez 20 ml de ce produit pour 15 l d'eau.")
    assert not services.contains_dose("Séchez trois jours, puis remplissez le sac aux trois quarts.")
    assert services.plain("**Bonjour**\n# Titre\n* un\n* deux `x`") == "Bonjour\nTitre\n- un\n- deux x"


def test_a_rewritten_follow_up_searches_loosely_and_a_model_that_finds_no_answer_gives_unknown(db, monkeypatch):
    from apps.assistant import services

    modes = []
    monkeypatch.setattr(services, "search", lambda q, vc, strict=True: modes.append(strict) or [(3.0, DOC)])
    monkeypatch.setattr(services, "get_backend", lambda: Fake(rewrite="Combien de temps se garde le niébé ?"))
    services.ask(object(), "Et combien de temps ça se garde ?", None, "fr", TALK)
    services.ask(object(), "Comment protéger mon champ ?", None, "fr", [])
    assert modes == [False, True]  # relance reformulée : tolérant ; question qui se suffit : strict
    monkeypatch.setattr(services, "get_backend", lambda: Fake(answer=llm.NO_ANSWER))
    r = services.ask(object(), "Comment protéger mon champ ?", None)
    assert r["status"] == "unknown" and r["citations"] == [] and r["answer"] == services.UNKNOWN


def test_the_screen_gets_markdown_while_ussd_and_sms_keep_plain_text(db, monkeypatch):
    from apps.assistant import services

    fake = Fake(answer="Voici :\n- **trois jours** au soleil")
    monkeypatch.setattr(services, "search", lambda q, vc, strict=True: [(3.0, DOC)])
    monkeypatch.setattr(services, "get_backend", lambda: fake)
    assert "**trois jours**" in services.ask(object(), "Comment sécher le grain ?", None, "fr", [], markdown=True)["answer"]
    assert "Markdown simple" in fake.seen["system"]
    plain = services.ask(object(), "Comment sécher le grain ?")["answer"]  # appel par défaut (USSD) : texte brut
    assert "**" not in plain and "sans Markdown" in fake.seen["system"]
