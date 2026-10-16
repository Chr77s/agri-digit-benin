from django.http import Http404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.errors import ApiError
from apps.core.pagination import Cursor
from apps.core.permissions import ADMIN, AGENT, PRODUCTEUR, RESPONSABLE, roles

from . import services
from .models import Application, Contest, Program, SelectionCandidate, SelectionRun

MANAGERS = (RESPONSABLE, ADMIN)


class ProgramSerializer(serializers.ModelSerializer):
    is_closed = serializers.SerializerMethodField()

    class Meta:
        model = Program
        fields = ["id", "name", "description", "conditions", "value_chains", "closes_at", "is_closed", "created_at"]

    def get_is_closed(self, p):
        from datetime import date

        return p.closes_at < date.today()


class ApplicationSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source="program.name", read_only=True)
    producer_code = serializers.CharField(source="producer.code", read_only=True)

    class Meta:
        model = Application
        fields = ["id", "program", "program_name", "producer", "producer_code", "status", "reason", "created_at"]


class RunSerializer(serializers.ModelSerializer):
    created_by = serializers.CharField(source="created_by.phone", read_only=True)
    validated_by = serializers.CharField(source="validated_by.phone", read_only=True, default=None)

    class Meta:
        model = SelectionRun
        fields = ["id", "program", "department", "weights", "target_count", "status", "selected_count",
                  "total_count", "created_by", "validated_by", "validation_reason", "created_at"]


class WeightsSerializer(serializers.Serializer):
    confidence = serializers.FloatField(min_value=0, default=0.4)
    road_distance = serializers.FloatField(min_value=0, default=0.3)
    area = serializers.FloatField(min_value=0, default=0.3)


class RunInSerializer(serializers.Serializer):
    program = serializers.UUIDField(required=False, allow_null=True)
    department = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    target_count = serializers.IntegerField(min_value=1, max_value=500_000)
    weights = WeightsSerializer(required=False)


class CandidateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SelectionCandidate
        fields = ["farm_id", "department", "commune", "score", "rank", "selected", "confidence", "road_distance_m",
                  "area_ha"]


class ContestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contest
        fields = ["id", "run", "farm_id", "reason", "status", "created_at"]


@api_view(["GET", "POST"])
@permission_classes([roles(PRODUCTEUR, AGENT, RESPONSABLE, ADMIN)])
def program_list(request):
    if request.method == "GET":
        return Response(ProgramSerializer(Program.objects.order_by("closes_at"), many=True).data)
    if request.user.role not in MANAGERS:
        raise ApiError("Seul le responsable de programme crée un programme.", "forbidden", 403)
    s = ProgramSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    return Response(ProgramSerializer(services.create_program(request.user, s.validated_data)).data, status=201)


@api_view(["POST"])
@permission_classes([roles(PRODUCTEUR)])
def program_apply(request, pk):
    program = Program.objects.filter(pk=pk).first()
    if program is None:
        raise Http404
    return Response(ApplicationSerializer(services.apply(request.user, program)).data, status=201)


def applications_for(user):
    qs = Application.objects.select_related("program", "producer")
    if user.role in MANAGERS:
        return qs
    if user.role == AGENT:
        return qs.filter(producer__department=user.department)
    if user.role == PRODUCTEUR:
        return qs.filter(producer__user=user)
    raise ApiError("Action non autorisée pour votre rôle.", "forbidden", 403)


@api_view(["GET"])
def application_list(request):
    return Response(ApplicationSerializer(applications_for(request.user).order_by("-created_at"), many=True).data)


@api_view(["POST"])
@permission_classes([roles(RESPONSABLE, ADMIN, AGENT)])
def application_decide(request, pk):
    app = applications_for(request.user).filter(pk=pk).first()
    if app is None:
        raise Http404
    status = request.data.get("status")
    if status not in ("en_instruction", "acceptee", "refusee"):
        raise ApiError("Statut invalide.", "validation_error", 400, fields={"status": ["Statut invalide."]})
    return Response(ApplicationSerializer(services.decide(request.user, app, status,
                                                          (request.data.get("reason") or "").strip())).data)


@api_view(["GET", "POST"])
@permission_classes([roles(RESPONSABLE, ADMIN, AGENT)])
def run_list(request):
    if request.method == "GET":
        return Response(RunSerializer(SelectionRun.objects.select_related("created_by", "validated_by")
                                      .order_by("-created_at"), many=True).data)
    if request.user.role not in MANAGERS:
        raise ApiError("Seul le responsable de programme lance une sélection.", "forbidden", 403)
    s = RunInSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    d = s.validated_data
    program = Program.objects.filter(pk=d["program"]).first() if d.get("program") else None
    weights = dict(d.get("weights") or WeightsSerializer().to_internal_value({}))
    run = services.run_selection(request.user, program, d.get("department") or None, d["target_count"], weights)
    return Response(RunSerializer(run).data, status=201)


def _run(pk):
    run = SelectionRun.objects.filter(pk=pk).first()
    if run is None:
        raise Http404
    return run


class CandidatePagination(Cursor):
    ordering = "rank"


@api_view(["GET"])
@permission_classes([roles(PRODUCTEUR, AGENT, RESPONSABLE, ADMIN)])
def run_candidates(request, pk):
    run = _run(pk)
    qs = run.candidates.all()
    sel = request.query_params.get("selected")
    if sel in ("true", "false"):
        qs = qs.filter(selected=sel == "true")
    if f := request.query_params.get("farm_id"):
        qs = qs.filter(farm_id=f)
    pg = CandidatePagination()
    return pg.get_paginated_response(CandidateSerializer(pg.paginate_queryset(qs, request), many=True).data)


@api_view(["POST"])
@permission_classes([roles(AGENT, ADMIN)])
def run_validate(request, pk):
    run = services.validate_run(request.user, _run(pk), (request.data.get("reason") or "").strip())
    return Response(RunSerializer(run).data)


@api_view(["GET", "POST"])
@permission_classes([roles(PRODUCTEUR, AGENT, RESPONSABLE, ADMIN)])
def run_contests(request, pk):
    run = _run(pk)
    if request.method == "GET":
        if request.user.role not in (RESPONSABLE, ADMIN, AGENT):
            qs = run.contests.filter(created_by=request.user)
        else:
            qs = run.contests.all()
        return Response(ContestSerializer(qs.order_by("-created_at"), many=True).data)
    c = services.contest(request.user, run, str(request.data.get("farm_id") or ""),
                         (request.data.get("reason") or "").strip())
    return Response(ContestSerializer(c).data, status=201)
