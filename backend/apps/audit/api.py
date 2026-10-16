from rest_framework import generics, serializers

from apps.core.pagination import Cursor
from apps.core.permissions import ADMIN, AUDITEUR, roles

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ["id", "at", "actor_phone", "actor_role", "action", "object_type", "object_id", "details"]


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
        return qs
