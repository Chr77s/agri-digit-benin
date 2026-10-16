import pytest

from apps.parcels.models import Campaign, Parcel
from apps.production.services import seed_reference_yields
from conftest import client_for


@pytest.fixture
def campaign(producer):
    seed_reference_yields()
    parcel = Parcel.objects.create(producer=producer, name="P", geometry={}, land_type="pluvial_plateau",
                                   tenure="coutumier", area_ha=2.0, department="alibori")
    return Campaign.objects.create(parcel=parcel, value_chain="mais", season="2026-pluie-1", stage="recolte")


def test_harvest_estimate_flag_and_limits(users, producer, campaign):
    c = client_for(producer.user)
    body = {"campaign": str(campaign.id), "harvested_at": "2026-10-01", "quantity_kg": 3100}
    r = c.post("/api/v1/harvests", body, format="json")
    assert r.status_code == 201 and r.json()["estimated_kg"] == 3000 and r.json()["flagged"] is False
    r = c.post("/api/v1/harvests", {**body, "quantity_kg": 8000, "stored_kg": 7000, "sold_kg": 1000}, format="json")
    assert r.json()["flagged"] is True and r.json()["deviation_pct"] > 50
    assert c.post("/api/v1/harvests", {**body, "stored_kg": 3000, "sold_kg": 200}, format="json").status_code == 400
    agent = client_for(users["agent"])
    assert len(agent.get("/api/v1/harvests?flagged=true").json()["results"]) == 1
    assert client_for(users["agent_zou"]).get("/api/v1/harvests").json()["results"] == []


def test_support_delivery_and_confirmation(users, producer):
    agent, p = client_for(users["agent"]), client_for(producer.user)
    body = {"producer": str(producer.id), "item": "Semences de maïs", "quantity": 25, "unit": "kg",
            "value_xof": 30000, "repayable": False}
    assert p.post("/api/v1/supports", body, format="json").status_code == 403
    r = agent.post("/api/v1/supports", body, format="json")
    assert r.status_code == 201 and r.json()["status"] == "remis"
    sid = r.json()["id"]
    assert client_for(users["agent_zou"]).post("/api/v1/supports", body, format="json").status_code == 404
    assert agent.post(f"/api/v1/supports/{sid}/confirm").status_code == 403
    r = p.post(f"/api/v1/supports/{sid}/confirm")
    assert r.json()["status"] == "confirme" and r.json()["confirmed_at"]
    assert p.post(f"/api/v1/supports/{sid}/confirm").status_code == 400
    assert len(p.get("/api/v1/supports").json()["results"]) == 1
