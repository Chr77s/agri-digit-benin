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


MARKETS = [
    ("Banikoara", "Alibori", 0.88), ("Kandi", "Alibori", 0.92), ("Malanville", "Alibori", 1.04),
    ("Parakou (Arzéké)", "Borgou", 1), ("Bohicon", "Zou", 1.13), ("Dantokpa (Cotonou)", "Littoral", 1.22),
]
PRICE_CHAINS = {"mais": 215, "soja": 300, "riz": 260, "niebe": 420, "manioc": 330, "anacarde": 400}


def prices(chain):
    base = PRICE_CHAINS.get(chain, 200)
    return [{"market": m, "department": dep, "price": _round(base * f / 5) * 5,
             "change": _round((unit(f"{chain}:{m}") - 0.6) * 12)} for m, dep, f in MARKETS]
