from django.utils.dateparse import parse_date
from rest_framework import generics, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.pagination import Cursor
from apps.core.permissions import ADMIN, AUDITEUR, roles

from .models import AuditLog
from .services import verify_chain


def _date(v):
    try:
        return parse_date(v or "")
    except ValueError:  # date bien formée mais impossible (31 février)
        return None


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ["id", "seq", "at", "actor_phone", "actor_role", "action", "object_type", "object_id", "details",
                  "prev_hash", "hash"]


class AuditPagination(Cursor):
    ordering = "-at"


class AuditLogList(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [roles(AUDITEUR, ADMIN)]
    pagination_class = AuditPagination

    def get_queryset(self):
        qs = AuditLog.objects.all()
        if a := self.request.query_params.get("action"):
            qs = qs.filter(action=a)
        if a := self.request.query_params.get("actor"):
            qs = qs.filter(actor_phone=a)
        if a := self.request.query_params.get("object_type"):
            qs = qs.filter(object_type=a)
        # bornes de dates incluses (AAAA-MM-JJ) ; une date mal formée est ignorée
        if (a := _date(self.request.query_params.get("from"))):
            qs = qs.filter(at__date__gte=a)
        if (a := _date(self.request.query_params.get("to"))):
            qs = qs.filter(at__date__lte=a)
        return qs


@api_view(["GET"])
@permission_classes([roles(AUDITEUR, ADMIN)])
def verify(request):
    """Recalcule toute la chaîne d'empreintes : {ok, count, broken_seq, checked_at}."""
    return Response(verify_chain())
