from django.db import transaction
from django.utils import timezone

from apps.audit.services import record
from apps.core.errors import ApiError
from apps.producers.models import Producer
from integrations.notifications import get_channel

from .models import Alert


@transaction.atomic
def create(actor, d):
    if actor.role == "agent_atda" and d["department"] != actor.department:
        raise ApiError("Vous ne pouvez alerter que votre département.", "out_of_scope", 403)
    status = "en_attente_validation" if d["severity"] == "urgent" else "brouillon"
    a = Alert.objects.create(created_by=actor, status=status, **d)
    record(actor, "alert.create", a, severity=a.severity)
    return a


@transaction.atomic
def approve(actor, alert):
    if alert.created_by_id == actor.id:
        raise ApiError("Une seconde validation par un autre utilisateur est requise.", "second_validation_required",
                       403)
    if alert.status != "en_attente_validation":
        raise ApiError("Cette alerte n'attend pas de validation.", "invalid_status", 400)
    alert.status, alert.approved_by = "approuvee", actor
    alert.save(update_fields=["status", "approved_by"])
    record(actor, "alert.approve", alert)
    return alert


def recipients(alert):
    qs = Producer.objects.filter(department=alert.department, status="valide")
    if alert.communes:
        qs = qs.filter(commune__in=alert.communes)
    if alert.value_chains:
        qs = qs.filter(parcels__campaigns__value_chain__in=alert.value_chains).distinct()
    return qs.select_related("user")


@transaction.atomic
def send(actor, alert):
    if alert.status == "en_attente_validation":
        raise ApiError("Alerte urgente : une seconde validation est requise avant l'envoi.", "approval_required", 400)
    if alert.status == "envoyee":
        raise ApiError("Alerte déjà envoyée.", "already_sent", 400)
    sent = delivered = failed = 0
    body = f"[{alert.severity.upper()}] {alert.title} : {alert.message}"
    for p in recipients(alert):
        if p.user:
            get_channel("in_app").send(p.phone, alert.message, user=p.user, title=alert.title)
        o = get_channel("sms").send(p.phone, body, department=alert.department)
        sent += 1
        delivered += o.status == "livre"
        failed += o.status == "echoue"
    alert.status, alert.sent_at = "envoyee", timezone.now()
    alert.stats = {"sent": sent, "delivered": delivered, "failed": failed}
    alert.save(update_fields=["status", "sent_at", "stats"])
    record(actor, "alert.send", alert, **alert.stats)
    return alert.stats
