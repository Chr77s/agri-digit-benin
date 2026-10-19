from django.db.models import Q

from .models import Match, Offer, Payment


def offers(user, type_=None, value_chain=None, department=None):
    """Annonces ouvertes ou en relation pour tous ; ses propres annonces quel que soit le statut."""
    qs = Offer.objects.select_related("owner").filter(Q(status__in=["ouverte", "en_relation"]) | Q(owner=user))
    if type_:
        qs = qs.filter(type=type_)
    if value_chain:
        qs = qs.filter(value_chain=value_chain)
    if department:
        qs = qs.filter(department=department)
    return qs


def offer_for_contact(pk):
    return Offer.objects.select_related("owner").filter(pk=pk).first()


def matches_mine(user):
    return Match.objects.select_related("offer__owner", "requester").filter(Q(requester=user) | Q(offer__owner=user))


def match_for_party(user, pk):
    return matches_mine(user).filter(pk=pk).first()


def payment_visible(user, pk):
    qs = Payment.objects.select_related("payee", "match__offer")
    if user.role != "admin_maep":
        # les deux parties de la mise en relation voient le paiement, quel que soit celui qui l'a lancé
        qs = qs.filter(Q(match__requester=user) | Q(match__offer__owner=user))
    return qs.filter(pk=pk).first()
