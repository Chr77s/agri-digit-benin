import hashlib
import hmac
import secrets

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.audit.services import record

from .models import PartnerKey

SMALL_COUNT = 5  # en dessous, une cellule pourrait désigner une personne : elle est masquée


def _hash(key):
    return hashlib.sha256(key.encode()).hexdigest()


def check_key(partner, given):
    """Clé active du partenaire (base) ou, à défaut, clé de configuration INTEROP_KEY_<PARTENAIRE>."""
    if not given:
        return False
    k = PartnerKey.objects.filter(partner=partner, key_hash=_hash(given), revoked_at__isnull=True).first()
    if k:
        PartnerKey.objects.filter(pk=k.pk).update(last_used_at=timezone.now())
        return True
    expected = settings.INTEROP_KEYS.get(partner, "")
    return bool(expected) and hmac.compare_digest(given.encode(), expected.encode())


@transaction.atomic
def issue_key(actor, partner):
    """Nouvelle clé ; les précédentes du partenaire sont révoquées. Renvoie la clé entière (affichée une seule fois)."""
    now = timezone.now()
    PartnerKey.objects.filter(partner=partner, revoked_at__isnull=True).update(revoked_at=now)
    prefix = f"{partner[:2]}_live_"
    key = prefix + secrets.token_urlsafe(24)
    k = PartnerKey.objects.create(partner=partner, key_hash=_hash(key), prefix=prefix, last4=key[-4:])
    record(actor, "interop.key_issue", k, partner=partner)
    return k, key


@transaction.atomic
def revoke_key(actor, partner):
    n = PartnerKey.objects.filter(partner=partner, revoked_at__isnull=True).update(revoked_at=timezone.now())
    record(actor, "interop.key_revoke", object_type="partner", object_id=partner, keys=n)
    return n


def mask_small(rows):
    for r in rows:
        if r["producers"] < SMALL_COUNT:
            r.update(producers=None, area_ha=None, campaigns=None, masked=True)
    return rows
