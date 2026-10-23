from django.http import Http404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.errors import ApiError
from apps.core.permissions import ADMIN, AGENT, AUDITEUR, PRODUCTEUR, RESPONSABLE, roles
from apps.parcels.api import parcels_for
from apps.producers.selectors import get_producer
from apps.referentiel.models import Department

from . import climate, services
from .models import Scheme, SoilAnalysis, Works

STAFF = (AGENT, ADMIN, RESPONSABLE, AUDITEUR)
WRITERS = (AGENT, ADMIN)


class WorksSerializer(serializers.ModelSerializer):
    class Meta:
        model = Works
        fields = ["id", "scheme", "type", "title", "status", "planned_on", "started_on", "finished_on", "cost_xof",
                  "contractor", "progress_pct", "notes", "created_at"]
        read_only_fields = fields


class SchemeSerializer(serializers.ModelSerializer):
    works = WorksSerializer(many=True, read_only=True)

    class Meta:
        model = Scheme
        fields = ["id", "name", "kind", "department", "commune", "lat", "lon", "area_available_ha", "area_arable_ha",
                  "area_used_ha", "status", "works", "created_at"]
        read_only_fields = ["id", "status", "works", "created_at"]


class SchemeIn(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    kind = serializers.ChoiceField(choices=Scheme.KINDS)
    department = serializers.SlugRelatedField(slug_field="code", queryset=Department.objects.all())
    commune = serializers.CharField(max_length=40, required=False, allow_blank=True, default="")
    lat = serializers.FloatField(min_value=6, max_value=13, required=False, allow_null=True)  # le Bénin
    lon = serializers.FloatField(min_value=0, max_value=4, required=False, allow_null=True)
    area_available_ha = serializers.FloatField(min_value=0.01)
    area_arable_ha = serializers.FloatField(min_value=0)
    area_used_ha = serializers.FloatField(min_value=0, required=False, default=0)
    status = serializers.ChoiceField(choices=["projet", "operationnel", "a_rehabiliter"], required=False)


class SchemePatch(serializers.Serializer):
    area_available_ha = serializers.FloatField(min_value=0.01, required=False)
    area_arable_ha = serializers.FloatField(min_value=0, required=False)
    area_used_ha = serializers.FloatField(min_value=0, required=False)
    status = serializers.ChoiceField(choices=["projet", "operationnel", "a_rehabiliter"], required=False)


class WorksIn(serializers.Serializer):
    type = serializers.ChoiceField(choices=Works.TYPES)
    title = serializers.CharField(max_length=150)
    planned_on = serializers.DateField(required=False, allow_null=True)
    cost_xof = serializers.IntegerField(min_value=0, required=False, allow_null=True)
    contractor = serializers.CharField(max_length=150, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class WorksPatch(serializers.Serializer):
    status = serializers.ChoiceField(choices=["en_cours", "termine", "abandonne"], required=False)
    progress_pct = serializers.IntegerField(min_value=0, max_value=100, required=False)
    cost_xof = serializers.IntegerField(min_value=0, required=False, allow_null=True)
    contractor = serializers.CharField(max_length=150, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


@api_view(["GET", "POST"])
def scheme_list(request):
    if request.method == "GET":
        qs = services.schemes_for(request.user)
        if k := request.query_params.get("kind"):
            qs = qs.filter(kind=k)
        return Response({"results": SchemeSerializer(qs, many=True).data})
    if request.user.role not in WRITERS:
        raise ApiError("Seul un agent ou l'administration enregistre un aménagement.", "forbidden", 403)
    s = SchemeIn(data=request.data)
    s.is_valid(raise_exception=True)
    d = dict(s.validated_data)
    d["department"] = d["department"].code
    return Response(SchemeSerializer(services.create_scheme(request.user, d)).data, status=201)


@api_view(["PATCH"])
@permission_classes([roles(*WRITERS)])
def scheme_detail(request, pk):
    sch = services.schemes_for(request.user).filter(pk=pk).first()
    if sch is None:
        raise Http404
    s = SchemePatch(data=request.data)
    s.is_valid(raise_exception=True)
    return Response(SchemeSerializer(services.update_scheme(request.user, sch, dict(s.validated_data))).data)


@api_view(["POST"])
@permission_classes([roles(*WRITERS)])
def scheme_works(request, pk):
    sch = services.schemes_for(request.user).filter(pk=pk).first()
    if sch is None:
        raise Http404
    s = WorksIn(data=request.data)
    s.is_valid(raise_exception=True)
    return Response(WorksSerializer(services.create_works(request.user, sch, dict(s.validated_data))).data, status=201)


@api_view(["PATCH"])
@permission_classes([roles(*WRITERS)])
def works_detail(request, pk):
    w = Works.objects.select_related("scheme").filter(pk=pk, scheme__in=services.schemes_for(request.user)).first()
    if w is None:
        raise Http404
    s = WorksPatch(data=request.data)
    s.is_valid(raise_exception=True)
    return Response(WorksSerializer(services.update_works(request.user, w, dict(s.validated_data))).data)


class SoilIn(serializers.Serializer):
    parcel = serializers.UUIDField()
    sampled_on = serializers.DateField()
    laboratory = serializers.CharField(max_length=120, required=False, allow_blank=True)
    ph = serializers.FloatField(min_value=3, max_value=10)
    organic_matter_pct = serializers.FloatField(min_value=0, max_value=30)
    phosphorus_ppm = serializers.FloatField(min_value=0, max_value=500, required=False, allow_null=True)
    texture = serializers.ChoiceField(choices=SoilAnalysis.TEXTURES, required=False, allow_blank=True)


def soil_out(a):
    return {"id": str(a.id), "parcel": str(a.parcel_id), "parcel_name": a.parcel.name, "sampled_on": a.sampled_on,
            "laboratory": a.laboratory, "ph": a.ph, "organic_matter_pct": a.organic_matter_pct,
            "phosphorus_ppm": a.phosphorus_ppm, "texture": a.texture, "findings": services.interpret(a),
            "reference": services.SOIL_REFERENCE}


@api_view(["GET", "POST"])
@permission_classes([roles(PRODUCTEUR, AGENT, ADMIN)])
def soil_list(request):
    parcels = parcels_for(request.user)
    if request.method == "GET":
        qs = SoilAnalysis.objects.select_related("parcel").filter(parcel__in=parcels).order_by("-sampled_on")
        if pid := request.query_params.get("parcel"):
            qs = qs.filter(parcel_id=pid)
        return Response({"results": [soil_out(a) for a in qs]})
    if request.user.role == PRODUCTEUR:
        raise ApiError("Seul un agent saisit une analyse de sol.", "forbidden", 403)
    s = SoilIn(data=request.data)
    s.is_valid(raise_exception=True)
    d = dict(s.validated_data)
    parcel = parcels.filter(pk=d.pop("parcel")).first()
    if parcel is None:
        raise Http404
    d["texture"] = d.get("texture") or ""
    return Response(soil_out(services.create_soil(request.user, parcel, d)), status=201)


@api_view(["GET"])
@permission_classes([roles(*STAFF)])
def soil_summary(request):
    return Response({"results": services.soil_summary(request.user)})


@api_view(["GET"])
@permission_classes([roles(*STAFF)])
def land_use(request):
    return Response(services.land_use(request.user, request.query_params.get("season") or None))


@api_view(["GET"])
@permission_classes([roles(PRODUCTEUR, AGENT, ADMIN)])
def climate_risks(request):
    """Le producteur : ses parcelles. L'agent et l'administration désignent un producteur (`?producer=`)."""
    if request.user.role == PRODUCTEUR:
        producer = getattr(request.user, "producer", None)
        if producer is None:
            return Response({"results": []})
    else:
        producer = get_producer(request.user, request.query_params.get("producer"))
    return Response({"results": climate.parcels_risks(list(producer.parcels.order_by("created_at")))})


@api_view(["GET"])
@permission_classes([roles(*STAFF)])
def climate_departments(request):
    dep = request.user.department if request.user.role == AGENT and request.user.department else None
    return Response({"results": climate.departments_risks(dep)})
