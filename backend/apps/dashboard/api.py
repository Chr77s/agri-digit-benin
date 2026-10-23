from datetime import date

from django.db.models import Count, Max, Q, Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.alerts.models import Alert
from apps.assistant.models import AssistantLog
from apps.core.permissions import ADMIN, AGENT, RESPONSABLE, roles
from apps.farms.models import FarmPOC
from apps.farms.selectors import source_label
from apps.parcels.models import Campaign, Parcel
from apps.producers.models import Producer
from apps.production.models import Harvest, Support
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


def _rate(part, total):
    return round(100 * part / total, 1) if total else None


def _by(qs, key, agg):
    return [{"label": r[key], "value": r["v"] or 0} for r in qs.values(key).annotate(v=agg).order_by(key)]


def _sea(key, label, value, unit, source, upd=None, **extra):
    return {**_ind(key, label, value, unit, source, upd), **extra}


def under_35_cutoff(today=None):
    today = today or date.today()
    return date(today.year - 35, today.month, min(today.day, 28))  # 29 février : le 28, sans lever d'erreur


@api_view(["GET"])
@permission_classes([roles(AGENT, ADMIN, RESPONSABLE, "repr_mtdi")])
def sea(request):
    """UC-22 : indicateurs de suivi-évaluation. Une valeur sans source (`None`) s'affiche « non disponible »."""
    dep = request.user.department if request.user.role == AGENT else request.query_params.get("department")
    f = {"department": dep} if dep else {}
    valid = Producer.objects.filter(status="valide", **f)
    camps = Campaign.objects.filter(**({"parcel__department": dep} if dep else {}))
    apps_ = Application.objects.filter(producer__in=Producer.objects.filter(**f))
    supports = Support.objects.filter(producer__in=Producer.objects.filter(**f))
    harvests = Harvest.objects.filter(campaign__in=camps)
    # seuls les SMS des alertes comptent (la boîte d'envoi contient aussi codes, décisions, réponses USSD)
    alert_stats = [a.stats for a in Alert.objects.filter(status="envoyee", **f)]
    logs = AssistantLog.objects.all()  # le journal de l'assistant ne porte aucune donnée de localisation
    cutoff = under_35_cutoff()
    n = valid.count()
    decided = apps_.filter(status__in=("acceptee", "refusee")).count()
    sup = {r["status"]: r["v"] or 0 for r in supports.values("status").annotate(v=Sum("value_xof"))}
    area = _by(camps, "value_chain", Sum("parcel__area_ha"))
    breakdown_chain = _by(camps.filter(parcel__producer__status="valide"), "value_chain",
                         Count("parcel__producer", distinct=True))
    indicators = [
        _sea("producers_by_chain", "Producteurs validés par filière", n, "producteurs", REGISTRY,
            valid.aggregate(u=Max("validated_at"))["u"], breakdown=breakdown_chain),
        _sea("women_share", "Part de femmes", _rate(valid.filter(sex="F").count(), n), "%", REGISTRY),
        _sea("under_35_share", "Part de moins de 35 ans", _rate(valid.filter(birth_date__gt=cutoff).count(), n), "%",
            REGISTRY),
        _sea("area_by_chain", "Surface par filière", round(sum(r["value"] for r in area), 2), "ha", REGISTRY,
            breakdown=[{"label": r["label"], "value": round(r["value"], 2)} for r in area]),
        _sea("campaigns_by_stage", "Campagnes par stade", camps.count(), "campagnes", REGISTRY,
            camps.aggregate(u=Max("created_at"))["u"], breakdown=_by(camps, "stage", Count("id"))),
        _sea("application_acceptance", "Taux d'acceptation des candidatures",
            _rate(apps_.filter(status="acceptee").count(), decided), "%", REGISTRY),
        _sea("alert_delivery", "Taux de livraison des alertes", _rate(sum(s.get("delivered", 0) for s in alert_stats),
                                                                       sum(s.get("sent", 0) for s in alert_stats)), "%",
            "Boîte d'envoi simulée"),
        _sea("supports_value", "Appuis remis et confirmés", sum(sup.values()), "XOF", REGISTRY,
            breakdown=[{"label": "remis", "value": sup.get("remis", 0)},
                       {"label": "confirmé", "value": sup.get("confirme", 0)}]),
        _sea("harvests_flagged", "Récoltes signalées à vérifier",
            harvests.filter(flagged=True, check_status__in=("a_verifier", "visite")).count(), "récoltes", REGISTRY),
        _sea("assistant_questions", "Questions à l'assistant", logs.count(), "questions", "Journal de l'assistant"),
        _sea("assistant_escalation", "Taux d'escalade de l'assistant",
            _rate(logs.filter(status="escalated").count(), logs.count()), "%", "Journal de l'assistant"),
    ]
    name = Department.objects.filter(code=dep).values_list("name", flat=True).first() if dep else "National"
    return Response({"scope": {"department": dep, "name": name}, "indicators": indicators})
