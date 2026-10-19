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
