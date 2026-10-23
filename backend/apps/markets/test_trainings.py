from datetime import timedelta

from django.utils import timezone

from apps.audit.models import AuditLog
from apps.markets.models import Showcase, Training
from conftest import client_for, make_user

URL = "/api/v1/trainings"


def _day(n=0):
    return str(timezone.localdate() + timedelta(days=n))


def _body(**extra):
    return {"title": "Séchage et stockage du maïs", "theme": "stockage", "department": "alibori", "date": _day(1),
            "place": "Mairie de Kandi", "seats": 2, "audience": ["producteur", "transformateur"], **extra}


def _row(client, tid):
    return next((t for t in client.get(URL).json()["results"] if t["id"] == tid), None)


def test_who_creates_a_training_and_which_values_are_refused(users, producer):
    agent, admin = client_for(users["agent"]), client_for(users["admin"])
    r = agent.post(URL, _body(), format="json")
    assert r.status_code == 201 and r.json()["seats_left"] == 2 and r.json()["audience"] == [
        "producteur", "transformateur"]
    assert AuditLog.objects.filter(action="training.create", actor=users["agent"]).count() == 1
    assert agent.post(URL, _body(department="zou"), format="json").status_code == 403  # hors de son département
    assert admin.post(URL, _body(department="zou"), format="json").status_code == 201
    for who in ("transf", "distrib", "gest", "resp"):
        assert client_for(users[who]).post(URL, _body(), format="json").status_code == 403, who
    assert client_for(producer.user).post(URL, _body(), format="json").status_code == 403
    for bad in ({"date": _day(-1)}, {"theme": "magie"}, {"audience": []}, {"audience": ["agent_atda"]},
                {"seats": 0}, {"title": ""}):
        assert agent.post(URL, {**_body(), **bad}, format="json").status_code == 400, bad
    assert admin.post(URL, _body(department="atlantide"), format="json").status_code == 400  # département inconnu


def test_voluntary_registration_with_audience_department_and_seats(users, producer):
    tid = client_for(users["agent"]).post(URL, _body(), format="json").json()["id"]
    reg = f"{URL}/{tid}/register"
    p1, p2 = client_for(producer.user), client_for(make_user("0196000050", "producteur", "alibori"))
    p3 = client_for(make_user("0196000051", "producteur", "alibori"))
    assert _row(p1, tid)["my_registration"] is None
    assert p1.post(reg).status_code == 201
    assert p1.post(reg).json()["code"] == "already_registered"
    assert p2.post(reg).status_code == 201
    full = p3.post(reg)
    assert full.status_code == 409 and full.json()["code"] == "full"  # 2 places seulement
    assert _row(p3, tid)["seats_left"] == 0
    assert p1.delete(reg).status_code == 204  # l'inscription se retire avant le jour de la formation
    assert p3.post(reg).status_code == 201  # la place libérée est reprise
    assert _row(p1, tid)["my_registration"] is None and _row(p3, tid)["my_registration"]["attended"] is None
    # un transformateur d'un autre département, un gestionnaire hors du public visé : la séance ne les concerne pas
    assert _row(client_for(users["transf"]), tid) is None
    assert client_for(users["transf"]).post(reg).status_code == 404
    assert client_for(users["gest"]).post(reg).status_code == 404  # alibori, mais le public visé est autre
    only_distrib = client_for(users["admin"]).post(URL, _body(audience=["distributeur"]), format="json").json()["id"]
    assert p1.post(f"{URL}/{only_distrib}/register").status_code == 404
    assert client_for(users["auditeur"]).get(URL).status_code == 403
    # le personnel voit les effectifs, jamais l'acteur ordinaire
    assert "present" not in _row(p1, tid) and _row(client_for(users["agent"]), tid)["registered"] == 2


