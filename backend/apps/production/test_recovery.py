from datetime import timedelta

import pytest
from django.utils import timezone

from apps.alerts.models import Notification
from apps.parcels.models import Campaign, Parcel
from apps.production import recovery
from apps.production.models import Claim, Installment
from conftest import client_for

PHONE = "0196000001"  # FakePay : un numéro qui finit par 0 échoue


@pytest.fixture(autouse=True)
def _instant_payments(settings):
    settings.FAKEPAY_DELAY_S = 0


def _support(users, producer, **extra):
    body = {"producer": str(producer.id), "item": "Engrais NPK", "quantity": 4, "unit": "sac", "value_xof": 30000,
            "repayable": True, **extra}
    r = client_for(users["agent"]).post("/api/v1/supports", body, format="json")
    assert r.status_code == 201, r.content
    return r.json()["id"]


def _open_claim(users, producer, **extra):
    sid = _support(users, producer, **extra)
    client_for(producer.user).post(f"/api/v1/supports/{sid}/confirm", {}, format="json")
    return client_for(producer.user).get("/api/v1/claims").json()["results"][0]


def test_repayable_support_opens_a_claim_only_once_received(users, producer):
    p = client_for(producer.user)
    sid = _support(users, producer, repay_installments=3,
                   repay_first_due=str(timezone.localdate() + timedelta(days=10)))
    assert p.get("/api/v1/claims").json()["results"] == []  # remis, pas encore reçu : pas de dette
    p.post(f"/api/v1/supports/{sid}/confirm", {}, format="json")
    c = p.get("/api/v1/claims").json()["results"][0]
    assert c["kind"] == "appui" and c["amount_xof"] == 30000 and c["status"] == "en_cours"
    assert [i["amount_xof"] for i in c["installments"]] == [10000, 10000, 10000]
    assert c["next_due_on"] == str(timezone.localdate() + timedelta(days=10))
    gift = _support(users, producer, repayable=False, item="Bâche")
    p.post(f"/api/v1/supports/{gift}/confirm", {}, format="json")
    assert len(p.get("/api/v1/claims").json()["results"]) == 1  # un don n'ouvre pas de créance
    past = {"producer": str(producer.id), "item": "x", "quantity": 1, "unit": "sac", "value_xof": 1000,
            "repayable": True, "repay_first_due": "2020-01-01"}
    assert client_for(users["agent"]).post("/api/v1/supports", past, format="json").status_code == 400


def test_one_click_payment_is_imputed_and_failures_can_be_retried(users, producer):
    p = client_for(producer.user)
    c = _open_claim(users, producer)
    pay = f"/api/v1/claims/{c['id']}/pay"
    assert p.post(pay, {"payer_phone": "123"}, format="json").status_code == 400
    assert p.post(pay, {"payer_phone": PHONE, "amount_xof": 99999}, format="json").status_code == 400
    r = p.post(pay, {"payer_phone": PHONE}, format="json")
    assert r.status_code == 201 and r.json()["amount_xof"] == 10000 and r.json()["status"] == "en_attente"
    assert p.post(pay, {"payer_phone": PHONE}, format="json").status_code == 409  # un paiement à la fois
    assert p.get(f"/api/v1/claim-payments/{r.json()['id']}").json()["status"] == "reussi"
    d = p.get(f"/api/v1/claims/{c['id']}").json()
    assert d["paid_xof"] == 10000 and d["outstanding_xof"] == 20000 and d["installments"][0]["status"] == "payee"
    assert d["payments"][0]["reference"].startswith("AGR-")
    failed = p.post(pay, {"payer_phone": "0196000010"}, format="json").json()  # finit par 0 : échoue
    assert p.get(f"/api/v1/claim-payments/{failed['id']}").json()["status"] == "echoue"
    assert p.get(f"/api/v1/claims/{c['id']}").json()["paid_xof"] == 10000  # rien d'imputé
    big = p.post(pay, {"payer_phone": PHONE, "amount_xof": 15000}, format="json").json()  # déborde sur l'échéance 3
    p.get(f"/api/v1/claim-payments/{big['id']}")
    ins = p.get(f"/api/v1/claims/{c['id']}").json()["installments"]
    assert [i["paid_xof"] for i in ins] == [10000, 10000, 5000] and ins[2]["status"] == "partielle"
    assert Notification.objects.filter(user=users["agent"], title="Remboursement reçu").count() == 2


