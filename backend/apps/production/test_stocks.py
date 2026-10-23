import itertools
from datetime import timedelta
from io import StringIO

from django.core.management import call_command
from django.utils import timezone

from apps.alerts.models import Notification
from apps.production import stocks
from apps.production.models import Lot, Site
from conftest import client_for, make_user

_n = itertools.count(1)
URL = "/api/v1/stocks/outlook"


def _lot(holder, product, kg, *, status="en_stock", age=10, site=None, chain="mais", parents=()):
    lot = Lot.objects.create(code=f"LOT-{next(_n):06d}", value_chain=chain, product=product, quantity_kg=kg,
                             status=status, holder=holder, site=site, created_by=holder)
    Lot.objects.filter(pk=lot.pk).update(created_at=timezone.now() - timedelta(days=age))
    if parents:
        lot.parents.add(*parents)
    return lot


def _sold(seller, buyer, product, sold_kg, left_kg, *, age, sold_ago, chain="mais", site=None):
    """Le vendeur garde `left_kg` et remet `sold_kg` à l'acheteur (un lot enfant naît chez lui)."""
    if left_kg:
        _lot(seller, product, left_kg, age=age, chain=chain, site=site)
    parent = _lot(seller, product, 0, status="transfere", age=age, chain=chain, site=site)
    _lot(buyer, product, sold_kg, age=sold_ago, chain=chain, parents=[parent])


def _scenario(users):
    t, d = users["transf"], users["distrib"]
    _sold(t, d, "maïs grain", 600, 300, age=25, sold_ago=3)  # 24 kg/jour sur 25 jours, 300 kg : 12,5 jours
    _sold(t, d, "farine de maïs", 300, 50, age=10, sold_ago=2)  # 30 kg/jour, 50 kg : moins de 2 jours
    _sold(t, d, "gari", 100, 0, age=12, sold_ago=1, chain="manioc")  # plus rien, alors que ça sortait
    _sold(t, d, "soja grain", 30, 5000, age=40, sold_ago=5, chain="soja")  # 1 kg/jour, 5000 kg
    _lot(t, "niébé", 400, age=5, chain="niebe")  # aucune sortie observée
    _sold(t, d, "manioc frais", 80, 10, age=60, sold_ago=45, chain="manioc")  # sortie hors de la période de 30 jours


def test_levels_and_days_of_cover_per_product(users):
    _scenario(users)
    r = client_for(users["transf"]).get(URL).json()
    assert r["scope"] == "mine" and r["window_days"] == 30 and r["thresholds"] == {"critical_days": 7, "low_days": 15}
    assert r["summary"] == {"rupture": 1, "critique": 1, "bas": 1, "ok": 1, "non_calculable": 2}
    by = {x["product"]: x for x in r["results"]}
    assert [x["product"] for x in r["results"]] == ["gari", "farine de maïs", "maïs grain", "soja grain",
                                                    "manioc frais", "niébé"]  # le plus urgent d'abord
    assert by["maïs grain"] | {"site": None} == {
        "value_chain": "mais", "product": "maïs grain", "site": None, "site_name": None, "department": "borgou",
        "stock_kg": 300.0, "outflow_kg": 600.0, "observed_days": 25, "daily_outflow_kg": 24.0, "days_cover": 12.5,
        "level": "bas"}
    assert (by["farine de maïs"]["level"], by["farine de maïs"]["days_cover"]) == ("critique", 1.7)
    assert (by["gari"]["level"], by["gari"]["stock_kg"], by["gari"]["days_cover"]) == ("rupture", 0.0, 0.0)
    assert (by["soja grain"]["level"], by["soja grain"]["days_cover"]) == ("ok", 5000.0)
    # sans sortie observée : jamais une couverture infinie présentée comme bonne nouvelle
    for p in ("niébé", "manioc frais"):
        assert (by[p]["level"], by[p]["days_cover"], by[p]["daily_outflow_kg"]) == ("non_calculable", None, 0.0)
    assert "holder" not in by["gari"] and "_daily" not in by["gari"]


def test_thresholds():
    assert stocks.level(100, 0) == "non_calculable" and stocks.level(0, 0) == "non_calculable"
    assert stocks.level(0, 5) == "rupture"
    assert stocks.level(34, 5) == "critique" and stocks.level(35, 5) == "bas"  # 7 jours de couverture
    assert stocks.level(74, 5) == "bas" and stocks.level(75, 5) == "ok"  # 15 jours


