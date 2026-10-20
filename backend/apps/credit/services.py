"""Score de crédit (UC-19/20) : grille transparente de docs/MODEL_CARD.md (non calibrée), aide à la décision."""
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from apps.audit.services import record
from apps.core.errors import ApiError
from apps.parcels.models import Campaign
from apps.producers.models import Consent
from apps.production.recovery import repayment_rate

DISCLAIMER = "Aide à la décision. La décision de crédit revient à une personne (art. 401)."
AREA_CAP_HA = 10.0
NEUTRAL = 0.5


def active_credit_consent(producer):
    return producer.consents.filter(type="credit", withdrawn_at__isnull=True).first()


@transaction.atomic
def give_consent(actor, producer, text_version="v1"):
    c = active_credit_consent(producer)
    if c is None:
        c = Consent.objects.create(producer=producer, type="credit", text_version=text_version)
        record(actor, "credit.consent", c)
    return c


@transaction.atomic
def withdraw_consent(actor, producer):
    c = active_credit_consent(producer)
    if c is None:
        raise ApiError("Aucun consentement crédit actif.", "no_consent", 400)
    c.withdrawn_at = timezone.now()
    c.save(update_fields=["withdrawn_at"])
    record(actor, "credit.consent_withdraw", c)
    return c


def compute(producer):
    camps = list(Campaign.objects.filter(parcel__producer=producer).values_list("stage", "value_chain"))
    area = producer.parcels.aggregate(s=Sum("area_ha"))["s"] or 0.0
    seniority = 0.0 if producer.status != "valide" else min(1.0, max(1, len(camps)) / 3)
    harvest = sum(1 for s, _ in camps if s == "recolte") / len(camps) if camps else NEUTRAL
    repaid = repayment_rate(producer.user) if producer.user_id else None
    factors = [
        ("Fiche validée et ancienneté", 0.2, seniority),
        ("Superficie cultivée", 0.2, min(area, AREA_CAP_HA) / AREA_CAP_HA),
        ("Campagnes suivies jusqu'à la récolte", 0.25, harvest),
        # part des échéances échues payées (appuis et prêts) ; neutre tant qu'aucune n'est échue, jamais défavorable
        ("Appuis remboursés", 0.25, NEUTRAL if repaid is None else repaid),
        ("Diversification", 0.1, 1.0 if len({v for _, v in camps}) >= 2 else 0.0),
    ]
    out = [{"name": n, "weight": w, "value": round(v, 3), "contribution": round(100 * w * v, 1)}
           for n, w, v in factors]
    return {"score": round(sum(f["contribution"] for f in out)), "factors": out, "disclaimer": DISCLAIMER}


def consult(actor, producer):
    if active_credit_consent(producer) is None:
        return None
    result = compute(producer)
    with transaction.atomic():
        record(actor, "credit.score_view", producer, score=result["score"])
    return result
