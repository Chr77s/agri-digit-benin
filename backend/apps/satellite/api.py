"""UC-23 : suivi satellite. DONNÉES DE DÉMONSTRATION : valeurs déterministes, aucune image réelle n'est lue."""
import hashlib
from datetime import datetime, time, timedelta, timezone

from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.permissions import AGENT, PRODUCTEUR
from apps.referentiel.models import Department

SOURCE = "Données de démonstration (POC), non officielles"
SENSOR = "Sentinel-2 (démonstration)"


def _unit(key, day):
    return int(hashlib.sha256(f"{key}:{day}".encode()).hexdigest()[:8], 16) / 0xFFFFFFFF


def _acquired(today):
    # un passage tous les 5 jours, comme la revisite de Sentinel-2
    day = today - timedelta(days=today.toordinal() % 5)
    return datetime.combine(day, time(10, 30), tzinfo=timezone.utc)


@api_view(["GET"])
def satellite(request):
    when = _acquired(datetime.now(timezone.utc).date())
    dep = request.query_params.get("department")
    # l'agent et le producteur ne voient que leur département
    if request.user.role in (AGENT, PRODUCTEUR) and request.user.department:
        dep = request.user.department
    qs = Department.objects.order_by("name")
    if dep:
        qs = qs.filter(code=dep)
    results = [{"department": d.code, "commune": None,
                "ndvi": round(0.3 + 0.55 * _unit(d.code + ":ndvi", when.date()), 2),
                "soil_moisture_pct": round(10 + 30 * _unit(d.code + ":sm", when.date()), 1),
                "acquired_at": when, "sensor": SENSOR} for d in qs]
    return Response({"source": SOURCE, "results": results})
