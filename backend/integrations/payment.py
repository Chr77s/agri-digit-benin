"""Paiement Mobile Money. FakePay = bac à sable SIMULÉ ; adaptateurs agrégateurs vides (aucune clé réelle)."""
import uuid

from django.conf import settings


class PaymentProvider:
    def initiate(self, amount_xof: int, phone: str, reference: str) -> dict:
        raise NotImplementedError

    def status(self, transaction_id: str) -> str:
        raise NotImplementedError


class FakePay(PaymentProvider):
    def initiate(self, amount_xof, phone, reference):
        if amount_xof <= 0:
            raise ValueError("Montant invalide")
        return {"transaction_id": f"FAKE-{uuid.uuid4().hex[:12]}", "status": "succes", "simulated": True}

    def status(self, transaction_id):
        return "succes"


class FedaPayProvider(PaymentProvider):
    pass


class KKiaPayProvider(PaymentProvider):
    pass


class CinetPayProvider(PaymentProvider):
    pass


def get_provider() -> PaymentProvider:
    return {"fedapay": FedaPayProvider, "kkiapay": KKiaPayProvider, "cinetpay": CinetPayProvider}.get(
        settings.PAYMENT_BACKEND, FakePay)()
