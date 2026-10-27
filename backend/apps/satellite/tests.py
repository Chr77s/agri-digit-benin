import httpx
import pytest

from conftest import client_for

DAILY = {"daily": {"time": ["2026-10-20", "2026-10-21"], "temperature_2m_max": [34.9, 33.2],
                   "temperature_2m_min": [24.7, 22.7], "precipitation_sum": [0.0, 12.4],
                   "precipitation_probability_max": [0, 80]}}


def test_weather_comes_from_the_open_source_with_its_label(producer, settings, monkeypatch):
    settings.WEATHER_BACKEND = "open-meteo"
    seen = {}

    def fake_get(url, params, **kw):
        seen.update(params)
        return httpx.Response(200, json=DAILY, request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx, "get", fake_get)
    w = client_for(producer.user).get("/api/v1/weather").json()
    assert w["simulated"] is False and w["source"].startswith("Open-Meteo") and w["updated_at"]
    assert w["days"][1] == {"date": "2026-10-21", "tmax": 33, "tmin": 23, "rain_mm": 12, "rain_pct": 80}
    assert seen["timezone"] == "Africa/Porto-Novo" and seen["forecast_days"] == 7


def test_weather_falls_back_to_labelled_demo_when_the_service_is_down(producer, settings, monkeypatch):
    settings.WEATHER_BACKEND = "open-meteo"

    def down(*a, **kw):
        raise httpx.ConnectError("hors ligne")

    monkeypatch.setattr(httpx, "get", down)
    w = client_for(producer.user).get("/api/v1/weather").json()
    assert w["simulated"] is True and w["source"].startswith("Démonstration") and len(w["days"]) == 7


def test_observation_is_unique_per_zone_and_period(db):
    from datetime import date

    from django.db import IntegrityError, transaction

    from apps.satellite.models import SatelliteObservation

    kw = dict(zone_kind="department", zone_code="alibori", period_start=date(2026, 9, 1),
              period_end=date(2026, 9, 10), ndvi=0.5, ndmi=0.2, valid_pct=90.0)
    SatelliteObservation.objects.create(**kw)
    with pytest.raises(IntegrityError), transaction.atomic():
        SatelliteObservation.objects.create(**kw)
    SatelliteObservation.objects.create(**{**kw, "period_start": date(2026, 9, 11), "period_end": date(2026, 9, 20)})


def test_zones_cover_the_12_departments(db):
    from shapely.geometry import shape

    from apps.referentiel.models import Department
    from apps.referentiel.zones import department_features

    feats = department_features()
    assert {f["properties"]["code"] for f in feats} == set(Department.objects.values_list("code", flat=True))
    assert len(feats) == 12 and all(shape(f["geometry"]).is_valid for f in feats)


def test_unknown_department_raises_keyerror():
    from apps.referentiel.zones import department_geometry

    with pytest.raises(KeyError):
        department_geometry("atlantide")


# ---------- client Copernicus (réponses simulées, aucun appel réseau) ----------
from datetime import date  # noqa: E402

from integrations import copernicus  # noqa: E402

GEOM = {"type": "Polygon", "coordinates": [[[2.0, 11.0], [2.1, 11.0], [2.1, 11.1], [2.0, 11.1], [2.0, 11.0]]]}


def _stat(mean, n=100, nodata=20):
    return {"bands": {"B0": {"stats": {"mean": mean, "sampleCount": n, "noDataCount": nodata}}}}


def _interval(a, b, ndvi, ndmi, **kw):
    return {"interval": {"from": f"{a}T00:00:00Z", "to": f"{b}T00:00:00Z"},
            "outputs": {"ndvi": _stat(ndvi, **kw), "ndmi": _stat(ndmi, **kw)}}


STATS = {"status": "OK", "data": [
    _interval("2026-08-01", "2026-08-11", 0.61, 0.22),
    _interval("2026-08-11", "2026-08-21", "NaN", "NaN", nodata=100),
    _interval("2026-08-21", "2026-08-31", 0.5, 0.1, nodata=90),
]}


