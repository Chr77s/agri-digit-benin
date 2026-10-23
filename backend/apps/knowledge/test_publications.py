from conftest import client_for


def test_services_innovations_and_financing_reach_the_right_actors(users, producer):
    adm, p = client_for(users["admin"]), client_for(producer.user)
    assert p.post("/api/v1/publications", {}, format="json").status_code == 403
    assert adm.post("/api/v1/publications", {"kind": "financement", "title": "Ligne FNDA maïs", "body": "Crédit",
                                             "provider": "FNDA"}, format="json").status_code == 400  # montant requis
    adm.post("/api/v1/publications", {"kind": "financement", "title": "Ligne FNDA maïs", "body": "Crédit de campagne",
                                      "provider": "FNDA", "value_chains": ["mais"], "amount_xof": 500000000},
             format="json")
    adm.post("/api/v1/publications", {"kind": "innovation", "title": "Sac PICS", "body": "Triple ensachage",
                                      "provider": "INRAB", "departments": ["zou"]}, format="json")
    adm.post("/api/v1/publications", {"kind": "service", "title": "Assurance récolte", "body": "Indicielle",
                                      "provider": "AMAB", "departments": ["alibori"]}, format="json")
    seen = [x["title"] for x in p.get("/api/v1/publications").json()["results"]]
    assert set(seen) == {"Ligne FNDA maïs", "Assurance récolte"}  # l'innovation du Zou n'est pas pour l'Alibori
    assert [x["kind"] for x in p.get("/api/v1/publications?kind=service").json()["results"]] == ["service"]
    f = adm.get("/api/v1/dashboard/financing").json()
    assert f["by_chain"] == {"mais": 500000000} and f["published_total"] == 500000000
    assert p.get("/api/v1/dashboard/financing").status_code == 403
