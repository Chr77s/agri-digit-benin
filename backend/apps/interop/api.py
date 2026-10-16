"""UC-24 : échange d'agrégats pseudonymisés avec X-Road, SONAMA et FNDA. Aucune donnée personnelle ne sort."""
import hmac

from django.conf import settings
from django.db import transaction
from django.db.models import Count, Sum
from django.http import Http404
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.audit.services import record
from apps.core.errors import ApiError
from apps.core.permissions import ADMIN
from apps.parcels.models import Campaign


class InteropThrottle(SimpleRateThrottle):
    """Limite par adresse IP : la clé ne doit pas pouvoir être devinée par essais répétés."""

    scope = "interop"

    def get_rate(self):
        return "60/min"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


def aggregate_rows():
    # shortcut: pas de seuil de petits effectifs, à ajouter avant d'ouvrir à un partenaire réel
    qs = (Campaign.objects.filter(parcel__producer__status="valide")
          .values("parcel__department", "value_chain")
          .annotate(producers=Count("parcel__producer", distinct=True), area_ha=Sum("parcel__area_ha"),
                    campaigns=Count("id"))
          .order_by("parcel__department", "value_chain"))
    return [{"department": r["parcel__department"], "value_chain": r["value_chain"], "producers": r["producers"],
             "area_ha": round(r["area_ha"] or 0, 2), "campaigns": r["campaigns"]} for r in qs]


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
@throttle_classes([InteropThrottle])
def aggregates(request, partner):
    if partner not in settings.INTEROP_KEYS:
        raise Http404
    expected = settings.INTEROP_KEYS[partner]
    is_admin = request.user.is_authenticated and request.user.role == ADMIN
    given = request.headers.get("X-Api-Key", "")
    if not is_admin and not (expected and hmac.compare_digest(given.encode(), expected.encode())):
        raise ApiError("Clé d'API absente ou invalide.", "unauthorized", 401)
    rows = aggregate_rows()
    with transaction.atomic():
        record(request.user, "interop.aggregates", object_type="partner", object_id=partner, rows=len(rows),
               via="admin" if is_admin else "api_key")
    return Response({"partner": partner, "results": rows})
