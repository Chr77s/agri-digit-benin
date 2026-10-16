from conftest import client_for
from integrations.notifications import sms_segments

ALERT = {"title": "Chenille", "message": "Surveillez vos champs.", "category": "ravageur", "severity": "urgent",
         "department": "alibori"}


def test_urgent_alert_second_validation(users, producer):
    a = client_for(users["agent"])
    r = a.post("/api/v1/alerts", ALERT, format="json")
    assert r.status_code == 201 and r.json()["status"] == "en_attente_validation"
    aid = r.json()["id"]
    assert a.post(f"/api/v1/alerts/{aid}/send").json()["code"] == "approval_required"
    r = a.post(f"/api/v1/alerts/{aid}/approve")
    assert r.status_code == 403 and r.json()["code"] == "second_validation_required"
    assert client_for(users["agent2"]).post(f"/api/v1/alerts/{aid}/approve").json()["status"] == "approuvee"
    assert a.post(f"/api/v1/alerts/{aid}/send").json() == {"sent": 1, "delivered": 1, "failed": 0}
    out = a.get("/api/v1/outbox").json()["results"]
    assert out[0]["to"] == "01****0099" and out[0]["encoding"] in ("GSM-7", "UCS-2")
    assert client_for(users["agent_zou"]).post(f"/api/v1/alerts/{aid}/approve").status_code == 404
    assert client_for(users["agent_zou"]).post("/api/v1/alerts", ALERT, format="json").status_code == 403
    assert client_for(producer.user).get("/api/v1/alerts").status_code == 403
    n = client_for(producer.user).get("/api/v1/notifications").json()["results"][0]
    assert client_for(producer.user).post(f"/api/v1/notifications/{n['id']}/read").json()["status"] == "lu"
    assert client_for(users["agent"]).post(f"/api/v1/notifications/{n['id']}/read").status_code == 404


def test_sms_segmentation():
    assert sms_segments("a" * 306) == ("GSM-7", 2)
    assert sms_segments("a" * 307) == ("GSM-7", 3)
    assert sms_segments("ɛ" * 134) == ("UCS-2", 2)
