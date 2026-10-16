import uuid

from django.conf import settings
from django.db import models

LANGUAGES = ["fon", "bba", "yo", "dnd"]
STATUSES = ["a_traduire", "propose", "valide", "rejete"]


class TranslationEntry(models.Model):
    """Une clé de l'interface dans une langue nationale. Aucun texte inventé : seed en `a_traduire`, texte vide."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.CharField(max_length=200)
    language = models.CharField(max_length=5, choices=[(x, x) for x in LANGUAGES], db_index=True)
    source_text = models.TextField()
    text = models.TextField(blank=True)
    status = models.CharField(max_length=12, choices=[(s, s) for s in STATUSES], default="a_traduire",
                              db_index=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                               related_name="+")
    average_score = models.FloatField(null=True, blank=True)
    reviews_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["key", "language"], name="uniq_translation_key_language")]


class TranslationReview(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entry = models.ForeignKey(TranslationEntry, on_delete=models.CASCADE, related_name="reviews")
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    text = models.TextField()  # texte noté (une nouvelle proposition repart de zéro)
    score = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
