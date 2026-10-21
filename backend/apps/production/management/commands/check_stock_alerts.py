from django.core.management.base import BaseCommand

from apps.production.stocks import alert_holders


class Command(BaseCommand):
    help = "Prévient les détenteurs dont un stock est critique ou épuisé (une fois par semaine et par produit au plus)."

    def handle(self, *args, **opts):
        self.stdout.write(f"{alert_holders()} alerte(s) de stock envoyée(s)")
