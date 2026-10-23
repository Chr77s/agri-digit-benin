from datetime import timedelta

from django.utils import timezone

from apps.audit.models import AuditLog
from apps.markets.models import PriceObservation
from apps.parcels.models import Campaign, Parcel
from apps.production.models import Harvest
from apps.production.services import seed_reference_yields
from apps.ussd.services import handle
from conftest import client_for

GEO = {"type": "Polygon", "coordinates": [[[2.43, 11.3], [2.44, 11.3], [2.44, 11.31], [2.43, 11.3]]]}


def _body(**extra):
    return {"market": "Banikoara", "department": "alibori", "value_chain": "mais", "form": "brut",
            "product": "maïs grain", "price_xof_per_kg": 190, "observed_on": str(timezone.localdate()), **extra}


def _obs(days_ago, price, user=None, **extra):
    d = dict(market="Banikoara", department="alibori", value_chain="mais", form="brut", product="maïs grain")
    d.update(extra)
    return PriceObservation.objects.create(price_xof_per_kg=price, recorded_by=user,
                                           observed_on=timezone.localdate() - timedelta(days=days_ago), **d)


def test_who_records_a_price_and_which_values_are_refused(users, producer):
    agent, admin = client_for(users["agent"]), client_for(users["admin"])
    url = "/api/v1/prices"
    r = agent.post(url, _body(), format="json")
    assert r.status_code == 201 and r.json()["price"] == 190 and r.json()["simulated"] is False
    assert AuditLog.objects.filter(action="price.record", actor=users["agent"]).count() == 1
    assert agent.post(url, _body(department="zou"), format="json").status_code == 403  # pas son département
    assert admin.post(url, _body(department="zou"), format="json").status_code == 201  # l'administration relève partout
    assert client_for(users["transf"]).post(url, _body(), format="json").status_code == 403  # alibori, il est à borgou
    assert client_for(users["transf"]).post(url, _body(department="borgou", market="Parakou"),
                                            format="json").status_code == 201
    assert client_for(users["gest"]).post(url, _body(market="Kandi"), format="json").status_code == 201
    assert client_for(producer.user).post(url, _body(market="Kandi"), format="json").status_code == 403
    assert client_for(users["resp"]).post(url, _body(market="Kandi"), format="json").status_code == 403
    future = str(timezone.localdate() + timedelta(days=1))
    for bad in ({"observed_on": future}, {"price_xof_per_kg": 0}, {"price_xof_per_kg": -5},
                {"price_xof_per_kg": 20001}, {"value_chain": "inconnue"}, {"form": "frit"}, {"market": "  "}):
        assert agent.post(url, {**_body(market="Gogounou"), **bad}, format="json").status_code == 400, bad
    assert agent.post(url, _body(price_xof_per_kg=20000, market="Gogounou"), format="json").status_code == 201
    assert agent.post(url, _body(), format="json").status_code == 409  # même relevé, même jour, même auteur
    assert PriceObservation.objects.count() == 5


def test_latest_reading_per_market_within_30_days_with_change(users):
    _obs(40, 150, market="Kandi")  # trop ancien : n'est plus « le prix du moment »
    _obs(40, 150)
    _obs(10, 180)
    _obs(0, 190)
    _obs(0, 300, form="transforme", product="farine de maïs")
    r = client_for(users["agent"]).get("/api/v1/prices?value_chain=mais").json()
    assert r["simulated"] is False and r["window_days"] == 30
    rows = {(x["form"], x["market"]): x for x in r["latest"]}
    assert set(rows) == {("brut", "Banikoara"), ("transforme", "Banikoara")}  # Kandi n'a plus de relevé récent
    assert rows[("brut", "Banikoara")]["price"] == 190 and rows[("brut", "Banikoara")]["change"] == 6  # +5,6 % sur 180
    assert rows[("transforme", "Banikoara")]["change"] is None and rows[("transforme", "Banikoara")]["product"] == \
        "farine de maïs"
    assert {h["form"] for h in r["history"]} == {"brut", "transforme"}
    assert client_for(users["agent"]).get("/api/v1/prices").status_code == 400  # la filière est obligatoire
    assert client_for().get("/api/v1/prices?value_chain=mais").status_code == 401


def test_without_readings_the_demo_values_stay_labelled_simulated(users):
    c = client_for(users["agent"])
    r = c.get("/api/v1/prices?value_chain=mais").json()
    assert r["simulated"] is True and r["latest"] and all(x["simulated"] for x in r["latest"])
    assert r["latest"][0]["observed_on"] is None and "Démonstration" in r["source"]
    assert c.get("/api/v1/prices?value_chain=coton").json() == {  # pas de prix de démonstration pour le coton : rien
        "value_chain": "coton", "simulated": True, "window_days": 30, "latest": [], "history": [],
        "source": "Démonstration : aucun relevé récent pour cette filière."}
    _obs(0, 200)
    r = c.get("/api/v1/prices?value_chain=mais").json()
    assert r["simulated"] is False and [x["price"] for x in r["latest"]] == [200]  # plus aucune valeur simulée


def test_phone_and_sms_prices_follow_the_readings(users, producer):
    assert "(demonstration)" in handle("0197000099", "2*1")[1]
    _obs(2, 205, market="Banikoara")
    _obs(2, 230, market="Bohicon", department="zou")
    more, text = handle("0197000099", "2*1")
    assert not more and text.splitlines()[:3] == ["PRIX MAIS (F/kg)", "Banikoara 205", "Bohicon 230"]
    assert text.endswith(f"(releves du {timezone.localdate() - timedelta(days=2):%d/%m})")
    assert "demonstration" not in text and len(text) <= 182 and text.isascii()


