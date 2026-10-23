"""Revenu du producteur : ventes déclarées à la récolte, dépenses déclarées, remboursements payés."""
from django.db import transaction
from django.db.models import Sum
from django.http import Http404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.audit.services import record
from apps.core.errors import ApiError
from apps.core.permissions import ADMIN, AGENT, PRODUCTEUR, roles
from apps.market.models import Payment
from apps.parcels.models import Campaign
from apps.producers.selectors import get_producer

from .models import ClaimPayment, Expense, Harvest, Support


@transaction.atomic
def create_expense(actor, producer, d):
    campaign = d.get("campaign")
    if campaign and not Campaign.objects.filter(pk=campaign, parcel__producer=producer).exists():
        raise Http404
    if d["spent_on"] > timezone.localdate():
        raise ApiError("La date ne peut pas être dans le futur.", "validation_error", 400,
                       fields={"spent_on": ["Date future."]})
    e = Expense.objects.create(producer=producer, campaign_id=campaign, category=d["category"],
                               label=d.get("label", ""), amount_xof=d["amount_xof"], spent_on=d["spent_on"])
    record(actor, "expense.create", e, amount_xof=e.amount_xof, category=e.category)
    return e


def revenue(producer, season=None):
    """Revenu net = ventes − dépenses − remboursements. Une dépense sans campagne et les remboursements ne se rattachent
    à aucune campagne : ils ne comptent que sur l'ensemble des campagnes (pas quand on filtre par campagne)."""
    camps = Campaign.objects.filter(parcel__producer=producer).select_related("parcel")
    seasons = sorted(camps.values_list("season", flat=True).distinct())
    camps = list(camps.filter(season=season) if season else camps)
    rows = {c.id: {"campaign": str(c.id), "value_chain": c.value_chain, "season": c.season, "parcel": c.parcel.name,
                   "area_ha": c.parcel.area_ha, "sold_kg": 0.0, "sales_xof": 0, "expenses_xof": 0} for c in camps}
    unpriced = 0
    for h in Harvest.objects.filter(campaign_id__in=list(rows)):
        rows[h.campaign_id]["sold_kg"] += h.sold_kg
        if h.sale_price_xof_per_kg is not None:
            rows[h.campaign_id]["sales_xof"] += round(h.sold_kg * h.sale_price_xof_per_kg)
        elif h.sold_kg > 0:
            unpriced += 1
    spent = Expense.objects.filter(producer=producer)
    for e in spent.filter(campaign_id__in=list(rows)):
        rows[e.campaign_id]["expenses_xof"] += e.amount_xof
    for r in rows.values():
        r["net_xof"] = r["sales_xof"] - r["expenses_xof"]
    general = repaid = free = 0
    if not season:
        general = spent.filter(campaign__isnull=True).aggregate(s=Sum("amount_xof"))["s"] or 0
        repaid = ClaimPayment.objects.filter(claim__debtor=producer.user_id, claim__kind__in=("appui", "pret"),
                                             status="reussi").aggregate(s=Sum("amount_xof"))["s"] or 0
        free = Support.objects.filter(producer=producer, status="confirme", repayable=False).aggregate(
            s=Sum("value_xof"))["s"] or 0
    sales = sum(r["sales_xof"] for r in rows.values())
    expenses = sum(r["expenses_xof"] for r in rows.values()) + general
    net = sales - expenses - repaid
    area = round(sum({c.parcel_id: c.parcel.area_ha for c in camps}.values()), 4)
    market = Payment.objects.filter(payee=producer.user_id, status="reussi").aggregate(s=Sum("amount_xof"))["s"] or 0
    return {"season": season or None, "seasons": seasons, "sales_xof": sales, "unpriced_harvests": unpriced,
            "expenses_xof": expenses, "repayments_xof": repaid, "net_xof": net, "area_ha": area,
            "net_per_ha_xof": round(net / area) if area else None, "free_supports_xof": free,
            "market_received_xof": market, "by_campaign": list(rows.values())}


class ExpenseIn(serializers.Serializer):
    campaign = serializers.UUIDField(required=False, allow_null=True)
    category = serializers.ChoiceField(choices=Expense.CATEGORIES)
    label = serializers.CharField(max_length=150, required=False, allow_blank=True)
    amount_xof = serializers.IntegerField(min_value=1)
    spent_on = serializers.DateField()


def _producer(request):
    """Le producteur lui-même ; l'agent et l'administration désignent le producteur (`?producer=`) de leur périmètre."""
    if request.user.role == PRODUCTEUR:
        p = getattr(request.user, "producer", None)
        if p is None:
            raise ApiError("Aucune fiche producteur associée à ce compte.", "no_producer", 400)
        return p
    if not request.query_params.get("producer"):
        raise ApiError("Indiquez le producteur.", "validation_error", 400, fields={"producer": ["Obligatoire."]})
    return get_producer(request.user, request.query_params["producer"])


def expense_out(e):
    return {"id": str(e.id), "campaign": str(e.campaign_id) if e.campaign_id else None, "category": e.category,
            "label": e.label, "amount_xof": e.amount_xof, "spent_on": e.spent_on}


@api_view(["GET"])
@permission_classes([roles(PRODUCTEUR, AGENT, ADMIN)])
def revenue_summary(request):
    return Response(revenue(_producer(request), request.query_params.get("season") or None))


@api_view(["GET", "POST"])
@permission_classes([roles(PRODUCTEUR, AGENT, ADMIN)])
def expense_list(request):
    if request.method == "GET":
        qs = Expense.objects.filter(producer=_producer(request)).order_by("-spent_on", "-created_at")
        return Response({"results": [expense_out(e) for e in qs]})
    if request.user.role != PRODUCTEUR:
        raise ApiError("Seul le producteur déclare ses dépenses.", "forbidden", 403)
    s = ExpenseIn(data=request.data)
    s.is_valid(raise_exception=True)
    return Response(expense_out(create_expense(request.user, _producer(request), s.validated_data)), status=201)


@api_view(["DELETE"])
@permission_classes([roles(PRODUCTEUR)])
def expense_delete(request, pk):
    e = Expense.objects.filter(pk=pk, producer__user=request.user).first()
    if e is None:
        raise Http404
    with transaction.atomic():
        record(request.user, "expense.delete", e, amount_xof=e.amount_xof)
        e.delete()
    return Response(status=204)
