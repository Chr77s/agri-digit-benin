from datetime import date, timedelta

from django.utils import timezone

from apps.lands import climate
from apps.parcels.models import Campaign, Parcel
from conftest import client_for

GEO = {"type": "Polygon", "coordinates": [[[2.43, 11.3], [2.44, 11.3], [2.44, 11.31], [2.43, 11.3]]]}
SCHEME = {"name": "Bas-fond de Founougo", "kind": "bas_fond", "department": "alibori", "commune": "banikoara",
          "area_available_ha": 120, "area_arable_ha": 90, "area_used_ha": 40}


def _parcel(producer, **extra):
    return Parcel.objects.create(producer=producer, name="Champ 1", department="alibori", geometry=GEO,
                                 land_type="pluvial_plateau", tenure="coutumier", area_ha=4.0, **extra)


def test_scheme_areas_are_checked_and_scoped_to_the_zone(users):
    agent, admin = client_for(users["agent"]), client_for(users["admin"])
    too_much = {**SCHEME, "area_used_ha": 100}  # plus que l'exploitable
    assert agent.post("/api/v1/schemes", too_much, format="json").status_code == 400
    assert agent.post("/api/v1/schemes", {**SCHEME, "department": "zou"}, format="json").status_code == 403
    r = agent.post("/api/v1/schemes", SCHEME, format="json")
    assert r.status_code == 201 and r.json()["status"] == "operationnel"
    sid = r.json()["id"]
    assert client_for(users["transf"]).post("/api/v1/schemes", SCHEME, format="json").status_code == 403
    assert [s["id"] for s in agent.get("/api/v1/schemes").json()["results"]] == [sid]
    assert client_for(users["agent_zou"]).get("/api/v1/schemes").json()["results"] == []  # public dans le département
    assert [s["id"] for s in admin.get("/api/v1/schemes").json()["results"]] == [sid]
    assert agent.patch(f"/api/v1/schemes/{sid}", {"area_arable_ha": 200}, format="json").status_code == 400
    assert agent.patch(f"/api/v1/schemes/{sid}", {"area_used_ha": 60}, format="json").json()["area_used_ha"] == 60
    assert client_for(users["agent_zou"]).patch(f"/api/v1/schemes/{sid}", {"area_used_ha": 1}, format="json") \
        .status_code == 404


def test_rehabilitation_works_drive_the_scheme_status(users):
    agent = client_for(users["agent"])
    sid = agent.post("/api/v1/schemes", SCHEME, format="json").json()["id"]
    works = agent.post(f"/api/v1/schemes/{sid}/works", {"type": "rehabilitation", "title": "Curage des canaux",
                                                        "cost_xof": 8_000_000}, format="json")
    assert works.status_code == 201 and works.json()["status"] == "planifie"
    wid = works.json()["id"]
    status = lambda: agent.get("/api/v1/schemes").json()["results"][0]["status"]  # noqa: E731
    assert status() == "a_rehabiliter"
    assert agent.patch(f"/api/v1/works/{wid}", {"status": "termine"}, format="json").status_code == 400  # pas démarrés
    assert agent.patch(f"/api/v1/works/{wid}", {"status": "en_cours", "progress_pct": 40}, format="json") \
        .json()["started_on"] == str(timezone.localdate())
    assert status() == "en_travaux"
    assert agent.patch(f"/api/v1/schemes/{sid}", {"status": "operationnel"}, format="json").status_code == 409
    done = agent.patch(f"/api/v1/works/{wid}", {"status": "termine"}, format="json").json()
    assert done["progress_pct"] == 100 and done["finished_on"] and status() == "operationnel"
    assert agent.patch(f"/api/v1/works/{wid}", {"notes": "x"}, format="json").status_code == 400  # clos
    # un nouvel aménagement ne se fait que sur un projet ; l'entretien ne change pas l'état
    assert agent.post(f"/api/v1/schemes/{sid}/works", {"type": "nouvel_amenagement", "title": "Extension"},
                      format="json").status_code == 400
    upkeep = agent.post(f"/api/v1/schemes/{sid}/works", {"type": "entretien", "title": "Désherbage des canaux"},
                        format="json").json()["id"]
    agent.patch(f"/api/v1/works/{upkeep}", {"status": "en_cours"}, format="json")
    assert status() == "operationnel"
    proj = agent.post("/api/v1/schemes", {**SCHEME, "name": "Nouveau périmètre", "status": "projet", "area_used_ha": 0},
                      format="json").json()["id"]
    new = agent.post(f"/api/v1/schemes/{proj}/works", {"type": "nouvel_amenagement", "title": "Construction"},
                     format="json").json()["id"]
    agent.patch(f"/api/v1/works/{new}", {"status": "en_cours"}, format="json")
    agent.patch(f"/api/v1/works/{new}", {"status": "abandonne"}, format="json")
    assert {s["id"]: s["status"] for s in agent.get("/api/v1/schemes").json()["results"]}[proj] == "projet"
    assert client_for(users["agent_zou"]).patch(f"/api/v1/works/{wid}", {"notes": "x"}, format="json") \
        .status_code == 404