def test_processing_gap_between_raw_and_processed_prices(users, producer):
    _obs(1, 190, market="Banikoara")
    _obs(1, 210, market="Kandi")
    _obs(1, 300, market="Kandi", form="transforme", product="farine de maïs")
    _obs(1, 500, market="Dantokpa", department="littoral", form="transforme", product="farine de maïs")  # sans brut
    for who in ("transf", "resp", "admin"):
        r = client_for(users[who]).get("/api/v1/prices/margins")
        assert r.status_code == 200, who
    rows = client_for(users["transf"]).get("/api/v1/prices/margins").json()["results"]
    assert len(rows) == 1  # le département sans prix brut n'a pas d'écart
    assert rows[0] | {"observed_on": None} == {
        "value_chain": "mais", "department": "alibori", "product": "farine de maïs", "raw_xof": 200,
        "transformed_xof": 300, "gap_xof": 100, "gap_pct": 50, "raw_markets": 2, "transformed_markets": 1,
        "observed_on": None}
    for who in ("agent", "distrib"):
        assert client_for(users[who]).get("/api/v1/prices/margins").status_code == 403
    assert client_for(producer.user).get("/api/v1/prices/margins").status_code == 403


def test_trend_projection_and_reliability(users):
    for days_ago in (49, 42, 35, 28, 21, 14, 7, 0):  # +1 FCFA par jour
        _obs(days_ago, 200 + 49 - days_ago)
    r = client_for(users["agent"]).get("/api/v1/market-analysis?value_chain=mais").json()
    assert r["method"]["min_observations"] == 6
    pooled, by_market = r["prices"][0], r["prices"][1]
    assert pooled["market"] is None and by_market["market"] == "Banikoara"
    assert pooled["observations"] == 8 and pooled["moving_avg_xof"] == 238  # moyenne de 228, 235, 242, 249
    assert pooled["variation_pct"] == 13.3 and pooled["trend"] == "hausse" and pooled["reliability"] == "faible"
    assert pooled["projection"]["price_xof"] == 277 and pooled["projection"]["low_xof"] == 277  # droite parfaite
    assert "Hausse de 13,3 % sur 4 semaines" in pooled["text"] and "Indicatif" in pooled["text"]


def test_no_projection_below_six_readings_or_without_time_spread(users):
    for days_ago in (30, 20, 10):
        _obs(days_ago, 200 + days_ago)
    for _ in range(6):  # 6 relevés le même jour : aucune tendance
        _obs(1, 250, market="Kandi")
    r = client_for(users["admin"]).get("/api/v1/market-analysis?value_chain=mais").json()
    by = {p["market"]: p for p in r["prices"]}
    assert by["Banikoara"]["observations"] == 3 and by["Banikoara"]["reliability"] == "insuffisante"
    assert by["Banikoara"]["projection"] is None and "trop peu" in by["Banikoara"]["text"]
    assert by["Kandi"]["observations"] == 6 and by["Kandi"]["reliability"] == "insuffisante"
    assert by["Kandi"]["projection"] is None


def test_stable_inside_the_five_percent_band(users):
    for days_ago, price in ((50, 200), (40, 200), (35, 200), (20, 210), (10, 210), (0, 210)):
        _obs(days_ago, price)
    p = client_for(users["admin"]).get("/api/v1/market-analysis?value_chain=mais").json()["prices"][0]
    assert p["variation_pct"] == 5.0 and p["trend"] == "stable"  # 5 % exactement : pas encore une hausse


def test_expected_supply_against_previous_season_and_masking(users, producer):
    seed_reference_yields()  # maïs : 1500 kg/ha, source « demonstration »
    parcel = Parcel.objects.create(producer=producer, name="Champ 1", department="alibori", geometry=GEO,
                                   land_type="pluvial_plateau", tenure="coutumier", area_ha=2)
    old = Campaign.objects.create(parcel=parcel, value_chain="mais", season="2025-pluie-1", stage="recolte")
    Harvest.objects.create(campaign=old, harvested_at="2025-10-10", quantity_kg=2000)
    Campaign.objects.create(parcel=parcel, value_chain="mais", season="2026-pluie-1", stage="croissance")
    r = client_for(users["admin"]).get("/api/v1/market-analysis?value_chain=mais").json()
    row = r["supply"][0]
    assert (row["department"], row["season"], row["campaigns_pending"]) == ("alibori", "2026-pluie-1", 1)
    assert row["expected_kg"] == 3000 and row["harvested_kg"] == 0 and row["season_total_kg"] == 3000
    assert row["previous_season"] == "2025-pluie-1" and row["previous_harvest_kg"] == 2000
    assert row["change_pct"] == 50.0 and row["yield_source"] == "demonstration" and row["masked"] is False
    # hors du personnel, moins de 5 producteurs : la cellule est masquée, même le nombre de producteurs
    masked = client_for(users["transf"]).get("/api/v1/market-analysis?value_chain=mais").json()["supply"][0]
    assert masked["masked"] is True and masked["expected_kg"] is None and masked["producers"] is None
    assert masked["change_pct"] is None
    # l'agent d'un autre département ne voit pas cette zone, et ne peut pas en désigner une autre
    other = client_for(users["agent_zou"]).get("/api/v1/market-analysis?value_chain=mais&department=alibori").json()
    assert other["supply"] == [] and other["department"] == "zou"
    assert client_for(producer.user).get("/api/v1/market-analysis?value_chain=mais").status_code == 403
    assert client_for(users["admin"]).get("/api/v1/market-analysis").status_code == 400
