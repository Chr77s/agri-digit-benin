from apps.audit.models import AuditLog
from conftest import client_for


def test_interop_requires_key_and_exposes_no_personal_data(users, producer, settings):
    settings.INTEROP_KEYS = {"xroad": "k-test", "sonama": "", "fnda": "k-fnda"}
    url = "/api/v1/interop/xroad/aggregates"
    assert client_for().get(url).status_code == 401
    assert client_for().get(url, HTTP_X_API_KEY="faux").status_code == 401
    assert client_for().get("/api/v1/interop/sonama/aggregates", HTTP_X_API_KEY="").status_code == 401  # désactivé
    assert client_for().get("/api/v1/interop/inconnu/aggregates", HTTP_X_API_KEY="k").status_code == 404
    r = client_for().get(url, HTTP_X_API_KEY="k-test")
    assert r.status_code == 200
    body = r.content.decode()
    assert producer.phone not in body and producer.last_name not in body
    assert client_for(users["admin"]).get(url).status_code == 200
    assert AuditLog.objects.filter(action="interop.aggregates").count() == 2


def test_sea_indicators_scope_and_roles(users, producer):
    r = client_for(users["admin"]).get("/api/v1/dashboard/sea")
    indicators = r.json()["indicators"]
    keys = {i["key"] for i in indicators}
    assert {"women_share", "under_35_share", "campaigns_by_stage", "supports_value", "assistant_escalation"} <= keys
    assert all({"label", "unit", "source", "updated_at"} <= set(i) for i in indicators)
    assert next(i for i in indicators if i["key"] == "women_share")["value"] == 100.0
    zou = client_for(users["agent_zou"]).get("/api/v1/dashboard/sea").json()
    assert zou["scope"]["department"] == "zou"
    assert next(i for i in zou["indicators"] if i["key"] == "women_share")["value"] is None  # aucune donnée : pas 0
    assert client_for(producer.user).get("/api/v1/dashboard/sea").status_code == 403


def test_satellite_is_deterministic_and_labelled(users):
    c = client_for(users["agent"])
    a, b = c.get("/api/v1/satellite").json(), c.get("/api/v1/satellite").json()
    assert a == b and "non officielles" in a["source"] and len(a["results"]) == 1  # agent : son département
    assert len(client_for(users["admin"]).get("/api/v1/satellite").json()["results"]) == 12
