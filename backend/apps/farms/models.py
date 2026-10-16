import uuid

from django.db import models


class FarmPOC(models.Model):
    """Fermes détectées par le POC (données de démonstration, non officielles)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    farm_id = models.CharField(max_length=30, unique=True)
    lon = models.FloatField()
    lat = models.FloatField()
    department = models.CharField(max_length=40, db_index=True)
    commune = models.CharField(max_length=40, blank=True, db_index=True)
    is_maize = models.BooleanField(default=False)
    maize_confidence = models.FloatField()
    road_distance_m = models.FloatField()
    area_ha = models.FloatField()
    source = models.CharField(max_length=40)
    imported_at = models.DateTimeField(auto_now_add=True)
