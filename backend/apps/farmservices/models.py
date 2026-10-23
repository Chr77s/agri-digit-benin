import uuid

from django.conf import settings
from django.db import models

from apps.producers.models import Producer
from apps.production.models import Support


class Equipment(models.Model):
    """Matériel agricole d'un producteur (ou d'une coopérative), proposé ou non à la location."""

    KINDS = ("tracteur", "motoculteur", "charrue", "semoir", "pulverisateur", "decortiqueuse", "pompe", "tricycle",
             "autre")
    CONDITIONS = ("bon", "moyen", "mauvais")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="equipment")
    kind = models.CharField(max_length=20, db_index=True)
    label = models.CharField(max_length=120, blank=True)
    quantity = models.PositiveSmallIntegerField(default=1)
    condition = models.CharField(max_length=10, default="bon")
    acquired_year = models.PositiveSmallIntegerField(null=True, blank=True)
    for_hire = models.BooleanField(default=False, db_index=True)
    hire_rate_xof_per_ha = models.PositiveIntegerField(null=True, blank=True)
    department = models.CharField(max_length=40, db_index=True)
    commune = models.CharField(max_length=40, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class MechRequest(models.Model):
    """Demande de prestation de mécanisation d'un producteur auprès du propriétaire d'un matériel loué."""

    OPERATIONS = ("labour", "semis", "traitement", "recolte", "battage", "transport")
    STATUSES = ("demandee", "acceptee", "refusee", "realisee", "annulee")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requester = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    equipment = models.ForeignKey(Equipment, on_delete=models.PROTECT, related_name="requests")
    operation = models.CharField(max_length=12)
    area_ha = models.FloatField()
    wished_on = models.DateField()
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=10, default="demandee", db_index=True)
    estimate_xof = models.PositiveIntegerField(null=True, blank=True)  # surface demandée × tarif de l'annonce
    area_done_ha = models.FloatField(null=True, blank=True)
    price_xof = models.PositiveIntegerField(null=True, blank=True)  # surface réellement travaillée × tarif
    decided_at = models.DateTimeField(null=True, blank=True)
    done_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class SeedLot(models.Model):
    """Lot de semences certifiées d'un centre semencier, distribué aux producteurs sous forme d'appuis."""

    CATEGORIES = ("pre_base", "base", "r1", "r2")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=12, unique=True)
    value_chain = models.CharField(max_length=40, db_index=True)
    variety = models.CharField(max_length=80)
    category = models.CharField(max_length=10)
    certificate_no = models.CharField(max_length=60)
    centre = models.CharField(max_length=150)
    department = models.CharField(max_length=40, db_index=True)
    produced_on = models.DateField()
    quantity_kg = models.FloatField()
    available_kg = models.FloatField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)


class SeedDistribution(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lot = models.ForeignKey(SeedLot, on_delete=models.PROTECT, related_name="distributions")
    producer = models.ForeignKey(Producer, on_delete=models.PROTECT, related_name="+")
    support = models.OneToOneField(Support, on_delete=models.PROTECT, related_name="seed_distribution")
    quantity_kg = models.FloatField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)


class Pmea(models.Model):
    """Petite ou moyenne entreprise agricole de la zone : transformation, intrants, mécanisation, stockage…"""

    SERVICES = ("transformation", "intrants", "mecanisation", "stockage", "commercialisation", "conseil")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    services = models.JSONField(default=list)  # SQLite ne cherche pas dans une liste JSON : filtré en Python
    value_chains = models.JSONField(default=list)
    department = models.CharField(max_length=40, db_index=True)
    commune = models.CharField(max_length=40, blank=True)
    contact_name = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=10)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                              related_name="+")
    verified = models.BooleanField(default=False, db_index=True)
    verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                    related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

