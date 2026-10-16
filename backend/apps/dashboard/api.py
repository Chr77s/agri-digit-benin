from django.db.models import Count, Max, Q, Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.alerts.models import Alert
from apps.core.permissions import ADMIN, AGENT, RESPONSABLE, roles
from apps.farms.models import FarmPOC
from apps.farms.selectors import source_label
from apps.parcels.models import Parcel
from apps.producers.models import Producer
from apps.programs.models import Application
from apps.referentiel.models import Department

REGISTRY = "Registre Agri-Digit (prototype, données fictives)"


def _ind(key, label, value, unit, source, updated_at):
    return {"key": key, "label": label, "value": value, "unit": unit, "source": source, "updated_at": updated_at}


@api_view(["GET"])
@permission_classes([roles(AGENT, ADMIN, RESPONSABLE)])
def dashboard(request):
    dep = request.user.department if request.user.role == AGENT else request.query_params.get("department")
    prod = Producer.objects.filter(department=dep) if dep else Producer.objects.all()
    parcels = Parcel.objects.filter(department=dep) if dep else Parcel.objects.all()
    farms = FarmPOC.objects.filter(department=dep) if dep else FarmPOC.objects.all()
    alerts = Alert.objects.filter(department=dep, status="envoyee") if dep else Alert.objects.filter(status="envoyee")
    apps_ = Application.objects.filter(producer__in=prod)
    p = prod.aggregate(n=Count("id"), v=Count("id", filter=Q(status="valide")), f=Count("id", filter=Q(sex="F")),
                       u=Max("created_at"))
    pa = parcels.aggregate(n=Count("id"), ha=Sum("area_ha"), u=Max("created_at"))
    fa = farms.aggregate(n=Count("id"), ha=Sum("area_ha", filter=Q(is_maize=True)), u=Max("imported_at"))
    al = alerts.aggregate(n=Count("id"), u=Max("sent_at"))
    ap = apps_.aggregate(n=Count("id"), u=Max("created_at"))
    farm_src = source_label(farms) or "POC Agri-Digit"
    name = Department.objects.filter(code=dep).values_list("name", flat=True).first() if dep else "National"
    indicators = [
        _ind("producers_total", "Producteurs inscrits", p["n"], "producteurs", REGISTRY, p["u"]),
        _ind("producers_validated", "Producteurs validés", p["v"], "producteurs", REGISTRY, p["u"]),
        _ind("producers_women", "Productrices inscrites", p["f"], "producteurs", REGISTRY, p["u"]),
        _ind("parcels_area", "Surface des parcelles enregistrées", round(pa["ha"], 2) if pa["ha"] else None, "ha",
             REGISTRY, pa["u"]),
        _ind("farms_detected", "Fermes détectées (satellite)", fa["n"] or None, "fermes", farm_src, fa["u"]),
        _ind("maize_area_detected", "Surface de maïs détectée", round(fa["ha"], 1) if fa["ha"] else None, "ha",
             farm_src, fa["u"]),
        _ind("alerts_sent", "Alertes envoyées", al["n"], "alertes", REGISTRY, al["u"]),
        _ind("applications", "Candidatures aux programmes", ap["n"], "candidatures", REGISTRY, ap["u"]),
        # aucune source de rendement dans le prototype : affiché "non disponible"
        _ind("maize_yield", "Rendement moyen du maïs", None, "t/ha", "non disponible", None),
    ]
    return Response({"scope": {"department": dep, "name": name}, "indicators": indicators})
