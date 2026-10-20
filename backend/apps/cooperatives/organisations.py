"""Gouvernance des filières (TDR § 3.1) : unions, fédérations, interprofessions, OIA et OPA, leurs coopératives
membres, leurs effectifs, leur fonctionnement (réunions, prix convenus) et les formations reçues."""
from django.db import transaction
from django.db.models import Count, Q
from django.http import Http404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.audit.services import record
from apps.core.errors import ApiError
from apps.core.permissions import ADMIN, AGENT, roles
from apps.referentiel.data import ALL_VALUE_CHAIN_CODES

from .models import Cooperative, Membership, Organisation, OrgEvent

READ = (AGENT, ADMIN, "responsable_programme", "auditeur_copil", "gestionnaire_cooperative")
WRITE = (AGENT, ADMIN)


def orgs_for(user):
    qs = Organisation.objects.all()
    if user.role == AGENT:  # son département et les organisations nationales
        return qs.filter(Q(department=user.department) | Q(department=""))
    if user.role == "gestionnaire_cooperative":
        return qs.filter(cooperatives__manager=user).distinct()
    return qs


def headcount(org):
    """Effectifs : coopératives membres (directes et des organisations filles), producteurs actifs, dont femmes."""
    coop_ids = set(org.cooperatives.values_list("id", flat=True))
    for child in org.children.all():
        coop_ids |= set(child.cooperatives.values_list("id", flat=True))
    m = Membership.objects.filter(cooperative_id__in=coop_ids, left_at__isnull=True)
    agg = m.aggregate(producers=Count("producer", distinct=True),
                      women=Count("producer", distinct=True, filter=Q(producer__sex="F")))
    return {"cooperatives": len(coop_ids), **agg}


class OrgSerializer(serializers.ModelSerializer):
    kind = serializers.ChoiceField(choices=Organisation.KINDS)
    value_chains = serializers.ListField(child=serializers.ChoiceField(choices=ALL_VALUE_CHAIN_CODES), required=False)
    parent_name = serializers.CharField(source="parent.name", default=None, read_only=True)
    headcount = serializers.SerializerMethodField()

    class Meta:
        model = Organisation
        fields = ["id", "name", "kind", "value_chains", "department", "registration_number", "parent", "parent_name",
                  "headcount", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_headcount(self, o):
        return headcount(o)


class EventSerializer(serializers.ModelSerializer):
    kind = serializers.ChoiceField(choices=OrgEvent.KINDS)

    class Meta:
        model = OrgEvent
        fields = ["id", "kind", "date", "title", "notes", "price_xof_per_kg", "participants", "women", "youth",
                  "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate(self, d):
        n = d.get("participants")
        if n is not None and ((d.get("women") or 0) > n or (d.get("youth") or 0) > n):
            raise serializers.ValidationError({"women": ["Plus que le nombre de participants."]})
        if d["kind"] == "prix" and not d.get("price_xof_per_kg"):
            raise serializers.ValidationError({"price_xof_per_kg": ["Obligatoire pour un prix convenu."]})
        return d


@api_view(["GET", "POST"])
@permission_classes([roles(*READ)])
def organisation_list(request):
    u = request.user
    if request.method == "POST":
        if u.role not in WRITE:
            raise ApiError("Seul un agent ou un administrateur enregistre une organisation.", "forbidden", 403)
        s = OrgSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        if u.role == AGENT and s.validated_data.get("department") != u.department:
            raise ApiError("Vous enregistrez les organisations de votre département.", "out_of_scope", 403)
        with transaction.atomic():
            o = s.save(created_by=u)
            record(u, "organisation.create", o, kind=o.kind)
        return Response(OrgSerializer(o).data, status=201)
    qs = orgs_for(u).select_related("parent").order_by("name")
    return Response({"results": OrgSerializer(qs, many=True).data})


def _get(user, pk):
    o = orgs_for(user).filter(pk=pk).first()
    if o is None:
        raise Http404
    return o


@api_view(["GET"])
@permission_classes([roles(*READ)])
def organisation_detail(request, pk):
    o = _get(request.user, pk)
    return Response({**OrgSerializer(o).data,
                     "cooperatives": list(o.cooperatives.values("id", "name", "department", "commune")),
                     "events": EventSerializer(o.events.all(), many=True).data})


@api_view(["POST"])
@permission_classes([roles(*WRITE)])
def organisation_add_cooperative(request, pk):
    o = _get(request.user, pk)
    c = Cooperative.objects.filter(pk=request.data.get("cooperative")).first()
    if c is None or (request.user.role == AGENT and c.department != request.user.department):
        raise Http404
    o.cooperatives.add(c)
    record(request.user, "organisation.add_cooperative", o, cooperative=str(c.id))
    return Response(OrgSerializer(o).data)


@api_view(["POST"])
@permission_classes([roles(*WRITE)])
def organisation_event(request, pk):
    o = _get(request.user, pk)
    s = EventSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    e = s.save(organisation=o, created_by=request.user)
    record(request.user, "organisation.event", o, kind=e.kind, date=str(e.date))
    return Response(EventSerializer(e).data, status=201)
