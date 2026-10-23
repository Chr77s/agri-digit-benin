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
    assert any("(Maïs)" in n["body"] for n in agent.get("/api/v1/notifications").json()["results"])
    assert client_for(users["agent_zou"]).get("/api/v1/harvests").json()["results"] == []


def test_producer_reports_a_missing_or_unreceived_support(users, producer):
    agent, p = client_for(users["agent"]), client_for(producer.user)
    body = {"producer": str(producer.id), "item": "Engrais NPK", "quantity": 4, "unit": "sac", "value_xof": 60000,
            "repayable": False}
    sid = agent.post("/api/v1/supports", body, format="json").json()["id"]
    url = f"/api/v1/supports/{sid}/report"
    assert agent.post(url, {"kind": "manque"}, format="json").status_code == 403  # réservé au producteur concerné
    assert p.post(url, {"kind": "peut-etre"}, format="json").status_code == 400
    assert p.post(url, {"kind": "manque"}, format="json").status_code == 200
    assert p.get("/api/v1/supports").json()["results"][0]["status"] == "remis"  # reste à confirmer
    assert any(n["title"] == "Appui signalé" and f"{producer.code} signale qu'il en manque une partie" in n["body"]
               for n in agent.get("/api/v1/notifications").json()["results"])
    p.post(f"/api/v1/supports/{sid}/confirm")
    assert p.post(url, {"kind": "rien_recu"}, format="json").status_code == 400  # confirmé : plus rien à signaler


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


def test_agent_checks_a_flagged_harvest(users, producer, campaign):
    c, agent = client_for(producer.user), client_for(users["agent"])
    body = {"campaign": str(campaign.id), "harvested_at": "2026-10-01", "quantity_kg": 8000, "stored_kg": 1000,
            "sold_kg": 1000}
    h = c.post("/api/v1/harvests", body, format="json").json()
    assert h["flagged"] and h["check_status"] == "a_verifier"
    url = f"/api/v1/harvests/{h['id']}/check"
    ok = {"conclusion": "confirmee", "reason": "Vérifiée sur place."}
    assert c.post(url, ok, format="json").status_code == 403  # réservé à l'agent
    assert client_for(users["agent_zou"]).post(url, ok, format="json").status_code == 404  # hors périmètre
    assert agent.post(url, {"conclusion": "confirmee"}, format="json").json()["code"] == "reason_required"
    assert agent.post(url, {"conclusion": "autre", "reason": "xxxxx"}, format="json").status_code == 400
    to_check = "/api/v1/harvests?to_check=true"
    assert len(agent.get(to_check).json()["results"]) == 1
    r = agent.post(url, {"conclusion": "visite", "reason": "Passer lundi."}, format="json")
    assert r.json()["check_status"] == "visite" and r.json()["flagged"]  # une visite programmée reste à vérifier
    assert len(agent.get(to_check).json()["results"]) == 1
    too_low = {"conclusion": "corrigee", "quantity_kg": 1500, "reason": "Erreur de comptage."}
    assert agent.post(url, too_low, format="json").status_code == 400  # moins que le stock et les ventes (2 000 kg)
    r = agent.post(url, {**too_low, "quantity_kg": 3100}, format="json")
    assert r.status_code == 200 and r.json()["check_status"] == "corrigee"
    assert r.json()["quantity_kg"] == 3100 and r.json()["declared_kg"] == 8000  # l'originale reste visible
    assert r.json()["flagged"] is False  # l'écart est recalculé : +3,3 %
    assert agent.get(to_check).json()["results"] == []
    assert len(agent.get("/api/v1/harvests?to_check=false").json()["results"]) == 1
    assert agent.post(url, ok, format="json").json()["code"] == "invalid_status"  # déjà tranchée
    notes = c.get("/api/v1/notifications").json()["results"]
    assert any(n["title"] == "Récolte vérifiée" for n in notes)
