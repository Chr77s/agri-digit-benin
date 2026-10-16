import uuid

from django.conf import settings
from django.db import models


class Counter(models.Model):
    """Séquence en base pour les identifiants lisibles (incrémentée sous select_for_update)."""

    name = models.CharField(max_length=40, primary_key=True)
    value = models.PositiveIntegerField(default=0)


class Producer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=24, unique=True)
    npi = models.CharField(max_length=20, unique=True)
    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    sex = models.CharField(max_length=1)
    birth_date = models.DateField()
    department = models.CharField(max_length=40, db_index=True)
    commune = models.CharField(max_length=40, db_index=True)
    phone = models.CharField(max_length=10, unique=True)
    language = models.CharField(max_length=5, default="fr")
    status = models.CharField(max_length=20, default="en_attente", db_index=True)
    reject_reason = models.TextField(blank=True)
    guardian_name = models.CharField(max_length=150, blank=True)
    guardian_npi = models.CharField(max_length=20, blank=True)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                related_name="producer")
    created_at = models.DateTimeField(auto_now_add=True)
    validated_at = models.DateTimeField(null=True, blank=True)
    version = models.PositiveIntegerField(default=1)  # UC-25 : détection des conflits hors ligne
    verification_code = models.CharField(max_length=8, unique=True, null=True, blank=True)  # UC-07
    card_issued_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.code


class ProducerVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    producer = models.ForeignKey(Producer, on_delete=models.CASCADE, related_name="versions")
    version = models.PositiveIntegerField()
    data = models.JSONField()
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    reason = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Consent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    producer = models.ForeignKey(Producer, on_delete=models.CASCADE, related_name="consents")
    type = models.CharField(max_length=30)  # donnees_personnelles | parental | credit
    text_version = models.CharField(max_length=10)
    channel = models.CharField(max_length=20, default="web")
    created_at = models.DateTimeField(auto_now_add=True)
    withdrawn_at = models.DateTimeField(null=True, blank=True)
