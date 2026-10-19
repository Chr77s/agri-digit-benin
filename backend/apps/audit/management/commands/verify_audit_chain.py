from django.core.management.base import BaseCommand, CommandError

from apps.audit.services import verify_chain


class Command(BaseCommand):
    help = "Vérifie la chaîne d'empreintes du journal d'audit (à planifier, par exemple chaque nuit)."

    def handle(self, *args, **opts):
        r = verify_chain()
        if not r["ok"]:
            raise CommandError(f"Rupture de chaîne à l'entrée n° {r['broken_seq']} ({r['count']} entrée(s) intègres avant).")
        self.stdout.write(f"Chaîne intègre : {r['count']} entrée(s) vérifiées.")
