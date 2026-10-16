from apps.parcels.models import Campaign, Parcel
from conftest import client_for


def test_offline_conflict_and_forced_choice(users, producer):
    parcel = Parcel.objects.create(producer=producer, name="P", geometry={}, land_type="pluvial_plateau",
                                   tenure="coutumier", area_ha=1, department="alibori")
    camp = Campaign.objects.create(parcel=parcel, value_chain="mais", season="2026-pluie-1", stage="semis")
    c, url = client_for(users["agent"]), f"/api/v1/campaigns/{camp.id}"
    r = c.patch(url, {"stage": "croissance", "base_version": 1}, format="json")
    assert r.status_code == 200 and r.json()["version"] == 2
    r = c.patch(url, {"stage": "floraison", "base_version": 1}, format="json")  # lu avant la modification ci-dessus
    assert r.status_code == 409 and r.json()["code"] == "conflict"
    assert r.json()["server_version"] == 2 and r.json()["server"]["stage"] == "croissance"
    r = c.patch(url, {"stage": "floraison", "base_version": 1, "force": True}, format="json")
    assert r.status_code == 200 and r.json()["stage"] == "floraison" and r.json()["version"] == 3
