"""Préchauffage du cache satellite des 12 départements, pour `refresh_satellite` et l'adresse du cron."""
from apps.referentiel import zones
from apps.referentiel.models import Department

from . import services


def refresh_departments(deadline):
    """Rafraîchit les observations périmées ou manquantes ; renvoie `{"real": n, "fallback": m}` par département."""
    codes = list(Department.objects.values_list("code", flat=True))
    zs = services.zone_series("department", {c: zones.department_geometry(c) for c in codes}, deadline=deadline)
    real = sum(1 for z in zs.values() if not z["simulated"])
    return {"real": real, "fallback": len(zs) - real}
