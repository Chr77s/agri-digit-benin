import uuid

from django.conf import settings
from django.db import models

from apps.parcels.models import Campaign
from apps.producers.models import Producer
from apps.programs.models import Program


class ReferenceYield(models.Model):
    """Rendement de référence par filière (kg/ha), paramétrable en base. `source` dit d'où vient la valeur."""

    value_chain = models.CharField(max_length=40, primary_key=True)
    yield_kg_ha = models.PositiveIntegerField()
    source = models.CharField(max_length=200, default="demonstration")
    updated_at = models.DateTimeField(auto_now=True)


class Support(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    producer = models.ForeignKey(Producer, on_delete=models.CASCADE, related_name="supports")
    program = models.ForeignKey(Program, null=True, blank=True, on_delete=models.SET_NULL, related_name="supports")
    item = models.CharField(max_length=150)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=20)
    value_xof = models.PositiveIntegerField()
    repayable = models.BooleanField(default=False)
    status = models.CharField(max_length=20, default="remis")  # remis | confirme
    delivered_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)


class Harvest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name="harvests")
    harvested_at = models.DateField()
    quantity_kg = models.FloatField()
    stored_kg = models.FloatField(default=0)
    sold_kg = models.FloatField(default=0)
    sale_price_xof_per_kg = models.PositiveIntegerField(null=True, blank=True)
    estimated_kg = models.FloatField(null=True)
    deviation_pct = models.FloatField(null=True)
    flagged = models.BooleanField(default=False, db_index=True)
    # Vérification d'une récolte signalée par l'agent : a_verifier | visite (reste à vérifier) | confirmee | corrigee.
    check_status = models.CharField(max_length=20, default="a_verifier", db_index=True)
    check_reason = models.TextField(blank=True)
    checked_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name="+")
    checked_at = models.DateTimeField(null=True, blank=True)
    declared_kg = models.FloatField(null=True, blank=True)  # quantité d'origine, gardée quand l'agent la corrige
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
