"""UC-21 Offres, mise en relation et paiement SIMULÉ (FakePay). Chaque transition est journalisée."""
import re
import uuid

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.audit.services import record
from apps.core.errors import ApiError
from integrations.notifications import get_channel
from integrations.payment import get_provider

from .models import Match, Offer, Payment

MARKET_ROLES = ("producteur", "transformateur", "distributeur", "gestionnaire_cooperative")


def mask(phone):
    return phone[:2] + "****" + phone[-4:] if phone and len(phone) >= 6 else "****"


def _notify(user, title, body):
    get_channel("in_app").send(user.phone, body, user=user, title=title)


@transaction.atomic
def create_offer(actor, data):
    o = Offer.objects.create(owner=actor, **data)
    record(actor, "market.offer_create", o, type=o.type, value_chain=o.value_chain)
    return o


@transaction.atomic
def contact(actor, offer, message):
    if offer.owner_id == actor.id:
        raise ApiError("Vous ne pouvez pas répondre à votre propre annonce.", "own_offer", 400)
    if offer.status not in ("ouverte", "en_relation"):
        raise ApiError("Cette annonce n'est plus ouverte.", "offer_closed", 400)
    if offer.matches.filter(requester=actor, status__in=["proposee", "acceptee"]).exists():
        raise ApiError("Une mise en relation est déjà en cours pour cette annonce.", "duplicate", 409)
    m = Match.objects.create(offer=offer, requester=actor, message=message)
    record(actor, "market.match_propose", m, offer=str(offer.id))
    _notify(offer.owner, "Nouvelle mise en relation", f"Quelqu'un est intéressé par votre annonce "
                                                       f"({offer.value_chain}, {offer.quantity_kg} kg).")
    return m


@transaction.atomic
def decide(actor, m, accept):
    if m.offer.owner_id != actor.id:
        raise ApiError("Seul l'auteur de l'annonce peut répondre.", "forbidden", 403)
    if m.status != "proposee":
        raise ApiError("Cette mise en relation a déjà reçu une réponse.", "invalid_status", 400)
    m.status, m.decided_at = ("acceptee" if accept else "refusee"), timezone.now()
    m.save(update_fields=["status", "decided_at"])
    if accept and m.offer.status == "ouverte":
        m.offer.status = "en_relation"
        m.offer.save(update_fields=["status"])
    record(actor, "market.match_" + ("accept" if accept else "refuse"), m)
    _notify(m.requester, "Mise en relation", "Votre demande a été acceptée : le numéro de contact est visible."
            if accept else "Votre demande de mise en relation a été refusée.")
    return m


def counterpart(user, m):
    return m.offer.owner if m.requester_id == user.id else m.requester


@transaction.atomic
def create_payment(actor, m, amount_xof, payer_phone):
    if actor.id not in (m.requester_id, m.offer.owner_id):
        raise ApiError("Introuvable.", "not_found", 404)
    if m.status != "acceptee":
        raise ApiError("La mise en relation doit être acceptée avant le paiement.", "match_not_accepted", 400)
    if amount_xof > settings.PAYMENT_MAX_XOF:
        raise ApiError(f"Montant au-dessus du plafond de {settings.PAYMENT_MAX_XOF} FCFA.", "amount_over_limit", 400)
    if not re.match(settings.PHONE_REGEX, payer_phone):
        raise ApiError("Numéro Mobile Money invalide.", "validation_error", 400,
                       fields={"payer_phone": ["Format attendu : 01XXXXXXXX."]})
    provider = get_provider()
    reference = f"AGD-{uuid.uuid4().hex[:10].upper()}"
    tx = provider.initiate(amount_xof, payer_phone, reference)
    p = Payment.objects.create(match=m, payer=actor, payee=counterpart(actor, m), amount_xof=amount_xof,
                               payer_phone=payer_phone, provider=provider.name, reference=reference,
                               transaction_id=tx["transaction_id"], status="en_attente")
    record(actor, "market.payment_initiate", p, amount_xof=amount_xof, reference=reference)
    return p