def test_who_sees_the_claims_and_the_portfolio(users, producer):
    c = _open_claim(users, producer)
    Installment.objects.filter(claim_id=c["id"], rank=1).update(due_on=timezone.localdate() - timedelta(days=3))
    agent, admin = client_for(users["agent"]), client_for(users["admin"])
    assert [x["id"] for x in agent.get("/api/v1/claims").json()["results"]] == [c["id"]]
    assert client_for(users["agent_zou"]).get("/api/v1/claims").json()["results"] == []
    assert client_for(users["agent_zou"]).get(f"/api/v1/claims/{c['id']}").status_code == 404
    assert client_for(users["financier"]).get("/api/v1/claims").json()["results"] == []  # ni appuis ni prêts d'autrui
    assert client_for(users["transf"]).get(f"/api/v1/claims/{c['id']}").status_code == 404
    pf = admin.get("/api/v1/claims/portfolio").json()
    assert pf["total"]["overdue_xof"] == 10000 and pf["total"]["overdue_count"] == 1
    assert pf["total"]["recovery_rate"] == 0.0 and pf["by_department"]["alibori"]["count"] == 1
    client_for(producer.user).post(f"/api/v1/claims/{c['id']}/pay", {"payer_phone": PHONE}, format="json")
    pay_id = Claim.objects.get(pk=c["id"]).payments.get().id
    client_for(producer.user).get(f"/api/v1/claim-payments/{pay_id}")
    assert admin.get("/api/v1/claims/portfolio").json()["total"]["recovery_rate"] == 1.0
    assert agent.get(f"/api/v1/claims/{c['id']}").json()["status"] == "en_cours"
    assert agent.post(f"/api/v1/claims/{c['id']}/pay", {"payer_phone": PHONE}, format="json").status_code == 403


def test_loan_needs_the_credit_consent_and_stays_between_the_bank_and_the_borrower(users, producer):
    fin, p = client_for(users["financier"]), client_for(producer.user)
    body = {"kind": "pret", "producer": str(producer.id), "label": "Crédit de campagne", "amount_xof": 90000,
            "installments": 3}
    assert fin.post("/api/v1/claims", body, format="json").status_code == 404  # pas de consentement crédit
    p.post("/api/v1/credit/consent")
    r = fin.post("/api/v1/claims", body, format="json")
    assert r.status_code == 201 and r.json()["kind"] == "pret"
    assert [x["kind"] for x in p.get("/api/v1/claims").json()["results"]] == ["pret"]
    assert [x["kind"] for x in fin.get("/api/v1/claims").json()["results"]] == ["pret"]
    for who in ("agent", "admin", "resp", "auditeur"):
        assert client_for(users[who]).get("/api/v1/claims").json()["results"] == []  # prêt : jamais vu du programme
    assert client_for(users["agent"]).post("/api/v1/claims", body, format="json").status_code == 403
    assert fin.post("/api/v1/claims", {**body, "kind": "plateau", "debtor_phone": users["transf"].phone},
                    format="json").status_code == 403
    assert fin.get("/api/v1/claims/portfolio").json()["total"]["count"] == 1


def test_plateau_equipment_is_opened_by_the_agent_of_the_zone(users):
    body = {"kind": "plateau", "debtor_phone": users["transf"].phone, "label": "Presse à huile", "amount_xof": 600000,
            "installments": 6}
    assert client_for(users["agent"]).post("/api/v1/claims", body, format="json").status_code == 404  # hors département
    r = client_for(users["admin"]).post("/api/v1/claims", body, format="json")
    assert r.status_code == 201 and r.json()["debtor"] == "—"  # le démo n'a pas de nom : jamais le téléphone
    t = client_for(users["transf"])
    c = t.get("/api/v1/claims").json()["results"][0]
    assert c["kind"] == "plateau" and len(c["installments"]) == 6 and c["amount_xof"] == 600000
    assert t.post(f"/api/v1/claims/{c['id']}/pay", {"payer_phone": PHONE}, format="json").status_code == 201


