"""Recouvrement : créances à échéances (appui remboursable, prêt, équipement du plateau) et remboursement en un clic.

Le reste dû et le retard se calculent sur les échéances ; le paiement est celui du marché (FakePay, SIMULÉ).
"""
import re
import uuid
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone

from apps.audit.services import record
from apps.core.errors import ApiError
from apps.core.permissions import ADMIN, AGENT, AUDITEUR, FINANCIER, RESPONSABLE
from integrations.notifications import get_channel
from integrations.payment import get_provider

from .models import Claim, ClaimPayment, Installment

DEFAULT_INSTALLMENTS = 3
MAX_INSTALLMENTS = 12
STEP_DAYS = 30
FIRST_DUE_DAYS = 90  # après la remise, le temps d'une récolte
REMIND_DAYS = 7  # rappel dans les 7 jours avant l'échéance, puis chaque semaine tant qu'elle est en retard


def _tell(user, title, body):
    get_channel("in_app").send(user.phone, body, user=user, title=title)
    get_channel("sms").send(user.phone, body, department=user.department)


def claims_for(user):
    """Qui voit quoi : le débiteur la sienne ; l'institution financière ses prêts ; l'agent les appuis et équipements de
    son département ; l'administration, le programme et l'audit tous les appuis et équipements, jamais les prêts."""
    qs = Claim.objects.select_related("debtor", "debtor__producer", "creditor").prefetch_related("installments")
    if user.role == FINANCIER:
        return qs.filter(kind="pret", creditor=user)
    if user.role == AGENT:
        return qs.exclude(kind="pret").filter(department=user.department)
    if user.role in (ADMIN, RESPONSABLE, AUDITEUR):
        return qs.exclude(kind="pret")
    return qs.filter(debtor=user)


def _left(i):
    return i.amount_xof - i.paid_xof


def installment_status(i, today):
    if _left(i) <= 0:
        return "payee"
    if i.due_on < today:
        return "en_retard"
    return "partielle" if i.paid_xof else "a_venir"


def summary(c, today=None):
    today = today or timezone.localdate()
    ins = list(c.installments.all())
    total = sum(i.amount_xof for i in ins)
    paid = sum(i.paid_xof for i in ins)
    overdue = sum(_left(i) for i in ins if i.due_on < today)
    nxt = next((i for i in ins if _left(i) > 0), None)
    p = getattr(c.debtor, "producer", None)
    return {
        "id": str(c.id), "kind": c.kind, "label": c.label, "amount_xof": total, "paid_xof": paid,
        "outstanding_xof": total - paid, "overdue_xof": overdue,
        "status": "solde" if total == paid else "en_retard" if overdue else "en_cours",
        "debtor": p.code if p else (c.debtor.full_name or "—"), "department": c.department,
        "next_due_on": nxt.due_on if nxt else None, "next_amount_xof": _left(nxt) if nxt else 0,
        "created_at": c.created_at,
        "installments": [{"rank": i.rank, "due_on": i.due_on, "amount_xof": i.amount_xof, "paid_xof": i.paid_xof,
                          "status": installment_status(i, today)} for i in ins],
    }


def _matured(claims, today):
    """(montant échu, dont payé) sur les échéances dont la date est passée."""
    due = paid = 0
    for c in claims:
        for i in c.installments.all():
            if i.due_on < today:
                due += i.amount_xof
                paid += min(i.paid_xof, i.amount_xof)
    return due, paid


def _aggregate(claims, today):
    due, paid_due = _matured(claims, today)
    rows = [summary(c, today) for c in claims]
    return {"count": len(rows), "amount_xof": sum(r["amount_xof"] for r in rows),
            "paid_xof": sum(r["paid_xof"] for r in rows), "outstanding_xof": sum(r["outstanding_xof"] for r in rows),
            "overdue_xof": sum(r["overdue_xof"] for r in rows),
            "overdue_count": sum(1 for r in rows if r["status"] == "en_retard"),
            "recovery_rate": round(paid_due / due, 3) if due else None}


def portfolio(user, today=None):
    today = today or timezone.localdate()
    claims = list(claims_for(user))
    by_dep = {}
    for c in claims:
        by_dep.setdefault(c.department, []).append(c)
    return {"total": _aggregate(claims, today),
            "by_kind": {k: _aggregate([c for c in claims if c.kind == k], today) for k in Claim.KINDS
                        if any(c.kind == k for c in claims)},
            "by_department": {d: _aggregate(cs, today) for d, cs in sorted(by_dep.items())}}


def repayment_rate(user, today=None):
    """Part des échéances échues payées par cette personne (appuis et prêts) ; None tant qu'aucune n'est échue."""
    today = today or timezone.localdate()
    claims = Claim.objects.filter(debtor=user, kind__in=("appui", "pret")).prefetch_related("installments")
    due, paid = _matured(claims, today)
    return paid / due if due else None


def split(total, n):
    base, extra = divmod(total, n)
    return [base] * (n - 1) + [base + extra]


