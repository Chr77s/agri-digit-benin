from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.pagination import Cursor
from apps.core.permissions import ADMIN, roles

from . import services
from .models import LANGUAGES, STATUSES, TranslationEntry

REPR = "repr_mtdi"


class EntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = TranslationEntry
        fields = ["id", "key", "language", "source_text", "text", "status", "average_score", "reviews_count",
                  "updated_at"]


class TextIn(serializers.Serializer):
    text = serializers.CharField(max_length=2000)


class ReviewIn(serializers.Serializer):
    score = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(max_length=1000, required=False, allow_blank=True, default="")


class EntryCursor(Cursor):
    ordering = "key"
    page_size = 50


@api_view(["GET"])
@permission_classes([roles(REPR, ADMIN)])
def entry_list(request):
    qs = TranslationEntry.objects.all()
    lang, status = request.query_params.get("language"), request.query_params.get("status")
    if lang in LANGUAGES:
        qs = qs.filter(language=lang)
    if status in STATUSES:
        qs = qs.filter(status=status)
    pg = EntryCursor()
    page = pg.paginate_queryset(qs, request)
    return pg.get_paginated_response(EntrySerializer(page, many=True).data)


@api_view(["GET", "PATCH"])
@permission_classes([roles(REPR, ADMIN)])
def entry_detail(request, pk):
    e = get_object_or_404(TranslationEntry, pk=pk)
    if request.method == "PATCH":
        if request.user.role != REPR:
            return Response({"detail": "Action non autorisée pour votre rôle.", "code": "forbidden"}, status=403)
        s = TextIn(data=request.data)
        s.is_valid(raise_exception=True)
        e = services.propose(request.user, e, s.validated_data["text"])
    return Response(EntrySerializer(e).data)


@api_view(["POST"])
@permission_classes([roles(REPR)])
def entry_review(request, pk):
    e = get_object_or_404(TranslationEntry, pk=pk)
    s = ReviewIn(data=request.data)
    s.is_valid(raise_exception=True)
    return Response(EntrySerializer(services.review(request.user, e, **s.validated_data)).data)


@api_view(["GET"])
@permission_classes([roles(REPR, ADMIN)])
def entry_summary(request):
    return Response(services.summary())


@api_view(["GET"])
@permission_classes([AllowAny])
def i18n_dictionary(request, language):
    if language not in LANGUAGES:
        raise Http404
    return Response(services.dictionary(language))
