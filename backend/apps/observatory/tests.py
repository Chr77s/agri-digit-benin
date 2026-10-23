import json
from datetime import date

from apps.audit.models import AuditLog
from apps.cooperatives.models import Cooperative, Organisation
from apps.lands.models import Scheme
from apps.observatory import actors_map
from apps.observatory.models import NationalStat
from apps.observatory.testkit import make_harvest, make_producer
from apps.production.models import Site
from apps.referentiel.models import Department
from conftest import client_for

URL, IMPORT, MAP = "/api/v1/national-coverage", "/api/v1/national-coverage/import", "/api/v1/map/actors"
SRC = "Annuaire statistique du MAEP, 2025"


def _row(year, production, consumption, imports=None, vc="riz", source=SRC, **extra):
    return {"value_chain": vc, "year": year, "production_t": production, "consumption_t": consumption,
            "imports_t": imports, "source": source, **extra}


def test_coverage_ratios_trends_and_watch_alerts(users):
    admin = client_for(users["admin"])
    for r in (_row(2023, 100_000, 150_000, 50_000), _row(2024, 120_000, 160_000, 40_000),
              _row(2025, 90_000, 170_000, 60_000)):  # 2025 : production -25 %, importations +50 %, couverture 52,9 %
        assert admin.post(URL, r, format="json").status_code == 201
    out = admin.get(URL).json()
    assert out["thresholds"] == {"coverage_min_pct": 80, "imports_rise_pct": 20, "production_drop_pct": 15}
    riz = out["chains"][0]
    assert riz["value_chain"] == "riz" and [r["year"] for r in riz["series"]] == [2023, 2024, 2025]
    first, last = riz["series"][0], riz["latest"]
    assert first["coverage_pct"] == 66.7 and first["production_change_pct"] is None  # pas d'année précédente
    assert last["coverage_pct"] == 52.9 and last["import_dependency_pct"] == 35.3
    assert last["production_change_pct"] == -25.0 and last["imports_change_pct"] == 50.0
    assert last["coverage_change_pts"] == round(52.9 - 75.0, 1) and last["exports_t"] is None  # pas de zéro inventé
    assert {a["kind"] for a in out["alerts"]} == {"couverture_faible", "importations_en_hausse", "production_en_baisse"}
    assert all(a["year"] == 2025 and a["source"] == SRC and a["demo"] is False for a in out["alerts"])


def test_no_variation_without_the_previous_year_and_no_alert_when_fine(users):
    admin = client_for(users["admin"])
    admin.post(URL, _row(2022, 100, 100, 10, vc="mais"), format="json")
    admin.post(URL, _row(2025, 40, 60, 90, vc="mais"), format="json")  # trou de deux ans : aucune variation
    latest = admin.get(URL + "?value_chain=mais").json()["chains"][0]["latest"]
    assert latest["production_change_pct"] is None and latest["imports_change_pct"] is None
    # production -60 % et importations x9 depuis 2022, mais sans l'année précédente seule la couverture alerte
    assert [a["kind"] for a in admin.get(URL).json()["alerts"]] == ["couverture_faible"]
    admin.post(URL, _row(2025, 90, 100, 90, vc="mais"), format="json")  # 90 % : plus d'alerte, ligne remplacée
    assert NationalStat.objects.count() == 2 and admin.get(URL).json()["alerts"] == []


def test_demo_rows_are_flagged_and_a_value_may_be_missing(users):
    admin = client_for(users["admin"])
    r = admin.post(URL, _row(2025, 100, None, source=NationalStat.DEMO_SOURCE), format="json")
    assert r.status_code == 201
    row = r.json()["chains"][0]["latest"]
    assert row["demo"] is True and row["coverage_pct"] is None and row["import_dependency_pct"] is None
    assert r.json()["demo_source"] == NationalStat.DEMO_SOURCE


def test_entry_is_validated_and_restricted(users):
    admin, resp = client_for(users["admin"]), client_for(users["resp"])
    assert admin.post(URL, _row(2025, 1, 1, source=""), format="json").status_code == 400  # source obligatoire
    assert admin.post(URL, {k: v for k, v in _row(2025, 1, 1).items() if k != "source"}, format="json") \
        .status_code == 400
    assert admin.post(URL, _row(2025, -1, 1), format="json").status_code == 400
    assert admin.post(URL, _row(date.today().year + 1, 1, 1), format="json").status_code == 400
    assert admin.post(URL, _row(2025, None, None), format="json").status_code == 400  # aucune valeur
    assert admin.post(URL, _row(2025, 1, 1, vc="licorne"), format="json").status_code == 400
    assert resp.post(URL, _row(2025, 1, 1), format="json").status_code == 201
    for who in ("agent", "auditeur"):  # lecture seule
        assert client_for(users[who]).get(URL).status_code == 200
        assert client_for(users[who]).post(URL, _row(2025, 1, 1), format="json").status_code == 403
    for who in ("transf", "agronome", "financier"):
        assert client_for(users[who]).get(URL).status_code == 403
    assert AuditLog.objects.filter(action="national_stat.save").count() == 1