def test_credit_score_follows_the_repayment_of_the_producer(users, producer):
    client_for(producer.user).post("/api/v1/credit/consent")
    fin = client_for(users["financier"])
    factor = lambda: next(f for f in fin.get(f"/api/v1/credit/scores/{producer.id}").json()["factors"]  # noqa: E731
                          if f["name"] == "Appuis remboursés")["value"]
    assert factor() == 0.5  # aucune échéance échue : neutre
    c = _open_claim(users, producer)
    Installment.objects.filter(claim_id=c["id"], rank=1).update(due_on=timezone.localdate() - timedelta(days=5))
    assert factor() == 0.0  # une échéance échue et impayée
    client_for(producer.user).post(f"/api/v1/claims/{c['id']}/pay", {"payer_phone": PHONE}, format="json")
    client_for(producer.user).get(f"/api/v1/claim-payments/{Claim.objects.get(pk=c['id']).payments.get().id}")
    assert factor() == 1.0


def test_reminders_go_out_once_a_week(users, producer):
    c = _open_claim(users, producer)
    today = timezone.localdate()
    assert recovery.remind(today) == 0  # première échéance dans 90 jours
    Installment.objects.filter(claim_id=c["id"], rank=1).update(due_on=today - timedelta(days=1))
    assert recovery.remind(today) == 1
    assert recovery.remind(today) == 0  # déjà rappelée aujourd'hui
    assert recovery.remind(today + timedelta(days=7)) == 1
    assert Notification.objects.filter(user=producer.user, title="Échéance de remboursement").count() == 2


@pytest.fixture
def campaign(producer):
    parcel = Parcel.objects.create(producer=producer, name="Champ 1", geometry={}, land_type="pluvial_plateau",
                                   tenure="coutumier", area_ha=2.0, department="alibori")
    return Campaign.objects.create(parcel=parcel, value_chain="mais", season="2026-pluie-1", stage="recolte")


def test_revenue_is_sales_minus_expenses_minus_repayments(users, producer, campaign):
    p = client_for(producer.user)
    p.post("/api/v1/harvests", {"campaign": str(campaign.id), "harvested_at": "2026-10-01", "quantity_kg": 3000,
                                "stored_kg": 500, "sold_kg": 2000, "sale_price_xof_per_kg": 200}, format="json")
    p.post("/api/v1/harvests", {"campaign": str(campaign.id), "harvested_at": "2026-10-02", "quantity_kg": 100,
                                "sold_kg": 50}, format="json")  # vendue sans prix : jamais devinée
    exp = {"campaign": str(campaign.id), "category": "intrants", "amount_xof": 50000, "spent_on": "2026-06-01"}
    assert p.post("/api/v1/expenses", exp, format="json").status_code == 201
    assert p.post("/api/v1/expenses", {**exp, "campaign": None, "category": "transport", "amount_xof": 10000},
                  format="json").status_code == 201
    assert p.post("/api/v1/expenses", {**exp, "spent_on": "2999-01-01"}, format="json").status_code == 400
    assert p.post("/api/v1/expenses", {**exp, "category": "autre_chose"}, format="json").status_code == 400
    c = _open_claim(users, producer)
    p.post(f"/api/v1/claims/{c['id']}/pay", {"payer_phone": PHONE}, format="json")
    p.get(f"/api/v1/claim-payments/{Claim.objects.get(pk=c['id']).payments.get().id}")
    r = p.get("/api/v1/revenue").json()
    assert r["sales_xof"] == 400000 and r["unpriced_harvests"] == 1
    assert r["expenses_xof"] == 60000 and r["repayments_xof"] == 10000 and r["net_xof"] == 330000
    assert r["net_per_ha_xof"] == 165000 and r["seasons"] == ["2026-pluie-1"]
    s = p.get("/api/v1/revenue?season=2026-pluie-1").json()
    assert s["expenses_xof"] == 50000 and s["repayments_xof"] == 0 and s["net_xof"] == 350000  # rien de non rattaché
    assert s["by_campaign"][0]["net_xof"] == 350000
    assert client_for(users["agent"]).get("/api/v1/revenue").status_code == 400  # producteur à désigner
    assert client_for(users["agent"]).get(f"/api/v1/revenue?producer={producer.id}").json()["net_xof"] == 330000
    assert client_for(users["agent_zou"]).get(f"/api/v1/revenue?producer={producer.id}").status_code == 404
    assert client_for(users["agent"]).post("/api/v1/expenses", exp, format="json").status_code == 403
    one = p.get("/api/v1/expenses").json()["results"][0]["id"]
    assert p.delete(f"/api/v1/expenses/{one}").status_code == 204
    assert len(p.get("/api/v1/expenses").json()["results"]) == 1
