from django.core.management.base import BaseCommand

from apps.satellite.refresh import refresh_departments


class Command(BaseCommand):
    help = "Préchauffe le cache satellite des 12 départements (à planifier toutes les 12 h : les observations sont gardées 24 h)."

    def handle(self, *args, **options):
        # le premier remplissage (9 intervalles par département) dépasse le délai d'une requête web : ici on attend
        n = refresh_departments(deadline=300)
        self.stdout.write(f"réel : {n['real']}, repli : {n['fallback']}")
