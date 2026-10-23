import uuid

from django.db import models

PARTNERS = {
    "xroad": "X-Road Bénin",
    "sonama": "SONAMA",
    "fnda": "FNDA",
}


class PartnerKey(models.Model):
    """Clé d'API d'un partenaire : seule son empreinte est gardée ; la clé entière n'est montrée qu'à la création."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    partner = models.CharField(max_length=20, db_index=True)
    key_hash = models.CharField(max_length=64, unique=True)
    prefix = models.CharField(max_length=12)
    last4 = models.CharField(max_length=4)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
