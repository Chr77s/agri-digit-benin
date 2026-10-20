from datetime import timedelta

from django.utils import timezone

from apps.accounts.models import User
from apps.farmservices.models import SeedLot
from apps.production.models import Expense, Support
from conftest import PWD, client_for, make_user

TOMORROW = str(timezone.localdate() + timedelta(days=1))


def _owner(department="alibori"):
    return make_user("0196000050", "producteur", department, "banikoara")


def _tractor(client, **extra):
    r = client.post("/api/v1/equipment", {"kind": "tracteur", "label": "Tracteur 75 ch", "for_hire": True,
                                          "hire_rate_xof_per_ha": 25000, **extra}, format="json")
    assert r.status_code == 201, r.content
    return r.json()


def test_producer_declares_equipment_and_only_hires_it_out_with_a_rate(users, producer):
    p = client_for(producer.user)
    assert p.post("/api/v1/equipment", {"kind": "tracteur", "for_hire": True}, format="json").status_code == 400
    assert p.post("/api/v1/equipment", {"kind": "avion"}, format="json").status_code == 400
    e = p.post("/api/v1/equipment", {"kind": "pompe", "quantity": 2, "condition": "moyen", "acquired_year": 2021},
               format="json").json()
    assert e["department"] == "alibori" and e["for_hire"] is False and e["quantity"] == 2
    assert p.patch(f"/api/v1/equipment/{e['id']}", {"for_hire": True}, format="json").status_code == 400
    assert p.patch(f"/api/v1/equipment/{e['id']}", {"for_hire": True, "hire_rate_xof_per_ha": 8000},
                   format="json").json()["for_hire"] is True
    assert [x["id"] for x in p.get("/api/v1/equipment").json()["results"]] == [e["id"]]
    assert client_for(users["agent"]).post("/api/v1/equipment", {"kind": "pompe"}, format="json").status_code == 403
    assert client_for(users["agent_zou"]).get("/api/v1/equipment").json()["results"] == []
    ag = client_for(users["agent"]).get("/api/v1/equipment").json()["results"]
    assert ag[0]["owner"] == producer.code  # le personnel voit le code, jamais le téléphone
    s = client_for(users["admin"]).get("/api/v1/equipment/summary").json()["results"]
    assert s == [{"department": "alibori", "kind": "pompe", "owners": 1, "units": 2, "for_hire_units": 2}]
    assert p.get("/api/v1/equipment/summary").status_code == 403
    assert p.delete(f"/api/v1/equipment/{e['id']}").status_code == 204


def test_mechanization_request_from_acceptance_to_expense(users, producer):
    owner = _owner()
    o, p = client_for(owner), client_for(producer.user)
    eq = _tractor(o)
    assert [x["id"] for x in p.get("/api/v1/mechanization/providers").json()["results"]] == [eq["id"]]
    assert o.get("/api/v1/mechanization/providers").json()["results"] == []  # pas son propre matériel
    body = {"equipment": eq["id"], "operation": "labour", "area_ha": 2, "wished_on": TOMORROW}
    assert p.post("/api/v1/mechanization/requests", {**body, "wished_on": "2020-01-01"}, format="json") \
        .status_code == 400
    assert o.post("/api/v1/mechanization/requests", body, format="json").status_code == 400  # son propre matériel
    r = p.post("/api/v1/mechanization/requests", body, format="json").json()
    assert r["estimate_xof"] == 50000 and r["counterpart_phone"] is None and r["role"] == "sent"
    assert p.post("/api/v1/mechanization/requests", body, format="json").status_code == 409
    got = o.get("/api/v1/mechanization/requests").json()["results"][0]
    assert got["role"] == "received" and got["counterpart"] == producer.code and got["counterpart_phone"] is None
    assert p.post(f"/api/v1/mechanization/requests/{r['id']}/decide", {"accept": True}, format="json") \
        .status_code == 403  # seul le propriétaire répond
    assert o.post(f"/api/v1/mechanization/requests/{r['id']}/complete", {"area_done_ha": 2}, format="json") \
        .status_code == 400  # pas encore acceptée
    acc = o.post(f"/api/v1/mechanization/requests/{r['id']}/decide", {"accept": True}, format="json").json()
    assert acc["status"] == "acceptee" and acc["counterpart_phone"] == producer.user.phone  # visible après l'accord
    assert p.get("/api/v1/mechanization/requests").json()["results"][0]["counterpart_phone"] == owner.phone
    assert o.post(f"/api/v1/mechanization/requests/{r['id']}/decide", {"accept": False}, format="json") \
        .status_code == 400
    assert o.post(f"/api/v1/mechanization/requests/{r['id']}/complete", {"area_done_ha": 9}, format="json") \
        .status_code == 400  # plus d'une fois et demie la surface demandée
    done = o.post(f"/api/v1/mechanization/requests/{r['id']}/complete", {"area_done_ha": 1.5}, format="json").json()
    assert done["status"] == "realisee" and done["price_xof"] == 37500
    exp = Expense.objects.get(producer=producer)
    assert exp.category == "mecanisation" and exp.amount_xof == 37500  # entre dans le revenu
    assert p.post(f"/api/v1/mechanization/requests/{r['id']}/cancel", format="json").status_code == 400
    stranger = client_for(make_user("0196000051", "producteur", "alibori", "banikoara"))
    assert stranger.post(f"/api/v1/mechanization/requests/{r['id']}/cancel", format="json").status_code == 404


