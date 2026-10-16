import uuid

from django.conf import settings
from django.db import models

from apps.producers.models import Producer


class Program(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True)
    conditions = models.TextField(blank=True)
    value_chains = models.JSONField(default=list, blank=True)
    closes_at = models.DateField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)


class Application(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name="applications")
    producer = models.ForeignKey(Producer, on_delete=models.CASCADE, related_name="applications")
    status = models.CharField(max_length=20, default="deposee")
    reason = models.TextField(blank=True)
    decided_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["program", "producer"], name="one_application")]


class SelectionRun(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    program = models.ForeignKey(Program, null=True, blank=True, on_delete=models.SET_NULL)
    department = models.CharField(max_length=40, blank=True)
    target_count = models.PositiveIntegerField()
    weights = models.JSONField()
    status = models.CharField(max_length=20, default="proposition")
    selected_count = models.PositiveIntegerField(default=0)
    total_count = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    validated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.PROTECT, related_name="+")
    validation_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    validated_at = models.DateTimeField(null=True)


class SelectionCandidate(models.Model):
    id = models.BigAutoField(primary_key=True)
    run = models.ForeignKey(SelectionRun, on_delete=models.CASCADE, related_name="candidates")
    farm_id = models.CharField(max_length=30)
    department = models.CharField(max_length=40)
    commune = models.CharField(max_length=40, blank=True)
    score = models.FloatField()
    rank = models.PositiveIntegerField()
    selected = models.BooleanField()
    confidence = models.FloatField()
    road_distance_m = models.FloatField()
    area_ha = models.FloatField()

    class Meta:
        indexes = [models.Index(fields=["run", "selected", "rank"]), models.Index(fields=["run", "farm_id"])]


class Contest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run = models.ForeignKey(SelectionRun, on_delete=models.CASCADE, related_name="contests")
    farm_id = models.CharField(max_length=30)
    reason = models.TextField()
    status = models.CharField(max_length=20, default="deposee")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
