"""Copernicus Data Space : jeton OAuth2 puis Statistical API (NDVI et NDMI Sentinel-2 L2A par zone et par intervalle de 10 jours).

La forme exacte de la réponse n'est pas confirmée par la documentation : la lecture est tolérante et
`manage.py satellite_check` affiche la réponse brute pour la valider avec de vraies clés."""
import time
from datetime import date, timedelta

import httpx
from django.conf import settings

TIMEOUT = 15
MIN_VALID_PCT = 20.0  # sous ce seuil, l'intervalle est trop nuageux pour être publié
MAX_CLOUD = 80
_TOKEN = {"value": None, "exp": 0.0}

# Composite « NDVI maximal » : pour chaque pixel et chaque intervalle, on garde la meilleure observation claire (en saison des
# pluies, une seule date par intervalle laisse la moitié des pixels sous les nuages) ; le NDMI est pris à la même date.
# SCL exclus : 0 sans donnée, 1 saturé, 3 ombre de nuage, 8 et 9 nuages, 10 cirrus, 11 neige
EVALSCRIPT = """//VERSION=3
function setup() {
  return { input: [{ bands: ["B04", "B08", "B8A", "B11", "SCL", "dataMask"] }],
    output: [{ id: "ndvi", bands: 1, sampleType: "FLOAT32" }, { id: "ndmi", bands: 1, sampleType: "FLOAT32" }, { id: "dataMask", bands: 1 }],
    mosaicking: "ORBIT" };
}
function evaluatePixel(samples) {
  let best = -2, ndmi = 0, ok = 0;
  for (const s of samples) {
    if ([0, 1, 3, 8, 9, 10, 11].includes(s.SCL) || s.dataMask === 0) continue;
    const v = (s.B08 - s.B04) / (s.B08 + s.B04);
    if (v > best) { best = v; ndmi = (s.B8A - s.B11) / (s.B8A + s.B11); ok = 1; }
  }
  return { ndvi: [best], ndmi: [ndmi], dataMask: [ok] };
}
"""


class CopernicusError(Exception):
    pass


def token():
    if _TOKEN["value"] and time.time() < _TOKEN["exp"]:
        return _TOKEN["value"]
    if not (settings.CDSE_CLIENT_ID and settings.CDSE_CLIENT_SECRET):
        raise CopernicusError("Clés Copernicus absentes (CDSE_CLIENT_ID et CDSE_CLIENT_SECRET).")
    try:
        r = httpx.post(settings.CDSE_TOKEN_URL, timeout=TIMEOUT, data={
            "grant_type": "client_credentials", "client_id": settings.CDSE_CLIENT_ID, "client_secret": settings.CDSE_CLIENT_SECRET})
        r.raise_for_status()
        d = r.json()
        _TOKEN.update(value=d["access_token"], exp=time.time() + float(d.get("expires_in", 300)) - 60)
    except (httpx.HTTPError, KeyError, ValueError) as e:
        raise CopernicusError(f"Jeton Copernicus refusé : {e}") from e
    return _TOKEN["value"]


def raw_statistics(geometry, start, end, resolution):
    """Réponse JSON brute pour la géométrie, de `start` à `end` inclus, par intervalles de 10 jours."""
    body = {
        "input": {
            "bounds": {"geometry": geometry, "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"}},
            "data": [{"type": "sentinel-2-l2a", "dataFilter": {"maxCloudCoverage": MAX_CLOUD}}],
        },
        "aggregation": {
            "timeRange": {"from": f"{start.isoformat()}T00:00:00Z", "to": f"{(end + timedelta(days=1)).isoformat()}T00:00:00Z"},
            "aggregationInterval": {"of": "P10D"},
            "evalscript": EVALSCRIPT, "resx": resolution, "resy": resolution,
        },
    }
    try:
        r = httpx.post(settings.CDSE_STATS_URL, json=body, headers={"Authorization": f"Bearer {token()}"}, timeout=TIMEOUT)
        r.raise_for_status()
        return r.json()
    except (httpx.HTTPError, ValueError) as e:
        raise CopernicusError(f"Statistical API Copernicus : {e}") from e


def _stats(output):
    return (((output or {}).get("bands") or {}).get("B0") or {}).get("stats") or {}


def _mean(output):
    try:
        v = float(_stats(output)["mean"])
    except (KeyError, TypeError, ValueError):
        return None
    return None if v != v else round(v, 4)  # NaN : tout l'intervalle est masqué


def series(geometry, start, end, resolution):
    out = []
    for item in raw_statistics(geometry, start, end, resolution).get("data") or []:
        outputs = item.get("outputs") or {}
        s = _stats(outputs.get("ndvi"))
        try:
            valid = round(100 * (1 - float(s["noDataCount"]) / float(s["sampleCount"])), 1)
        except (KeyError, TypeError, ValueError, ZeroDivisionError):
            valid = None
        clear = valid is not None and valid >= MIN_VALID_PCT
        out.append({
            "from": date.fromisoformat(item["interval"]["from"][:10]),
            "to": date.fromisoformat(item["interval"]["to"][:10]) - timedelta(days=1),
            "ndvi": _mean(outputs.get("ndvi")) if clear else None,
            "ndmi": _mean(outputs.get("ndmi")) if clear else None,
            "valid_pct": valid,
        })
    return out
