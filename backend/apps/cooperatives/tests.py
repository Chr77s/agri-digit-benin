from apps.cooperatives.models import Cooperative
from conftest import client_for

NEW = {"name": "Coop A", "department": "alibori", "commune": "banikoara", "value_chains": ["mais"]}


def test_cooperative_members_scope_and_history(users, producer):
    cid = client_for(users["agent"]).post("/api/v1/cooperatives", NEW, format="json").json()["id"]
    assert client_for(users["agent"]).post("/api/v1/cooperatives", NEW, format="json").status_code == 409
    Cooperative.objects.filter(pk=cid).update(manager=users["gest"])
    gest = client_for(users["gest"])
    url = f"/api/v1/cooperatives/{cid}/members"
    r = gest.post(url, {"producer": producer.code, "role": "president"}, format="json")
    assert r.status_code == 201 and r.json()["producer_code"] == producer.code
    assert gest.post(url, {"producer": producer.code}, format="json").status_code == 409
    assert gest.get(f"/api/v1/cooperatives/{cid}").json()["members_count"] == 1
    # hors périmètre : agent d'un autre département, autre gestionnaire
    assert client_for(users["agent_zou"]).get(f"/api/v1/cooperatives/{cid}").status_code == 404
    assert client_for(users["transf"]).get(f"/api/v1/cooperatives/{cid}").status_code == 403
    mine = client_for(producer.user).get("/api/v1/memberships/mine").json()["results"]
    assert [m["cooperative"] for m in mine] == [cid]
    mid = r.json()["id"]
    assert gest.post(f"/api/v1/memberships/{mid}/end", {}, format="json").status_code == 400
    assert gest.post(f"/api/v1/memberships/{mid}/end", {"reason": "départ"}, format="json").status_code == 200
    assert gest.get(url + "?active=true").json()["results"] == []
    assert gest.get(url + "?active=false").json()["results"][0]["left_at"] is not None  # historique conservé
    assert gest.post(url, {"producer": producer.code}, format="json").status_code == 201  # ré-adhésion


def _coop(name, department="alibori", manager=None):
    return Cooperative.objects.create(name=name, department=department, commune="banikoara", value_chains=["mais"],
                                      manager=manager)


def test_producer_requests_to_join_and_the_manager_decides(users, producer):
    coop, far = _coop("Coop proche", manager=users["gest"]), _coop("Coop lointaine", department="zou")
    p, gest = client_for(producer.user), client_for(users["gest"])
    nearby = p.get("/api/v1/cooperatives/nearby").json()["results"]
    assert [c["name"] for c in nearby] == ["Coop proche"]  # celle du Zou n'est pas proche
    assert nearby[0]["request_status"] is None
    assert "manager_phone" not in nearby[0]  # le téléphone du gestionnaire n'est pas montré avant l'adhésion
    url = f"/api/v1/cooperatives/{coop.id}/join-request"
    assert p.post(f"/api/v1/cooperatives/{far.id}/join-request", {}, format="json").json()["code"] == "out_of_scope"
    r = p.post(url, {"message": "Je cultive du maïs à Kokey."}, format="json")
    assert r.status_code == 201 and r.json()["status"] == "en_attente"
    assert p.post(url, {}, format="json").status_code == 409  # une demande en attente à la fois
    assert p.get("/api/v1/cooperatives/nearby").json()["results"][0]["request_status"] == "en_attente"
    assert any(n["title"] == "Demande d'adhésion" for n in gest.get("/api/v1/notifications").json()["results"])
    pending = gest.get("/api/v1/join-requests?status=en_attente").json()["results"]
    assert [x["producer_code"] for x in pending] == [producer.code] and pending[0]["message"].startswith("Je cultive")
    rid = r.json()["id"]
    decide = f"/api/v1/join-requests/{rid}/decide"
    assert client_for(users["transf"]).post(decide, {"status": "acceptee"}, format="json").status_code == 403
    assert client_for(users["agent_zou"]).post(decide, {"status": "acceptee"}, format="json").status_code == 404
    assert p.post(decide, {"status": "acceptee"}, format="json").status_code == 403  # le producteur ne décide pas
    assert gest.post(decide, {"status": "refusee"}, format="json").json()["code"] == "reason_required"
    assert gest.post(decide, {"status": "refusee", "reason": "Parcelles hors zone."}, format="json").status_code == 200
    nearby = p.get("/api/v1/cooperatives/nearby").json()["results"][0]
    assert nearby["request_status"] == "refusee" and nearby["request_reason"] == "Parcelles hors zone."
    assert gest.post(decide, {"status": "acceptee"}, format="json").json()["code"] == "invalid_status"  # déjà traitée
    rid = p.post(url, {}, format="json").json()["id"]  # après un refus, une nouvelle demande est permise
    assert gest.post(f"/api/v1/join-requests/{rid}/decide", {"status": "acceptee"}, format="json").status_code == 200
    assert [m["cooperative"] for m in p.get("/api/v1/memberships/mine").json()["results"]] == [str(coop.id)]
    assert p.get("/api/v1/cooperatives/nearby").json()["results"] == []  # déjà membre
    assert p.post(url, {}, format="json").status_code == 409