def test_batch_import_is_all_or_nothing(users):
    admin = client_for(users["admin"])
    good = [_row(2024, 10, 20), _row(2025, 12, 20), _row(2025, 5, 9, vc="mais")]
    r = admin.post(IMPORT, {"rows": good}, format="json")
    assert r.status_code == 201 and r.json()["imported"] == 3 and NationalStat.objects.count() == 3
    bad = [_row(2023, 10, 20), _row(2022, 10, 20, source="")]
    r = admin.post(IMPORT, {"rows": bad}, format="json")
    assert r.status_code == 400 and r.json()["fields"]["rows"][1]["source"] and not r.json()["fields"]["rows"][0]
    assert NationalStat.objects.count() == 3  # rien n'a été enregistré
    assert admin.post(IMPORT, {"rows": [_row(2023, 1, 1), _row(2023, 2, 2)]}, format="json").status_code == 400
    assert admin.post(IMPORT, {"rows": []}, format="json").status_code == 400
    assert admin.post(IMPORT, {"rows": "x"}, format="json").status_code == 400
    assert client_for(users["agent"]).post(IMPORT, {"rows": good}, format="json").status_code == 403
    assert AuditLog.objects.filter(action="national_stat.import").count() == 1


def test_a_row_can_be_deleted_by_the_administration_only(users):
    admin = client_for(users["admin"])
    sid = admin.post(URL, _row(2025, 1, 1), format="json").json()["chains"][0]["latest"]["id"]
    assert client_for(users["agent"]).delete(f"{URL}/{sid}").status_code == 403
    assert admin.delete(f"{URL}/{sid}").status_code == 204 and NationalStat.objects.count() == 0
    assert admin.delete(f"{URL}/{sid}").status_code == 404


# ---------- carte des acteurs ----------

def _world(users, producer):
    gest = users["gest"]
    Site.objects.create(owner=gest, kind="magasin", name="Magasin de Kandi", department="alibori", commune="kandi",
                        lat=11.134, lon=2.938, capacity_t=200)
    Site.objects.create(owner=gest, kind="point_vente", name="Point de vente de Zogbodomey", department="zou",
                        lat=7.1, lon=2.1)
    Scheme.objects.create(name="Bas-fond de Founougo", kind="bas_fond", department="alibori", lat=11.3, lon=2.4,
                          area_available_ha=120, area_arable_ha=90)
    Scheme.objects.create(name="Sans position", kind="plateau", department="alibori", area_available_ha=10,
                          area_arable_ha=5)
    Cooperative.objects.create(name="Coopérative maïs de Banikoara", department="alibori", commune="banikoara",
                               value_chains=["mais"], manager=gest)
    Cooperative.objects.create(name="Coopérative anacarde de Savalou", department="zou", commune="savalou",
                               value_chains=["anacarde"])
    Organisation.objects.create(name="Union des producteurs de maïs", kind="union", value_chains=["mais"],
                                department="alibori")
    Organisation.objects.create(name="Interprofession nationale du riz", kind="interprofession", value_chains=["riz"])
    make_harvest(producer, chain="mais")


def _layers(data):
    return {f["properties"]["layer"] for f in data["features"]}


def test_map_offers_layers_without_any_personal_data(users, producer):
    _world(users, producer)
    r = client_for(users["admin"]).get(MAP)
    data = r.json()
    assert r.status_code == 200 and data["type"] == "FeatureCollection"
    assert _layers(data) == {"sites", "schemes", "organisations", "cooperatives", "parcels"}
    assert [layer["id"] for layer in data["layers"]] == ["sites", "schemes", "organisations", "cooperatives", "parcels",
                                                         "pmea", "equipment"]  # les deux dernières : apps/farmservices
    text = json.dumps(data, ensure_ascii=False)
    for secret in (producer.phone, producer.last_name, producer.first_name, producer.npi, users["gest"].phone):
        assert secret not in text
    parcel = next(f for f in data["features"] if f["properties"]["layer"] == "parcels")["properties"]
    assert parcel["producer"] == producer.code and parcel["value_chains"] == ["mais"] and "name" not in parcel
    meta = {layer["id"]: layer for layer in data["layers"]}
    assert meta["schemes"]["count"] == 1 and meta["sites"]["count"] == 2  # l'aménagement sans position est omis
    assert meta["organisations"]["not_placed"] == 1 and meta["organisations"]["count"] == 1  # nationale : pas de point
    assert meta["sites"]["chain_filter"] is False and meta["cooperatives"]["chain_filter"] is True


