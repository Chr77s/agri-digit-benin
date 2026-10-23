from django.db.models import Q, Sum
from django.http import Http404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.errors import ApiError
from apps.core.permissions import ADMIN, AGENT, AUDITEUR, PRODUCTEUR, RESPONSABLE, roles
from apps.producers.selectors import get_producer
from apps.referentiel.data import ALL_VALUE_CHAIN_CODES
from apps.referentiel.models import Department

from . import services
from .models import Equipment, MechRequest, Pmea, SeedLot

GESTIONNAIRE = "gestionnaire_cooperative"
OWNERS = (PRODUCTEUR, GESTIONNAIRE)
STAFF = (AGENT, ADMIN, RESPONSABLE, AUDITEUR)
DEPARTMENT = serializers.SlugRelatedField(slug_field="code", queryset=Department.objects.all())


# ---------- Matériel ----------
class EquipmentIn(serializers.Serializer):
    kind = serializers.ChoiceField(choices=Equipment.KINDS)
    label = serializers.CharField(max_length=120, required=False, allow_blank=True)
    quantity = serializers.IntegerField(min_value=1, max_value=999, required=False)
    condition = serializers.ChoiceField(choices=Equipment.CONDITIONS, required=False)
    acquired_year = serializers.IntegerField(required=False, allow_null=True)
    for_hire = serializers.BooleanField(required=False)
    hire_rate_xof_per_ha = serializers.IntegerField(min_value=1, required=False, allow_null=True)


def equipment_out(e, with_owner=False):
    out = {"id": str(e.id), "kind": e.kind, "label": e.label, "quantity": e.quantity, "condition": e.condition,
           "acquired_year": e.acquired_year, "for_hire": e.for_hire, "hire_rate_xof_per_ha": e.hire_rate_xof_per_ha,
           "department": e.department, "commune": e.commune}
    return {**out, "owner": services.owner_label(e.owner)} if with_owner else out


@api_view(["GET", "POST"])
@permission_classes([roles(*OWNERS, *STAFF)])
def equipment_list(request):
    u = request.user
    if request.method == "POST":
        if u.role not in OWNERS:
            raise ApiError("Seul le propriétaire déclare son matériel.", "forbidden", 403)
        s = EquipmentIn(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(equipment_out(services.create_equipment(u, dict(s.validated_data))), status=201)
    qs = Equipment.objects.select_related("owner__producer").order_by("-created_at")
    if u.role in OWNERS:
        qs = qs.filter(owner=u)
    elif u.role == AGENT and u.department:
        qs = qs.filter(department=u.department)
    if dep := request.query_params.get("department"):
        qs = qs.filter(department=dep)
    return Response({"results": [equipment_out(e, with_owner=u.role not in OWNERS) for e in qs]})


@api_view(["PATCH", "DELETE"])
@permission_classes([roles(*OWNERS)])
def equipment_detail(request, pk):
    e = Equipment.objects.filter(pk=pk, owner=request.user).first()
    if e is None:
        raise Http404
    if request.method == "DELETE":
        if e.requests.filter(status__in=("demandee", "acceptee")).exists():
            raise ApiError("Des demandes de prestation sont en cours sur ce matériel.", "in_use", 409)
        if e.requests.exists():  # l'historique des prestations reste : on retire le matériel de la location
            raise ApiError("Ce matériel a un historique de prestations : retirez-le de la location plutôt que de le "
                           "supprimer.", "has_history", 409)
        e.delete()
        return Response(status=204)
    s = EquipmentIn(data=request.data, partial=True)
    s.is_valid(raise_exception=True)
    return Response(equipment_out(services.update_equipment(request.user, e, dict(s.validated_data))))


@api_view(["GET"])
@permission_classes([roles(*STAFF)])
def equipment_summary(request):
    return Response({"results": services.equipment_summary(request.user)})


# ---------- Mécanisation ----------
class RequestIn(serializers.Serializer):
    equipment = serializers.UUIDField()
    operation = serializers.ChoiceField(choices=MechRequest.OPERATIONS)
    area_ha = serializers.FloatField(min_value=0.1, max_value=1000)
    wished_on = serializers.DateField()
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True)


