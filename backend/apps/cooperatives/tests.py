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
