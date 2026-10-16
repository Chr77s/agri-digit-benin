import uuid

from django.conf import settings
from django.db import models


class Offer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="offers")
    type = models.CharField(max_length=10, choices=[("offre", "offre"), ("demande", "demande")], db_index=True)
    value_chain = models.CharField(max_length=40, db_index=True)
    quantity_kg = models.PositiveIntegerField()
    price_xof_per_kg = models.PositiveIntegerField()
    department = models.CharField(max_length=40, db_index=True)
    commune = models.CharField(max_length=40)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=12, default="ouverte", db_index=True)  # ouverte|en_relation|conclue|retiree
    created_at = models.DateTimeField(auto_now_add=True)


class Match(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    offer = models.ForeignKey(Offer, on_delete=models.CASCADE, related_name="matches")
    requester = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    message = models.TextField(blank=True)
    status = models.CharField(max_length=10, default="proposee", db_index=True)  # proposee|acceptee|refusee
    created_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)


class Payment(models.Model):
    """Paiement SIMULÉ (FakePay). Statut rafraîchi à la lecture auprès du fournisseur."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.ForeignKey(Match, on_delete=models.PROTECT, related_name="payments")
    payer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    payee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    amount_xof = models.PositiveIntegerField()
    payer_phone = models.CharField(max_length=10)
    provider = models.CharField(max_length=20)
    reference = models.CharField(max_length=40, unique=True)
    transaction_id = models.CharField(max_length=80)
    status = models.CharField(max_length=12, default="en_attente", db_index=True)  # en_attente|reussi|echoue|rembourse
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    refunded_at = models.DateTimeField(null=True, blank=True)
