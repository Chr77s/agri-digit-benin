from django.http import Http404
from rest_framework import serializers
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.errors import ApiError
from apps.core.permissions import ADMIN, AGENT, PRODUCTEUR
from apps.producers.selectors import get_producer, producers_for

from . import services
from .models import Campaign, Parcel

VALUE_CHAINS = ["coton", "anacarde", "ananas", "mais", "riz", "soja", "manioc", "niebe", "elevage",
                "peche_aquaculture"]
STAGES = ["semis", "croissance", "floraison", "recolte"]


class ParcelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Parcel
        fields = ["id", "producer", "name", "geometry", "land_type", "tenure", "area_ha", "overlap_warning",
                  "overlap_with", "created_at"]


class ParcelInSerializer(serializers.Serializer):
    producer = serializers.UUIDField(required=False)
    name = serializers.CharField(max_length=100)
    geometry = serializers.JSONField()
    land_type = serializers.ChoiceField(choices=["pluvial_plateau", "bas_fond", "irrigue"])
    tenure = serializers.ChoiceField(choices=["propriete", "location", "pret", "coutumier", "autre"])


class CampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = ["id", "parcel", "value_chain", "season", "stage", "created_at"]


class CampaignInSerializer(serializers.Serializer):
    parcel = serializers.UUIDField()
    value_chain = serializers.ChoiceField(choices=VALUE_CHAINS)
    season = serializers.RegexField(r"^\d{4}-[a-z0-9-]{3,12}$")
    stage = serializers.ChoiceField(choices=STAGES)


def _check_role(user, write=False):
    if user.role not in (PRODUCTEUR, AGENT, ADMIN):
        raise ApiError("Action non autorisée pour votre rôle.", "forbidden", 403)


def parcels_for(user):
    _check_role(user)
    return Parcel.objects.filter(producer__in=producers_for(user))


@api_view(["GET", "POST"])
def parcel_list(request):
    if request.method == "GET":
        qs = parcels_for(request.user).order_by("-created_at")
        if pid := request.query_params.get("producer"):
            qs = qs.filter(producer_id=pid)
        return Response(ParcelSerializer(qs, many=True).data)
    _check_role(request.user)
    s = ParcelInSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    d = s.validated_data
    if request.user.role == PRODUCTEUR:
        producer = getattr(request.user, "producer", None)
        if producer is None or (d.get("producer") and d["producer"] != producer.id):
            raise Http404
    else:
        if not d.get("producer"):
            raise ApiError("Le producteur est obligatoire.", "validation_error", 400,
                           fields={"producer": ["Obligatoire."]})
        producer = get_producer(request.user, d["producer"])
    return Response(ParcelSerializer(services.create_parcel(request.user, producer, d)).data, status=201)


@api_view(["GET", "POST"])
def campaign_list(request):
    if request.method == "GET":
        qs = Campaign.objects.filter(parcel__in=parcels_for(request.user)).order_by("-created_at")
        if pid := request.query_params.get("parcel"):
            qs = qs.filter(parcel_id=pid)
        return Response(CampaignSerializer(qs, many=True).data)
    s = CampaignInSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    d = dict(s.validated_data)
    parcel = parcels_for(request.user).filter(pk=d.pop("parcel")).first()
    if parcel is None:
        raise Http404
    return Response(CampaignSerializer(services.create_campaign(request.user, parcel, d)).data, status=201)


@api_view(["PATCH"])
def campaign_detail(request, pk):
    c = Campaign.objects.filter(pk=pk, parcel__in=parcels_for(request.user)).first()
    if c is None:
        raise Http404
    stage = request.data.get("stage")
    if stage not in STAGES:
        raise ApiError("Stade invalide.", "validation_error", 400, fields={"stage": ["Stade invalide."]})
    return Response(CampaignSerializer(services.set_stage(request.user, c, stage)).data)
