from django.core.management.base import BaseCommand, CommandError

from apps.core.errors import ApiError
from apps.observatory import training


class Command(BaseCommand):
    help = ("Exporte un jeu d'entraînement pseudonymisé (sans nom, téléphone, NPI ni coordonnées exactes) avec son "
            "fichier de description. Voir docs/REENTRAINEMENT.md.")

    def add_arguments(self, parser):
        parser.add_argument("kind", choices=training.KINDS)
        parser.add_argument("--output", required=True, help="dossier d'écriture (créé si besoin)")
        parser.add_argument("--with-images", action="store_true",
                            help="diagnostic : copie aussi les images, nommées par leur empreinte")

    def handle(self, *args, **opts):
        try:
            csv_path, desc_path, desc = training.export(opts["kind"], opts["output"], opts["with_images"])
        except ApiError as e:
            raise CommandError(e.payload["detail"]) from e
        self.stdout.write(f"{desc['rows']} ligne(s) -> {csv_path}\nDescription -> {desc_path}")
