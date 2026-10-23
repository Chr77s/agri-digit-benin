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


def test_producer_writes_to_the_sector_agent_and_gets_an_answer(users, producer):
    p, agent = client_for(producer.user), client_for(users["agent"])
    assert p.post("/api/v1/chat", {"body": " "}, format="json").status_code == 400
    r = p.post("/api/v1/chat", {"body": "Mes plants de maïs jaunissent, pouvez-vous passer ?"}, format="json")
    assert r.status_code == 201 and r.json()["results"][0]["mine"] is True
    assert any(n["title"] == "Message d'un producteur" for n in agent.get("/api/v1/notifications").json()["results"])
    threads = agent.get("/api/v1/chat/threads").json()["results"]
    assert threads[0]["code"] == producer.code and threads[0]["unread"] == 1
    assert client_for(users["agent_zou"]).get("/api/v1/chat/threads").json()["results"] == []  # hors secteur
    assert client_for(users["agent_zou"]).get(f"/api/v1/chat/{producer.id}").status_code == 404
    thread = agent.get(f"/api/v1/chat/{producer.id}").json()["results"]
    assert thread[0]["from_producer"] is True and thread[0]["mine"] is False
    assert agent.get("/api/v1/chat/threads").json()["results"][0]["unread"] == 0  # ouvert : lu
    agent.post(f"/api/v1/chat/{producer.id}", {"body": "Je passe jeudi matin."}, format="json")
    mine = p.get("/api/v1/chat").json()["results"]
    assert [m["body"] for m in mine] == ["Mes plants de maïs jaunissent, pouvez-vous passer ?", "Je passe jeudi matin."]
    assert any(n["title"] == "Message de votre agent" for n in p.get("/api/v1/notifications").json()["results"])
    assert client_for(users["transf"]).get("/api/v1/chat").status_code == 403
