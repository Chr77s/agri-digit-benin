from django.core.management.base import BaseCommand

from apps.production.recovery import remind


class Command(BaseCommand):
    help = "Rappelle par message les échéances de remboursement à venir ou en retard (à planifier chaque jour)."

    def handle(self, *args, **opts):
        self.stdout.write(f"{remind()} rappel(s) envoyé(s)")
