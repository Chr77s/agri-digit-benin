from django.core.management.base import BaseCommand

from apps.referentiel import zones
from apps.referentiel.models import Department
from apps.satellite import services


class Command(BaseCommand):
    help = "Préchauffe le cache satellite des 12 départements (à planifier toutes les 12 h : les observations sont gardées 24 h)."

    def handle(self, *args, **options):
        codes = list(Department.objects.values_list("code", flat=True))
        # le premier remplissage (9 intervalles par département) dépasse le délai d'une requête web : ici on attend
        zs = services.zone_series("department", {c: zones.department_geometry(c) for c in codes}, deadline=300)
        real = sum(1 for z in zs.values() if not z["simulated"])
        self.stdout.write(f"réel : {real}, repli : {len(zs) - real}")
