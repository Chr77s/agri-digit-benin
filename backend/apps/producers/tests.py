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


def test_withdraw_personal_data_closes_then_erases(users, producer):
    from datetime import timedelta

    from django.core.management import call_command
    from django.utils import timezone
    from rest_framework_simplejwt.tokens import RefreshToken

    from apps.audit.models import AuditLog
    from apps.market.models import Offer
    from apps.producers.services import erase_closed

    user = producer.user
    offer = Offer.objects.create(owner=user, type="offre", value_chain="mais", quantity_kg=100, price_xof_per_kg=200,
                                 department="alibori", commune="banikoara")
    cookie = str(RefreshToken.for_user(user))
    c = client_for(user)
    dp = next(x for x in c.get("/api/v1/consents/mine").json() if x["type"] == "donnees_personnelles")
    assert c.post(f"/api/v1/consents/{dp['id']}/withdraw").status_code == 200
    producer.refresh_from_db()
    user.refresh_from_db()
    offer.refresh_from_db()
    assert producer.status == "ferme" and not user.is_active and offer.status == "retiree"
    assert AuditLog.objects.filter(action="producer.close", object_id=str(producer.id)).exists()
    # le cookie de session encore valide ne rouvre pas l'accès
    anon = client_for()
    anon.cookies["refresh"] = cookie
    assert anon.post("/api/v1/auth/refresh").status_code == 401
    # l'identité reste pendant le délai de conservation, puis est effacée
    assert erase_closed(365) == 0
    assert erase_closed(365, now=timezone.now() + timedelta(days=366)) == 1
    producer.refresh_from_db()
    user.refresh_from_db()
    assert producer.status == "efface" and producer.npi != REG["npi"] and producer.phone != REG["phone"]
    assert producer.first_name == "Compte" and producer.versions.count() == 0 and user.full_name == "Compte effacé"
    assert erase_closed(365, now=timezone.now() + timedelta(days=366)) == 0  # déjà effacé
    call_command("purge_retention")  # la commande planifiée appelle l'effacement


def test_demo_registration_gives_a_fresh_identity_each_time(settings):
    settings.DEMO_MODE = True
    c = client_for()
    codes = set()
    for _ in range(2):
        d = c.get("/api/v1/demo/registration").json()
        assert d["npi"].startswith("8") and d["phone"].startswith("0196")
        r = c.post("/api/v1/producers/register", {**REG, **d}, format="json")
        assert r.status_code == 201, r.json()
        codes.add(r.json()["code"])
    assert len(codes) == 2


def test_demo_registration_closed_outside_demo_mode(settings):
    settings.DEMO_MODE = False
    assert client_for().get("/api/v1/demo/registration").status_code == 404
