import uuid

from django.conf import settings
from django.db import models

STATUSES = ["auto", "transmis_agronome", "revu"]


class Diagnosis(models.Model):
    """Diagnostic SIMULÉ. `image` est un chemin relatif à MEDIA_ROOT (fichier réencodé, sans EXIF)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="diagnoses")
    value_chain = models.CharField(max_length=40)
    image = models.CharField(max_length=200, blank=True)
    pathology = models.CharField(max_length=60)
    pathology_label = models.CharField(max_length=120)
    confidence = models.FloatField()
    status = models.CharField(max_length=20, choices=[(s, s) for s in STATUSES], db_index=True)
    advice = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                    related_name="+")
    review_comment = models.TextField(blank=True)
    producer_note = models.TextField(blank=True)  # « Pas sûr ? » : ce que le producteur voit, écrit pour l'agronome
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
