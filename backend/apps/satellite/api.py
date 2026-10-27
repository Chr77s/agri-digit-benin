"""UC-23 : suivi satellite. NDVI et NDMI Sentinel-2 via Copernicus quand les clés existent ; sinon valeurs de démonstration,
déterministes et étiquetées (`simulated`). Voir services.py."""
from datetime import datetime, time, timezone

from django.http import Http404
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.permissions import AGENT, PRODUCTEUR
from apps.parcels.api import parcels_for
from apps.referentiel import zones
from apps.referentiel.models import Department

from . import services


def _payload(scope, zs, department_of):
    """Forme commune : une ligne par zone (dernier passage exploitable) et la série complète par zone."""
    results = []
    for code, z in zs.items():
        last = next((p for p in reversed(z["points"]) if p["ndvi"] is not None), None)
        ref = last or z["points"][-1]
        results.append({
            "department": department_of(code), "commune": None,
            "ndvi": last and last["ndvi"], "ndmi": last and last["ndmi"], "valid_pct": ref["valid_pct"],
            "acquired_at": datetime.combine(ref["to"], time(10, 30), tzinfo=timezone.utc),
            "sensor": services.SENSOR_DEMO if z["simulated"] else services.SENSOR_REAL, "simulated": z["simulated"]})
    simulated = any(r["simulated"] for r in results)
    return {"source": services.SOURCE_DEMO if simulated else services.SOURCE_REAL, "simulated": simulated, "scope": scope,
            "results": results, "series": {code: z["points"] for code, z in zs.items()}}


@api_view(["GET"])
def satellite(request):
    dep = request.query_params.get("department")
    # l'agent et le producteur ne voient que leur département
    if request.user.role in (AGENT, PRODUCTEUR) and request.user.department:
        dep = request.user.department
    qs = Department.objects.order_by("name")
    if dep:
        qs = qs.filter(code=dep)
    codes = list(qs.values_list("code", flat=True))
    zs = services.zone_series("department", {c: zones.department_geometry(c) for c in codes})
    return Response(_payload("department", zs, lambda code: code))


@api_view(["GET"])
def satellite_zones(request):
    return Response({"type": "FeatureCollection", "features": zones.department_features()})


@api_view(["GET"])
def parcel_satellite(request, pk):
    """Indices de la parcelle ; sans mesure propre (démonstration, rien de stocké), ceux de son département."""
    p = parcels_for(request.user).filter(pk=pk).first()
    if p is None:
        raise Http404
    key = str(p.pk)
    zs = services.zone_series("parcel", {key: p.geometry})
    if not zs[key]["simulated"]:
        return Response(_payload("parcel", zs, lambda code: p.department))
    try:
        dep = {p.department: zones.department_geometry(p.department)}
    except KeyError:  # département hors référentiel : on garde la démonstration de la parcelle
        return Response(_payload("department", zs, lambda code: p.department))
    return Response(_payload("department", services.zone_series("department", dep), lambda code: code))


def place_of(producer=None, department=None):
    """Point météo : centre de la première parcelle du producteur, sinon centre de son département (ou de celui
    demandé). Renvoie (lat, lon, libellé, clé de démonstration)."""
    from shapely.geometry import shape

    from apps.parcels.models import Parcel

    if producer and (p := Parcel.objects.filter(producer=producer).order_by("created_at").first()):
        c = shape(p.geometry).centroid
        return c.y, c.x, p.name, producer.commune
    code = (producer.department if producer else None) or department or "alibori"
    d = Department.objects.filter(code=code).first() or Department.objects.order_by("name").first()
    return d.lat, d.lon, d.name, d.code


@api_view(["GET"])
def weather(request):
    from integrations.market_data import weather as forecast7

    u = request.user
    producer = getattr(u, "producer", None) if u.role == PRODUCTEUR else None
    dep = u.department if u.role == AGENT else request.query_params.get("department")
    lat, lon, label, key = place_of(producer, dep)
    return Response({**forecast7(lat, lon, key), "place": label})
