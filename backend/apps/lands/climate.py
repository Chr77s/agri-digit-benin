"""Risques climatiques d'une parcelle : stress hydrique, sécheresse, inondation, par bilan hydrique simple.

Modèle à règles (docs/MODEL_CARD.md § 5) : pas d'apprentissage. Les seuils sont des repères agronomiques généraux,
à valider par l'INRAB avant tout usage opérationnel. Les données sont celles d'Open-Meteo ; sans réseau, une pluie de
démonstration est utilisée et le résultat le dit (`simulated`).
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import date

from apps.parcels.models import Campaign, Parcel
from apps.referentiel.models import Department
from integrations.market_data import climate_series

# coefficient cultural par stade : ce que la culture demande, en part de l'évapotranspiration de référence
KC = {"semis": 0.4, "croissance": 0.8, "floraison": 1.15, "recolte": 0.6}
LEVELS = ("faible", "moyen", "eleve")
# pluie cumulée en 3 jours (mm) au-delà de laquelle l'inondation devient probable : (moyen, élevé)
FLOOD_MM = {"bas_fond": (35, 60), "irrigue": (45, 70), "pluvial_plateau": (50, 80)}
ADVICE = {
    "stress_hydrique": "La pluie des 14 derniers jours couvre mal les besoins de la culture : surveillez l'humidité du "
                       "sol et, si possible, couvrez le sol (paillage). Demandez conseil à votre agent ATDA.",
    "secheresse": "Plusieurs jours sans pluie utile : évitez de semer ou de repiquer avant le retour des pluies.",
    "inondation": "De fortes pluies sont prévues : dégagez les fossés et les diguettes, et récoltez à l'avance ce qui "
                  "peut l'être.",
}


def _level(value, medium, high):
    return "eleve" if value >= high else "moyen" if value >= medium else "faible"


def assess(days, today, stage="croissance", land_type="pluvial_plateau"):
    """`days` : [{date ISO, rain_mm, et0_mm}] des 14 derniers jours puis des 7 suivants (aujourd'hui compris)."""
    iso = today.isoformat()
    past = sorted((d for d in days if d["date"] < iso), key=lambda d: d["date"])
    ahead = [d for d in days if d["date"] >= iso]
    need = KC.get(stage, KC["croissance"]) * sum(d["et0_mm"] for d in past)
    rain = sum(d["rain_mm"] for d in past)
    coverage = rain / need if need else 1.0  # 1 = la pluie couvre exactement le besoin
    dry = 0
    for d in reversed(past):
        if d["rain_mm"] >= 1:
            break
        dry += 1
    soon = sum(d["rain_mm"] for d in ahead[:3])
    rain3 = max((sum(x["rain_mm"] for x in ahead[i:i + 3]) for i in range(len(ahead))), default=0.0)
    flood_mm = FLOOD_MM.get(land_type, FLOOD_MM["pluvial_plateau"])
    risks = {
        "stress_hydrique": {"level": "eleve" if coverage < 0.4 else "moyen" if coverage < 0.7 else "faible",
                            "coverage": round(coverage, 2), "rain_mm": round(rain, 1), "need_mm": round(need, 1)},
        # 10 mm ou plus annoncés dans les 3 jours : on retire 3 jours secs à la série
        "secheresse": {"level": _level(dry - (3 if soon >= 10 else 0), 6, 10), "dry_days": dry,
                       "rain_next_3d_mm": round(soon, 1)},
        "inondation": {"level": _level(rain3, *flood_mm), "max_3d_mm": round(rain3, 1)},
    }
    return {"stage": stage, "land_type": land_type, "risks": risks,
            "advice": [ADVICE[k] for k, r in risks.items() if r["level"] != "faible"]}


def _parcel_risk(parcel, stage, value_chain, today):
    from shapely.geometry import shape

    c = shape(parcel.geometry).centroid if parcel.geometry else None
    dep = Department.objects.filter(code=parcel.department).first()
    lat, lon = (c.y, c.x) if c is not None and not c.is_empty else (dep.lat, dep.lon)
    s = climate_series(lat, lon, parcel.department)
    return {"parcel": str(parcel.id), "name": parcel.name, "value_chain": value_chain, "source": s["source"],
            "simulated": s["simulated"], "updated_at": s["updated_at"],
            **assess(s["days"], today, stage, parcel.land_type)}


def parcels_risks(parcels, today=None):
    """Une évaluation par parcelle, avec le stade de sa dernière campagne (« croissance » sans campagne)."""
    today = today or date.today()
    latest = {}
    for c in Campaign.objects.filter(parcel__in=parcels).order_by("created_at"):
        latest[c.parcel_id] = c
    return [_parcel_risk(p, latest[p.id].stage if p.id in latest else "croissance",
                         latest[p.id].value_chain if p.id in latest else None, today) for p in parcels]


def departments_risks(department=None, today=None):
    """Risque par département, au centre départemental et pour une culture en croissance sur plateau."""
    today = today or date.today()
    deps = list(Department.objects.order_by("name").filter(**({"code": department} if department else {})))
    counts = {d.code: (Parcel.objects.filter(department=d.code).count(),
                       Parcel.objects.filter(department=d.code, land_type="bas_fond").count()) for d in deps}
    with ThreadPoolExecutor(max_workers=6) as pool:  # le réseau seulement : pas d'accès à la base dans les fils
        series = list(pool.map(lambda d: climate_series(d.lat, d.lon, d.code), deps))
    return [{"department": d.code, "source": s["source"], "simulated": s["simulated"], "parcels": counts[d.code][0],
             "lowland_parcels": counts[d.code][1], **assess(s["days"], today)}
            for d, s in zip(deps, series, strict=True)]
