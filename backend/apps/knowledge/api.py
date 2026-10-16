from django.db.models import Q
from django.http import Http404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.errors import ApiError
from apps.core.pagination import Cursor
from apps.core.permissions import ADMIN, AGENT, AGRONOME, PRODUCTEUR, RESPONSABLE, roles

READERS = roles(PRODUCTEUR, AGENT, AGRONOME, RESPONSABLE, ADMIN)

from . import services
from .models import KnowledgeDoc

EDITORS = (AGRONOME, ADMIN)


class DocSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeDoc
        fields = ["id", "value_chain", "title", "body", "source", "version", "status", "language",
                  "language_validation", "updated_at"]
        read_only_fields = ["id", "version", "status", "language_validation", "updated_at"]


class DocPagination(Cursor):
    ordering = "-updated_at"


def _editor(user):
    if user.role not in EDITORS:
        raise ApiError("Seul l'agronome INRAB modifie la base de connaissances.", "forbidden", 403)


def _get(user, pk):
    qs = KnowledgeDoc.objects.all() if user.role in EDITORS else KnowledgeDoc.objects.filter(status="publie")
    doc = qs.filter(pk=pk).first()
    if doc is None:
        raise Http404
    return doc


@api_view(["GET", "POST"])
@permission_classes([READERS])
def doc_list(request):
    if request.method == "POST":
        _editor(request.user)
        s = DocSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(DocSerializer(services.create(request.user, s.validated_data)).data, status=201)
    qs = KnowledgeDoc.objects.all()
    if request.user.role not in EDITORS:
        qs = qs.filter(status="publie")
    p = request.query_params
    if v := p.get("value_chain"):
        qs = qs.filter(value_chain=v)
    if v := p.get("status"):
        qs = qs.filter(status=v)
    if v := p.get("search"):
        qs = qs.filter(Q(title__icontains=v) | Q(body__icontains=v))
    pg = DocPagination()
    return pg.get_paginated_response(DocSerializer(pg.paginate_queryset(qs, request), many=True).data)


@api_view(["GET", "PATCH"])
@permission_classes([READERS])
def doc_detail(request, pk):
    doc = _get(request.user, pk)
    if request.method == "GET":
        return Response(DocSerializer(doc).data)
    _editor(request.user)
    s = DocSerializer(doc, data=request.data, partial=True)
    s.is_valid(raise_exception=True)
    return Response(DocSerializer(services.edit(request.user, doc, s.validated_data)).data)


@api_view(["POST"])
def doc_review(request, pk):
    _editor(request.user)
    return Response(DocSerializer(services.review(request.user, _get(request.user, pk))).data)


@api_view(["POST"])
def doc_publish(request, pk):
    _editor(request.user)
    return Response(DocSerializer(services.publish(request.user, _get(request.user, pk))).data)


@api_view(["GET"])
@permission_classes([READERS])
def doc_versions(request, pk):
    doc = _get(request.user, pk)
    return Response([{"version": v.version, "title": v.title, "body": v.body, "source": v.source,
                      "status": v.status, "created_at": v.created_at} for v in doc.versions.order_by("created_at")])
