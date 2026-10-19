import uuid

from django.db import models

from apps.producers.models import Producer


class Parcel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    producer = models.ForeignKey(Producer, on_delete=models.CASCADE, related_name="parcels")
    name = models.CharField(max_length=100)
    geometry = models.JSONField()  # GeoJSON Polygon (WGS84)
    land_type = models.CharField(max_length=20)
    tenure = models.CharField(max_length=20)
    area_ha = models.FloatField()
    overlap_warning = models.BooleanField(default=False)
    overlap_with = models.JSONField(default=list, blank=True)
    department = models.CharField(max_length=40, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Campaign(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    parcel = models.ForeignKey(Parcel, on_delete=models.CASCADE, related_name="campaigns")
    value_chain = models.CharField(max_length=40)
    season = models.CharField(max_length=20)
    stage = models.CharField(max_length=20)
    variety = models.CharField(max_length=80, blank=True)
    sown_at = models.DateField(null=True, blank=True)  # date de semis : calendrier et tâches estimés
    version = models.PositiveIntegerField(default=1)  # UC-25
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["parcel", "season"], name="one_crop_per_parcel_season")]
