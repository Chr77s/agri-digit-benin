import re

from django.conf import settings
from django.http import Http404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.accounts.api import _phone
from apps.core.errors import ApiError
from apps.core.pagination import Cursor
from apps.core.permissions import ADMIN, AGENT, PRODUCTEUR, roles

from . import selectors, services
from .models import Consent, Producer

LANGS = ["fr", "fon", "bba", "yo", "dnd"]


def _npi(v):
    if not re.match(settings.NPI_REGEX, v or ""):
        raise serializers.ValidationError("NPI invalide (10 chiffres).")
    return v


class ProducerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producer
        fields = ["id", "code", "npi", "first_name", "last_name", "sex", "birth_date", "department", "commune",
                  "phone", "language", "status", "reject_reason", "created_at", "validated_at"]


class RegisterSerializer(serializers.Serializer):
    npi = serializers.CharField(validators=[_npi])
    first_name = serializers.CharField(max_length=80)
    last_name = serializers.CharField(max_length=80)
    sex = serializers.ChoiceField(choices=["F", "M"])
    birth_date = serializers.DateField()
    department = serializers.CharField(max_length=40)
    commune = serializers.CharField(max_length=40)
    phone = serializers.CharField(validators=[_phone])
    language = serializers.ChoiceField(choices=LANGS, default="fr")
    consent_accepted = serializers.BooleanField()
    consent_text_version = serializers.CharField(max_length=10, default="v1")
    guardian_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    guardian_npi = serializers.CharField(max_length=20, required=False, allow_blank=True)
    guardian_consent = serializers.BooleanField(required=False, default=False)


class PatchSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=80, required=False)
    last_name = serializers.CharField(max_length=80, required=False)
    sex = serializers.ChoiceField(choices=["F", "M"], required=False)
    birth_date = serializers.DateField(required=False)
    commune = serializers.CharField(max_length=40, required=False)
    phone = serializers.CharField(validators=[_phone], required=False)
    language = serializers.ChoiceField(choices=LANGS, required=False)


class ConsentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Consent
        fields = ["id", "type", "text_version", "channel", "created_at", "withdrawn_at"]


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    s = RegisterSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    return Response(ProducerSerializer(services.register(request.user, s.validated_data)).data, status=201)


@api_view(["GET"])
def producer_list(request):
    qs = selectors.search(selectors.producers_for(request.user), request.query_params)
    pg = Cursor()
    page = pg.paginate_queryset(qs, request)
    return pg.get_paginated_response(ProducerSerializer(page, many=True).data)


@api_view(["GET", "PATCH"])
def producer_detail(request, pk):
    p = selectors.get_producer(request.user, pk)
    if request.method == "GET":
        return Response(ProducerSerializer(p).data)
    if request.user.role not in (AGENT, ADMIN):
        raise ApiError("Seul un agent ou un administrateur corrige une fiche.", "forbidden", 403)
    s = PatchSerializer(data=request.data, partial=True)
    s.is_valid(raise_exception=True)
    return Response(ProducerSerializer(services.update(request.user, p, s.validated_data)).data)


@api_view(["POST"])
@permission_classes([roles(AGENT, ADMIN)])
def producer_validate(request, pk):
    return Response(ProducerSerializer(services.validate(request.user, selectors.get_producer(request.user, pk))).data)


@api_view(["POST"])
@permission_classes([roles(AGENT, ADMIN)])
def producer_reject(request, pk):
    p = selectors.get_producer(request.user, pk)
    reason = (request.data.get("reason") or "").strip()
    if not reason:
        raise ApiError("Le motif du rejet est obligatoire.", "reason_required", 400,
                       fields={"reason": ["Obligatoire."]})
    return Response(ProducerSerializer(services.reject(request.user, p, reason)).data)


@api_view(["GET"])
def producer_versions(request, pk):
    p = selectors.get_producer(request.user, pk)
    return Response([{"version": v.version, "data": v.data, "reason": v.reason, "created_at": v.created_at,
                      "changed_by": v.changed_by.phone if v.changed_by else None}
                     for v in p.versions.order_by("version").select_related("changed_by")])


@api_view(["GET"])
@permission_classes([roles(PRODUCTEUR)])
def consents_mine(request):
    p = getattr(request.user, "producer", None)
    qs = p.consents.order_by("-created_at") if p else Consent.objects.none()
    return Response(ConsentSerializer(qs, many=True).data)


@api_view(["POST"])
@permission_classes([roles(PRODUCTEUR)])
def consent_withdraw(request, pk):
    c = Consent.objects.filter(pk=pk, producer__user=request.user).first()
    if c is None:
        raise Http404
    return Response(ConsentSerializer(services.withdraw_consent(request.user, c)).data)
