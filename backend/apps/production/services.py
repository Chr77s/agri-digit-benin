from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.audit.services import record
from apps.core.errors import ApiError
from apps.producers.services import notify
from apps.referentiel.data import RESERVE_VALUE_CHAINS, VALUE_CHAINS
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


ISSUES = {"manque": "qu'il en manque une partie", "rien_recu": "n'avoir rien reçu"}


@transaction.atomic
def report_support_issue(actor, s, kind):
    """Le producteur signale un appui incomplet ou non reçu : journalisé, l'agent qui l'a remis est prévenu."""
    if s.status != "remis":
        raise ApiError("Appui déjà confirmé.", "invalid_status", 400)
    if kind not in ISSUES:
        raise ApiError("Signalement inconnu.", "invalid_kind", 400)
    record(actor, "support.issue", s, kind=kind)
    _notify_user(s.delivered_by, "Appui signalé", f"Agri-Digit : {s.producer.code} signale {ISSUES[kind]} pour "
                                                   f"« {s.item} ». Contactez-le.")
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


CHECKS = ("confirmee", "corrigee", "visite")


@transaction.atomic
def check_harvest(actor, h, conclusion, reason, quantity_kg=None):
    """L'agent conclut sur une récolte signalée : déclaration confirmée, quantité corrigée (l'originale est gardée) ou
    visite à programmer (elle reste à vérifier). Motif obligatoire ; le producteur est prévenu des deux premières."""
    if conclusion not in CHECKS:
        raise ApiError("Conclusion inconnue.", "validation_error", 400, fields={"conclusion": ["Valeur inconnue."]})
    if not reason:
        raise ApiError("Le motif est obligatoire.", "reason_required", 400, fields={"reason": ["Obligatoire."]})
    if not h.flagged or h.check_status not in ("a_verifier", "visite"):
        raise ApiError("Cette récolte n'est pas à vérifier.", "invalid_status", 400)
    if conclusion == "corrigee":
        if not quantity_kg or quantity_kg <= 0:
            raise ApiError("Indiquez la quantité corrigée.", "validation_error", 400,
                           fields={"quantity_kg": ["Obligatoire."]})
        if h.stored_kg + h.sold_kg > quantity_kg:
            raise ApiError("Stock et vente dépassent la quantité corrigée.", "validation_error", 400,
                           fields={"quantity_kg": ["Inférieure au stock et aux ventes déjà déclarés."]})
        h.declared_kg = h.declared_kg or h.quantity_kg
        h.quantity_kg = quantity_kg
        if h.estimated_kg:
            h.deviation_pct = round((quantity_kg - h.estimated_kg) / h.estimated_kg * 100, 1)
            h.flagged = abs(h.deviation_pct) > DEVIATION_FLAG_PCT
    h.check_status, h.check_reason, h.checked_by, h.checked_at = conclusion, reason, actor, timezone.now()
    h.save()
    record(actor, "harvest.check", h, conclusion=conclusion, reason=reason, quantity_kg=h.quantity_kg)
    if conclusion != "visite":
        label = "confirmée" if conclusion == "confirmee" else f"corrigée à {h.quantity_kg:g} kg"
        notify(h.campaign.parcel.producer, "Récolte vérifiée",
               f"Agri-Digit : votre récolte est {label}. Motif : {reason}")
    return h


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
        vc = dict(VALUE_CHAINS + RESERVE_VALUE_CHAINS).get(campaign.value_chain, campaign.value_chain)
        body = (f"Agri-Digit : récolte à vérifier pour {parcel.producer.code} ({vc}) : "
                f"écart de {dev:+.0f} % avec le rendement estimé.")
        for agent in User.objects.filter(role="agent_atda", department=parcel.department, is_active=True):
            _notify_user(agent, "Récolte à vérifier", body)
    return h