@transaction.atomic
def open_claim(actor, debtor, kind, label, amount_xof, *, installments=DEFAULT_INSTALLMENTS, first_due=None,
               creditor=None, support=None, department=""):
    today = timezone.localdate()
    if kind not in Claim.KINDS:
        raise ApiError("Type de créance inconnu.", "validation_error", 400, fields={"kind": ["Valeur inconnue."]})
    if amount_xof <= 0:
        raise ApiError("Le montant doit être positif.", "validation_error", 400, fields={"amount_xof": ["Positif."]})
    if not 1 <= installments <= MAX_INSTALLMENTS:
        raise ApiError(f"Entre 1 et {MAX_INSTALLMENTS} échéances.", "validation_error", 400,
                       fields={"installments": [f"Entre 1 et {MAX_INSTALLMENTS}."]})
    first_due = first_due or today + timedelta(days=FIRST_DUE_DAYS)
    if first_due < today:
        raise ApiError("La première échéance ne peut pas être passée.", "validation_error", 400,
                       fields={"first_due": ["Date passée."]})
    c = Claim.objects.create(kind=kind, debtor=debtor, creditor=creditor, support=support, label=label,
                             amount_xof=amount_xof, department=department or debtor.department)
    Installment.objects.bulk_create([
        Installment(claim=c, rank=n + 1, due_on=first_due + timedelta(days=STEP_DAYS * n), amount_xof=amt)
        for n, amt in enumerate(split(amount_xof, installments))])
    record(actor, "claim.open", c, kind=kind, amount_xof=amount_xof, installments=installments)
    _tell(debtor, "Remboursement à prévoir", f"Agri-Digit : « {label} », {amount_xof} FCFA à rembourser en "
                                             f"{installments} fois, la première avant le {first_due:%d/%m/%Y}.")
    return c


@transaction.atomic
def pay(actor, claim, payer_phone, amount_xof=None):
    """Remboursement en un clic : sans montant, la prochaine échéance (ou son reste)."""
    claim = Claim.objects.select_for_update().get(pk=claim.pk)
    if claim.debtor_id != actor.id:
        raise ApiError("Introuvable.", "not_found", 404)
    if claim.payments.filter(status="en_attente").exists():
        raise ApiError("Un paiement est déjà en cours pour cette créance.", "payment_pending", 409)
    ins = list(claim.installments.all())
    nxt = next((i for i in ins if _left(i) > 0), None)
    if nxt is None:
        raise ApiError("Cette créance est soldée.", "settled", 400)
    owed = sum(_left(i) for i in ins)
    amount_xof = amount_xof if amount_xof is not None else _left(nxt)
    if not 0 < amount_xof <= owed:
        raise ApiError(f"Montant entre 1 et {owed} FCFA.", "validation_error", 400,
                       fields={"amount_xof": [f"Entre 1 et {owed}."]})
    if amount_xof > settings.PAYMENT_MAX_XOF:
        raise ApiError(f"Montant au-dessus du plafond de {settings.PAYMENT_MAX_XOF} FCFA.", "amount_over_limit", 400)
    if not re.match(settings.PHONE_REGEX, payer_phone or ""):
        raise ApiError("Numéro Mobile Money invalide.", "validation_error", 400,
                       fields={"payer_phone": ["Format attendu : 01XXXXXXXX."]})
    provider = get_provider()
    reference = f"AGR-{uuid.uuid4().hex[:10].upper()}"
    tx = provider.initiate(amount_xof, payer_phone, reference)
    p = ClaimPayment.objects.create(claim=claim, payer=actor, amount_xof=amount_xof, payer_phone=payer_phone,
                                    provider=provider.name, reference=reference, transaction_id=tx["transaction_id"])
    record(actor, "claim.payment_initiate", p, amount_xof=amount_xof, reference=reference)
    return p


def refresh(p):
    """Interroge le fournisseur tant que le paiement est en attente ; à la réussite, impute sur les échéances."""
    if p.status != "en_attente":
        return p
    new = get_provider().status(p.transaction_id)
    if new == "en_attente":
        return p
    with transaction.atomic():
        p = ClaimPayment.objects.select_for_update().select_related("claim__debtor", "claim__creditor").get(pk=p.pk)
        if p.status != "en_attente":
            return p
        p.status, p.paid_at = new, timezone.now() if new == "reussi" else None
        p.save(update_fields=["status", "paid_at"])
        record(None, f"claim.payment_{new}", p, provider=p.provider, reference=p.reference)
        if new == "reussi":
            left = p.amount_xof
            for i in p.claim.installments.select_for_update():
                take = min(_left(i), left)
                if take:
                    i.paid_xof += take
                    i.save(update_fields=["paid_xof"])
                    left -= take
            _tell(p.claim.debtor, "Remboursement reçu", f"Agri-Digit : {p.amount_xof} FCFA reçus pour « "
                                                         f"{p.claim.label} » (réf. {p.reference}).")
            if p.claim.creditor:
                _tell(p.claim.creditor, "Remboursement reçu", f"Agri-Digit : {p.amount_xof} FCFA reçus pour « "
                                                               f"{p.claim.label} » (réf. {p.reference}).")
    return p


def remind(today=None):
    """Rappelle les échéances à venir (7 jours) ou en retard, une fois par semaine au plus. Renvoie le nombre."""
    today = today or timezone.localdate()
    qs = Installment.objects.select_related("claim__debtor").filter(
        due_on__lte=today + timedelta(days=REMIND_DAYS), paid_xof__lt=F("amount_xof")).filter(
        Q(reminded_on__isnull=True) | Q(reminded_on__lte=today - timedelta(days=REMIND_DAYS)))
    n = 0
    for i in qs:
        state = "dépassée depuis le" if i.due_on < today else "à payer avant le"
        _tell(i.claim.debtor, "Échéance de remboursement", f"Agri-Digit : {_left(i)} FCFA pour « {i.claim.label} », "
                                                           f"échéance {state} {i.due_on:%d/%m/%Y}.")
        i.reminded_on = today
        i.save(update_fields=["reminded_on"])
        n += 1
    return n
