from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.audit.services import record
from apps.core.errors import ApiError
from apps.producers.services import notify
from integrations.notifications import get_channel

from .models import Harvest, ReferenceYield, Support

DEVIATION_FLAG_PCT = 50  # écart absolu au rendement estimé au-delà duquel la récolte est signalée

# Valeurs de DÉMONSTRATION (ordre de grandeur, non officielles) : à remplacer par les références INRAB/DSA.
DEMO_YIELDS = {"coton": 1100, "anacarde": 450, "ananas": 45000, "mais": 1500, "riz": 3000, "soja": 1000,
               "manioc": 13000, "niebe": 700}


def seed_reference_yields():
    for vc, kg in DEMO_YIELDS.items():
        ReferenceYield.objects.get_or_create(value_chain=vc, defaults={"yield_kg_ha": kg, "source": "demonstration"})


def _notify_user(user, title, body):
    if user is not None:
        get_channel("in_app").send(user.phone, body, user=user, title=title)


@transaction.atomic
def create_support(actor, producer, d):
    if producer.status != "valide":
        raise ApiError("Un appui ne peut être remis qu'à un producteur validé.", "not_validated", 400)
    s = Support.objects.create(producer=producer, delivered_by=actor, **d)
    record(actor, "support.deliver", s, producer=producer.code, value_xof=s.value_xof, repayable=s.repayable)
    notify(producer, "Appui remis", f"Agri-Digit : un appui ({s.item}) vous a été remis. Confirmez la réception.")
    return s


@transaction.atomic
def confirm_support(actor, s):
    if s.status != "remis":
        raise ApiError("Appui déjà confirmé.", "invalid_status", 400)
    s.status, s.confirmed_at = "confirme", timezone.now()
    s.save(update_fields=["status", "confirmed_at"])
    record(actor, "support.confirm", s)
    _notify_user(s.delivered_by, "Appui confirmé", f"Agri-Digit : {s.producer.code} a confirmé la réception de "
                                                   f"« {s.item} ».")
    return s


def estimate(campaign):
    ref = ReferenceYield.objects.filter(value_chain=campaign.value_chain).first()
    return round(ref.yield_kg_ha * campaign.parcel.area_ha, 1) if ref else None


@transaction.atomic
def create_harvest(actor, campaign, d):
    if d.get("stored_kg", 0) + d.get("sold_kg", 0) > d["quantity_kg"]:
        raise ApiError("Stock et vente dépassent la quantité récoltée.", "validation_error", 400,
                       fields={"stored_kg": ["stored_kg + sold_kg doit être inférieur ou égal à quantity_kg."]})
    est = estimate(campaign)
    dev = round((d["quantity_kg"] - est) / est * 100, 1) if est else None
    h = Harvest.objects.create(campaign=campaign, created_by=actor, estimated_kg=est, deviation_pct=dev,
                               flagged=dev is not None and abs(dev) > DEVIATION_FLAG_PCT, **d)
    record(actor, "harvest.create", h, campaign=str(campaign.id), flagged=h.flagged, deviation_pct=dev)
    if h.flagged:
        parcel = campaign.parcel
        body = (f"Agri-Digit : récolte à vérifier pour {parcel.producer.code} ({campaign.value_chain}) : "
                f"écart de {dev:+.0f} % avec le rendement estimé.")
        for agent in User.objects.filter(role="agent_atda", department=parcel.department, is_active=True):
            _notify_user(agent, "Récolte à vérifier", body)
    return h
