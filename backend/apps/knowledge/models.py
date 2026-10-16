import uuid

from django.conf import settings
from django.db import models

STATUSES = [("brouillon", "Brouillon"), ("relu", "Relu"), ("publie", "Publié")]


class KnowledgeDoc(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    value_chain = models.CharField(max_length=40, db_index=True)
    title = models.CharField(max_length=200)
    body = models.TextField()
    source = models.CharField(max_length=500)
    version = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUSES, default="brouillon", db_index=True)
    language = models.CharField(max_length=5, default="fr")
    language_validation = models.CharField(max_length=20, default="valide")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class KnowledgeDocVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doc = models.ForeignKey(KnowledgeDoc, on_delete=models.CASCADE, related_name="versions")
    version = models.PositiveIntegerField()
    title = models.CharField(max_length=200)
    body = models.TextField()
    source = models.CharField(max_length=500)
    status = models.CharField(max_length=20)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                               related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
