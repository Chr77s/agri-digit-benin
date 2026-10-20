import httpx

from conftest import client_for

DAILY = {"daily": {"time": ["2026-10-20", "2026-10-21"], "temperature_2m_max": [34.9, 33.2],
                   "temperature_2m_min": [24.7, 22.7], "precipitation_sum": [0.0, 12.4],
                   "precipitation_probability_max": [0, 80]}}


def test_weather_comes_from_the_open_source_with_its_label(producer, settings, monkeypatch):
    settings.WEATHER_BACKEND = "open-meteo"
    seen = {}

    def fake_get(url, params, **kw):
        seen.update(params)
        return httpx.Response(200, json=DAILY, request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx, "get", fake_get)
    w = client_for(producer.user).get("/api/v1/weather").json()
    assert w["simulated"] is False and w["source"].startswith("Open-Meteo") and w["updated_at"]
    assert w["days"][1] == {"date": "2026-10-21", "tmax": 33, "tmin": 23, "rain_mm": 12, "rain_pct": 80}
    assert seen["timezone"] == "Africa/Porto-Novo" and seen["forecast_days"] == 7


def test_weather_falls_back_to_labelled_demo_when_the_service_is_down(producer, settings, monkeypatch):
    settings.WEATHER_BACKEND = "open-meteo"

    def down(*a, **kw):
        raise httpx.ConnectError("hors ligne")

    monkeypatch.setattr(httpx, "get", down)
    w = client_for(producer.user).get("/api/v1/weather").json()
    assert w["simulated"] is True and w["source"].startswith("Démonstration") and len(w["days"]) == 7
