from datetime import date, timedelta

from django.utils import timezone

from apps.programs.models import Application, Program
from conftest import client_for


def test_programs_apply_closed(users, producer):
    r = client_for(users["resp"]).post("/api/v1/programs", {"name": "Ouvert", "closes_at": "2099-01-01",
                                                            "value_chains": ["mais"]}, format="json")
    assert r.status_code == 201
    assert client_for(users["agent"]).post("/api/v1/programs", {"name": "x", "closes_at": "2099-01-01"},
                                           format="json").status_code == 403
    closed = Program.objects.create(name="Clos", closes_at=date(2025, 12, 31))
    c = client_for(producer.user)
    r = c.post(f"/api/v1/programs/{r.json()['id']}/apply")
    assert r.status_code == 201 and r.json()["status"] == "deposee"
    app_id = r.json()["id"]
    assert c.post(f"/api/v1/programs/{Program.objects.get(name='Ouvert').id}/apply").status_code == 409
    r = c.post(f"/api/v1/programs/{closed.id}/apply")
    assert r.status_code == 400 and r.json()["code"] == "program_closed"
    assert r.json()["detail"] == ("Ce programme est clos depuis le 31/12/2025. Les candidatures ne sont plus "
                                  "acceptées.")
    resp = client_for(users["resp"])
    assert resp.post(f"/api/v1/applications/{app_id}/decide", {"status": "refusee"},
                     format="json").json()["code"] == "reason_required"
    assert resp.post(f"/api/v1/applications/{app_id}/decide", {"status": "acceptee", "reason": "ok"},
                     format="json").json()["status"] == "acceptee"
    assert client_for(users["agent_zou"]).get("/api/v1/applications").json() == []


def test_producer_contests_a_refusal_once_within_fifteen_days(users, producer):
    prog = Program.objects.create(name="Kits", closes_at=date(2099, 1, 1), status="publie")
    c, resp = client_for(producer.user), client_for(users["resp"])
    app_id = c.post(f"/api/v1/programs/{prog.id}/apply").json()["id"]
    url = f"/api/v1/applications/{app_id}/contest"
    r = c.post(url, {"reason": "Inscrit avant la date."}, format="json")
    assert r.json()["code"] == "invalid_status"  # pas encore refusé
    resp.post(f"/api/v1/applications/{app_id}/decide",
              {"status": "refusee", "reason": "Quota atteint."}, format="json")
    assert Application.objects.get(pk=app_id).decided_at is not None
    assert any(n["body"].endswith("« Kits » est refusée.") for n in c.get("/api/v1/notifications").json()["results"])
    assert resp.post(url, {"reason": "x"}, format="json").status_code == 403  # réservé au producteur
    assert c.post(url, {"reason": " "}, format="json").json()["code"] == "reason_required"
    r = c.post(url, {"reason": "Inscrit avant la date limite."}, format="json")
    assert r.status_code == 200 and r.json()["status"] == "en_instruction" and r.json()["contested_at"]
    assert r.json()["contest_reason"] == "Inscrit avant la date limite."
    assert any(n["title"] == "Refus contesté" for n in client_for(users["agent"]).get("/api/v1/notifications")
               .json()["results"])
    resp.post(f"/api/v1/applications/{app_id}/decide",
              {"status": "refusee", "reason": "Quota confirmé."}, format="json")
    assert c.post(url, {"reason": "Encore."}, format="json").json()["code"] == "already_contested"  # une seule fois


def test_contest_window_closes_after_fifteen_days(users, producer):
    prog = Program.objects.create(name="Kits", closes_at=date(2099, 1, 1), status="publie")
    c = client_for(producer.user)
    app_id = c.post(f"/api/v1/programs/{prog.id}/apply").json()["id"]
    client_for(users["resp"]).post(f"/api/v1/applications/{app_id}/decide", {"status": "refusee", "reason": "Quota."},
                                   format="json")
    Application.objects.filter(pk=app_id).update(decided_at=timezone.now() - timedelta(days=16))
    r = c.post(f"/api/v1/applications/{app_id}/contest", {"reason": "Trop tard ?"}, format="json")
    assert r.status_code == 400 and r.json()["code"] == "contest_window_closed"


