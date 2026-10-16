from django.http import Http404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.pagination import Cursor
from apps.core.permissions import ADMIN, roles
from apps.referentiel.models import Commune, ValueChain

from . import selectors, services
from .services import MARKET_ROLES, mask


class OfferSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    type = serializers.CharField()
    value_chain = serializers.CharField()
    quantity_kg = serializers.IntegerField()
    price_xof_per_kg = serializers.IntegerField()
    department = serializers.CharField()
    commune = serializers.CharField()
    description = serializers.CharField()
    status = serializers.CharField()
    created_at = serializers.DateTimeField()
    owner_role = serializers.CharField(source="owner.role")
    owner_phone_masked = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()

    def get_owner_phone_masked(self, o):
        return mask(o.owner.phone)

    def get_is_mine(self, o):
        return o.owner_id == self.context["user"].id


class OfferIn(serializers.Serializer):
    type = serializers.ChoiceField(choices=["offre", "demande"])
    value_chain = serializers.CharField(max_length=40)
    quantity_kg = serializers.IntegerField(min_value=1, max_value=10_000_000)
    price_xof_per_kg = serializers.IntegerField(min_value=1, max_value=10_000_000)
    department = serializers.CharField(max_length=40)
    commune = serializers.CharField(max_length=40)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True, default="")

    def validate_value_chain(self, v):
        if not ValueChain.objects.filter(code=v).exists():
            raise serializers.ValidationError("Filière inconnue.")
        return v

    def validate(self, d):
        if not Commune.objects.filter(code=d["commune"], department_id=d["department"]).exists():
            raise serializers.ValidationError({"commune": ["Commune inconnue pour ce département."]})
        return d


class MatchSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    offer = serializers.UUIDField(source="offer_id")
    offer_summary = serializers.SerializerMethodField()
    requester = serializers.UUIDField(source="requester_id")
    message = serializers.CharField()
    status = serializers.CharField()
    created_at = serializers.DateTimeField()
    decided_at = serializers.DateTimeField()
    is_owner = serializers.SerializerMethodField()
    counterpart_phone = serializers.SerializerMethodField()

    def get_offer_summary(self, m):
        o = m.offer
        return {"type": o.type, "value_chain": o.value_chain, "quantity_kg": o.quantity_kg,
                "price_xof_per_kg": o.price_xof_per_kg, "status": o.status}

    def get_is_owner(self, m):
        return m.offer.owner_id == self.context["user"].id

    def get_counterpart_phone(self, m):
        # le numéro n'est révélé qu'après acceptation
        phone = services.counterpart(self.context["user"], m).phone
        return phone if m.status == "acceptee" else mask(phone)


class MessageIn(serializers.Serializer):
    message = serializers.CharField(max_length=1000, required=False, allow_blank=True, default="")


class PaymentIn(serializers.Serializer):
    match = serializers.UUIDField()
    amount_xof = serializers.IntegerField(min_value=1)
    payer_phone = serializers.CharField(max_length=10)


def payment_out(p):
    return {"id": str(p.id), "match": str(p.match_id), "amount_xof": p.amount_xof, "status": p.status,
            "provider": p.provider, "reference": p.reference, "payer_masked": mask(p.payer_phone),
            "created_at": p.created_at, "paid_at": p.paid_at, "refunded_at": p.refunded_at,
            "receipt": services.receipt(p), "simulation": True}


@api_view(["GET", "POST"])
@permission_classes([roles(*MARKET_ROLES, ADMIN)])
def offer_list(request):
    u = request.user
    if request.method == "POST":
        if u.role not in MARKET_ROLES:
            return Response({"detail": "Action non autorisée pour votre rôle.", "code": "forbidden"}, status=403)
        s = OfferIn(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(OfferSerializer(services.create_offer(u, s.validated_data), context={"user": u}).data,
                        status=201)
    q = request.query_params
    pg = Cursor()
    page = pg.paginate_queryset(selectors.offers(u, q.get("type"), q.get("value_chain"), q.get("department")),
                                request)
    return pg.get_paginated_response(OfferSerializer(page, many=True, context={"user": u}).data)


@api_view(["POST"])
@permission_classes([roles(*MARKET_ROLES)])
def offer_contact(request, pk):
    o = selectors.offer_for_contact(pk)
    if o is None:
        raise Http404
    s = MessageIn(data=request.data)
    s.is_valid(raise_exception=True)
    m = services.contact(request.user, o, s.validated_data["message"])
    return Response(MatchSerializer(m, context={"user": request.user}).data, status=201)


@api_view(["GET"])
@permission_classes([roles(*MARKET_ROLES)])
def matches_mine(request):
    pg = Cursor()
    page = pg.paginate_queryset(selectors.matches_mine(request.user), request)
    return pg.get_paginated_response(MatchSerializer(page, many=True, context={"user": request.user}).data)


def _decide(request, pk, accept):
    m = selectors.match_for_party(request.user, pk)
    if m is None:
        raise Http404
    m = services.decide(request.user, m, accept)
    return Response(MatchSerializer(m, context={"user": request.user}).data)


@api_view(["POST"])
@permission_classes([roles(*MARKET_ROLES)])
def match_accept(request, pk):
    return _decide(request, pk, True)


@api_view(["POST"])
@permission_classes([roles(*MARKET_ROLES)])
def match_refuse(request, pk):
    return _decide(request, pk, False)


@api_view(["POST"])
@permission_classes([roles(*MARKET_ROLES)])
def payment_create(request):
    s = PaymentIn(data=request.data)
    s.is_valid(raise_exception=True)
    m = selectors.match_for_party(request.user, s.validated_data["match"])
    if m is None:
        raise Http404
    p = services.create_payment(request.user, m, s.validated_data["amount_xof"], s.validated_data["payer_phone"])
    return Response(payment_out(p), status=201)


@api_view(["GET"])
@permission_classes([roles(*MARKET_ROLES, ADMIN)])
def payment_detail(request, pk):
    p = selectors.payment_visible(request.user, pk)
    if p is None:
        raise Http404
    return Response(payment_out(services.refresh(p)))


@api_view(["POST"])
@permission_classes([roles(ADMIN)])
def payment_refund(request, pk):
    p = selectors.payment_visible(request.user, pk)
    if p is None:
        raise Http404
    return Response(payment_out(services.refund(request.user, services.refresh(p))))