def test_a_transformation_consumes_its_parent_lots(users):
    t = users["transf"]
    maize = _lot(t, "maïs grain", 200, status="transforme", age=10)  # le lot parent garde sa quantité d'origine
    _lot(t, "farine de maïs", 150, age=2, parents=[maize])
    by = {x["product"]: x for x in client_for(t).get(URL).json()["results"]}
    assert (by["maïs grain"]["level"], by["maïs grain"]["outflow_kg"], by["maïs grain"]["stock_kg"]) == (
        "rupture", 200.0, 0.0)
    assert (by["farine de maïs"]["level"], by["farine de maïs"]["stock_kg"]) == ("non_calculable", 150.0)


def test_a_site_has_its_own_stock(users):
    t = users["transf"]
    plant = Site.objects.create(owner=t, kind="unite_transformation", name="Unité de Parakou", department="borgou",
                                lat=9.3, lon=2.6)
    shop = Site.objects.create(owner=t, kind="magasin", name="Magasin de Nikki", department="borgou", lat=9.9, lon=3.2)
    _sold(t, users["distrib"], "maïs grain", 300, 100, age=20, sold_ago=2, site=plant)  # 15 kg/jour : 6,7 jours
    _lot(t, "maïs grain", 5000, age=20, site=shop)
    rows = client_for(t).get(URL).json()["results"]
    assert [(x["site_name"], x["level"]) for x in rows] == [("Unité de Parakou", "critique"),
                                                            ("Magasin de Nikki", "non_calculable")]


def test_staff_see_an_aggregate_by_department_and_chain_without_identities(users, producer):
    t, t2 = users["transf"], make_user("0196000060", "transformateur", "borgou")
    _sold(t, users["distrib"], "maïs grain", 300, 0, age=20, sold_ago=2)  # en rupture
    _sold(t2, users["distrib"], "maïs grain", 30, 10000, age=20, sold_ago=2)  # largement couvert
    _lot(users["gest"], "maïs grain", 100, age=5)  # Alibori, pas de sortie
    rows = {(x["department"], x["value_chain"]): x for x in client_for(users["admin"]).get(URL).json()["results"]}
    assert rows[("borgou", "mais")] == {
        "department": "borgou", "value_chain": "mais", "holders": 2, "groups": 2, "at_risk_holders": 1,
        "stock_kg": 10000.0, "outflow_kg": 330.0, "daily_outflow_kg": 16.5, "days_cover": 606.1, "level": "ok"}
    assert rows[("alibori", "mais")]["level"] == "non_calculable" and rows[("alibori", "mais")]["days_cover"] is None
    r = client_for(users["resp"]).get(URL).json()
    assert r["scope"] == "aggregate" and len(r["results"]) == 3  # borgou, alibori et littoral (l'acheteur)
    assert not any(k in rows[("borgou", "mais")] for k in ("holder", "product", "site", "phone"))
    agent = client_for(users["agent"]).get(URL).json()["results"]  # son département seulement
    assert [(x["department"], x["value_chain"]) for x in agent] == [("alibori", "mais")]
    assert client_for(users["agent_zou"]).get(URL).json()["results"] == []
    assert client_for(users["distrib"]).get(URL).json()["scope"] == "mine"
    for denied in (client_for(users["auditeur"]), client_for(users["agronome"]), client_for(users["financier"])):
        assert denied.get(URL).status_code == 403
    assert client_for().get(URL).status_code == 401
    assert client_for(producer.user).get(URL).json() == {
        "scope": "mine", "window_days": 30, "thresholds": {"critical_days": 7, "low_days": 15},
        "summary": {"rupture": 0, "critique": 0, "bas": 0, "ok": 0, "non_calculable": 0}, "results": []}


def test_alerts_go_to_holders_once_a_week_per_product(users):
    _scenario(users)
    t = users["transf"]
    assert stocks.alert_holders() == 2  # gari (rupture) et farine de maïs (critique) ; ni « bas » ni « ok »
    sent = {n.title: n.body for n in Notification.objects.filter(user=t, channel="in_app")}
    assert set(sent) == {"Rupture de stock", "Stock critique"}
    assert "plus de stock de « gari »" in sent["Rupture de stock"] and "100 kg" in sent["Rupture de stock"]
    assert "« farine de maïs »" in sent["Stock critique"] and "environ 1,7 jours" in sent["Stock critique"]
    assert not Notification.objects.filter(user=users["distrib"]).exists()  # l'acheteur n'a pas de stock en alerte
    assert stocks.alert_holders() == 0  # déjà prévenu cette semaine
    assert stocks.alert_holders(now=timezone.now() + timedelta(days=8)) == 2  # la semaine suivante, on relance
    out = StringIO()
    call_command("check_stock_alerts", stdout=out)
    assert out.getvalue().strip() == "0 alerte(s) de stock envoyée(s)"