def test_organisations_and_cooperatives_sit_at_the_department_centre(users, producer):
    _world(users, producer)
    feats = client_for(users["admin"]).get(MAP + "?layers=cooperatives").json()["features"]
    assert {f["properties"]["department"] for f in feats} == {"alibori", "zou"}
    for f in feats:
        d = Department.objects.get(code=f["properties"]["department"])
        assert f["geometry"]["coordinates"] == [round(d.lon, 5), round(d.lat, 5)]
        assert f["properties"]["precision"] == "departement" and f["properties"]["count"] == 1
    assert {f["properties"]["layer"] for f in feats} == {"cooperatives"}


def test_map_filters_by_value_chain_and_department(users, producer):
    _world(users, producer)
    admin = client_for(users["admin"])
    mais = admin.get(MAP + "?value_chain=mais").json()
    coops = [f["properties"]["names"] for f in mais["features"] if f["properties"]["layer"] == "cooperatives"]
    assert coops == [["Coopérative maïs de Banikoara"]]
    sites = [f for f in mais["features"] if f["properties"]["layer"] == "sites"]
    assert len(sites) == 2  # les sites n'ont pas de filière : le filtre est sans effet
    riz = admin.get(MAP + "?value_chain=riz").json()
    assert "parcels" not in _layers(riz) and "cooperatives" not in _layers(riz)
    zou = admin.get(MAP + "?department=zou").json()
    assert {f["properties"]["name"] for f in zou["features"] if f["properties"]["layer"] == "sites"} \
        == {"Point de vente de Zogbodomey"}
    assert admin.get(MAP + "?layers=nope").status_code == 400


def test_map_parcels_are_for_staff_in_their_scope_only(users, producer):
    _world(users, producer)
    assert "parcels" in _layers(client_for(users["agent"]).get(MAP).json())
    # aucune parcelle dans le périmètre de l'agent de Zou
    assert "parcels" not in _layers(client_for(users["agent_zou"]).get(MAP).json())
    for who in ("resp", "auditeur", "transf", "distrib", "gest", "agronome"):
        data = client_for(users[who]).get(MAP).json()
        assert "parcels" not in _layers(data) and "parcels" not in {layer["id"] for layer in data["layers"]}
    mine = client_for(producer.user).get(MAP).json()  # le producteur reste dans son département
    assert producer.user.department == "alibori" and mine["filters"]["department"] == "alibori"
    assert client_for().get(MAP).status_code == 401


def test_agent_stays_in_his_department(users, producer):
    _world(users, producer)
    data = client_for(users["agent_zou"]).get(MAP + "?department=alibori").json()
    assert data["filters"]["department"] == "zou"
    assert {f["properties"]["department"] for f in data["features"]} == {"zou"}


def test_another_app_can_register_a_layer(users):
    actors_map.register("essai", "Couche d'essai", lambda u, d, v: [actors_map.feature("essai", 2.4, 6.4, id="x")])
    try:
        data = client_for(users["admin"]).get(MAP + "?layers=essai").json()
        assert [f["properties"]["layer"] for f in data["features"]] == ["essai"]
        assert [layer["id"] for layer in data["layers"]][-1] == "essai"
    finally:
        actors_map.LAYERS.pop("essai")


def test_producers_are_never_exposed_by_a_cluster(users):
    p = make_producer()
    Cooperative.objects.create(name="Coop", department="alibori", commune="x", value_chains=["mais"])
    text = json.dumps(client_for(users["admin"]).get(MAP).json())
    assert p.code not in text and p.phone not in text


def test_demo_seed_is_flagged_idempotent_and_never_overwrites_real_figures(users):
    from apps.accounts.management.commands.seed_demo import Command

    NationalStat.objects.create(value_chain="riz", year=2025, production_t=1.0, source=SRC)  # saisie réelle
    for _ in range(2):
        Command()._national_stats()
    assert NationalStat.objects.count() == 8 and NationalStat.objects.get(value_chain="riz", year=2025).source == SRC
    out = client_for(users["auditeur"]).get(URL).json()
    mais = next(c for c in out["chains"] if c["value_chain"] == "mais")
    assert all(r["demo"] and r["source"] == NationalStat.DEMO_SOURCE for r in mais["series"])
    soja = next(c for c in out["chains"] if c["value_chain"] == "soja")
    assert soja["latest"]["coverage_pct"] == 63.4 and soja["latest"]["demo"] is True
    assert ("soja", "couverture_faible") in {(a["value_chain"], a["kind"]) for a in out["alerts"]}
