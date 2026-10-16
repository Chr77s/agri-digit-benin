"""Paiement Mobile Money. FakePay = bac à sable SIMULÉ ; adaptateurs agrégateurs vides (aucune clé réelle)."""
import time
import uuid

from django.conf import settings


class PaymentProvider:
    name = ""

    def initiate(self, amount_xof: int, phone: str, reference: str) -> dict:
        raise NotImplementedError

    def status(self, transaction_id: str) -> str:
        """en_attente | reussi | echoue"""
        raise NotImplementedError


class FakePay(PaymentProvider):
    """SIMULATION sans état : l'heure d'initiation et le dernier chiffre du payeur sont codés dans l'identifiant.
    Réussite après FAKEPAY_DELAY_S secondes ; un numéro qui finit par 0 échoue (démonstration)."""

    name = "FakePay"

    def initiate(self, amount_xof, phone, reference):
        if amount_xof <= 0:
            raise ValueError("Montant invalide")
        tid = f"FAKE-{int(time.time() * 1000)}-{phone[-1:] or 'x'}-{uuid.uuid4().hex[:8]}"
        return {"transaction_id": tid, "status": "en_attente", "simulated": True}

    def status(self, transaction_id):
        _, started_ms, last, _ = transaction_id.split("-")
        if time.time() * 1000 - int(started_ms) < settings.FAKEPAY_DELAY_S * 1000:
            return "en_attente"
        return "echoue" if last == "0" else "reussi"


class FedaPayProvider(PaymentProvider):
    pass


class KKiaPayProvider(PaymentProvider):
    pass


class CinetPayProvider(PaymentProvider):
    pass


def get_provider() -> PaymentProvider:
    return {"fedapay": FedaPayProvider, "kkiapay": KKiaPayProvider, "cinetpay": CinetPayProvider}.get(
        settings.PAYMENT_BACKEND, FakePay)()
