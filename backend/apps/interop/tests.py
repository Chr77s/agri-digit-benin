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


def test_partner_keys_exchanges_and_connectors(users, producer, settings):
    from apps.interop.services import mask_small

    settings.INTEROP_KEYS = {"xroad": "", "sonama": "", "fnda": ""}
    admin = client_for(users["admin"])
    assert client_for(users["agent"]).post("/api/v1/interop/keys/xroad/renew").status_code == 403
    assert admin.post("/api/v1/interop/keys/inconnu/renew").status_code == 404
    r = admin.post("/api/v1/interop/keys/xroad/renew")
    assert r.status_code == 201 and r.json()["key"].startswith("xr_live_")
    key = r.json()["key"]
    url = "/api/v1/interop/xroad/aggregates"
    assert client_for().get(url, HTTP_X_API_KEY=key).status_code == 200
    assert client_for().get(url, HTTP_X_API_KEY="faux").status_code == 401  # refus journalisé
    # renouveler révoque l'ancienne clé
    key2 = admin.post("/api/v1/interop/keys/xroad/renew").json()["key"]
    assert client_for().get(url, HTTP_X_API_KEY=key).status_code == 401
    assert client_for().get(url, HTTP_X_API_KEY=key2).status_code == 200
    assert admin.post("/api/v1/interop/keys/xroad/revoke").json()["revoked"] == 1
    assert client_for().get(url, HTTP_X_API_KEY=key2).status_code == 401

    ex = admin.get("/api/v1/interop/exchanges", {"partner": "xroad"}).json()["results"]
    assert [e["ok"] for e in ex] == [False, True, False, False, True]  # du plus récent au plus ancien
    assert ex[1]["via"] == "api_key" and ex[0]["status"] == 401 and ex[0]["ip"].endswith("x.x")
    assert len(admin.get("/api/v1/interop/exchanges", {"failed": "1"}).json()["results"]) == 3
    assert client_for(users["auditeur"]).get("/api/v1/interop/exchanges").status_code == 403

    cons = {c["partner"]: c for c in admin.get("/api/v1/interop/connectors").json()}
    assert set(cons) == {"xroad", "sonama", "fnda"}
    assert cons["xroad"]["calls_24h"] == 5 and cons["xroad"]["failures_24h"] == 3 and not cons["xroad"]["configured"]
    assert cons["xroad"]["key"] is None and cons["xroad"]["last_exchange_at"]
    body = str(admin.get("/api/v1/interop/connectors").content)
    assert key2 not in body and key2[8:-4] not in body  # la clé n'est jamais renvoyée après sa création

    rows = mask_small([{"producers": 4, "area_ha": 2.0, "campaigns": 4}, {"producers": 5, "area_ha": 9.0, "campaigns": 5}])
    assert rows[0] == {"producers": None, "area_ha": None, "campaigns": None, "masked": True}
    assert rows[1]["producers"] == 5