def test_selection_proposal_validation_contest(users, producer, farms):
    resp = client_for(users["resp"])
    assert client_for(users["agent"]).post("/api/v1/selection-runs", {"target_count": 5},
                                           format="json").status_code == 403
    r = resp.post("/api/v1/selection-runs", {"target_count": 10, "department": "alibori",
                                             "weights": {"confidence": 1, "road_distance": 0, "area": 0}},
                  format="json")
    assert r.status_code == 201 and r.json()["status"] == "proposition"
    run = r.json()
    assert run["weights"]["confidence"] == 1
    cands = resp.get(f"/api/v1/selection-runs/{run['id']}/candidates?selected=true").json()["results"]
    assert len(cands) == 10 and cands[0]["farm_id"] == "F39" and cands[0]["rank"] == 1
    assert resp.post(f"/api/v1/selection-runs/{run['id']}/validate", {"reason": "x"},
                     format="json").status_code == 403
    a = client_for(users["agent"])
    assert a.post(f"/api/v1/selection-runs/{run['id']}/validate", {}, format="json").status_code == 400
    assert a.post(f"/api/v1/selection-runs/{run['id']}/validate", {"reason": "Conforme"},
                  format="json").json()["status"] == "validee"
    p = client_for(producer.user)
    assert p.post(f"/api/v1/selection-runs/{run['id']}/contest", {"farm_id": "F39", "reason": "x"},
                  format="json").json()["code"] == "farm_selected"
    r = p.post(f"/api/v1/selection-runs/{run['id']}/contest", {"farm_id": "F0", "reason": "Erreur"}, format="json")
    assert r.status_code == 201 and r.json()["status"] == "deposee"
    assert len(resp.get(f"/api/v1/selection-runs/{run['id']}/contests").json()) == 1
    assert client_for(users["auditeur"]).get(f"/api/v1/selection-runs/{run['id']}/candidates").status_code == 403


def test_program_draft_publish_criteria_and_estimate(users, producer):
    from datetime import timedelta

    from apps.parcels.models import Campaign, Parcel

    resp = client_for(users["resp"])
    # brouillon incomplet accepté, invisible du producteur
    r = resp.post("/api/v1/programs", {"name": "Motopompes", "status": "brouillon", "value_chains": []}, format="json")
    assert r.status_code == 201 and r.json()["state"] == "brouillon" and r.json()["closes_at"] is None
    pid = r.json()["id"]
    pc = client_for(producer.user)
    assert pid not in [p["id"] for p in pc.get("/api/v1/programs").json()]
    assert pc.post(f"/api/v1/programs/{pid}/apply").json()["code"] == "not_published"
    # publication refusée tant qu'il manque filière et clôture (au moins 14 jours)
    r = resp.patch(f"/api/v1/programs/{pid}", {"status": "publie"}, format="json")
    assert r.status_code == 400 and set(r.json()["fields"]) == {"value_chains", "closes_at"}
    soon = (date.today() + timedelta(days=5)).isoformat()
    r = resp.patch(f"/api/v1/programs/{pid}", {"status": "publie", "value_chains": ["riz"], "closes_at": soon},
                   format="json")
    assert r.json()["fields"]["closes_at"][0].startswith("Fixez la date de clôture, au moins 14 jours")
    assert client_for(users["agent"]).patch(f"/api/v1/programs/{pid}", {"name": "x"}, format="json").status_code == 403
    # critères : département de l'Alibori, campagne de riz exigée, 3 ha au plus
    criteria = {"departments": ["alibori"], "require_campaign": True, "value_chains": ["riz"], "max_area_ha": 3}
    assert resp.post("/api/v1/programs/estimate", criteria, format="json").json() == {"count": 0}
    later = (date.today() + timedelta(days=30)).isoformat()
    r = resp.patch(f"/api/v1/programs/{pid}", {**criteria, "closes_at": later, "status": "publie"}, format="json")
    assert r.status_code == 200 and r.json()["state"] == "ouvert"
    assert resp.patch(f"/api/v1/programs/{pid}", {"name": "y"}, format="json").json()["code"] == "published"
    r = pc.post(f"/api/v1/programs/{pid}/apply")
    assert r.status_code == 400 and r.json()["code"] == "not_eligible"
    parcel = Parcel.objects.create(producer=producer, name="Bas-fond", geometry={}, land_type="bas_fond",
                                   tenure="propriete", area_ha=2.5)
    Campaign.objects.create(parcel=parcel, value_chain="riz", season="2026-pluie-1", stage="semis")
    assert resp.post("/api/v1/programs/estimate", criteria, format="json").json() == {"count": 1}
    assert resp.post("/api/v1/programs/estimate", {**criteria, "max_area_ha": 2}, format="json").json() == {"count": 0}
    assert pc.post(f"/api/v1/programs/{pid}/apply").status_code == 201
    assert pc.post("/api/v1/programs/estimate", criteria, format="json").status_code == 403
