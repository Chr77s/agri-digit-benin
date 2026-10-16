from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.audit.services import record
from apps.core.errors import ApiError
from apps.referentiel.services import commune_in_department

from .models import Cooperative, Membership


@transaction.atomic
def create_cooperative(actor, d):
    if not commune_in_department(d["department"], d["commune"]):
        raise ApiError("Commune inconnue pour ce département.", "invalid_commune", 400,
                       fields={"commune": ["Commune invalide."]})
    if actor.role == "agent_atda" and actor.department != d["department"]:
        raise ApiError("Hors de votre périmètre.", "out_of_scope", 403)
    if Cooperative.objects.filter(name__iexact=d["name"]).exists():
        raise ApiError("Une coopérative porte déjà ce nom.", "duplicate", 409)
    c = Cooperative.objects.create(**d)
    record(actor, "cooperative.create", c)
    return c


def add_member(actor, coop, producer, role):
    """Un producteur peut appartenir à plusieurs coopératives, mais une seule adhésion active par coopérative."""
    try:
        with transaction.atomic():
            m = Membership.objects.create(cooperative=coop, producer=producer, role=role, created_by=actor)
            record(actor, "cooperative.member_add", m, cooperative=str(coop.id), producer=producer.code, role=role)
    except IntegrityError:
        raise ApiError("Ce producteur est déjà membre actif de cette coopérative.", "duplicate", 409)
    return m


@transaction.atomic
def end_membership(actor, m, reason):
    if not reason:
        raise ApiError("Le motif de sortie est obligatoire.", "reason_required", 400,
                       fields={"reason": ["Obligatoire."]})
    if m.left_at is not None:
        raise ApiError("Adhésion déjà terminée.", "invalid_status", 400)
    m.left_at, m.end_reason = timezone.now(), reason
    m.save(update_fields=["left_at", "end_reason"])
    record(actor, "cooperative.member_end", m, cooperative=str(m.cooperative_id), reason=reason)
    return m
