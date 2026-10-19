from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.audit.models import AuditLog, RetentionPolicy
from apps.audit.services import record
from apps.diagnosis.services import purge as purge_diagnoses
from apps.producers.services import erase_closed


class Command(BaseCommand):
    help = "Applique les durées de conservation (audit : 5 ans par défaut)."

    def handle(self, *args, **opts):
        pol, _ = RetentionPolicy.objects.get_or_create(
            data_type="audit_log", defaults={"retention_days": settings.AUDIT_RETENTION_DAYS,
                                             "description": "Journal d'audit"})
        limit = timezone.now() - timedelta(days=pol.retention_days)
        qs = AuditLog.objects.filter(at__lt=limit)
        last = qs.exclude(seq__isnull=True).order_by("-seq").first()
        # seule voie de suppression du journal : purge de conservation (contourne le refus du QuerySet)
        n = qs._raw_delete(qs.db)
        if n:  # garde le maillon purgé pour que la vérification de la chaîne reparte de l'entrée suivante
            record(None, "audit.purge", count=n, up_to_seq=last.seq if last else None,
                   last_hash=last.hash if last else "")
        self.stdout.write(f"audit_log : {n} entrée(s) purgée(s) avant {limit:%Y-%m-%d}")
        self.stdout.write(f"diagnostics : {purge_diagnoses(settings.DIAGNOSIS_RETENTION_DAYS)} photo(s) purgée(s)")
        self.stdout.write(f"comptes fermés : {erase_closed(settings.PRODUCER_RETENTION_DAYS)} identité(s) effacée(s)")