@pytest.fixture
def cdse(settings, monkeypatch):
    """Clés présentes, jeton remis à zéro, httpx.post remplacé. `calls` liste les URL appelées."""
    settings.CDSE_CLIENT_ID, settings.CDSE_CLIENT_SECRET = "id", "secret"
    copernicus._TOKEN.update(value=None, exp=0.0)
    box = {"calls": [], "bodies": [], "stats": STATS, "status": 200, "error": None}

    def fake_post(url, **kw):
        box["calls"].append(url)
        if box["error"]:
            raise box["error"]
        if url == settings.CDSE_TOKEN_URL:
            box["token_data"] = kw.get("data")
            return httpx.Response(200, json={"access_token": "tok", "expires_in": 600}, request=httpx.Request("POST", url))
        box["bodies"].append(kw["json"])
        if box.get("fail_geom") is not None and kw["json"]["input"]["bounds"]["geometry"] == box["fail_geom"]:
            raise httpx.ConnectError("zone en échec")
        return httpx.Response(box["status"], json=box["stats"], request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx, "post", fake_post)
    return box


def test_token_is_cached_until_expiry(cdse, settings):
    copernicus.series(GEOM, date(2026, 8, 1), date(2026, 8, 30), 0.003)
    copernicus.series(GEOM, date(2026, 8, 1), date(2026, 8, 30), 0.003)
    assert cdse["calls"].count(settings.CDSE_TOKEN_URL) == 1
    assert cdse["token_data"]["grant_type"] == "client_credentials"


def test_series_reads_ndvi_ndmi_and_valid_pct(cdse):
    pts = copernicus.series(GEOM, date(2026, 8, 1), date(2026, 8, 30), 0.003)
    assert pts[0] == {"from": date(2026, 8, 1), "to": date(2026, 8, 10), "ndvi": 0.61, "ndmi": 0.22, "valid_pct": 80.0}


def test_fully_masked_interval_gives_none(cdse):
    pts = copernicus.series(GEOM, date(2026, 8, 1), date(2026, 8, 30), 0.003)
    assert (pts[1]["ndvi"], pts[1]["ndmi"]) == (None, None)  # "NaN" : tout est masqué
    assert pts[2]["valid_pct"] == 10.0 and (pts[2]["ndvi"], pts[2]["ndmi"]) == (None, None)  # sous 20 % : trop nuageux


@pytest.mark.parametrize("status", [401, 429, 500])
def test_http_errors_become_copernicus_error(cdse, status):
    cdse["status"], cdse["stats"] = status, {"error": "x"}
    with pytest.raises(copernicus.CopernicusError):
        copernicus.series(GEOM, date(2026, 8, 1), date(2026, 8, 30), 0.003)


def test_network_failure_becomes_copernicus_error(cdse):
    cdse["error"] = httpx.ConnectError("hors ligne")
    with pytest.raises(copernicus.CopernicusError):
        copernicus.series(GEOM, date(2026, 8, 1), date(2026, 8, 30), 0.003)


def test_missing_keys_raise_copernicus_error(cdse, settings):
    settings.CDSE_CLIENT_ID = ""
    with pytest.raises(copernicus.CopernicusError, match="Clés"):
        copernicus.series(GEOM, date(2026, 8, 1), date(2026, 8, 30), 0.003)
    assert cdse["calls"] == []


def test_request_body(cdse):
    copernicus.series(GEOM, date(2026, 8, 1), date(2026, 8, 30), 0.003)
    b = cdse["bodies"][0]
    agg = b["aggregation"]
    assert agg["aggregationInterval"] == {"of": "P10D"} and agg["resx"] == agg["resy"] == 0.003
    assert agg["timeRange"] == {"from": "2026-08-01T00:00:00Z", "to": "2026-08-31T00:00:00Z"}
    assert b["input"]["data"][0] == {"type": "sentinel-2-l2a", "dataFilter": {"maxCloudCoverage": 80}}
    assert agg["evalscript"] == copernicus.EVALSCRIPT and "SCL" in copernicus.EVALSCRIPT
    assert b["input"]["bounds"]["geometry"] == GEOM


# ---------- services : périodes, cache, repli ----------
from datetime import timedelta  # noqa: E402

from apps.satellite import services  # noqa: E402
from apps.satellite.models import SatelliteObservation  # noqa: E402

TODAY = date(2026, 10, 27)
GEOM2 = {"type": "Polygon", "coordinates": [[[1.0, 7.0], [1.1, 7.0], [1.1, 7.1], [1.0, 7.1], [1.0, 7.0]]]}


