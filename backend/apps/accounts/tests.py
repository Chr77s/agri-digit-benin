from datetime import timedelta

from django.utils import timezone

from apps.accounts.models import User
from apps.alerts.models import Outbox
from conftest import PWD, client_for


def _code(phone):
    body = client_for().get("/api/v1/demo/otp-inbox", {"phone": phone}).json()[0]["body"]
    return body.split("est ")[1][:6]


def test_otp_login_producer_and_staff(users, producer):
    c = client_for()
    r = c.post("/api/v1/auth/otp/request", {"phone": "0197000099"}, format="json")
    assert r.status_code == 200 and r.json()["requires_password"] is False
    r = c.post("/api/v1/auth/otp/verify", {"phone": "0197000099", "code": _code("0197000099")}, format="json")
    assert r.status_code == 200 and r.json()["user"]["producer_id"] == str(producer.id)
    assert r.cookies["refresh"]["httponly"] and r.cookies["refresh"]["samesite"] == "Lax"
    me = client_for()
    me.credentials(HTTP_AUTHORIZATION=f"Bearer {r.json()['access']}")
    assert me.get("/api/v1/auth/me").json()["role"] == "producteur"
    # agent : mot de passe obligatoire
    c.post("/api/v1/auth/otp/request", {"phone": "0197000002"}, format="json")
    r = c.post("/api/v1/auth/otp/verify", {"phone": "0197000002", "code": _code("0197000002")}, format="json")
    assert r.status_code == 400 and r.json()["code"] == "invalid_password"
    Outbox.objects.all().delete()  # horloge Windows ~15 ms : évite deux codes au même horodatage
    c.post("/api/v1/auth/otp/request", {"phone": "0197000002"}, format="json")
    r = c.post("/api/v1/auth/otp/verify", {"phone": "0197000002", "code": _code("0197000002"), "password": PWD},
               format="json")
    assert r.status_code == 200


def test_otp_validation_and_expiry(users):
    c = client_for()
    assert c.post("/api/v1/auth/otp/request", {"phone": "123"}, format="json").status_code == 400
    c.post("/api/v1/auth/otp/request", {"phone": "0197000003"}, format="json")
    User.objects.filter(phone="0197000003").update(otp_expires_at=timezone.now() - timedelta(minutes=1))
    r = c.post("/api/v1/auth/otp/verify", {"phone": "0197000003", "code": _code("0197000003"), "password": PWD},
               format="json")
    assert r.status_code == 400 and r.json()["code"] == "code_expired"


def test_otp_lock_after_5_failures(users):
    c = client_for()
    c.post("/api/v1/auth/otp/request", {"phone": "0197000003"}, format="json")
    good = _code("0197000003")
    bad = "000000" if good != "000000" else "111111"
    codes = [c.post("/api/v1/auth/otp/verify", {"phone": "0197000003", "code": bad, "password": PWD},
                    format="json").status_code for _ in range(5)]
    assert codes == [400, 400, 400, 400, 429]
    r = c.post("/api/v1/auth/otp/request", {"phone": "0197000003"}, format="json")
    assert r.status_code == 429 and r.json()["code"] == "locked"


def test_admin_users_permissions(users):
    r = client_for(users["admin"]).post("/api/v1/admin/users", {"phone": "0197001000", "full_name": "Nouvel agent",
                                                                 "role": "agent_atda", "department": "zou",
                                                                 "password": "Tres-Long-2026!"}, format="json")
    assert r.status_code == 201
    r = client_for(users["admin"]).post("/api/v1/admin/users", {"phone": "0197001000", "full_name": "x",
                                                                 "role": "agent_atda"}, format="json")
    assert r.status_code == 409
    assert client_for(users["agent"]).get("/api/v1/admin/users").status_code == 403
    uid = User.objects.get(phone="0197001000").id
    r = client_for(users["admin"]).patch(f"/api/v1/admin/users/{uid}", {"is_active": False}, format="json")
    assert r.status_code == 200 and r.json()["is_active"] is False


def test_unauthenticated_401():
    r = client_for().get("/api/v1/producers")
    assert r.status_code == 401 and r.json()["code"] == "not_authenticated"
