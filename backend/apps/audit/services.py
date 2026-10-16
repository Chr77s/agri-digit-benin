import structlog

from .models import AuditLog

log = structlog.get_logger()


def record(actor, action, obj=None, object_type="", object_id="", **details):
    """À appeler dans la transaction de l'action (transaction.atomic côté service)."""
    if obj is not None:
        object_type = object_type or obj.__class__.__name__
        object_id = object_id or str(obj.pk)
    auth = actor is not None and getattr(actor, "is_authenticated", False)
    entry = AuditLog.objects.create(
        actor=actor if auth else None,
        actor_phone=actor.phone if auth else "",
        actor_role=actor.role if auth else "anonyme",
        action=action, object_type=object_type, object_id=str(object_id), details=details,
    )
    # aucune donnée personnelle dans les journaux techniques
    log.info("audit", action=action, object_type=object_type, object_id=str(object_id))
    return entry
