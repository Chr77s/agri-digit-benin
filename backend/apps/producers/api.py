import re

from django.conf import settings
from django.http import Http404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle

from apps.accounts.api import _phone
from apps.core.errors import ApiError
from apps.core.pagination import Cursor
from apps.core.permissions import ADMIN, AGENT, PRODUCTEUR, roles
from apps.core.versioning import check_version

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
                  "phone", "language", "status", "reject_reason", "created_at", "validated_at", "version"]


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
    forced, base = check_version(request.data, p, lambda o: ProducerSerializer(o).data)
    return Response(ProducerSerializer(services.update(request.user, p, s.validated_data, forced, base)).data)


@api_view(["GET"])
@permission_classes([roles(PRODUCTEUR, AGENT, ADMIN)])
def producer_card(request, pk):
    p = services.issue_card(request.user, selectors.get_producer(request.user, pk))
    return Response({"code": p.code, "full_name": f"{p.first_name} {p.last_name}", "commune": p.commune,
                     "department": p.department, "status": p.status, "verification_code": p.verification_code,
                     "verify_url": request.build_absolute_uri(f"/api/v1/verify/{p.verification_code}"),
                     "issued_at": p.card_issued_at})


class VerifyThrottle(SimpleRateThrottle):
    """Limite par adresse IP, connecté ou non (le code de 8 caractères ne doit pas être énumérable)."""

    scope = "verify"

    def get_rate(self):
        return settings.VERIFY_THROTTLE_RATE

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


@api_view(["GET"])
@permission_classes([AllowAny])
@throttle_classes([VerifyThrottle])
def verify(request, code):
    # tiers qui scanne la carte : statut et nom seulement (minimisation, art. 424)
    p = Producer.objects.filter(verification_code=code.upper()).first()
    if p is None:
        raise Http404
    return Response({"status": p.status, "full_name": f"{p.first_name} {p.last_name}"})


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
