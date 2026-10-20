import uuid

from django.http import Http404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.errors import ApiError
from apps.core.pagination import Cursor
from apps.core.permissions import ADMIN, AGENT, PRODUCTEUR, roles
from apps.parcels.api import VALUE_CHAINS
from apps.producers.models import Producer
from apps.producers.selectors import producers_for

from . import selectors, services
from .models import MEMBER_ROLES, Cooperative, Membership, MembershipRequest
from .selectors import COOP_MANAGER


class CooperativeSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(max_length=150)
    department = serializers.CharField(max_length=40)
    commune = serializers.CharField(max_length=40)
    value_chains = serializers.ListField(child=serializers.ChoiceField(choices=VALUE_CHAINS), allow_empty=False)
    registration_number = serializers.CharField(max_length=60, required=False, allow_blank=True, default="")
    members_count = serializers.IntegerField(read_only=True, default=0)
    manager_phone = serializers.CharField(source="manager.phone", read_only=True, default=None)


class MemberSerializer(serializers.ModelSerializer):
    producer_id = serializers.UUIDField(source="producer.id", read_only=True)
    producer_code = serializers.CharField(source="producer.code", read_only=True)
    producer_name = serializers.SerializerMethodField()
    cooperative_name = serializers.CharField(source="cooperative.name", read_only=True)

    class Meta:
        model = Membership
        fields = ["id", "cooperative", "cooperative_name", "producer_id", "producer_code", "producer_name", "role",
                  "joined_at", "left_at", "end_reason"]

    def get_producer_name(self, m):
        return f"{m.producer.first_name} {m.producer.last_name}"


class MemberInSerializer(serializers.Serializer):
    producer = serializers.CharField(max_length=40)  # UUID ou code lisible BJ-AGR-...
    role = serializers.ChoiceField(choices=MEMBER_ROLES, default="membre")


class NearbySerializer(serializers.Serializer):
    """Ce qu'un producteur voit d'une coopérative avant d'adhérer : pas de téléphone du gestionnaire."""

    id = serializers.UUIDField()
    name = serializers.CharField()
    department = serializers.CharField()
    commune = serializers.CharField()
    value_chains = serializers.ListField(child=serializers.CharField())
    members_count = serializers.IntegerField()
    request_id = serializers.SerializerMethodField()
    request_status = serializers.SerializerMethodField()
    request_reason = serializers.SerializerMethodField()

    def get_request_id(self, c):
        return str(c.request.id) if c.request else None

    def get_request_status(self, c):
        return c.request.status if c.request else None

    def get_request_reason(self, c):
        return c.request.decision_reason if c.request else ""


class JoinRequestSerializer(serializers.ModelSerializer):
    cooperative_name = serializers.CharField(source="cooperative.name", read_only=True)
    producer_code = serializers.CharField(source="producer.code", read_only=True)
    producer_name = serializers.SerializerMethodField()
    producer_commune = serializers.CharField(source="producer.commune", read_only=True)

    class Meta:
        model = MembershipRequest
        fields = ["id", "cooperative", "cooperative_name", "producer_code", "producer_name", "producer_commune",
                  "message", "status", "decision_reason", "decided_at", "created_at"]

    def get_producer_name(self, r):
        return f"{r.producer.first_name} {r.producer.last_name}"


def _paginate(request, qs, serializer):
    pg = Cursor()
    return pg.get_paginated_response(serializer(pg.paginate_queryset(qs, request), many=True).data)


@api_view(["GET", "POST"])
@permission_classes([roles(AGENT, ADMIN, COOP_MANAGER, PRODUCTEUR)])
def cooperative_list(request):
    if request.method == "GET":
        return _paginate(request, selectors.search(selectors.cooperatives_for(request.user), request.query_params),
                         CooperativeSerializer)
    if request.user.role not in (AGENT, ADMIN):
        raise ApiError("Seul un agent ou un administrateur crée une coopérative.", "forbidden", 403)
    s = CooperativeSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    c = services.create_cooperative(request.user, s.validated_data)
    return Response(CooperativeSerializer(selectors.get_cooperative(request.user, c.pk)).data, status=201)


