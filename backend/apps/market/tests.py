from apps.market import services
from conftest import client_for

OFFER = {"type": "offre", "value_chain": "mais", "quantity_kg": 1000, "price_xof_per_kg": 250, "department": "borgou",
         "commune": "parakou", "description": "Maïs sec"}


def _matched(users):
    seller, buyer = client_for(users["transf"]), client_for(users["distrib"])
    oid = seller.post("/api/v1/offers", OFFER, format="json").json()["id"]
    mid = buyer.post(f"/api/v1/offers/{oid}/contact", {"message": "Intéressé"}, format="json").json()["id"]
    return seller, buyer, oid, mid


def test_contact_acceptance_reveals_phone_then_payment(users, settings):
    settings.FAKEPAY_DELAY_S = 0
    seller, buyer = client_for(users["transf"]), client_for(users["distrib"])
    assert client_for(users["agent"]).post("/api/v1/offers", OFFER, format="json").status_code == 403
    oid = seller.post("/api/v1/offers", OFFER, format="json").json()["id"]
    assert buyer.get("/api/v1/offers?type=offre&value_chain=mais").json()["results"][0]["id"] == oid
    m = buyer.post(f"/api/v1/offers/{oid}/contact", {"message": "Intéressé"}, format="json")
    assert m.status_code == 201 and m.json()["status"] == "proposee"
    assert "*" in m.json()["counterpart_phone"]  # masqué avant acceptation
    mid = m.json()["id"]
    assert buyer.post(f"/api/v1/matches/{mid}/accept").status_code in (403, 404)  # seul le propriétaire décide
    acc = seller.post(f"/api/v1/matches/{mid}/accept")
    assert acc.json()["status"] == "acceptee" and acc.json()["counterpart_phone"] == users["distrib"].phone
    assert buyer.get("/api/v1/matches/mine").json()["results"][0]["counterpart_phone"] == users["transf"].phone
    pay = {"match": mid, "amount_xof": 250000, "payer_phone": "0197000011"}
    over = buyer.post("/api/v1/payments", {**pay, "amount_xof": 500001}, format="json")
    assert over.status_code == 400 and over.json()["code"] == "amount_over_limit"
    p = buyer.post("/api/v1/payments", pay, format="json")
    assert p.status_code == 201 and p.json()["provider"] == "FakePay"
    got = buyer.get(f"/api/v1/payments/{p.json()['id']}").json()
    assert got["status"] == "reussi" and got["receipt"]["amount_xof"] == 250000
    assert "0197000011" not in str(got["receipt"])  # numéros masqués sur le reçu
    refund = client_for(users["admin"]).post(f"/api/v1/payments/{p.json()['id']}/refund")
    assert refund.json()["status"] == "rembourse"


def test_payment_fails_for_demo_number_ending_in_zero(users, settings):
    settings.FAKEPAY_DELAY_S = 0
    seller, buyer, _, mid = _matched(users)
    seller.post(f"/api/v1/matches/{mid}/accept")
    p = buyer.post("/api/v1/payments", {"match": mid, "amount_xof": 1000, "payer_phone": "0197000010"}, format="json")
    assert buyer.get(f"/api/v1/payments/{p.json()['id']}").json()["status"] == "echoue"


def test_seller_can_request_payment_and_is_the_payee(users, settings):
    settings.FAKEPAY_DELAY_S = 0
    seller, buyer, _, mid = _matched(users)
    seller.post(f"/api/v1/matches/{mid}/accept")
    p = seller.post("/api/v1/payments", {"match": mid, "amount_xof": 1000, "payer_phone": "0197000011"}, format="json")
    assert p.status_code == 201
    got = seller.get(f"/api/v1/payments/{p.json()['id']}").json()
    assert got["status"] == "reussi" and got["receipt"]["payee_masked"] == services.mask(users["transf"].phone)
    assert buyer.get(f"/api/v1/payments/{p.json()['id']}").status_code == 200  # l'acheteur suit le paiement demandé