def test_refused_and_cancelled_requests_free_the_equipment(users, producer):
    owner = _owner()
    o, p = client_for(owner), client_for(producer.user)
    eq = _tractor(o)
    body = {"equipment": eq["id"], "operation": "semis", "area_ha": 1, "wished_on": TOMORROW}
    r = p.post("/api/v1/mechanization/requests", body, format="json").json()
    assert o.post(f"/api/v1/mechanization/requests/{r['id']}/decide", {"accept": False}, format="json") \
        .json()["status"] == "refusee"
    r2 = p.post("/api/v1/mechanization/requests", body, format="json").json()
    assert o.delete(f"/api/v1/equipment/{eq['id']}").status_code == 409  # une demande est en cours
    assert p.post(f"/api/v1/mechanization/requests/{r2['id']}/cancel", format="json").json()["status"] == "annulee"
    gone = o.delete(f"/api/v1/equipment/{eq['id']}")
    assert gone.status_code == 409 and gone.json()["code"] == "has_history"  # l'historique reste
    assert o.patch(f"/api/v1/equipment/{eq['id']}", {"for_hire": False}, format="json").json()["for_hire"] is False
    assert p.get("/api/v1/mechanization/providers").json()["results"] == []


SEEDS = {"value_chain": "mais", "variety": "EVDT 97 STR", "category": "r1", "certificate_no": "CERT-2026-0412",
         "centre": "Centre semencier de Kandi", "department": "alibori", "produced_on": "2026-05-10",
         "quantity_kg": 500}


def test_seed_lot_is_distributed_as_a_support_with_its_code(users, producer):
    agent = client_for(users["agent"])
    assert agent.post("/api/v1/seed-lots", {**SEEDS, "category": "x"}, format="json").status_code == 400
    assert agent.post("/api/v1/seed-lots", {**SEEDS, "department": "zou"}, format="json").status_code == 403
    assert agent.post("/api/v1/seed-lots", {**SEEDS, "produced_on": "2999-01-01"}, format="json").status_code == 400
    lot = agent.post("/api/v1/seed-lots", SEEDS, format="json").json()
    assert lot["code"].startswith("SEM-") and lot["available_kg"] == 500
    pid = str(producer.id)
    assert agent.post(f"/api/v1/seed-lots/{lot['id']}/distribute", {"producer": pid, "quantity_kg": 900},
                      format="json").status_code == 400  # plus que le stock
    out = agent.post(f"/api/v1/seed-lots/{lot['id']}/distribute", {"producer": pid, "quantity_kg": 120},
                     format="json").json()
    assert out["available_kg"] == 380 and out["distributed_kg"] == 120 and out["beneficiaries"] == 1
    s = Support.objects.get(producer=producer)
    assert s.item == f"Semences certifiées EVDT 97 STR (R1) · {lot['code']}" and float(s.quantity) == 120
    assert s.unit == "kg" and s.status == "remis"  # le producteur la confirme dans « Mes appuis »
    assert client_for(producer.user).get("/api/v1/supports").json()["results"][0]["item"] == s.item
    paid = agent.post(f"/api/v1/seed-lots/{lot['id']}/distribute",
                      {"producer": pid, "quantity_kg": 10, "value_xof": 6000, "repayable": True}, format="json")
    assert paid.status_code == 201 and Support.objects.filter(repayable=True, value_xof=6000).exists()
    assert client_for(users["agent_zou"]).post(f"/api/v1/seed-lots/{lot['id']}/distribute",
                                               {"producer": pid, "quantity_kg": 1}, format="json").status_code == 404
    assert [x["code"] for x in client_for(users["resp"]).get("/api/v1/seed-lots").json()["results"]] == [lot["code"]]
    assert client_for(users["resp"]).post("/api/v1/seed-lots", SEEDS, format="json").status_code == 403
    assert client_for(producer.user).get("/api/v1/seed-lots").status_code == 403
    assert SeedLot.objects.get().available_kg == 370


def test_pmea_directory_is_verified_before_it_is_public(users, producer):
    transf = client_for(users["transf"])
    body = {"name": "Huilerie de Parakou", "services": ["transformation", "stockage"], "value_chains": ["soja"],
            "department": "borgou", "commune": "parakou", "phone": "0196112233", "contact_name": "M. Tidjani"}
    assert transf.post("/api/v1/pmea", {**body, "services": ["magie"]}, format="json").status_code == 400
    assert transf.post("/api/v1/pmea", {**body, "phone": "123"}, format="json").status_code == 400
    assert client_for(producer.user).post("/api/v1/pmea", body, format="json").status_code == 403
    p = transf.post("/api/v1/pmea", body, format="json").json()
    assert p["verified"] is False and p["mine"] is True
    other = client_for(User.objects.create_user(phone="0196000060", password=PWD, role="producteur",
                                                department="borgou", commune="parakou"))
    assert other.get("/api/v1/pmea?department=borgou").json()["results"] == []  # pas encore vérifiée
    assert [x["id"] for x in transf.get("/api/v1/pmea?department=borgou").json()["results"]] == [p["id"]]
    assert client_for(users["agent"]).post(f"/api/v1/pmea/{p['id']}/verify").status_code == 403  # autre département
    assert client_for(users["admin"]).post(f"/api/v1/pmea/{p['id']}/verify").json()["verified"] is True
    r = other.get("/api/v1/pmea").json()  # le producteur est ramené à son département
    assert r["department"] == "borgou" and [x["name"] for x in r["results"]] == ["Huilerie de Parakou"]
    assert other.get("/api/v1/pmea?department=borgou&service=intrants").json()["results"] == []
    assert len(other.get("/api/v1/pmea?department=borgou&service=stockage").json()["results"]) == 1
    assert client_for(users["transf"]).post(f"/api/v1/pmea/{p['id']}/verify").status_code == 403
