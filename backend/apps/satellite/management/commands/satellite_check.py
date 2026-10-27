import json
from datetime import date, timedelta

from django.core.management.base import BaseCommand, CommandError

from apps.referentiel import zones
from apps.satellite import services
from integrations import copernicus


class Command(BaseCommand):
    help = "Valide la clé Copernicus : obtient un jeton puis affiche la réponse brute de la Statistical API pour un département."

    def add_arguments(self, parser):
        parser.add_argument("--department", default="alibori")

    def handle(self, *args, **options):
        try:
            geometry = zones.department_geometry(options["department"])
        except KeyError:
            raise CommandError(f"Département inconnu : {options['department']}") from None
        end = date.today() - timedelta(days=1)
        try:
            copernicus.token()
            self.stdout.write("jeton OK")
            raw = copernicus.raw_statistics(geometry, end - timedelta(days=29), end, services.RESOLUTION["department"])
        except copernicus.CopernicusError as e:
            raise CommandError(str(e)) from e
        self.stdout.write(json.dumps(raw, ensure_ascii=False, indent=2))
