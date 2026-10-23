import uuid

from django.http import Http404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.permissions import roles

from . import lots
from .models import Harvest, Lot, Site

ALL = (*lots.HOLDERS, *lots.READERS)


class SiteSerializer(serializers.ModelSerializer):
    kind = serializers.ChoiceField(choices=Site.KINDS)

    class Meta:
        model = Site
        fields = ["id", "kind", "name", "department", "commune", "lat", "lon", "capacity_t", "equipment", "created_at"]
        read_only_fields = ["id", "created_at"]


class LotSerializer(serializers.ModelSerializer):
    site_name = serializers.CharField(source="site.name", default=None, read_only=True)
    parents = serializers.SlugRelatedField(slug_field="code", many=True, read_only=True)

    class Meta:
        model = Lot
        fields = ["id", "code", "value_chain", "product", "quantity_kg", "status", "site", "site_name", "parents",
                  "created_at"]


@api_view(["GET", "POST"])
@permission_classes([roles(*ALL)])
def site_list(request):
    u = request.user
    if request.method == "POST":
        s = SiteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(SiteSerializer(lots.create_site(u, s.validated_data)).data, status=201)
    qs = Site.objects.all() if u.role == "admin_maep" else Site.objects.filter(department=u.department) \
        if u.role == "agent_atda" else Site.objects.filter(owner=u)
    return Response({"results": SiteSerializer(qs.order_by("name"), many=True).data})


@api_view(["GET"])
@permission_classes([roles(*lots.HOLDERS)])
def lot_list(request):
    qs = Lot.objects.filter(holder=request.user).select_related("site").prefetch_related("parents")
    harvests = [{"id": str(h.id), "producer_code": h.campaign.parcel.producer.code,
                 "value_chain": h.campaign.value_chain, "harvested_at": h.harvested_at,
                 "available_kg": round(h.stored_kg - (h.collected or 0), 3)}
                for h in lots.harvests_collectable(request.user) if h.stored_kg - (h.collected or 0) > 0]
    return Response({"results": LotSerializer(qs.order_by("-created_at"), many=True).data, "harvests": harvests})


class CollectIn(serializers.Serializer):
    harvest = serializers.UUIDField()
    quantity_kg = serializers.FloatField(min_value=0.001)
    site = serializers.UUIDField(required=False, allow_null=True)


@api_view(["POST"])
@permission_classes([roles(*lots.HOLDERS)])
def lot_collect(request):
    s = CollectIn(data=request.data)
    s.is_valid(raise_exception=True)
    h = Harvest.objects.select_related("campaign__parcel__producer").filter(pk=s.validated_data["harvest"]).first()
    if h is None:
        raise Http404
    lot = lots.collect(request.user, h, s.validated_data["quantity_kg"], s.validated_data.get("site"))
    return Response(LotSerializer(lot).data, status=201)


class TransferIn(serializers.Serializer):
    to_phone = serializers.RegexField(r"^01\d{8}$")
    quantity_kg = serializers.FloatField(min_value=0.001)


@api_view(["POST"])
@permission_classes([roles(*lots.HOLDERS)])
def lot_transfer(request, pk):
    lot = Lot.objects.filter(pk=pk, holder=request.user).first()
    if lot is None:
        raise Http404
    s = TransferIn(data=request.data)
    s.is_valid(raise_exception=True)
    return Response(LotSerializer(lots.transfer(request.user, lot, **s.validated_data)).data, status=201)


class TransformIn(serializers.Serializer):
    parents = serializers.ListField(child=serializers.UUIDField(), min_length=1, max_length=50)
    product = serializers.CharField(max_length=120)
    quantity_kg = serializers.FloatField(min_value=0.001)
    site = serializers.UUIDField(required=False, allow_null=True)


@api_view(["POST"])
@permission_classes([roles(*lots.HOLDERS)])
def lot_transform(request):
    s = TransformIn(data=request.data)
    s.is_valid(raise_exception=True)
    parents = list(Lot.objects.filter(pk__in=s.validated_data["parents"], holder=request.user))
    if len(parents) != len(set(s.validated_data["parents"])):
        raise Http404
    lot = lots.transform(request.user, parents, s.validated_data["product"], s.validated_data["quantity_kg"],
                         s.validated_data.get("site"))
    return Response(LotSerializer(lot).data, status=201)


@api_view(["GET"])
@permission_classes([roles(*ALL)])
def lot_trace(request, ref):
    try:
        lot = Lot.objects.filter(pk=uuid.UUID(ref)).first()
    except ValueError:  # code imprimé sur le sac : LOT-XXXXXX
        lot = Lot.objects.filter(code=ref.upper()).first()
    if lot is None or not lots.visible(request.user, lot):
        raise Http404
    return Response(lots.trace(lot))
