import uuid

from django.conf import settings
from django.db import models


class PriceObservation(models.Model):
    """Relevé de prix saisi par un acteur habilité : un marché, une filière, une forme (brut ou transformé), un jour."""

    FORMS = ("brut", "transforme")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    market = models.CharField(max_length=80)
    department = models.CharField(max_length=40, db_index=True)
    value_chain = models.CharField(max_length=40, db_index=True)
    form = models.CharField(max_length=10)
    product = models.CharField(max_length=120)  # « maïs grain », « farine de maïs »…
    price_xof_per_kg = models.PositiveIntegerField()
    observed_on = models.DateField(db_index=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    source = models.CharField(max_length=20, default="releve")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["value_chain", "observed_on"])]


class Survey(models.Model):
    """Enquête de satisfaction des consommateurs : des notes de 1 à 5 et un commentaire libre facultatif."""

    STATUSES = ("active", "close")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=8, unique=True)
    title = models.CharField(max_length=150)
    value_chain = models.CharField(max_length=40, blank=True)
    department = models.CharField(max_length=40, blank=True, db_index=True)
    questions = models.JSONField(default=list)  # liste de textes ; l'indice de la question est celui de la note
    status = models.CharField(max_length=10, default="active", db_index=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)


class SurveyResponse(models.Model):
    """Réponse anonyme : ni adresse IP, ni téléphone, ni compte. `device_hash` est l'empreinte d'un jeton tiré au hasard
    par le navigateur (jamais lié à une personne) ; elle sert seulement à refuser une 2e réponse du même appareil."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name="responses")
    ratings = models.JSONField(default=list)
    comment = models.TextField(blank=True)
    department = models.CharField(max_length=40, blank=True, db_index=True)
    commune = models.CharField(max_length=40, blank=True)
    channel = models.CharField(max_length=10, default="web")
    device_hash = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["survey", "device_hash"], condition=~models.Q(device_hash=""),
                                               name="one_response_per_device")]


class Training(models.Model):
    """Session de formation proposée dans un département (renforcement des capacités)."""

    THEMES = ("production", "transformation", "stockage", "commercialisation", "gestion", "qualite", "numerique",
              "autre")
    AUDIENCES = ("producteur", "transformateur", "distributeur", "gestionnaire_cooperative")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=150)
    theme = models.CharField(max_length=20)
    department = models.CharField(max_length=40, db_index=True)
    date = models.DateField(db_index=True)
    place = models.CharField(max_length=150)
    seats = models.PositiveSmallIntegerField()
    audience = models.JSONField(default=list)  # rôles visés
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)


class TrainingRegistration(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    training = models.ForeignKey(Training, on_delete=models.CASCADE, related_name="registrations")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    attended = models.BooleanField(null=True, blank=True)  # vide : présence pas encore enregistrée
    marked_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    marked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["training", "user"], name="one_registration_per_user")]


class Showcase(models.Model):
    """Vitrine des produits d'un transformateur, d'un distributeur ou d'une coopérative (promotion des produits)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="showcases")
    company = models.CharField(max_length=150)
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    value_chain = models.CharField(max_length=40, db_index=True)
    form = models.CharField(max_length=10)  # brut | transforme
    price_xof_per_kg = models.PositiveIntegerField(null=True, blank=True)  # indicatif
    department = models.CharField(max_length=40, db_index=True)
    contact = models.CharField(max_length=120)  # contact d'entreprise publié par l'auteur, vu des acteurs connectés
    status = models.CharField(max_length=10, default="publie", db_index=True)  # publie | retire
    created_at = models.DateTimeField(auto_now_add=True)
    withdrawn_at = models.DateTimeField(null=True, blank=True)
