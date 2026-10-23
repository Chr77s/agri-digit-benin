from django.http import FileResponse, Http404
from rest_framework import serializers
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.core.pagination import Cursor
from apps.core.permissions import AGRONOME, PRODUCTEUR, roles
from apps.referentiel.models import ValueChain
from integrations.diagnosis import RISK

from . import selectors, services


class DiagnosisSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    value_chain = serializers.CharField()
    pathology = serializers.CharField()
    pathology_label = serializers.CharField()
    confidence = serializers.FloatField()
    status = serializers.CharField()
    advice = serializers.CharField()
    review_comment = serializers.CharField()
    producer_note = serializers.CharField()
    reviewed_at = serializers.DateTimeField()
    created_at = serializers.DateTimeField()
    image_url = serializers.SerializerMethodField()
    risk = serializers.SerializerMethodField()
    simulation = serializers.SerializerMethodField()
    help = serializers.SerializerMethodField()

    def get_image_url(self, d):
        return f"/api/v1/diagnoses/{d.id}/image"

    def get_risk(self, d):
        return RISK.get(d.pathology)  # « autre » (relecture agronome) : pas de niveau

    def get_simulation(self, d):
        return True

    def get_help(self, d):
        return services.HELP


class DiagnosisInSerializer(serializers.Serializer):
    image = serializers.FileField()
    value_chain = serializers.CharField(max_length=40)

    def validate_value_chain(self, v):
        if not ValueChain.objects.filter(code=v).exists():
            raise serializers.ValidationError("Filière inconnue.")
        return v


class AskInSerializer(serializers.Serializer):
    note = serializers.CharField(max_length=500, allow_blank=True, required=False, default="")


class ReviewInSerializer(serializers.Serializer):
    pathology = serializers.CharField(max_length=60)
    comment = serializers.CharField(max_length=1000, allow_blank=True, required=False, default="")


@api_view(["GET", "POST"])
@permission_classes([roles(PRODUCTEUR, AGRONOME)])
@parser_classes([MultiPartParser, FormParser])
def diagnosis_list(request):
    if request.method == "POST":
        if request.user.role != PRODUCTEUR:
            return Response({"detail": "Action non autorisée pour votre rôle.", "code": "forbidden"}, status=403)
        s = DiagnosisInSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = services.create(request.user, s.validated_data["image"], s.validated_data["value_chain"])
        return Response(DiagnosisSerializer(d).data, status=201)
    pg = Cursor()
    page = pg.paginate_queryset(selectors.visible(request.user, request.query_params.get("status")), request)
    return pg.get_paginated_response(DiagnosisSerializer(page, many=True).data)


@api_view(["POST"])
@permission_classes([roles(AGRONOME)])
@parser_classes([JSONParser, FormParser])
def diagnosis_review(request, pk):
    d = selectors.get_visible(request.user, pk) or _404()
    s = ReviewInSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    return Response(DiagnosisSerializer(services.review(request.user, d, **s.validated_data)).data)


@api_view(["POST"])
@permission_classes([roles(PRODUCTEUR)])
@parser_classes([JSONParser, FormParser])
def diagnosis_ask_agronome(request, pk):
    d = selectors.get_visible(request.user, pk) or _404()
    s = AskInSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    return Response(DiagnosisSerializer(services.ask_agronome(request.user, d, s.validated_data["note"])).data)


@api_view(["GET"])
@permission_classes([roles(PRODUCTEUR, AGRONOME)])
def diagnosis_image(request, pk):
    d = selectors.get_visible(request.user, pk) or _404()
    path = services.image_path(d)
    if not d.image or not path.exists():
        raise Http404
    resp = FileResponse(open(path, "rb"), content_type="image/png" if d.image.endswith(".png") else "image/jpeg")
    resp["Cache-Control"] = "private, no-store"
    return resp


def _404():
    raise Http404
