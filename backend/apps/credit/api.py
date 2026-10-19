from django.http import Http404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.errors import ApiError
from apps.core.pagination import Cursor
from apps.core.permissions import FINANCIER, PRODUCTEUR, roles
from apps.producers.models import Consent, Producer

from . import services


def _producer(user):
    p = getattr(user, "producer", None)
    if p is None:
        raise ApiError("Aucune fiche producteur associée à ce compte.", "no_producer", 400)
    return p


def _consent_out(c):
    return {"id": str(c.id), "type": c.type, "text_version": c.text_version, "created_at": c.created_at,
            "withdrawn_at": c.withdrawn_at}


@api_view(["POST"])
@permission_classes([roles(PRODUCTEUR)])
def consent(request):
    c = services.give_consent(request.user, _producer(request.user), request.data.get("text_version") or "v1")
    return Response(_consent_out(c), status=201)


@api_view(["POST"])
@permission_classes([roles(PRODUCTEUR)])
def consent_withdraw(request):
    return Response(_consent_out(services.withdraw_consent(request.user, _producer(request.user))))


def _consenting():
    return Producer.objects.filter(consents__type="credit", consents__withdrawn_at__isnull=True).distinct()


@api_view(["GET"])
@permission_classes([roles(FINANCIER)])
def consented_producers(request):
    pg = Cursor()
    page = pg.paginate_queryset(_consenting(), request)
    since = {c.producer_id: c.created_at for c in Consent.objects.filter(
        producer__in=page, type="credit", withdrawn_at__isnull=True)}
    return pg.get_paginated_response([{"id": str(p.id), "code": p.code, "first_name": p.first_name,
                                       "last_name": p.last_name, "commune": p.commune,
                                       "consented_at": since.get(p.id)} for p in page])


@api_view(["GET"])
@permission_classes([roles(FINANCIER)])
def score(request, producer_id):
    p = Producer.objects.filter(pk=producer_id).first()
    result = services.consult(request.user, p) if p else None
    if result is None:  # pas de consentement actif : indiscernable d'un producteur inexistant
        raise Http404
    return Response(result)
