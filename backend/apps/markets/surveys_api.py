from django.conf import settings
from django.db.models import Count
from django.http import Http404
from rest_framework import serializers
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle

from apps.core.permissions import ADMIN, AGENT, RESPONSABLE, roles

from . import surveys
from .models import Survey

STAFF = (AGENT, RESPONSABLE, ADMIN)


class _PerAddress(SimpleRateThrottle):
    """Par adresse, connecté ou non. Plusieurs téléphones peuvent partager celle d'un opérateur : débit généreux."""

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class RespondThrottle(_PerAddress):
    scope = "survey"

    def get_rate(self):
        return settings.SURVEY_THROTTLE_RATE


class ReadThrottle(_PerAddress):
    scope = "survey_read"

    def get_rate(self):
        return settings.SURVEY_READ_THROTTLE_RATE


class SurveyIn(serializers.Serializer):
    title = serializers.CharField(max_length=150)
    value_chain = serializers.CharField(max_length=40, required=False, allow_blank=True, default="")
    department = serializers.CharField(max_length=40, required=False, allow_blank=True, default="")
    questions = serializers.ListField(child=serializers.CharField(max_length=200, allow_blank=False), min_length=1,
                                      max_length=surveys.MAX_QUESTIONS)


class RespondIn(serializers.Serializer):
    ratings = serializers.ListField(child=serializers.IntegerField(min_value=1, max_value=5), min_length=1,
                                    max_length=surveys.MAX_QUESTIONS)
    comment = serializers.CharField(max_length=surveys.MAX_COMMENT, required=False, allow_blank=True, default="")
    department = serializers.CharField(max_length=40, required=False, allow_blank=True, default="")
    commune = serializers.CharField(max_length=40, required=False, allow_blank=True, default="")
    channel = serializers.ChoiceField(choices=["web", "agent"], required=False, default="web")
    device = serializers.CharField(min_length=16, max_length=64, required=False, allow_blank=True, default="")
    website = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")  # champ piège


def survey_out(s, responses=None):
    return {"id": str(s.id), "code": s.code, "title": s.title, "value_chain": s.value_chain, "department": s.department,
            "questions": s.questions, "status": s.status, "path": f"/enquete/{s.code}", "created_at": s.created_at,
            "closed_at": s.closed_at, **({} if responses is None else {"responses": responses})}


@api_view(["GET", "POST"])
@permission_classes([roles(*STAFF)])
def survey_list(request):
    if request.method == "GET":
        qs = surveys.surveys_for(request.user).annotate(n=Count("responses"))
        return Response({"results": [survey_out(s, s.n) for s in qs]})
    s = SurveyIn(data=request.data)
    s.is_valid(raise_exception=True)
    return Response(survey_out(surveys.create_survey(request.user, dict(s.validated_data)), 0), status=201)


def _own(request, pk):
    s = surveys.surveys_for(request.user).filter(pk=pk).first()
    if s is None:
        raise Http404
    return s


@api_view(["POST"])
@permission_classes([roles(*STAFF)])
def survey_close(request, pk):
    return Response(survey_out(surveys.close_survey(request.user, _own(request, pk))))


@api_view(["GET"])
@permission_classes([roles(*STAFF)])
def survey_results(request, pk):
    return Response(surveys.results(_own(request, pk)))


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([ReadThrottle])
def public_survey(request, code):
    """Page publique : titre et questions, rien d'autre."""
    s = Survey.objects.filter(code=code.upper()).first()
    if s is None:
        raise Http404
    return Response({"code": s.code, "title": s.title, "value_chain": s.value_chain, "department": s.department,
                     "questions": s.questions, "status": s.status})


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([RespondThrottle])
def public_respond(request, code):
    s = Survey.objects.filter(code=code.upper()).first()
    if s is None:
        raise Http404
    body = RespondIn(data=request.data)
    body.is_valid(raise_exception=True)
    d = dict(body.validated_data)
    if d.pop("website"):  # un robot remplit tout, y compris le champ qu'un humain ne voit pas : on fait semblant
        return Response({"ok": True}, status=201)
    surveys.respond(s, d)
    return Response({"ok": True}, status=201)
