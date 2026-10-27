"""UC-23 : indices satellite par zone. Copernicus (via le cache en base) quand les clés existent, sinon démonstration étiquetée.

Une zone est un département (contour geoBoundaries) ou une parcelle (son tracé). Les appels réseau se font en parallèle dans
des fils sans accès à la base ; les écritures restent dans le fil appelant."""
import hashlib
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from concurrent.futures import TimeoutError as FuturesTimeout
from datetime import date, timedelta

from django.conf import settings
from django.core.cache import cache
from django.db.models import Max
from django.utils import timezone

from integrations import copernicus

from .models import SatelliteObservation

log = logging.getLogger(__name__)

PERIOD_DAYS, N_PERIODS = 10, 9
TTL = timedelta(hours=24)
DEADLINE_S, WORKERS = 20, 4
FAIL_TTL_S = 600  # après un échec, on ne réessaie pas cette zone pendant 10 minutes
RESOLUTION = {"department": 0.003, "parcel": 0.0001}  # degrés (environ 330 m et 11 m)
SOURCE_REAL = "Copernicus Sentinel-2 L2A via Copernicus Data Space"
SOURCE_DEMO = "Données de démonstration (POC), non officielles"
SENSOR_REAL = "Sentinel-2 L2A"
SENSOR_DEMO = "Sentinel-2 (démonstration)"


def periods(today):
    """Les 9 blocs complets de 10 jours qui précèdent celui de `today`, du plus ancien au plus récent."""
    block = today.toordinal() // PERIOD_DAYS
    return [(date.fromordinal(b * PERIOD_DAYS), date.fromordinal(b * PERIOD_DAYS + PERIOD_DAYS - 1))
            for b in range(block - N_PERIODS, block)]


def backend():
    mode = settings.SATELLITE_BACKEND
    if mode in ("cdse", "demo"):
        return mode
    return "cdse" if settings.CDSE_CLIENT_ID and settings.CDSE_CLIENT_SECRET else "demo"


def _unit(key, day):
    return int(hashlib.sha256(f"{key}:{day}".encode()).hexdigest()[:8], 16) / 0xFFFFFFFF


def _demo(code, ps):
    return [{"from": a, "to": b, "ndvi": round(0.3 + 0.55 * _unit(f"{code}:ndvi", b), 2),
             "ndmi": round(-0.1 + 0.6 * _unit(f"{code}:ndmi", b), 2), "valid_pct": 100.0} for a, b in ps]


def _fail_key(kind, code):
    return f"satellite:fail:{kind}:{code}"


def _stale(kind, code, ps):
    qs = SatelliteObservation.objects.filter(zone_kind=kind, zone_code=code)
    last = qs.aggregate(m=Max("fetched_at"))["m"]
    return last is None or last < timezone.now() - TTL or not qs.filter(period_start=ps[-1][0]).exists()


def _refresh(kind, zones, ps):
    todo = [c for c in zones if _stale(kind, c, ps) and not cache.get(_fail_key(kind, c))]
    if not todo or cache.get(_fail_key("token", "")):
        return
    try:
        copernicus.token()  # une seule fois ici : évite la course entre fils et échoue vite sans clés
    except copernicus.CopernicusError as e:
        log.warning("satellite : %s", e)
        cache.set(_fail_key("token", ""), 1, FAIL_TTL_S)
        return
    pool = ThreadPoolExecutor(WORKERS)
    futures = {pool.submit(copernicus.series, zones[c], ps[0][0], ps[-1][1], RESOLUTION[kind]): c for c in todo}
    try:
        for f in as_completed(futures, timeout=DEADLINE_S):
            code = futures[f]
            try:
                points = f.result()
            except copernicus.CopernicusError as e:
                log.warning("satellite : zone %s/%s en échec : %s", kind, code, e)
                cache.set(_fail_key(kind, code), 1, FAIL_TTL_S)
                continue
            for p in points:
                SatelliteObservation.objects.update_or_create(
                    zone_kind=kind, zone_code=code, period_start=p["from"],
                    defaults={"period_end": p["to"], "ndvi": p["ndvi"], "ndmi": p["ndmi"], "valid_pct": p["valid_pct"]})
    except FuturesTimeout:
        log.warning("satellite : délai de %s s dépassé, zones restantes servies depuis le cache", DEADLINE_S)
    finally:
        pool.shutdown(wait=False, cancel_futures=True)


def _read(kind, code, ps):
    rows = {o.period_start: o for o in SatelliteObservation.objects.filter(
        zone_kind=kind, zone_code=code, period_start__in=[a for a, _ in ps])}
    if backend() == "demo" or not rows:
        return {"simulated": True, "points": _demo(code, ps)}
    points = []
    for a, b in ps:
        o = rows.get(a)
        points.append({"from": a, "to": b, "ndvi": o and o.ndvi, "ndmi": o and o.ndmi, "valid_pct": o and o.valid_pct})
    return {"simulated": False, "points": points}


def zone_series(kind, zones, today=None):
    """{code: {"simulated": bool, "points": [9 points]}} pour les zones `{code: géométrie GeoJSON}`."""
    ps = periods(today or date.today())
    if backend() == "cdse":
        _refresh(kind, zones, ps)
    return {code: _read(kind, code, ps) for code in zones}
