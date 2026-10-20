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


class MembershipRequest(models.Model):
    """Demande d'adhésion du producteur, décidée par le gestionnaire ou l'agent ; acceptée, elle crée l'adhésion."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cooperative = models.ForeignKey(Cooperative, on_delete=models.CASCADE, related_name="join_requests")
    producer = models.ForeignKey(Producer, on_delete=models.CASCADE, related_name="join_requests")
    message = models.TextField(blank=True)
    status = models.CharField(max_length=20, default="en_attente", db_index=True)  # en_attente | acceptee | refusee
    decision_reason = models.TextField(blank=True)
    decided_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    decided_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["cooperative", "producer"], condition=Q(status="en_attente"),
                                               name="one_pending_join_request")]


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


class Organisation(models.Model):
    """Organisation de filière au-dessus des coopératives : union, fédération, interprofession, OIA, OPA."""

    KINDS = ("union", "federation", "interprofession", "oia", "opa")
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True)
    kind = models.CharField(max_length=20)
    value_chains = models.JSONField(default=list, blank=True)
    department = models.CharField(max_length=40, blank=True, db_index=True)  # vide : nationale
    registration_number = models.CharField(max_length=60, blank=True)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="children")
    cooperatives = models.ManyToManyField(Cooperative, blank=True, related_name="organisations")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)


class OrgEvent(models.Model):
    """Vie de l'organisation : assemblée, réunion, prix convenu (mécanisme de prix), formation (renforcement)."""

    KINDS = ("assemblee", "reunion", "prix", "formation")
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organisation = models.ForeignKey(Organisation, on_delete=models.CASCADE, related_name="events")
    kind = models.CharField(max_length=20)
    date = models.DateField()
    title = models.CharField(max_length=200)
    notes = models.TextField(blank=True)
    price_xof_per_kg = models.PositiveIntegerField(null=True, blank=True)  # prix convenu (événement « prix »)
    participants = models.PositiveIntegerField(null=True, blank=True)
    women = models.PositiveIntegerField(null=True, blank=True)
    youth = models.PositiveIntegerField(null=True, blank=True)  # moins de 35 ans
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]
