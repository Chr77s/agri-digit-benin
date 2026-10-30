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
    # extraits issus d'un même fichier importé (relecture et publication groupées) ; vide pour une fiche saisie à la main
    batch = models.UUIDField(null=True, blank=True, db_index=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                    related_name="+")
    reviewed_at = models.DateTimeField(null=True, blank=True)

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


class Publication(models.Model):
    """Promotion auprès des acteurs (TDR § 1, 3.1) : service d'un partenaire (e-banking, assurance, publicité),
    innovation agricole ou technologique, financement mobilisé pour une filière."""

    KINDS = ("service", "innovation", "financement")
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=20, db_index=True)
    title = models.CharField(max_length=200)
    body = models.TextField()
    provider = models.CharField(max_length=150)  # partenaire, institut (INRAB…), bailleur
    value_chains = models.JSONField(default=list, blank=True)  # vide : toutes
    departments = models.JSONField(default=list, blank=True)  # vide : tout le pays
    amount_xof = models.PositiveBigIntegerField(null=True, blank=True)  # financement mobilisé
    link = models.URLField(blank=True)
    active = models.BooleanField(default=True)
    published_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
