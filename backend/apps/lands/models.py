import uuid

from django.conf import settings
from django.db import models

from apps.parcels.models import Parcel


class Scheme(models.Model):
    """Aménagement : bas-fond, périmètre irrigué ou plateau, avec ses trois superficies (TDR § 3.1)."""

    KINDS = ("bas_fond", "irrigue", "plateau")
    STATUSES = ("projet", "operationnel", "a_rehabiliter", "en_travaux")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    kind = models.CharField(max_length=10, db_index=True)
    department = models.CharField(max_length=40, db_index=True)
    commune = models.CharField(max_length=40, blank=True)
    lat = models.FloatField(null=True, blank=True)
    lon = models.FloatField(null=True, blank=True)
    area_available_ha = models.FloatField()  # disponible : l'emprise de l'aménagement
    area_arable_ha = models.FloatField()  # exploitable : ce qui peut être cultivé
    area_used_ha = models.FloatField(default=0)  # exploitée : ce qui l'est cette saison
    status = models.CharField(max_length=15, default="operationnel", db_index=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)


class Works(models.Model):
    """Travaux sur un aménagement : réhabilitation, nouvel aménagement ou entretien."""

    TYPES = ("rehabilitation", "nouvel_amenagement", "entretien")
    STATUSES = ("planifie", "en_cours", "termine", "abandonne")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    scheme = models.ForeignKey(Scheme, on_delete=models.CASCADE, related_name="works")
    type = models.CharField(max_length=20, db_index=True)
    title = models.CharField(max_length=150)
    status = models.CharField(max_length=10, default="planifie", db_index=True)
    planned_on = models.DateField(null=True, blank=True)
    started_on = models.DateField(null=True, blank=True)
    finished_on = models.DateField(null=True, blank=True)
    cost_xof = models.PositiveBigIntegerField(null=True, blank=True)
    contractor = models.CharField(max_length=150, blank=True)
    progress_pct = models.PositiveSmallIntegerField(default=0)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)


class SoilAnalysis(models.Model):
    """Résultat d'analyse de sol d'une parcelle, saisi par l'agent (laboratoire ou kit de terrain)."""

    TEXTURES = ("sableux", "limoneux", "argileux", "equilibre")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    parcel = models.ForeignKey(Parcel, on_delete=models.CASCADE, related_name="soil_analyses")
    sampled_on = models.DateField()
    laboratory = models.CharField(max_length=120, blank=True)
    ph = models.FloatField()
    organic_matter_pct = models.FloatField()
    phosphorus_ppm = models.FloatField(null=True, blank=True)  # P assimilable (Bray 1)
    texture = models.CharField(max_length=10, blank=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