def request_out(r, me):
    sent = r.requester_id == me.id
    other = r.equipment.owner if sent else r.requester
    visible = r.status in ("acceptee", "realisee")  # le numéro n'est donné qu'après l'accord
    return {"id": str(r.id), "role": "sent" if sent else "received", "status": r.status, "operation": r.operation,
            "area_ha": r.area_ha, "wished_on": r.wished_on, "notes": r.notes, "estimate_xof": r.estimate_xof,
            "area_done_ha": r.area_done_ha, "price_xof": r.price_xof, "created_at": r.created_at,
            "equipment": {"id": str(r.equipment_id), "kind": r.equipment.kind, "label": r.equipment.label,
                          "hire_rate_xof_per_ha": r.equipment.hire_rate_xof_per_ha},
            "counterpart": services.owner_label(other), "counterpart_phone": other.phone if visible else None}


@api_view(["GET"])
@permission_classes([roles(*OWNERS)])
def mech_providers(request):
    dep = request.query_params.get("department") or services.place_of(request.user)[0]
    qs = Equipment.objects.select_related("owner__producer").filter(for_hire=True, department=dep).exclude(
        owner=request.user)
    if k := request.query_params.get("kind"):
        qs = qs.filter(kind=k)
    return Response({"results": [equipment_out(e, with_owner=True) for e in qs.order_by("hire_rate_xof_per_ha")]})


@api_view(["GET", "POST"])
@permission_classes([roles(*OWNERS)])
def mech_requests(request):
    u = request.user
    if request.method == "GET":
        qs = MechRequest.objects.select_related("equipment__owner__producer", "requester__producer").filter(
            Q(requester=u) | Q(equipment__owner=u)).order_by("-created_at")
        return Response({"results": [request_out(r, u) for r in qs]})
    s = RequestIn(data=request.data)
    s.is_valid(raise_exception=True)
    d = dict(s.validated_data)
    e = Equipment.objects.filter(pk=d.pop("equipment")).select_related("owner__producer").first()
    if e is None:
        raise Http404
    return Response(request_out(services.create_request(u, e, d), u), status=201)


def _mine(request, pk):
    r = MechRequest.objects.select_related("equipment__owner__producer", "requester__producer").filter(
        Q(requester=request.user) | Q(equipment__owner=request.user), pk=pk).first()
    if r is None:
        raise Http404
    return r


@api_view(["POST"])
@permission_classes([roles(*OWNERS)])
def mech_decide(request, pk):
    r = services.decide_request(request.user, _mine(request, pk), bool(request.data.get("accept")))
    return Response(request_out(r, request.user))


@api_view(["POST"])
@permission_classes([roles(*OWNERS)])
def mech_complete(request, pk):
    try:
        area = float(request.data["area_done_ha"])
    except (KeyError, TypeError, ValueError):
        raise ApiError("Surface travaillée invalide.", "validation_error", 400,
                       fields={"area_done_ha": ["Nombre attendu."]}) from None
    return Response(request_out(services.complete_request(request.user, _mine(request, pk), area), request.user))


@api_view(["POST"])
@permission_classes([roles(*OWNERS)])
def mech_cancel(request, pk):
    return Response(request_out(services.cancel_request(request.user, _mine(request, pk)), request.user))


# ---------- Semences certifiées ----------
class SeedLotIn(serializers.Serializer):
    value_chain = serializers.ChoiceField(choices=ALL_VALUE_CHAIN_CODES)
    variety = serializers.CharField(max_length=80)
    category = serializers.ChoiceField(choices=SeedLot.CATEGORIES)
    certificate_no = serializers.CharField(max_length=60)
    centre = serializers.CharField(max_length=150)
    department = DEPARTMENT
    produced_on = serializers.DateField()
    quantity_kg = serializers.FloatField(min_value=1)


class DistributeIn(serializers.Serializer):
    producer = serializers.UUIDField()
    quantity_kg = serializers.FloatField(min_value=0.1)
    value_xof = serializers.IntegerField(min_value=0, required=False, default=0)
    repayable = serializers.BooleanField(required=False, default=False)


