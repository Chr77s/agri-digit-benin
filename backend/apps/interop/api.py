"""UC-24 : échange d'agrégats pseudonymisés avec X-Road, SONAMA et FNDA. Aucune donnée personnelle ne sort."""
import time

from django.db import transaction
from django.db.models import Count, Sum
from django.http import Http404
from rest_framework import serializers
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.audit.services import record
from apps.core.errors import ApiError
from apps.core.pagination import Cursor
from apps.core.permissions import ADMIN, roles
from apps.parcels.models import Campaign

from . import selectors, services
from .models import PARTNERS


class InteropThrottle(SimpleRateThrottle):
    """Limite par adresse IP : la clé ne doit pas pouvoir être devinée par essais répétés."""

    scope = "interop"

    def get_rate(self):
        return "60/min"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


def aggregate_rows():
    qs = (Campaign.objects.filter(parcel__producer__status="valide")
          .values("parcel__department", "value_chain")
          .annotate(producers=Count("parcel__producer", distinct=True), area_ha=Sum("parcel__area_ha"),
                    campaigns=Count("id"))
          .order_by("parcel__department", "value_chain"))
    return [{"department": r["parcel__department"], "value_chain": r["value_chain"], "producers": r["producers"],
             "area_ha": round(r["area_ha"] or 0, 2), "campaigns": r["campaigns"]} for r in qs]


def _masked_ip(request):
    ip = request.META.get("REMOTE_ADDR", "")
    parts = ip.split(".")
    return ".".join(parts[:2] + ["x", "x"]) if len(parts) == 4 else "masquée"


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
@throttle_classes([InteropThrottle])
def aggregates(request, partner):
    if partner not in PARTNERS:
        raise Http404
    start = time.monotonic()
    is_admin = request.user.is_authenticated and request.user.role == ADMIN
    if not is_admin and not services.check_key(partner, request.headers.get("X-Api-Key", "")):
        # tentative refusée journalisée (adresse tronquée) : le journal des échanges montre les essais de clé
        record(None, "interop.denied", object_type="partner", object_id=partner, status=401, ip=_masked_ip(request))
        raise ApiError("Clé d'API absente ou invalide.", "unauthorized", 401)
    rows = services.mask_small(aggregate_rows())
    with transaction.atomic():
        record(request.user, "interop.aggregates", object_type="partner", object_id=partner, rows=len(rows),
               via="admin" if is_admin else "api_key", status=200, ms=round((time.monotonic() - start) * 1000))
    return Response({"partner": partner, "results": rows})


@api_view(["GET"])
@permission_classes([roles(ADMIN)])
def connectors(request):
    return Response(selectors.connectors())


class ExchangeSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    at = serializers.DateTimeField()
    partner = serializers.CharField(source="object_id")
    ok = serializers.SerializerMethodField()
    via = serializers.SerializerMethodField()
    rows = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    ip = serializers.SerializerMethodField()

    def get_ok(self, e):
        return e.action == "interop.aggregates"

    def get_via(self, e):
        return e.details.get("via", "refused")

    def get_rows(self, e):
        return e.details.get("rows")

    def get_status(self, e):
        return e.details.get("status", 200 if e.action == "interop.aggregates" else 401)

    def get_ip(self, e):
        return e.details.get("ip", "")


class ExchangePagination(Cursor):
    ordering = "-seq"


@api_view(["GET"])
@permission_classes([roles(ADMIN)])
def exchanges(request):
    qs = selectors.exchanges(request.query_params.get("partner") or None, request.query_params.get("failed") == "1")
    page = ExchangePagination()
    return page.get_paginated_response(ExchangeSerializer(page.paginate_queryset(qs, request), many=True).data)


@api_view(["POST"])
@permission_classes([roles(ADMIN)])
def key_renew(request, partner):
    if partner not in PARTNERS:
        raise Http404
    k, key = services.issue_key(request.user, partner)
    return Response({"partner": partner, "key": key, "created_at": k.created_at}, status=201)


@api_view(["POST"])
@permission_classes([roles(ADMIN)])
def key_revoke(request, partner):
    if partner not in PARTNERS:
        raise Http404
    return Response({"partner": partner, "revoked": services.revoke_key(request.user, partner)})
