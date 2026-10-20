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