def test_attendance_is_recorded_by_the_agent_on_the_day(users, producer):
    agent = client_for(users["agent"])
    today = agent.post(URL, _body(date=_day(0), seats=5), format="json").json()["id"]
    later = agent.post(URL, _body(date=_day(1), seats=5), format="json").json()["id"]
    p1 = client_for(producer.user)
    p2 = client_for(make_user("0196000050", "producteur", "alibori"))
    for t in (today, later):
        assert p1.post(f"{URL}/{t}/register").status_code == 201
    assert p2.post(f"{URL}/{today}/register").status_code == 201
    regs = agent.get(f"{URL}/{today}/registrations").json()["results"]
    assert {r["role"] for r in regs} == {"producteur"} and all(r["attended"] is None for r in regs)
    assert all("phone" not in r for r in regs)  # le nom ou un numéro masqué, jamais le téléphone
    first, second = regs[0]["id"], regs[1]["id"]
    mark = f"{URL}/{today}/attendance"
    assert agent.post(mark, {"registration": first, "present": True}, format="json").status_code == 200
    assert agent.post(mark, {"registration": second, "present": False}, format="json").status_code == 200
    assert AuditLog.objects.filter(action="training.attendance", actor=users["agent"]).count() == 2
    ahead = agent.get(f"{URL}/{later}/registrations").json()["results"][0]["id"]
    early = agent.post(f"{URL}/{later}/attendance", {"registration": ahead, "present": True}, format="json")
    assert early.status_code == 400 and early.json()["code"] == "invalid_status"  # avant le jour
    for who in ("agent_zou", "transf"):
        c = client_for(users[who])
        assert c.post(mark, {"registration": first, "present": True}, format="json").status_code in (403, 404), who
        assert c.get(f"{URL}/{today}/registrations").status_code in (403, 404), who
    assert p1.post(mark, {"registration": first, "present": True}, format="json").status_code == 403
    assert p1.delete(f"{URL}/{today}/register").status_code == 400  # le jour même, on n'annule plus
    assert p1.delete(f"{URL}/{later}/register").status_code == 204
    mine = [t for t in p2.get(URL).json()["results"] if t["id"] == today][0]
    assert mine["my_registration"]["attended"] is False
    r = agent.get(f"{URL}/report").json()
    assert r["results"] == [{"department": "alibori", "sessions": 2, "upcoming": 2, "seats": 10, "registered": 2,
                             "present": 1, "absent": 1, "to_record": 0, "attendance_pct": 50}]
    assert r["total"]["registered"] == 2 and r["total"]["attendance_pct"] == 50


def test_report_scope_by_role(users, producer):
    client_for(users["agent"]).post(URL, _body(), format="json")
    client_for(users["admin"]).post(URL, _body(department="zou"), format="json")
    assert [x["department"] for x in client_for(users["agent"]).get(f"{URL}/report").json()["results"]] == ["alibori"]
    assert [x["department"] for x in client_for(users["admin"]).get(f"{URL}/report").json()["results"]] == [
        "alibori", "zou"]
    assert client_for(users["resp"]).get(f"{URL}/report").status_code == 200
    assert client_for(users["transf"]).get(f"{URL}/report").status_code == 403
    assert client_for(producer.user).get(f"{URL}/report").status_code == 403
    assert Training.objects.count() == 2


SHOW = "/api/v1/showcase"


def _show(**extra):
    return {"company": "Maïs d'Or SARL", "name": "Farine de maïs 1 kg", "description": "Moulue et tamisée.",
            "value_chain": "mais", "form": "transforme", "price_xof_per_kg": 450, "department": "borgou",
            "contact": "contact@maisdor.example", **extra}


def test_showcase_is_published_by_businesses_and_read_by_everyone_signed_in(users, producer):
    transf, distrib = client_for(users["transf"]), client_for(users["distrib"])
    r = transf.post(SHOW, _show(), format="json")
    assert r.status_code == 201 and r.json()["is_mine"] is True and r.json()["status"] == "publie"
    assert AuditLog.objects.filter(action="showcase.publish", actor=users["transf"]).count() == 1
    assert client_for(users["gest"]).post(SHOW, _show(name="Maïs grain", form="brut"), format="json").status_code == 201
    assert distrib.post(SHOW, _show(price_xof_per_kg=None), format="json").status_code == 201
    for who in ("agent", "admin", "resp"):
        assert client_for(users[who]).post(SHOW, _show(), format="json").status_code == 403, who
    assert client_for(producer.user).post(SHOW, _show(), format="json").status_code == 403
    for bad in ({"price_xof_per_kg": 0}, {"price_xof_per_kg": 20001}, {"value_chain": "inconnue"}, {"form": "frit"},
                {"department": "atlantide"}, {"name": ""}, {"contact": ""}):
        assert transf.post(SHOW, {**_show(), **bad}, format="json").status_code == 400, bad
    listing = client_for(producer.user).get(SHOW).json()["results"]  # tout acteur connecté lit la vitrine
    assert len(listing) == 3 and all(x["is_mine"] is False for x in listing)
    assert [x["name"] for x in client_for(producer.user).get(f"{SHOW}?form=brut").json()["results"]] == ["Maïs grain"]
    assert len(transf.get(f"{SHOW}?mine=1").json()["results"]) == 1
    assert client_for().get(SHOW).status_code == 401
    # le retrait revient à l'auteur (et à l'administration, pour modérer)
    mine = transf.get(f"{SHOW}?mine=1").json()["results"][0]["id"]
    assert distrib.post(f"{SHOW}/{mine}/withdraw").status_code == 404
    assert client_for(producer.user).post(f"{SHOW}/{mine}/withdraw").status_code == 403
    assert transf.post(f"{SHOW}/{mine}/withdraw").json()["status"] == "retire"
    assert transf.post(f"{SHOW}/{mine}/withdraw").status_code == 400
    assert len(client_for(producer.user).get(SHOW).json()["results"]) == 2  # retiré : plus dans la vitrine
    other = distrib.get(f"{SHOW}?mine=1").json()["results"][0]["id"]
    assert client_for(users["admin"]).post(f"{SHOW}/{other}/withdraw").status_code == 200
    assert Showcase.objects.filter(status="retire").count() == 2
