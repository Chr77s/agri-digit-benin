import uuid

from django.conf import settings
from django.db import models


class AuditQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise PermissionError("Journal d'audit non modifiable.")

    def delete(self):
        raise PermissionError("Journal d'audit non modifiable.")


class AuditLog(models.Model):
    """Journal append-only : save() refuse la mise à jour, delete() est interdit."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    at = models.DateTimeField(auto_now_add=True, db_index=True)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    actor_phone = models.CharField(max_length=20, blank=True)
    actor_role = models.CharField(max_length=40, blank=True)
    action = models.CharField(max_length=80, db_index=True)
    object_type = models.CharField(max_length=60, blank=True)
    object_id = models.CharField(max_length=64, blank=True)
    details = models.JSONField(default=dict, blank=True)

    objects = AuditQuerySet.as_manager()

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise PermissionError("Journal d'audit non modifiable.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionError("Journal d'audit non modifiable.")


class RetentionPolicy(models.Model):
    data_type = models.CharField(max_length=60, unique=True)
    retention_days = models.PositiveIntegerField()
    description = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return f"{self.data_type} ({self.retention_days} j)"
