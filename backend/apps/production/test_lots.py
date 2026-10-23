from apps.cooperatives.models import Cooperative, Membership
from apps.parcels.models import Campaign, Parcel
from apps.production.models import Harvest, Support
from conftest import client_for

GEO = {"type": "Polygon", "coordinates": [[[2.43, 11.3], [2.44, 11.3], [2.44, 11.31], [2.43, 11.3]]]}


def test_lot_traced_from_harvest_to_transformed_product(users, producer):
    parcel = Parcel.objects.create(producer=producer, name="Champ 1", department="alibori", geometry=GEO,
                                   land_type="pluvial_plateau", tenure="coutumier", area_ha=2)
    camp = Campaign.objects.create(parcel=parcel, value_chain="mais", season="2026-pluie-1", stage="recolte")
    h = Harvest.objects.create(campaign=camp, harvested_at="2026-10-10", quantity_kg=3000, stored_kg=2500)
    Support.objects.create(producer=producer, item="Semences BEMA14", quantity=2, unit="sac", value_xof=20000)
    Support.objects.update(created_at="2026-06-01T08:00:00Z")  # remis avant la récolte
    Support.objects.create(producer=producer, item="Bâche", quantity=1, unit="unite", value_xof=5000)  # après : exclu
    coop = Cooperative.objects.create(name="Coop", department="alibori", commune="banikoara", value_chains=["mais"],
                                      manager=users["gest"])
    gest, transf, p = client_for(users["gest"]), client_for(users["transf"]), client_for(producer.user)
    assert gest.post("/api/v1/lots/collect", {"harvest": str(h.id), "quantity_kg": 100}, format="json").status_code \
        == 404  # pas encore membre : pas de collecte
    Membership.objects.create(cooperative=coop, producer=producer, role="membre")
    assert gest.get("/api/v1/lots").json()["harvests"][0]["available_kg"] == 2500
    site = gest.post("/api/v1/sites", {"kind": "magasin", "name": "Magasin de Kandi", "department": "alibori",
                                       "lat": 11.13, "lon": 2.94, "capacity_t": 200}, format="json").json()["id"]
    assert gest.post("/api/v1/sites", {"kind": "magasin", "name": "X", "department": "alibori", "lat": 48.8,
                                       "lon": 2.3}, format="json").status_code == 400  # hors du Bénin
    over = gest.post("/api/v1/lots/collect", {"harvest": str(h.id), "quantity_kg": 2600}, format="json")
    assert over.status_code == 400  # au-delà du stock déclaré
    lot = gest.post("/api/v1/lots/collect", {"harvest": str(h.id), "quantity_kg": 2000, "site": site},
                    format="json").json()
    assert lot["site_name"] == "Magasin de Kandi" and lot["code"].startswith("LOT-")
    sent = gest.post(f"/api/v1/lots/{lot['id']}/transfer", {"to_phone": users["transf"].phone, "quantity_kg": 1500},
                     format="json").json()
    assert sent["parents"] == [lot["code"]]
    assert [x["quantity_kg"] for x in gest.get("/api/v1/lots").json()["results"]] == [500]  # le reste chez la coop
    flour = transf.post("/api/v1/lots/transform", {"parents": [sent["id"]], "product": "Farine de maïs",
                                                   "quantity_kg": 1100}, format="json").json()
    t = transf.get(f"/api/v1/lots/{flour['code']}/trace").json()
    assert t["origins"][0]["producer_code"] == producer.code and t["origins"][0]["parcel"] == "Champ 1"
    assert t["origins"][0]["inputs"] == ["Semences BEMA14 (2 sac)"]
    assert [s["product"] for s in t["steps"]][-1] == "Farine de maïs"
    assert p.get(f"/api/v1/lots/{flour['code']}/trace").status_code == 404  # le producteur n'a pas tenu ces lots
    assert client_for(users["agent"]).get(f"/api/v1/lots/{flour['code']}/trace").status_code == 200  # agent d'origine
    assert client_for(users["agent_zou"]).get(f"/api/v1/lots/{flour['code']}/trace").status_code == 404
    again = transf.post("/api/v1/lots/transform", {"parents": [sent["id"]], "product": "x", "quantity_kg": 1},
                        format="json")
    assert again.status_code == 400  # un lot transformé ne sert pas deux fois
