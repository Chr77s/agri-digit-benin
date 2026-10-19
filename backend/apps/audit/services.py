import structlog
from django.db import transaction
from django.utils import timezone

from .models import AuditChainHead, AuditLog

log = structlog.get_logger()


def record(actor, action, obj=None, object_type="", object_id="", **details):
    """À appeler dans la transaction de l'action (transaction.atomic côté service)."""
    if obj is not None:
        object_type = object_type or obj.__class__.__name__
        object_id = object_id or str(obj.pk)
    auth = actor is not None and getattr(actor, "is_authenticated", False)
    with transaction.atomic():
        head, _ = AuditChainHead.objects.select_for_update().get_or_create(id=1)
        entry = AuditLog(
            actor=actor if auth else None,
            actor_phone=actor.phone if auth else "",
            actor_role=actor.role if auth else "anonyme",
            action=action, object_type=object_type, object_id=str(object_id), details=details,
            at=timezone.now(), seq=head.seq + 1, prev_hash=head.hash,
        )
        entry.hash = entry.compute_hash()
        entry.save()
        head.seq, head.hash = entry.seq, entry.hash
        head.save(update_fields=["seq", "hash"])
    # aucune donnée personnelle dans les journaux techniques
    log.info("audit", action=action, object_type=object_type, object_id=str(object_id))
    return entry


def verify_chain():
    """Recalcule chaque empreinte dans l'ordre. Le début peut avoir été purgé (conservation) : la dernière purge
    journalisée indique l'empreinte attendue avant la première entrée restante."""
    qs = AuditLog.objects.filter(seq__isnull=False).order_by("seq")
    first = qs.first()
    expected = None
    if first is not None and first.seq > 1:
        purge = AuditLog.objects.filter(action="audit.purge").order_by("-seq").first()
        expected = purge.details.get("last_hash") if purge else None
    count, prev = 0, None
    for e in qs.iterator(chunk_size=2000):
        if prev is not None:
            ok_link = e.seq == prev.seq + 1 and e.prev_hash == prev.hash
        elif e.seq == 1:
            ok_link = e.prev_hash == ""
        else:  # début purgé : sans purge journalisée, rien ne garantit le maillon manquant
            ok_link = expected is not None and e.prev_hash == expected
        if not ok_link or e.compute_hash() != e.hash:
            return {"ok": False, "count": count, "broken_seq": e.seq, "checked_at": timezone.now()}
        prev, count = e, count + 1
    return {"ok": True, "count": count, "broken_seq": None, "checked_at": timezone.now()}

