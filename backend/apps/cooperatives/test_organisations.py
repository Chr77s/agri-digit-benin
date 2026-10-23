from apps.cooperatives.models import Cooperative, Membership
from conftest import client_for


def test_union_groups_cooperatives_with_headcount_meetings_and_prices(users, producer):
    agent, gest = client_for(users["agent"]), client_for(users["gest"])
    coop = Cooperative.objects.create(name="Coop", department="alibori", commune="banikoara", value_chains=["mais"],
                                      manager=users["gest"])
    Membership.objects.create(cooperative=coop, producer=producer, role="membre")
    body = {"name": "Union des producteurs de maïs de l'Alibori", "kind": "union", "value_chains": ["mais"],
            "department": "alibori"}
    assert gest.post("/api/v1/organisations", body, format="json").status_code == 403  # lecture seule
    assert agent.post("/api/v1/organisations", {**body, "department": "zou"}, format="json").status_code == 403
    oid = agent.post("/api/v1/organisations", body, format="json").json()["id"]
    agent.post(f"/api/v1/organisations/{oid}/cooperatives", {"cooperative": str(coop.id)}, format="json")
    bad = agent.post(f"/api/v1/organisations/{oid}/events", {"kind": "prix", "date": "2026-10-01", "title": "Prix"},
                     format="json")
    assert bad.status_code == 400  # un prix convenu exige le prix
    agent.post(f"/api/v1/organisations/{oid}/events", {"kind": "prix", "date": "2026-10-01",
                                                       "title": "Prix bord champ campagne 2026",
                                                       "price_xof_per_kg": 190}, format="json")
    agent.post(f"/api/v1/organisations/{oid}/events", {"kind": "formation", "date": "2026-09-15",
                                                       "title": "Gestion des stocks", "participants": 30,
                                                       "women": 14, "youth": 9}, format="json")
    d = gest.get(f"/api/v1/organisations/{oid}").json()  # le gestionnaire voit l'organisation de sa coopérative
    assert d["headcount"] == {"cooperatives": 1, "producers": 1, "women": int(producer.sex == "F")}
    assert [e["kind"] for e in d["events"]] == ["prix", "formation"] and d["events"][0]["price_xof_per_kg"] == 190
    assert client_for(users["agent_zou"]).get(f"/api/v1/organisations/{oid}").status_code == 404
    assert client_for(producer.user).get("/api/v1/organisations").status_code == 403
