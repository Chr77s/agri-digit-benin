from django.http import Http404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.errors import ApiError
from apps.core.permissions import roles

from . import showcase, trainings
from .models import Showcase, Training, TrainingRegistration

VIEWERS = (*trainings.ACTORS, *trainings.STAFF)


class TrainingIn(serializers.Serializer):
    title = serializers.CharField(max_length=150)
    theme = serializers.ChoiceField(choices=Training.THEMES)
    department = serializers.CharField(max_length=40)
    date = serializers.DateField()
    place = serializers.CharField(max_length=150)
    seats = serializers.IntegerField(min_value=1, max_value=1000)
    audience = serializers.ListField(child=serializers.ChoiceField(choices=Training.AUDIENCES), min_length=1)


def _training_out(t, user, c, mine):
    out = {"id": str(t.id), "title": t.title, "theme": t.theme, "department": t.department, "date": t.date,
           "place": t.place, "seats": t.seats, "audience": t.audience, "registered": c["registered"],
           "seats_left": max(0, t.seats - c["registered"]), "manage": trainings.can_manage(user, t)}
    if user.role in trainings.ACTORS:
        reg = mine.get(t.id)
        out["my_registration"] = None if reg is None else {"id": str(reg.id), "attended": reg.attended}
    if trainings.can_manage(user, t):
        out.update(present=c["present"], absent=c["absent"])
    return out


@api_view(["GET", "POST"])
@permission_classes([roles(*VIEWERS)])
def training_list(request):
    u = request.user
    if request.method == "POST":
        if u.role not in trainings.MANAGERS:
            raise ApiError("Seul un agent ou l'administration crée une formation.", "forbidden", 403)
        s = TrainingIn(data=request.data)
        s.is_valid(raise_exception=True)
        t = trainings.create_training(u, dict(s.validated_data))
        return Response(_training_out(t, u, {"registered": 0, "present": 0, "absent": 0}, {}), status=201)
    ts = trainings.trainings_for(u)
    c = trainings.counts(ts)
    mine = {r.training_id: r for r in TrainingRegistration.objects.filter(user=u, training__in=[t.id for t in ts])}
    return Response({"results": [_training_out(t, u, c[t.id], mine) for t in ts]})


@api_view(["GET"])
@permission_classes([roles(*trainings.MANAGERS, "responsable_programme")])
def training_report(request):
    return Response(trainings.report(request.user))


def _visible(request, pk):
    t = next((x for x in trainings.trainings_for(request.user) if str(x.id) == str(pk)), None)
    if t is None:
        raise Http404
    return t


@api_view(["POST", "DELETE"])
@permission_classes([roles(*trainings.ACTORS)])
def training_register(request, pk):
    t = _visible(request, pk)
    if request.method == "POST":
        r = trainings.register(request.user, t)
        return Response({"id": str(r.id), "attended": r.attended}, status=201)
    trainings.unregister(request.user, t)
    return Response(status=204)


@api_view(["GET"])
@permission_classes([roles(*trainings.MANAGERS)])
def training_registrations(request, pk):
    t = _visible(request, pk)
    if not trainings.can_manage(request.user, t):
        raise Http404
    regs = t.registrations.select_related("user").order_by("created_at")
    return Response({"results": [{
        "id": str(r.id), "name": r.user.full_name or f"{r.user.phone[:2]}****{r.user.phone[-4:]}",
        "role": r.user.role, "commune": r.user.commune, "attended": r.attended} for r in regs]})


class AttendanceIn(serializers.Serializer):
    registration = serializers.UUIDField()
    present = serializers.BooleanField()


@api_view(["POST"])
@permission_classes([roles(*trainings.MANAGERS)])
def training_attendance(request, pk):
    t = _visible(request, pk)
    s = AttendanceIn(data=request.data)
    s.is_valid(raise_exception=True)
    reg = t.registrations.filter(pk=s.validated_data["registration"]).first()
    if reg is None:
        raise Http404
    r = trainings.mark_attendance(request.user, t, reg, s.validated_data["present"])
    return Response({"id": str(r.id), "attended": r.attended})


class ShowcaseIn(serializers.Serializer):
    company = serializers.CharField(max_length=150)
    name = serializers.CharField(max_length=150)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True, default="")
    value_chain = serializers.CharField(max_length=40)
    form = serializers.ChoiceField(choices=["brut", "transforme"])
    price_xof_per_kg = serializers.IntegerField(required=False, allow_null=True, default=None)
    department = serializers.CharField(max_length=40)
    contact = serializers.CharField(max_length=120)


def _showcase_out(s, user):
    return {"id": str(s.id), "company": s.company, "name": s.name, "description": s.description,
            "value_chain": s.value_chain, "form": s.form, "price_xof_per_kg": s.price_xof_per_kg,
            "department": s.department, "contact": s.contact, "status": s.status, "created_at": s.created_at,
            "is_mine": s.owner_id == user.id}


@api_view(["GET", "POST"])
def showcase_list(request):
    u = request.user
    if request.method == "POST":
        if u.role not in showcase.WRITERS:
            raise ApiError("Seuls un transformateur, un distributeur ou une coopérative publient leurs produits.",
                           "forbidden", 403)
        s = ShowcaseIn(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(_showcase_out(showcase.publish(u, dict(s.validated_data)), u), status=201)
    qs = Showcase.objects.filter(status="publie").order_by("-created_at")
    q = request.query_params
    for field in ("value_chain", "department", "form"):
        if q.get(field):
            qs = qs.filter(**{field: q[field]})
    if q.get("mine"):
        qs = qs.filter(owner=u)
    return Response({"results": [_showcase_out(s, u) for s in qs]})


@api_view(["POST"])
@permission_classes([roles(*showcase.WRITERS, "admin_maep")])
def showcase_withdraw(request, pk):
    s = Showcase.objects.filter(pk=pk).first()
    if s is None:
        raise Http404
    return Response(_showcase_out(showcase.withdraw(request.user, s), request.user))
