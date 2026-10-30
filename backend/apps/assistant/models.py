import uuid

from django.conf import settings
from django.db import models


class AssistantProfile(models.Model):
    """Nom et personnalité du chatbot, réglés par l'administrateur (une seule ligne). Les règles de sécurité restent
    dans le code (integrations/llm.py::RULES) : cette personnalité ne peut pas les retirer."""

    name = models.CharField(max_length=40)
    persona = models.TextField(max_length=1500)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name="+")
    updated_at = models.DateTimeField(auto_now=True)


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