def refresh(p):
    """Interroge le fournisseur tant que le paiement est en attente ; journalise la transition."""
    if p.status != "en_attente":
        return p
    new = get_provider().status(p.transaction_id)
    if new == "en_attente":
        return p
    with transaction.atomic():
        p = Payment.objects.select_for_update().get(pk=p.pk)
        if p.status != "en_attente":
            return p
        p.status = new
        p.paid_at = timezone.now() if new == "reussi" else None
        p.save(update_fields=["status", "paid_at"])
        record(None, f"market.payment_{new}", p, provider=p.provider, reference=p.reference)
        if new == "reussi":
            Offer.objects.filter(pk=p.match.offer_id).update(status="conclue")
            _notify(p.payee, "Paiement reçu", f"Paiement de {p.amount_xof} FCFA reçu (réf. {p.reference}).")
    return p


@transaction.atomic
def refund(actor, p):
    if p.status != "reussi":
        raise ApiError("Seul un paiement réussi peut être remboursé.", "invalid_status", 400)
    p.status, p.refunded_at = "rembourse", timezone.now()
    p.save(update_fields=["status", "refunded_at"])
    record(actor, "market.payment_refund", p, reference=p.reference)
    return p


def receipt(p):
    if not p.paid_at:
        return None
    return {"reference": p.reference, "amount_xof": p.amount_xof, "payer_masked": mask(p.payer_phone),
            "payee_masked": mask(p.payee.phone), "paid_at": p.paid_at}


DEMO = [  # (téléphone, type, filière, kg, prix/kg, département, commune, description)
    ("0196000005", "offre", "mais", 2000, 180, "atlantique", "abomey_calavi", "Maïs grain sec, récolte 2026."),
    ("0196000006", "offre", "soja", 1500, 300, "borgou", "parakou", "Soja trié, en sacs."),
    ("0196000007", "offre", "anacarde", 800, 450, "collines", "savalou", "Noix de cajou séchées."),
    ("0196000008", "offre", "riz", 1200, 350, "couffo", "dogbo", "Riz paddy de bas-fond."),
    ("0196000009", "offre", "manioc", 3000, 90, "donga", "djougou", "Tubercules de manioc frais."),
    ("0196000010", "offre", "niebe", 600, 500, "littoral", "cotonou", "Niébé blanc, stocké en sacs hermétiques."),
    ("0197000009", "demande", "mais", 5000, 175, "borgou", "parakou", "Transformateur : achat de maïs pour farine."),
    ("0197000009", "demande", "soja", 2000, 290, "borgou", "parakou", "Transformateur : soja pour huile."),
    ("0197000010", "demande", "ananas", 1000, 150, "littoral", "cotonou", "Distributeur : ananas pour le marché."),
]
DEMO_USERS = {"0197000009": ("Transformateur (démo)", "transformateur", "borgou", "parakou"),
              "0197000010": ("Distributeur (démo)", "distributeur", "littoral", "cotonou")}


def seed_market(password):
    """6 offres et 3 demandes de démonstration (données fictives). Idempotent."""
    from apps.accounts.models import User

    if Offer.objects.filter(description__startswith="[démo]").exists():
        return 0
    for phone, (name, role, dep, commune) in DEMO_USERS.items():
        u, created = User.objects.get_or_create(phone=phone, defaults={"full_name": name, "role": role,
                                                                       "department": dep, "commune": commune})
        if created:
            u.set_password(password)
            u.save()
    n = 0
    for phone, typ, vc, kg, price, dep, commune, desc in DEMO:
        owner = User.objects.filter(phone=phone).first()
        if owner:
            Offer.objects.create(owner=owner, type=typ, value_chain=vc, quantity_kg=kg, price_xof_per_kg=price,
                                 department=owner.department or dep, commune=owner.commune or commune,
                                 description=f"[démo] {desc}")
            n += 1
    return n
