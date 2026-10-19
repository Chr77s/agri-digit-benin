from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from apps.audit.models import AuditLog

from .models import PARTNERS, PartnerKey

EXCHANGE_ACTIONS = ["interop.aggregates", "interop.denied"]


def exchanges(partner=None, failed=False):
    qs = AuditLog.objects.filter(action__in=EXCHANGE_ACTIONS).order_by("-seq")
    if partner:
        qs = qs.filter(object_id=partner)
    if failed:
        qs = qs.filter(action="interop.denied")
    return qs


def connectors():
    since = timezone.now() - timedelta(hours=24)
    out = []
    for p, label in PARTNERS.items():
        day = list(exchanges(p).filter(at__gte=since).values("action", "details"))
        ok_ms = [e["details"].get("ms") for e in day if e["action"] == "interop.aggregates" and e["details"].get("ms")]
        last = exchanges(p).filter(action="interop.aggregates").first()
        key = PartnerKey.objects.filter(partner=p, revoked_at__isnull=True).first()
        out.append({
            "partner": p, "label": label,
            "configured": bool(key) or bool(settings.INTEROP_KEYS.get(p)),
            "last_exchange_at": last.at if last else None,
            "calls_24h": len(day),
            "failures_24h": sum(e["action"] == "interop.denied" for e in day),
            "avg_ms": round(sum(ok_ms) / len(ok_ms)) if ok_ms else None,
            "key": {"masked": f"{key.prefix}••••••••{key.last4}", "created_at": key.created_at,
                    "last_used_at": key.last_used_at} if key else None,
        })
    return out