def lot_out(lot):
    return {"id": str(lot.id), "code": lot.code, "value_chain": lot.value_chain, "variety": lot.variety,
            "category": lot.category, "certificate_no": lot.certificate_no, "centre": lot.centre,
            "department": lot.department, "produced_on": lot.produced_on, "quantity_kg": lot.quantity_kg,
            "available_kg": lot.available_kg, "distributed_kg": round(lot.quantity_kg - lot.available_kg, 3),
            "beneficiaries": lot.distributions.count()}


@api_view(["GET", "POST"])
@permission_classes([roles(*STAFF)])
def seed_lot_list(request):
    u = request.user
    if request.method == "POST":
        if u.role not in (AGENT, ADMIN):
            raise ApiError("Seul un agent ou l'administration enregistre un lot de semences.", "forbidden", 403)
        s = SeedLotIn(data=request.data)
        s.is_valid(raise_exception=True)
        d = dict(s.validated_data)
        d["department"] = d["department"].code
        return Response(lot_out(services.create_seed_lot(u, d)), status=201)
    qs = SeedLot.objects.order_by("-created_at")
    if u.role == AGENT and u.department:
        qs = qs.filter(department=u.department)
    return Response({"results": [lot_out(x) for x in qs], "stock_kg": qs.aggregate(s=Sum("available_kg"))["s"] or 0})


@api_view(["POST"])
@permission_classes([roles(AGENT, ADMIN)])
def seed_lot_distribute(request, pk):
    lot = SeedLot.objects.filter(pk=pk).first()
    if lot is None or (request.user.role == AGENT and request.user.department
                       and lot.department != request.user.department):
        raise Http404
    s = DistributeIn(data=request.data)
    s.is_valid(raise_exception=True)
    d = s.validated_data
    producer = get_producer(request.user, d["producer"])
    services.distribute_seeds(request.user, lot, producer, d["quantity_kg"], d["value_xof"], d["repayable"])
    lot.refresh_from_db()
    return Response(lot_out(lot), status=201)


# ---------- Annuaire des PMEA ----------
class PmeaIn(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    services = serializers.ListField(child=serializers.ChoiceField(choices=Pmea.SERVICES), min_length=1)
    value_chains = serializers.ListField(child=serializers.ChoiceField(choices=ALL_VALUE_CHAIN_CODES), required=False,
                                         default=list)
    department = DEPARTMENT
    commune = serializers.CharField(max_length=40, required=False, allow_blank=True, default="")
    contact_name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    phone = serializers.RegexField(r"^01\d{8}$")
    description = serializers.CharField(max_length=500, required=False, allow_blank=True)


def pmea_out(p, me):
    return {"id": str(p.id), "name": p.name, "services": p.services, "value_chains": p.value_chains,
            "department": p.department, "commune": p.commune, "contact_name": p.contact_name, "phone": p.phone,
            "description": p.description, "verified": p.verified, "mine": p.owner_id == me.id}


@api_view(["GET", "POST"])
def pmea_list(request):
    u = request.user
    if request.method == "GET":
        dep = request.query_params.get("department") or (services.place_of(u)[0] if u.role == PRODUCTEUR else None)
        rows = services.pmea_visible(u, dep, request.query_params.get("service") or None)
        return Response({"results": [pmea_out(p, u) for p in rows], "department": dep})
    if u.role not in services.PMEA_WRITERS:
        raise ApiError("Votre rôle ne permet pas d'inscrire une entreprise.", "forbidden", 403)
    s = PmeaIn(data=request.data)
    s.is_valid(raise_exception=True)
    d = dict(s.validated_data)
    d["department"] = d["department"].code
    return Response(pmea_out(services.create_pmea(u, d), u), status=201)


@api_view(["POST"])
@permission_classes([roles(AGENT, ADMIN)])
def pmea_verify(request, pk):
    p = Pmea.objects.filter(pk=pk).first()
    if p is None:
        raise Http404
    return Response(pmea_out(services.verify_pmea(request.user, p), request.user))
