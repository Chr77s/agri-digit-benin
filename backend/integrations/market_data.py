"""Météo et prix de DÉMONSTRATION (aucune API Météo-Bénin ni relevé SIM). Même calcul que
frontend/src/features/weather/demo.ts : l'application et le téléphone simple affichent les mêmes chiffres.
shortcut: valeurs simulées, à remplacer par un service réel quand il existe (voir docs/MOCKS.md)."""
import math
from datetime import date, timedelta


def unit(key):
    """Nombre stable dans [0, 1) pour une clé (FNV-1a 32 bits, comme Math.imul du navigateur ; clés hors emoji)."""
    h = 2166136261
    for c in key:
        h = ((h ^ ord(c)) * 16777619) & 0xFFFFFFFF
    return (h % 10000) / 10000


def _round(x):
    """Math.round du navigateur (demi vers +infini)."""
    return math.floor(x + 0.5)


def forecast(place, today=None, days=7):
    today = today or date.today()
    out = []
    for i in range(days):
        d = today + timedelta(days=i)
        k = f"{place}:{d.isoformat()}"
        r = unit(f"{k}:rain")
        rain_mm = _round(15 + (r - 0.72) * 180) if r > 0.72 else _round((r - 0.5) * 20) if r > 0.5 else 0
        rain_pct = min(95, _round(5 + r * 90))
        tmax = _round(33 - rain_mm / 10 - unit(f"{k}:t") * 3)
        out.append({"date": d, "tmax": tmax, "tmin": tmax - 8 - _round(unit(f"{k}:n") * 2), "rain_mm": rain_mm,
                    "rain_pct": rain_pct})
    return out


def weather(lat, lon, place, days=7):
    """Prévisions réelles Open-Meteo (données ouvertes, modèles ECMWF et Météo-France) pour un point ; en cas
    d'échec, valeurs de démonstration étiquetées. Mise en cache 1 h (30 min après un échec)."""
    import httpx
    from django.conf import settings
    from django.core.cache import cache
    from django.utils import timezone

    key = f"weather:{round(lat, 2)}:{round(lon, 2)}:{days}"
    if (hit := cache.get(key)) is not None:
        return hit
    try:
        if settings.WEATHER_BACKEND != "open-meteo":
            raise RuntimeError("météo réelle désactivée")
        r = httpx.get(settings.WEATHER_URL, timeout=5, params={
            "latitude": lat, "longitude": lon, "timezone": "Africa/Porto-Novo", "forecast_days": days,
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max"})
        r.raise_for_status()
        d = r.json()["daily"]
        out = {"source": "Open-Meteo (prévisions ECMWF et Météo-France, données ouvertes)", "simulated": False,
               "updated_at": timezone.now().isoformat(),
               "days": [{"date": d["time"][i], "tmax": _round(d["temperature_2m_max"][i]),
                         "tmin": _round(d["temperature_2m_min"][i]), "rain_mm": _round(d["precipitation_sum"][i] or 0),
                         "rain_pct": d["precipitation_probability_max"][i] or 0} for i in range(len(d["time"]))]}
        cache.set(key, out, 3600)
    except Exception:  # réseau coupé, service indisponible : la démonstration prend le relais, signalée comme telle
        out = {"source": "Démonstration (service météo injoignable)", "simulated": True,
               "updated_at": timezone.now().isoformat(),
               "days": [{**x, "date": x["date"].isoformat()} for x in forecast(place, days=days)]}
        cache.set(key, out, 1800)
    return out


def climate_series(lat, lon, place, past=14, ahead=7):
    """Pluie et évapotranspiration de référence (ET0) des `past` derniers jours puis des `ahead` suivants, pour le
    modèle de risque climatique. Open-Meteo (données ouvertes) ; en cas d'échec, pluie de démonstration et ET0 fixe de
    4,5 mm/jour, étiquetées comme simulées. Cache 3 h (30 min après un échec)."""
    import httpx
    from django.conf import settings
    from django.core.cache import cache
    from django.utils import timezone

    key = f"climate:{round(lat, 2)}:{round(lon, 2)}"
    if (hit := cache.get(key)) is not None:
        return hit
    try:
        if settings.WEATHER_BACKEND != "open-meteo":
            raise RuntimeError("météo réelle désactivée")
        r = httpx.get(settings.WEATHER_URL, timeout=5, params={
            "latitude": lat, "longitude": lon, "timezone": "Africa/Porto-Novo", "past_days": past,
            "forecast_days": ahead, "daily": "precipitation_sum,et0_fao_evapotranspiration"})
        r.raise_for_status()
        d = r.json()["daily"]
        out = {"source": "Open-Meteo (données ouvertes)", "simulated": False, "updated_at": timezone.now().isoformat(),
               "days": [{"date": d["time"][i], "rain_mm": d["precipitation_sum"][i] or 0.0,
                         "et0_mm": d["et0_fao_evapotranspiration"][i] or 0.0} for i in range(len(d["time"]))]}
        cache.set(key, out, 3 * 3600)
    except Exception:  # réseau coupé : démonstration signalée
        start = date.today() - timedelta(days=past)
        out = {"source": "Démonstration (service météo injoignable)", "simulated": True,
               "updated_at": timezone.now().isoformat(),
               "days": [{"date": x["date"].isoformat(), "rain_mm": float(x["rain_mm"]), "et0_mm": 4.5}
                        for x in forecast(place, start, past + ahead)]}
        cache.set(key, out, 1800)
    return out

# Prix de DÉMONSTRATION (département = code du référentiel) : ils ne servent que tant qu'une filière n'a aucun relevé.
MARKETS = [
    ("Banikoara", "alibori", 0.88), ("Kandi", "alibori", 0.92), ("Malanville", "alibori", 1.04),
    ("Parakou (Arzéké)", "borgou", 1), ("Bohicon", "zou", 1.13), ("Dantokpa (Cotonou)", "littoral", 1.22),
]
PRICE_CHAINS = {"mais": 215, "soja": 300, "riz": 260, "niebe": 420, "manioc": 330, "anacarde": 400}


def demo_prices(chain):
    """Valeurs de démonstration, étiquetées `simulated` ; rien pour une filière sans prix de démonstration."""
    base = PRICE_CHAINS.get(chain)
    if base is None:
        return []
    return [{"market": m, "department": dep, "form": "brut", "product": chain, "price": _round(base * f / 5) * 5,
             "change": _round((unit(f"{chain}:{m}") - 0.6) * 12), "observed_on": None, "simulated": True}
            for m, dep, f in MARKETS]


def prices(chain):
    """Prix au marché d'une filière, forme brute : derniers relevés saisis (30 jours au plus) ; à défaut, démonstration.
    Chaque ligne dit si elle est simulée (`simulated`) et la date du relevé (`observed_on`)."""
    from apps.markets.prices import latest
    real = [r for r in latest(chain) if r["form"] == "brut"]
    return real or demo_prices(chain)