def test_land_use_counts_available_arable_and_used_surfaces(users, producer):
    p = _parcel(producer)
    Campaign.objects.create(parcel=p, value_chain="mais", season="2026-pluie-1", stage="croissance")
    Parcel.objects.create(producer=producer, name="Bas-fond", department="alibori", geometry=GEO,
                                  land_type="bas_fond", tenure="pret", area_ha=2.0)
    prod, agent = client_for(producer.user), client_for(users["agent"])
    assert prod.patch(f"/api/v1/parcels/{p.id}", {"arable_ha": 5}, format="json").status_code == 400  # > mesurée
    assert prod.patch(f"/api/v1/parcels/{p.id}", {"arable_ha": 3.5}, format="json").json()["arable_ha"] == 3.5
    lu = agent.get("/api/v1/land-use").json()
    rows = {r["land_type"]: r for r in lu["parcels"]}
    assert lu["season"] == "2026-pluie-1"
    assert rows["pluvial_plateau"]["available_ha"] == 4.0 and rows["pluvial_plateau"]["arable_ha"] == 3.5
    assert rows["pluvial_plateau"]["used_ha"] == 3.5  # porte une campagne de la saison
    assert rows["bas_fond"]["arable_ha"] == 2.0 and rows["bas_fond"]["used_ha"] == 0  # sans déclaration
    agent.post("/api/v1/schemes", SCHEME, format="json")
    assert agent.get("/api/v1/land-use").json()["schemes"] == [
        {"kind": "bas_fond", "count": 1, "available_ha": 120.0, "arable_ha": 90.0, "used_ha": 40.0}]
    assert client_for(users["agent_zou"]).get("/api/v1/land-use").json()["parcels"] == []
    assert prod.get("/api/v1/land-use").status_code == 403


def test_soil_analysis_is_interpreted_without_any_dose(users, producer):
    p = _parcel(producer)
    agent, prod = client_for(users["agent"]), client_for(producer.user)
    body = {"parcel": str(p.id), "sampled_on": "2026-09-01", "laboratory": "Laboratoire de Parakou", "ph": 4.8,
            "organic_matter_pct": 1.4, "phosphorus_ppm": 6, "texture": "sableux"}
    assert prod.post("/api/v1/soil-analyses", body, format="json").status_code == 403  # saisie réservée à l'agent
    assert agent.post("/api/v1/soil-analyses", {**body, "sampled_on": str(timezone.localdate() + timedelta(days=2))},
                      format="json").status_code == 400
    assert agent.post("/api/v1/soil-analyses", {**body, "ph": 12}, format="json").status_code == 400
    r = agent.post("/api/v1/soil-analyses", body, format="json")
    assert r.status_code == 201
    levels = {f["code"]: f["level"] for f in r.json()["findings"]}
    assert levels == {"ph": "alerte", "organic_matter": "attention", "phosphorus": "alerte", "texture": "attention"}
    assert not any(ch.isdigit() for f in r.json()["findings"] for ch in f["text"])  # jamais de dose chiffrée
    assert "INRAB" in r.json()["reference"]
    assert [a["ph"] for a in prod.get("/api/v1/soil-analyses").json()["results"]] == [4.8]
    assert client_for(users["agent_zou"]).get("/api/v1/soil-analyses").json()["results"] == []
    s = agent.get("/api/v1/soil-analyses/summary").json()["results"]
    assert s == [{"department": "alibori", "analyses": 1, "ph_mean": 4.8, "acid_share": 1.0,
                  "low_organic_share": 1.0, "low_phosphorus_share": 1.0}]
    assert prod.get("/api/v1/soil-analyses/summary").status_code == 403