def _payload(ps, ndvi=0.55):
    return {"status": "OK", "data": [{
        "interval": {"from": f"{a}T00:00:00Z", "to": f"{(b + timedelta(days=1)).isoformat()}T00:00:00Z"},
        "outputs": {"ndvi": _stat(ndvi), "ndmi": _stat(0.2)}} for a, b in ps]}


def test_periods_are_9_contiguous_complete_blocks():
    ps = services.periods(TODAY)
    assert len(ps) == 9 and ps[-1][1] < TODAY
    assert all(b - a == timedelta(days=9) for a, b in ps)
    assert all(ps[i + 1][0] == ps[i][1] + timedelta(days=1) for i in range(8))


def test_demo_mode_never_touches_the_network(monkeypatch):
    def boom(*a, **k):
        raise AssertionError("réseau interdit en démo")

    monkeypatch.setattr(httpx, "post", boom)
    a = services.zone_series("department", {"alibori": GEOM}, TODAY)
    b = services.zone_series("department", {"alibori": GEOM}, TODAY)
    assert a == b and a["alibori"]["simulated"] is True and len(a["alibori"]["points"]) == 9


def test_cdse_mode_fetches_stores_then_serves_from_cache(cdse, settings):
    settings.SATELLITE_BACKEND = "cdse"
    cdse["stats"] = _payload(services.periods(TODAY))
    stats_calls = lambda: cdse["calls"].count(settings.CDSE_STATS_URL)  # noqa: E731
    r = services.zone_series("department", {"alibori": GEOM, "zou": GEOM2}, TODAY)
    assert stats_calls() == 2 and SatelliteObservation.objects.count() == 18
    assert r["alibori"]["simulated"] is False and r["alibori"]["points"][-1]["ndvi"] == 0.55
    services.zone_series("department", {"alibori": GEOM, "zou": GEOM2}, TODAY)
    assert stats_calls() == 2


def _store(code, ps, ndvi, age_h):
    for a, b in ps:
        SatelliteObservation.objects.create(zone_kind="department", zone_code=code, period_start=a, period_end=b,
                                            ndvi=ndvi, ndmi=0.1, valid_pct=90.0)
    from django.utils import timezone
    SatelliteObservation.objects.filter(zone_code=code).update(fetched_at=timezone.now() - timedelta(hours=age_h))


def test_outage_serves_last_stored_and_does_not_hammer_copernicus(cdse, settings):
    settings.SATELLITE_BACKEND = "cdse"
    _store("alibori", services.periods(TODAY), 0.42, 25)
    cdse["error"] = httpx.ConnectError("hors ligne")
    r = services.zone_series("department", {"alibori": GEOM}, TODAY)
    assert r["alibori"]["simulated"] is False and r["alibori"]["points"][-1]["ndvi"] == 0.42
    n = len(cdse["calls"])
    services.zone_series("department", {"alibori": GEOM}, TODAY)
    assert len(cdse["calls"]) == n  # l'échec est mémorisé quelques minutes


def test_outage_without_stored_falls_back_to_labelled_demo(cdse, settings):
    settings.SATELLITE_BACKEND = "cdse"
    cdse["error"] = httpx.ConnectError("hors ligne")
    assert services.zone_series("department", {"alibori": GEOM}, TODAY)["alibori"]["simulated"] is True


def test_forced_cdse_without_keys_falls_back(settings, monkeypatch):
    settings.SATELLITE_BACKEND, settings.CDSE_CLIENT_ID, settings.CDSE_CLIENT_SECRET = "cdse", "", ""
    copernicus._TOKEN.update(value=None, exp=0.0)
    monkeypatch.setattr(httpx, "post", lambda *a, **k: (_ for _ in ()).throw(AssertionError("pas d'appel sans clés")))
    assert services.zone_series("department", {"alibori": GEOM}, TODAY)["alibori"]["simulated"] is True


def test_one_failing_zone_does_not_block_others(cdse, settings):
    settings.SATELLITE_BACKEND = "cdse"
    cdse["stats"], cdse["fail_geom"] = _payload(services.periods(TODAY)), GEOM2
    r = services.zone_series("department", {"alibori": GEOM, "zou": GEOM2}, TODAY)
    assert r["alibori"]["simulated"] is False and r["zou"]["simulated"] is True


