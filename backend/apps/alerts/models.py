import uuid

from django.conf import settings
from django.db import models


class Alert(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=150)
    message = models.TextField()
    category = models.CharField(max_length=20)
    severity = models.CharField(max_length=20)
    department = models.CharField(max_length=40, db_index=True)
    communes = models.JSONField(default=list, blank=True)
    value_chains = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=30, default="brouillon")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT,
                                    related_name="+")
    stats = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)


class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=150, blank=True)
    body = models.TextField()
    channel = models.CharField(max_length=10, default="in_app")
    status = models.CharField(max_length=10, default="livre")
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)


class Outbox(models.Model):
    """Boîte d'envoi SIMULÉE des SMS et messages vocaux (aucun envoi réel)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    channel = models.CharField(max_length=10, db_index=True)
    to = models.CharField(max_length=20, db_index=True)
    body = models.TextField()
    segments = models.PositiveSmallIntegerField(default=1)
    encoding = models.CharField(max_length=10, default="GSM-7")
    status = models.CharField(max_length=10, default="livre")
    department = models.CharField(max_length=40, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
