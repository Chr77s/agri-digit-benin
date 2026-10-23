from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.errors import ApiError
from apps.core.permissions import ADMIN, AGENT, RESPONSABLE, roles
from apps.referentiel.models import Department

from . import analysis, prices
from .models import PriceObservation

TRANSFORMATEUR, DISTRIBUTEUR = "transformateur", "distributeur"
MARGIN_READERS = (TRANSFORMATEUR, RESPONSABLE, ADMIN)
ANALYSTS = (AGENT, RESPONSABLE, ADMIN, TRANSFORMATEUR, DISTRIBUTEUR)
STAFF = (AGENT, RESPONSABLE, ADMIN)


class PriceIn(serializers.Serializer):
    market = serializers.CharField(max_length=80)
    department = serializers.SlugRelatedField(slug_field="code", queryset=Department.objects.all())
    value_chain = serializers.CharField(max_length=40)
    form = serializers.ChoiceField(choices=PriceObservation.FORMS)
    product = serializers.CharField(max_length=120)
    price_xof_per_kg = serializers.IntegerField()  # bornes contrôlées par le service (message précis)
    observed_on = serializers.DateField()


def price_out(o):
    return {"id": str(o.id), "market": o.market, "department": o.department, "value_chain": o.value_chain,
            "form": o.form, "product": o.product, "price": o.price_xof_per_kg, "observed_on": o.observed_on,
            "simulated": False}


def _chain(request):
    chain = request.query_params.get("value_chain")
    if not chain:
        raise ApiError("Indiquez la filière.", "validation_error", 400, fields={"value_chain": ["Obligatoire."]})
    return chain


@api_view(["GET", "POST"])
def price_list(request):
    """GET : derniers relevés d'une filière (30 jours au plus) et historique ; sans relevé, démonstration étiquetée.
    POST : un relevé, par un agent, l'administration, un gestionnaire, un transformateur ou un distributeur."""
    if request.method == "GET":
        return Response(prices.overview(_chain(request), request.query_params.get("department") or None))
    if request.user.role not in prices.WRITERS:
        raise ApiError("Votre rôle ne saisit pas de relevé de prix.", "forbidden", 403)
    s = PriceIn(data=request.data)
    s.is_valid(raise_exception=True)
    d = dict(s.validated_data)
    d["department"] = d["department"].code
    return Response(price_out(prices.record_price(request.user, d)), status=201)


@api_view(["GET"])
@permission_classes([roles(*MARGIN_READERS)])
def price_margins(request):
    return Response({"results": prices.margins(request.query_params.get("department") or None),
                     "note": "Écart de prix au kilo entre le produit transformé et la matière brute ; il ne tient pas "
                             "compte du rendement matière (un kilo de grain ne donne pas un kilo de farine)."})


@api_view(["GET"])
@permission_classes([roles(*ANALYSTS)])
def market_analysis(request):
    """Tendance des prix (moyenne mobile, variation, projection si assez de relevés) et offre attendue."""
    u = request.user
    chain = _chain(request)
    dep = u.department if u.role == AGENT and u.department else request.query_params.get("department") or None
    return Response({
        "value_chain": chain, "department": dep, "today": timezone.localdate(),
        "method": {"window_days": analysis.WINDOW_DAYS, "trend_threshold_pct": analysis.TREND_PCT,
                   "min_observations": analysis.MIN_OBSERVATIONS, "min_span_days": analysis.MIN_SPAN_DAYS,
                   "horizon_days": analysis.HORIZON_DAYS},
        "prices": analysis.price_trends(chain, dep),
        "supply": analysis.expected_supply(chain, dep, staff=u.role in STAFF)})