# ---------- API ----------
from conftest import client_for  # noqa: E402,F811


def _parcel(producer, dep="alibori"):
    from apps.parcels.models import Parcel

    return Parcel.objects.create(producer=producer, name="Champ", geometry=GEOM, land_type="bas_fond", tenure="propriete",
                                 area_ha=1.0, department=dep)


def test_satellite_demo_shape(users):
    d = client_for(users["admin"]).get("/api/v1/satellite").json()
    assert d["simulated"] is True and d["scope"] == "department" and "non officielles" in d["source"]
    assert len(d["results"]) == 12 and len(d["series"]) == 12 and all(len(v) == 9 for v in d["series"].values())
    row = d["results"][0]
    assert set(row) >= {"department", "commune", "ndvi", "ndmi", "valid_pct", "acquired_at", "sensor", "simulated"}
    assert "soil_moisture_pct" not in row


def test_satellite_real_mode_label(users, cdse, settings):
    settings.SATELLITE_BACKEND = "cdse"
    cdse["stats"] = _payload(services.periods(date.today()))
    d = client_for(users["agent"]).get("/api/v1/satellite").json()
    assert d["simulated"] is False and d["source"] == "Copernicus Sentinel-2 L2A via Copernicus Data Space"
    assert d["results"][0]["sensor"] == "Sentinel-2 L2A" and d["results"][0]["ndvi"] == 0.55


def test_agent_cannot_widen_department_filter(users):
    d = client_for(users["agent"]).get("/api/v1/satellite?department=zou").json()
    assert [r["department"] for r in d["results"]] == ["alibori"] and list(d["series"]) == ["alibori"]


def test_zones_endpoint_requires_auth_and_lists_12(users):
    assert client_for().get("/api/v1/satellite/zones").status_code == 401
    d = client_for(users["admin"]).get("/api/v1/satellite/zones").json()
    assert d["type"] == "FeatureCollection" and len(d["features"]) == 12


def test_parcel_satellite_is_scoped(users, producer):
    p = _parcel(producer)
    url = f"/api/v1/parcels/{p.pk}/satellite"
    assert client_for(producer.user).get(url).status_code == 200
    assert client_for(users["agent_zou"]).get(url).status_code == 404  # autre département
    assert client_for(users["financier"]).get(url).status_code == 403  # rôle sans accès aux parcelles


def test_parcel_satellite_demo_falls_back_to_department(producer):
    p = _parcel(producer)
    d = client_for(producer.user).get(f"/api/v1/parcels/{p.pk}/satellite").json()
    assert d["scope"] == "department" and d["simulated"] is True and d["results"][0]["department"] == "alibori"


def test_parcel_satellite_real_mode_uses_the_parcel(producer, cdse, settings):
    settings.SATELLITE_BACKEND = "cdse"
    cdse["stats"] = _payload(services.periods(date.today()), ndvi=0.7)
    p = _parcel(producer)
    d = client_for(producer.user).get(f"/api/v1/parcels/{p.pk}/satellite").json()
    assert d["scope"] == "parcel" and d["simulated"] is False and d["results"][0]["ndvi"] == 0.7
    assert list(d["series"]) == [str(p.pk)]


# ---------- commandes ----------
from io import StringIO  # noqa: E402

from django.core.management import call_command  # noqa: E402
from django.core.management.base import CommandError  # noqa: E402


def test_refresh_command_reports_counts(cdse, settings):
    settings.SATELLITE_BACKEND = "cdse"
    cdse["stats"] = _payload(services.periods(date.today()))
    out = StringIO()
    call_command("refresh_satellite", stdout=out)
    assert "réel : 12" in out.getvalue() and "repli : 0" in out.getvalue()


def test_check_command_prints_raw_json(cdse):
    out = StringIO()
    call_command("satellite_check", department="alibori", stdout=out)
    assert "jeton OK" in out.getvalue() and '"sampleCount"' in out.getvalue()


def test_check_command_without_keys_exits_1(settings):
    settings.CDSE_CLIENT_ID = settings.CDSE_CLIENT_SECRET = ""
    copernicus._TOKEN.update(value=None, exp=0.0)
    with pytest.raises(CommandError, match="Clés"):
        call_command("satellite_check", stdout=StringIO())
