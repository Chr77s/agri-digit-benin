import uuid

from django.db import models


class AssistantLog(models.Model):
    """Journal des questions SANS donnée personnelle (ni utilisateur, ni téléphone, ni position)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.TextField()
    value_chain = models.CharField(max_length=40, blank=True)
    role = models.CharField(max_length=40, blank=True)
    status = models.CharField(max_length=20)
    doc_ids = models.JSONField(default=list)
    backend = models.CharField(max_length=20)
    top_score = models.FloatField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
