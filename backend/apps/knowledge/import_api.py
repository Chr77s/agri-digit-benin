from rest_framework import serializers
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.audit.services import record

from . import importer
from .api import _editor


class ImportSerializer(serializers.Serializer):
    file = serializers.FileField()
    value_chain = serializers.CharField(max_length=40, default="general")
    title = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    source = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def doc_import(request):
    """Ajoute un fichier : il est découpé en extraits, en brouillon, à faire relire par une autre personne."""
    _editor(request.user)
    s = ImportSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    d = s.validated_data
    f = d["file"]
    res = importer.import_document(request.user, f.name, f.read(), d["value_chain"], d["title"], d["source"])
    return Response(res, status=201)


@api_view(["GET"])
def batch_list(request):
    _editor(request.user)
    return Response(importer.batches())


@api_view(["POST"])
def batch_review(request, batch):
    _editor(request.user)
    n = importer.review_batch(request.user, batch)
    record(request.user, "knowledge.batch_review", object_type="KnowledgeBatch", object_id=str(batch), chunks=n)
    return Response({"reviewed": n})


@api_view(["POST"])
def batch_publish(request, batch):
    _editor(request.user)
    n = importer.publish_batch(request.user, batch)
    record(request.user, "knowledge.batch_publish", object_type="KnowledgeBatch", object_id=str(batch), chunks=n)
    return Response({"published": n})


@api_view(["DELETE"])
def batch_delete(request, batch):
    _editor(request.user)
    n = importer.delete_batch(request.user, batch)
    record(request.user, "knowledge.batch_delete", object_type="KnowledgeBatch", object_id=str(batch), chunks=n)
    return Response(status=204)
