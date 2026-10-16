from datetime import date

from apps.programs.models import Program
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