def _series(rain, et0=5.0, ahead=None, today=date(2026, 10, 20)):
    """14 jours passés (pluie `rain` par jour) puis 7 jours à venir (liste `ahead`)."""
    rain = rain if isinstance(rain, list) else [rain] * 14
    past = [{"date": (today - timedelta(days=14 - i)).isoformat(), "rain_mm": rain[i], "et0_mm": et0}
            for i in range(14)]
    ahead = ahead or [0.0] * 7
    return past + [{"date": (today + timedelta(days=i)).isoformat(), "rain_mm": ahead[i], "et0_mm": et0}
                   for i in range(7)]


def test_risk_model_flags_drought_water_stress_and_floods():
    today = date(2026, 10, 20)
    dry = climate.assess(_series(0.0), today, "floraison")
    assert dry["risks"]["stress_hydrique"]["level"] == "eleve" and dry["risks"]["secheresse"]["level"] == "eleve"
    assert dry["risks"]["secheresse"]["dry_days"] == 14 and len(dry["advice"]) == 2
    assert dry["risks"]["inondation"]["level"] == "faible"
    # 10 mm annoncés dans les 3 jours : on retire 3 jours secs (12 jours secs restent « élevé », 10 − 3 = « moyen »)
    short = climate.assess(_series([5.0] * 2 + [0.0] * 12), today)
    assert short["risks"]["secheresse"]["level"] == "eleve"
    relief = climate.assess(_series([5.0] * 4 + [0.0] * 10, ahead=[12.0, 0, 0, 0, 0, 0, 0]), today)
    assert relief["risks"]["secheresse"]["dry_days"] == 10 and relief["risks"]["secheresse"]["level"] == "moyen"
    wet = climate.assess(_series(8.0, ahead=[40.0, 30.0, 20.0, 0, 0, 0, 0]), today)
    assert wet["risks"]["inondation"] == {"level": "eleve", "max_3d_mm": 90.0}  # 90 mm en 3 jours
    assert wet["risks"]["stress_hydrique"]["level"] == "faible" and wet["advice"] == [climate.ADVICE["inondation"]]
    lowland = climate.assess(_series(8.0, ahead=[25.0, 15.0, 0, 0, 0, 0, 0]), today, land_type="bas_fond")
    plateau = climate.assess(_series(8.0, ahead=[25.0, 15.0, 0, 0, 0, 0, 0]), today, land_type="pluvial_plateau")
    assert lowland["risks"]["inondation"]["level"] == "moyen" and plateau["risks"]["inondation"]["level"] == "faible"


def test_climate_endpoints_use_the_demo_series_offline(users, producer):
    p = _parcel(producer)
    Campaign.objects.create(parcel=p, value_chain="mais", season="2026-pluie-1", stage="floraison")
    r = client_for(producer.user).get("/api/v1/climate-risks").json()["results"]
    assert r[0]["parcel"] == str(p.id) and r[0]["simulated"] is True and r[0]["stage"] == "floraison"
    assert set(r[0]["risks"]) == {"stress_hydrique", "secheresse", "inondation"}
    assert client_for(users["agent"]).get("/api/v1/climate-risks").status_code == 404  # producteur à désigner
    assert len(client_for(users["agent"]).get(f"/api/v1/climate-risks?producer={producer.id}").json()["results"]) == 1
    assert client_for(users["agent_zou"]).get(f"/api/v1/climate-risks?producer={producer.id}").status_code == 404
    deps = client_for(users["admin"]).get("/api/v1/climate-risks/departments").json()["results"]
    assert len(deps) == 12 and {d["department"]: d["parcels"] for d in deps}["alibori"] == 1
    mine = client_for(users["agent"]).get("/api/v1/climate-risks/departments").json()["results"]
    assert [d["department"] for d in mine] == ["alibori"]
    assert client_for(producer.user).get("/api/v1/climate-risks/departments").status_code == 403
