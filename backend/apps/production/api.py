from django.http import Http404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.errors import ApiError
from apps.core.pagination import Cursor
from apps.core.permissions import ADMIN, AGENT, PRODUCTEUR, roles
from apps.parcels.api import parcels_for
from apps.parcels.models import Campaign
from apps.producers.selectors import get_producer
from apps.programs.models import Program

from . import selectors, services
from .models import Harvest, Support


class SupportSerializer(serializers.ModelSerializer):
    producer_code = serializers.CharField(source="producer.code", read_only=True)
    program_name = serializers.CharField(source="program.name", read_only=True, default=None)

    class Meta:
        model = Support
        fields = ["id", "producer", "producer_code", "program", "program_name", "item", "quantity", "unit",
                  "value_xof", "repayable", "status", "created_at", "confirmed_at"]
        read_only_fields = ["status", "created_at", "confirmed_at"]


class SupportInSerializer(serializers.Serializer):
    producer = serializers.UUIDField()
    program = serializers.UUIDField(required=False, allow_null=True)
    item = serializers.CharField(max_length=150)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0.01)
    unit = serializers.CharField(max_length=20)
    value_xof = serializers.IntegerField(min_value=0)
    repayable = serializers.BooleanField()


class HarvestSerializer(serializers.ModelSerializer):
    value_chain = serializers.CharField(source="campaign.value_chain", read_only=True)
    producer_code = serializers.CharField(source="campaign.parcel.producer.code", read_only=True)

    class Meta:
        model = Harvest
        fields = ["id", "campaign", "value_chain", "producer_code", "harvested_at", "quantity_kg", "stored_kg",
                  "sold_kg", "sale_price_xof_per_kg", "estimated_kg", "deviation_pct", "flagged", "created_at"]


class HarvestInSerializer(serializers.Serializer):
    campaign = serializers.UUIDField()
    harvested_at = serializers.DateField()
    quantity_kg = serializers.FloatField(min_value=0)
    stored_kg = serializers.FloatField(min_value=0, default=0)
    sold_kg = serializers.FloatField(min_value=0, default=0)
    sale_price_xof_per_kg = serializers.IntegerField(min_value=0, required=False, allow_null=True)


def _paginate(request, qs, serializer):
    pg = Cursor()
    return pg.get_paginated_response(serializer(pg.paginate_queryset(qs, request), many=True).data)


@api_view(["GET", "POST"])
@permission_classes([roles(PRODUCTEUR, AGENT, ADMIN)])
def support_list(request):
    if request.method == "GET":
        qs = selectors.supports_for(request.user)
        if pid := request.query_params.get("producer"):
            qs = qs.filter(producer_id=pid)
        return _paginate(request, qs, SupportSerializer)
    if request.user.role not in (AGENT, ADMIN):
        raise ApiError("Seul un agent enregistre la remise d'un appui.", "forbidden", 403)
    s = SupportInSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    d = dict(s.validated_data)
    producer = get_producer(request.user, d.pop("producer"))
    if pid := d.pop("program", None):
        d["program"] = Program.objects.filter(pk=pid).first()
        if d["program"] is None:
            raise ApiError("Programme inconnu.", "validation_error", 400, fields={"program": ["Inconnu."]})
    return Response(SupportSerializer(services.create_support(request.user, producer, d)).data, status=201)


@api_view(["POST"])
@permission_classes([roles(PRODUCTEUR)])
def support_confirm(request, pk):
    s = selectors.supports_for(request.user).filter(pk=pk).first()
    if s is None:
        raise Http404
    return Response(SupportSerializer(services.confirm_support(request.user, s)).data)


@api_view(["POST"])
@permission_classes([roles(PRODUCTEUR)])
def support_report(request, pk):
    s = selectors.supports_for(request.user).filter(pk=pk).first()
    if s is None:
        raise Http404
    return Response(SupportSerializer(services.report_support_issue(request.user, s, request.data.get("kind"))).data)


@api_view(["GET", "POST"])
@permission_classes([roles(PRODUCTEUR, AGENT, ADMIN)])
def harvest_list(request):
    if request.method == "GET":
        qs = selectors.harvests_for(request.user)
        if cid := request.query_params.get("campaign"):
            qs = qs.filter(campaign_id=cid)
        if (fl := request.query_params.get("flagged")) in ("true", "false"):
            qs = qs.filter(flagged=fl == "true")
        return _paginate(request, qs, HarvestSerializer)
    s = HarvestInSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    d = dict(s.validated_data)
    campaign = Campaign.objects.select_related("parcel__producer").filter(
        pk=d.pop("campaign"), parcel__in=parcels_for(request.user)).first()
    if campaign is None:
        raise Http404
    return Response(HarvestSerializer(services.create_harvest(request.user, campaign, d)).data, status=201)
