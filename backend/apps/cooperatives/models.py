import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q

from apps.producers.models import Producer

MEMBER_ROLES = ["membre", "president", "tresorier", "secretaire"]


class Cooperative(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150, unique=True)
    department = models.CharField(max_length=40, db_index=True)
    commune = models.CharField(max_length=40)
    value_chains = models.JSONField(default=list, blank=True)
    registration_number = models.CharField(max_length=60, blank=True)
    manager = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                related_name="managed_cooperatives")
    created_at = models.DateTimeField(auto_now_add=True)


class Membership(models.Model):
    """Adhésion : jamais supprimée, `left_at` renseigné à la sortie (historique conservé)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cooperative = models.ForeignKey(Cooperative, on_delete=models.CASCADE, related_name="memberships")
    producer = models.ForeignKey(Producer, on_delete=models.CASCADE, related_name="memberships")
    role = models.CharField(max_length=20, default="membre")
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
    end_reason = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["cooperative", "producer"], condition=Q(left_at__isnull=True),
                                               name="one_active_membership")]
