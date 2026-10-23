import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.parcels.models import Campaign
from apps.producers.models import Producer
from apps.programs.models import Program


class ReferenceYield(models.Model):
    """Rendement de référence par filière (kg/ha), paramétrable en base. `source` dit d'où vient la valeur."""

    value_chain = models.CharField(max_length=40, primary_key=True)
    yield_kg_ha = models.PositiveIntegerField()
    source = models.CharField(max_length=200, default="demonstration")
    updated_at = models.DateTimeField(auto_now=True)


class Support(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    producer = models.ForeignKey(Producer, on_delete=models.CASCADE, related_name="supports")
    program = models.ForeignKey(Program, null=True, blank=True, on_delete=models.SET_NULL, related_name="supports")
    item = models.CharField(max_length=150)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=20)
    value_xof = models.PositiveIntegerField()
    repayable = models.BooleanField(default=False)
    # modalités de remboursement fixées à la remise ; la créance s'ouvre quand le producteur confirme la réception
    repay_installments = models.PositiveSmallIntegerField(default=3)
    repay_first_due = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, default="remis")  # remis | confirme
    delivered_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)


class Harvest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name="harvests")
    harvested_at = models.DateField()
    quantity_kg = models.FloatField()
    stored_kg = models.FloatField(default=0)
    sold_kg = models.FloatField(default=0)
    sale_price_xof_per_kg = models.PositiveIntegerField(null=True, blank=True)
    estimated_kg = models.FloatField(null=True)
    deviation_pct = models.FloatField(null=True)
    flagged = models.BooleanField(default=False, db_index=True)
    # Vérification d'une récolte signalée par l'agent : a_verifier | visite (reste à vérifier) | confirmee | corrigee.
    check_status = models.CharField(max_length=20, default="a_verifier", db_index=True)
    check_reason = models.TextField(blank=True)
    checked_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name="+")
    checked_at = models.DateTimeField(null=True, blank=True)
    declared_kg = models.FloatField(null=True, blank=True)  # quantité d'origine, gardée quand l'agent la corrige
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)


class Site(models.Model):
    """Lieu physique d'un acteur, géolocalisé : magasin, unité de transformation, point de vente, centre semencier."""

    KINDS = ("magasin", "unite_transformation", "point_vente", "centre_semencier")
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sites")
    kind = models.CharField(max_length=30)
    name = models.CharField(max_length=150)
    department = models.CharField(max_length=40, db_index=True)
    commune = models.CharField(max_length=40, blank=True)
    lat = models.FloatField()
    lon = models.FloatField()
    capacity_t = models.FloatField(null=True, blank=True)
    equipment = models.TextField(blank=True)  # plateau technique (transformation), équipements de stockage
    created_at = models.DateTimeField(auto_now_add=True)


class Lot(models.Model):
    """Quantité de produit suivie de la récolte au point de vente. Un lot transformé ou divisé garde ses parents."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True)
    value_chain = models.CharField(max_length=40)
    product = models.CharField(max_length=120)  # « maïs grain », « farine de maïs »…
    quantity_kg = models.FloatField()
    status = models.CharField(max_length=20, default="en_stock", db_index=True)  # en_stock|transfere|transforme
    holder = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="lots")
    site = models.ForeignKey(Site, null=True, blank=True, on_delete=models.SET_NULL, related_name="lots")
    harvest = models.ForeignKey(Harvest, null=True, blank=True, on_delete=models.PROTECT, related_name="lots")
    parents = models.ManyToManyField("self", symmetrical=False, blank=True, related_name="children")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)


class Claim(models.Model):
    """Créance remboursée par échéances : appui remboursable, prêt d'une institution financière ou équipement du
    plateau d'un transformateur. Le reste dû se calcule sur les échéances, jamais stocké."""

    KINDS = ("appui", "pret", "plateau")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=10, db_index=True)
    debtor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="claims")
    creditor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    support = models.OneToOneField(Support, null=True, blank=True, on_delete=models.PROTECT, related_name="claim")
    label = models.CharField(max_length=150)
    amount_xof = models.PositiveIntegerField()
    department = models.CharField(max_length=40, blank=True, db_index=True)  # périmètre de l'agent
    created_at = models.DateTimeField(auto_now_add=True)


class Installment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    claim = models.ForeignKey(Claim, on_delete=models.CASCADE, related_name="installments")
    rank = models.PositiveSmallIntegerField()
    due_on = models.DateField()
    amount_xof = models.PositiveIntegerField()
    paid_xof = models.PositiveIntegerField(default=0)
    reminded_on = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["rank"]
        constraints = [models.UniqueConstraint(fields=["claim", "rank"], name="uniq_installment_rank")]


class ClaimPayment(models.Model):
    """Remboursement SIMULÉ (FakePay), imputé sur les échéances les plus anciennes quand il réussit."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    claim = models.ForeignKey(Claim, on_delete=models.PROTECT, related_name="payments")
    payer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    amount_xof = models.PositiveIntegerField()
    payer_phone = models.CharField(max_length=10)
    provider = models.CharField(max_length=20)
    reference = models.CharField(max_length=40, unique=True)
    transaction_id = models.CharField(max_length=80)
    status = models.CharField(max_length=12, default="en_attente", db_index=True)  # en_attente|reussi|echoue
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)


class Expense(models.Model):
    """Dépense d'exploitation déclarée par le producteur, pour calculer son revenu."""

    CATEGORIES = ("intrants", "main_oeuvre", "mecanisation", "transport", "autre")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    producer = models.ForeignKey(Producer, on_delete=models.CASCADE, related_name="expenses")
    campaign = models.ForeignKey(Campaign, null=True, blank=True, on_delete=models.SET_NULL, related_name="expenses")
    category = models.CharField(max_length=20)
    label = models.CharField(max_length=150, blank=True)
    amount_xof = models.PositiveIntegerField()
    spent_on = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)


class StockAlertSent(models.Model):
    """Alerte de stock déjà envoyée à un détenteur pour un produit : sert à n'en envoyer qu'une par semaine."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    holder = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    product = models.CharField(max_length=120)
    level = models.CharField(max_length=10)  # rupture | critique
    sent_at = models.DateTimeField(default=timezone.now, db_index=True)
