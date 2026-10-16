from apps.producers.models import Producer
from conftest import REG, client_for


def test_register_pending_and_code_sequence(users):
    r = client_for().post("/api/v1/producers/register", REG, format="json")
    assert r.status_code == 201
    assert r.json()["status"] == "en_attente" and r.json()["code"] == "BJ-AGR-2026-000001"
    r = client_for().post("/api/v1/producers/register", {**REG, "npi": "1000000003", "first_name": "Koffi",
                                                         "last_name": "HOUNSOU", "birth_date": "1978-11-20",
                                                         "phone": "0197000098", "sex": "M"}, format="json")
    assert r.json()["code"] == "BJ-AGR-2026-000002"


def test_register_duplicates_409(producer):
    r = client_for().post("/api/v1/producers/register", REG, format="json")
    assert r.status_code == 409 and r.json()["existing"]["code"] == producer.code
    r = client_for().post("/api/v1/producers/register", {**REG, "npi": "1000000003", "first_name": "Koffi",
                                                         "last_name": "HOUNSOU", "birth_date": "1978-11-20"},
                          format="json")
    assert r.status_code == 409  # même téléphone


def test_register_anip_errors():
    c = client_for()
    cases = [({"npi": "1234567890"}, 400, "npi_unknown"), ({"last_name": "AUTRE"}, 400, "name_mismatch"),
             ({"birth_date": "1991-07-01"}, 400, "birthdate_mismatch"), ({"npi": "9999999999"}, 503,
                                                                          "anip_unavailable"),
             ({"consent_accepted": False}, 400, "consent_required")]
    for patch, status, code in cases:
        r = c.post("/api/v1/producers/register", {**REG, **patch}, format="json")
        assert (r.status_code, r.json()["code"]) == (status, code), patch
    assert c.post("/api/v1/producers/register", {**REG, "npi": "12"}, format="json").status_code == 400


def test_minor_requires_guardian():
    d = {**REG, "npi": "1000000004", "first_name": "Mariam", "last_name": "ZATO", "birth_date": "2011-05-04"}
    r = client_for().post("/api/v1/producers/register", d, format="json")
    assert r.status_code == 400 and r.json()["code"] == "guardian_required"
    r = client_for().post("/api/v1/producers/register", {**d, "guardian_name": "Ali ZATO", "guardian_npi": "1000000003",
                                                         "guardian_consent": True}, format="json")
    assert r.status_code == 201


def test_scope_idor_and_roles(users, producer):
    assert client_for(users["agent"]).get(f"/api/v1/producers/{producer.id}").status_code == 200
    assert client_for(users["agent_zou"]).get(f"/api/v1/producers/{producer.id}").status_code == 404
    assert client_for(users["agent_zou"]).post(f"/api/v1/producers/{producer.id}/validate").status_code == 404
    assert client_for(users["auditeur"]).get("/api/v1/producers").status_code == 403
    assert client_for(users["agronome"]).get("/api/v1/producers").status_code == 403
    assert client_for(users["financier"]).get("/api/v1/producers").json()["results"] == []
    other = Producer.objects.create(code="X", npi="1000000005", first_name="a", last_name="b", sex="M",
                                    birth_date="1980-01-01", department="zou", commune="abomey", phone="0196000005")
    assert client_for(producer.user).get(f"/api/v1/producers/{other.id}").status_code == 404
    assert client_for(producer.user).post(f"/api/v1/producers/{producer.id}/validate").status_code == 403


def test_validate_reject_patch_versions(users, producer):
    a = client_for(users["agent"])
    r = a.post(f"/api/v1/producers/{producer.id}/reject", {}, format="json")
    assert r.status_code == 400 and r.json()["code"] == "reason_required"
    assert a.post(f"/api/v1/producers/{producer.id}/reject", {"reason": "Pièce manquante"},
                  format="json").json()["status"] == "rejete"
    assert a.post(f"/api/v1/producers/{producer.id}/validate").json()["status"] == "valide"
    assert a.patch(f"/api/v1/producers/{producer.id}", {"language": "fon"}, format="json").status_code == 200
    vs = a.get(f"/api/v1/producers/{producer.id}/versions").json()
    assert len(vs) == 4 and vs[-1]["data"]["language"] == "fon"
    notes = client_for(producer.user).get("/api/v1/notifications").json()["results"]
    assert len(notes) == 2


def test_consents(producer):
    c = client_for(producer.user)
    cons = c.get("/api/v1/consents/mine").json()
    assert cons[0]["type"] == "donnees_personnelles"
    r = c.post(f"/api/v1/consents/{cons[0]['id']}/withdraw")
    assert r.status_code == 200 and r.json()["withdrawn_at"]
