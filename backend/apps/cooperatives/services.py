from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.audit.services import record
from apps.core.errors import ApiError
from apps.producers.services import notify
from apps.referentiel.services import commune_in_department
from integrations.notifications import get_channel

from .models import Cooperative, Membership, MembershipRequest


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
def request_join(actor, coop, message):
    """Le producteur demande à rejoindre une coopérative de son département ; le gestionnaire (ou, à défaut, les
    agents du département) est prévenu. Une demande en attente à la fois par coopérative."""
    producer = getattr(actor, "producer", None)
    if producer is None or producer.status != "valide":
        raise ApiError("Votre inscription doit être validée avant de demander une adhésion.", "producer_not_validated",
                       400)
    if coop.department != producer.department:
        raise ApiError("Cette coopérative n'est pas dans votre département.", "out_of_scope", 400)
    if Membership.objects.filter(cooperative=coop, producer=producer, left_at__isnull=True).exists():
        raise ApiError("Vous êtes déjà membre de cette coopérative.", "duplicate", 409)
    try:
        with transaction.atomic():
            r = MembershipRequest.objects.create(cooperative=coop, producer=producer, message=message)
    except IntegrityError:
        raise ApiError("Votre demande est déjà en attente.", "duplicate", 409)
    record(actor, "cooperative.join_request", r, cooperative=str(coop.id))
    body = f"{producer.code} ({producer.commune}) demande à rejoindre « {coop.name} »." + (
        f" Message : « {message[:200]} »." if message else "")
    for u in ([coop.manager] if coop.manager_id else list(User.objects.filter(
            role="agent_atda", is_active=True, department=coop.department))):
        get_channel("in_app").send(u.phone, body, user=u, title="Demande d'adhésion")
    return r


@transaction.atomic
def decide_request(actor, r, status, reason):
    """Décision motivée (refus : motif obligatoire) ; l'acceptation crée l'adhésion, le producteur est prévenu."""
    if status not in ("acceptee", "refusee"):
        raise ApiError("Statut invalide.", "validation_error", 400, fields={"status": ["acceptee ou refusee."]})
    if status == "refusee" and not reason:
        raise ApiError("Le motif du refus est obligatoire.", "reason_required", 400,
                       fields={"reason": ["Obligatoire."]})
    if r.status != "en_attente":
        raise ApiError("Demande déjà traitée.", "invalid_status", 400)
    if status == "acceptee":
        add_member(actor, r.cooperative, r.producer, "membre")
    r.status, r.decision_reason, r.decided_by, r.decided_at = status, reason, actor, timezone.now()
    r.save(update_fields=["status", "decision_reason", "decided_by", "decided_at"])
    record(actor, "cooperative.join_decide", r, status=status, reason=reason)
    label = "acceptée" if status == "acceptee" else "refusée"
    notify(r.producer, "Adhésion", f"Agri-Digit : votre demande pour « {r.cooperative.name} » est {label}." + (
        f" Motif : {reason}" if reason else ""))
    return r


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