@api_view(["GET"])
@permission_classes([roles(AGENT, ADMIN, COOP_MANAGER, PRODUCTEUR)])
def cooperative_detail(request, pk):
    return Response(CooperativeSerializer(selectors.get_cooperative(request.user, pk)).data)


def _producer_for_coop(user, coop, ref):
    # gestionnaire et bureau n'ont pas accès au registre : il désigne un producteur du département de sa coopérative
    in_dept = user.role in (COOP_MANAGER, PRODUCTEUR)
    qs = Producer.objects.filter(department=coop.department) if in_dept else producers_for(user)
    try:
        p = qs.filter(pk=uuid.UUID(ref)).first()
    except ValueError:
        p = qs.filter(code=ref).first()
    if p is None:
        raise Http404
    return p


@api_view(["GET", "POST"])
@permission_classes([roles(AGENT, ADMIN, COOP_MANAGER, PRODUCTEUR)])
def cooperative_members(request, pk):
    coop = selectors.get_cooperative(request.user, pk)
    if request.method == "GET":
        qs = coop.memberships.select_related("producer", "cooperative")
        active = request.query_params.get("active")
        if active in ("true", "false"):
            qs = qs.filter(left_at__isnull=active == "true")
        return _paginate(request, qs, MemberSerializer)
    s = MemberInSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    producer = _producer_for_coop(request.user, coop, s.validated_data["producer"])
    return Response(MemberSerializer(services.add_member(request.user, coop, producer, s.validated_data["role"])).data,
                    status=201)


@api_view(["POST"])
@permission_classes([roles(AGENT, ADMIN, COOP_MANAGER, PRODUCTEUR)])
def membership_end(request, pk):
    m = selectors.get_membership(request.user, pk)
    return Response(MemberSerializer(services.end_membership(request.user, m,
                                                             (request.data.get("reason") or "").strip())).data)


@api_view(["GET"])
@permission_classes([roles(PRODUCTEUR)])
def cooperatives_nearby(request):
    producer = getattr(request.user, "producer", None)
    if producer is None:
        raise ApiError("Aucune fiche producteur associée à ce compte.", "no_producer", 400)
    return Response({"results": NearbySerializer(selectors.nearby_for(producer), many=True).data})


@api_view(["POST"])
@permission_classes([roles(PRODUCTEUR)])
def cooperative_join_request(request, pk):
    coop = Cooperative.objects.filter(pk=pk).first()
    if coop is None:
        raise Http404
    r = services.request_join(request.user, coop, (request.data.get("message") or "").strip()[:500])
    return Response(JoinRequestSerializer(r).data, status=201)


@api_view(["GET"])
@permission_classes([roles(PRODUCTEUR, AGENT, ADMIN, COOP_MANAGER)])
def join_request_list(request):
    qs = selectors.join_requests_for(request.user)
    if (s := request.query_params.get("status")) in ("en_attente", "acceptee", "refusee"):
        qs = qs.filter(status=s)
    if c := request.query_params.get("cooperative"):
        qs = qs.filter(cooperative_id=c)
    return _paginate(request, qs.order_by("-created_at"), JoinRequestSerializer)


@api_view(["POST"])
@permission_classes([roles(AGENT, ADMIN, COOP_MANAGER, PRODUCTEUR)])
def join_request_decide(request, pk):
    # décider : seulement les demandes des coopératives gérées, jamais la sienne
    r = MembershipRequest.objects.filter(pk=pk, cooperative__in=selectors.cooperatives_for(request.user).values("pk")
                                         ).exclude(producer__user=request.user).select_related("cooperative",
                                                                                              "producer").first()
    if r is None:
        raise Http404
    return Response(JoinRequestSerializer(services.decide_request(
        request.user, r, request.data.get("status"), (request.data.get("reason") or "").strip())).data)


@api_view(["GET"])
@permission_classes([roles(PRODUCTEUR)])
def memberships_mine(request):
    qs = Membership.objects.select_related("producer", "cooperative").filter(producer__user=request.user)
    return _paginate(request, qs, MemberSerializer)
