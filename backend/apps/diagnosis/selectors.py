from .models import Diagnosis

AGRONOME = "agronome_inrab"


def visible(user, status=None):
    """Producteur : les siens. Agronome : ceux transmis (ou le statut demandé, hors `auto`)."""
    qs = Diagnosis.objects.select_related("owner")
    if user.role == AGRONOME:
        return qs.filter(status=status if status in ("transmis_agronome", "revu") else "transmis_agronome")
    qs = qs.filter(owner=user)
    return qs.filter(status=status) if status else qs


def get_visible(user, pk):
    """Propriétaire ou agronome ; sinon None (404)."""
    d = Diagnosis.objects.select_related("owner").filter(pk=pk).first()
    if d and (d.owner_id == user.id or user.role == AGRONOME):
        return d
    return None
