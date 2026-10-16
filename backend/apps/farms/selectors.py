from django.db.models import Count, Max, Q, Sum

from apps.referentiel.models import Commune, Department

from .models import FarmPOC

SOURCE_LABEL = {"poc_agri_digit": "POC Agri-Digit (détection satellite, données de démonstration)",
                "synthetique_demo": "Données synthétiques de démonstration"}


def source_label(qs):
    src = qs.values_list("source", flat=True).first()
    return SOURCE_LABEL.get(src, src)


def aggregates(level="department", department=None):
    qs = FarmPOC.objects.all()
    if department:
        qs = qs.filter(department=department)
    key = "commune" if level == "commune" else "department"
    names = {c.code: c.name for c in (Commune.objects.all() if key == "commune" else Department.objects.all())}
    src, upd = source_label(qs), qs.aggregate(m=Max("imported_at"))["m"]
    rows = qs.values(key).annotate(farms=Count("id"), maize_ha=Sum("area_ha", filter=Q(is_maize=True))).order_by(key)
    return [{"name": names.get(r[key], r[key] or "non renseignée"), "code": r[key], "farms": r["farms"],
             "maize_ha": round(r["maize_ha"], 1) if r["maize_ha"] is not None else None, "source": src,
             "updated_at": upd} for r in rows]
