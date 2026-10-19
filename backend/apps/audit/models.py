import hashlib
import json
import uuid
from datetime import timezone as dt_tz

from django.conf import settings
from django.db import models
from django.utils import timezone


class AuditQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise PermissionError("Journal d'audit non modifiable.")

    def delete(self):
        raise PermissionError("Journal d'audit non modifiable.")


class AuditLog(models.Model):
    """Journal append-only : save() refuse la mise à jour, delete() est interdit.
    Chaque entrée porte l'empreinte de la précédente (`prev_hash`) et la sienne (`hash`) : une retouche en base casse la chaîne."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    at = models.DateTimeField(default=timezone.now, db_index=True)  # fixé avant le calcul de l'empreinte
    seq = models.PositiveBigIntegerField(unique=True, null=True)
    prev_hash = models.CharField(max_length=64, blank=True)
    hash = models.CharField(max_length=64, blank=True)
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

    def compute_hash(self):
        return entry_hash(self.prev_hash, self.seq, self.at, self.actor_id, self.actor_phone, self.actor_role,
                          self.action, self.object_type, self.object_id, self.details)


def entry_hash(prev_hash, seq, at, actor_id, actor_phone, actor_role, action, object_type, object_id, details):
    """SHA-256 du contenu canonique de l'entrée et de l'empreinte précédente (aussi utilisé par la migration)."""
    body = json.dumps([prev_hash, seq, at.astimezone(dt_tz.utc).isoformat(), str(actor_id or ""), actor_phone,
                       actor_role, action, object_type, object_id, details],
                      sort_keys=True, ensure_ascii=False, separators=(",", ":"), default=str)
    return hashlib.sha256(body.encode()).hexdigest()


class AuditChainHead(models.Model):
    """Dernier maillon de la chaîne ; verrouillé à chaque écriture pour que deux entrées n'aient pas le même rang."""

    id = models.PositiveSmallIntegerField(primary_key=True, default=1)
    seq = models.PositiveBigIntegerField(default=0)
    hash = models.CharField(max_length=64, blank=True)


class RetentionPolicy(models.Model):
    data_type = models.CharField(max_length=60, unique=True)
    retention_days = models.PositiveIntegerField()
    description = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return f"{self.data_type} ({self.retention_days} j)"
