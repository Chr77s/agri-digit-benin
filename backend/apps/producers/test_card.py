from conftest import client_for


def test_card_and_public_verification(users, producer):
    c = client_for(producer.user)
    r = c.get(f"/api/v1/producers/{producer.id}/card")
    assert r.status_code == 200
    code = r.json()["verification_code"]
    assert len(code) == 8 and r.json()["verify_url"].endswith(f"/verify/{code}")
    assert c.get(f"/api/v1/producers/{producer.id}/card").json()["verification_code"] == code  # stable
    pub = client_for().get(f"/api/v1/verify/{code}")
    assert pub.status_code == 200 and set(pub.json()) == {"status", "full_name"}  # aucune autre donnée
    assert client_for().get("/api/v1/verify/ZZZZZZZZ").status_code == 404
    producer.status = "en_attente"
    producer.save()
    r = c.get(f"/api/v1/producers/{producer.id}/card")
    assert r.status_code == 400 and r.json()["code"] == "not_validated"
    assert client_for(users["agent_zou"]).get(f"/api/v1/producers/{producer.id}/card").status_code == 404
