from conftest import client_for


def square(lon, lat, d=0.009):
    return {"type": "Polygon", "coordinates": [[[lon, lat], [lon + d, lat], [lon + d, lat + d], [lon, lat + d],
                                                [lon, lat]]]}


def body(geom):
    return {"name": "Champ", "geometry": geom, "land_type": "pluvial_plateau", "tenure": "propriete"}


def test_parcel_area_overlap_and_campaign(users, producer):
    c = client_for(producer.user)
    r = c.post("/api/v1/parcels", body(square(2.43, 11.29)), format="json")
    assert r.status_code == 201 and 90 < r.json()["area_ha"] < 110 and not r.json()["overlap_warning"]
    first = r.json()["id"]
    r = c.post("/api/v1/parcels", body(square(2.432, 11.29)), format="json")
    assert r.json()["overlap_warning"] and r.json()["overlap_with"] == [first]
    r = c.post("/api/v1/parcels", body({"type": "Point", "coordinates": [2, 11]}), format="json")
    assert r.status_code == 400
    cp = {"parcel": first, "value_chain": "mais", "season": "2026-pluie-1", "stage": "semis"}
    r = c.post("/api/v1/campaigns", {**cp, "variety": "EVDT 97 STR", "sown_at": "2026-08-12"}, format="json")
    assert r.status_code == 201 and r.json()["variety"] == "EVDT 97 STR" and r.json()["sown_at"] == "2026-08-12"
    assert "estimated_kg" in c.get("/api/v1/campaigns").json()[0]
    assert c.post("/api/v1/campaigns", {**cp, "value_chain": "soja"}, format="json").json()["code"] == \
        "campaign_exists"
    r = c.patch(f"/api/v1/campaigns/{r.json()['id']}", {"stage": "floraison"}, format="json")
    assert r.json()["stage"] == "floraison"
    # IDOR : un agent d'un autre département ne voit pas la parcelle
    assert client_for(users["agent_zou"]).get("/api/v1/parcels").json() == []
    assert client_for(users["agent_zou"]).post("/api/v1/campaigns", {**cp, "season": "2027-pluie-1"},
                                               format="json").status_code == 404
    assert client_for(users["auditeur"]).get("/api/v1/parcels").status_code == 403
