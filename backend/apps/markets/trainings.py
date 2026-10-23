"""Formations (TDR § 3.1 : renforcement des capacités des transformateurs et distributeurs) : séances proposées dans un
département, inscription volontaire, présence enregistrée par l'agent ou l'administration, rapport."""
from collections import defaultdict
from datetime import timedelta

from django.db import transaction
from django.db.models import Count
from django.utils import timezone

from apps.audit.services import record
from apps.core.errors import ApiError
from apps.core.permissions import ADMIN, AGENT, RESPONSABLE
from apps.referentiel.models import Department

from .models import Training, TrainingRegistration

ACTORS = Training.AUDIENCES
MANAGERS = (AGENT, ADMIN)
STAFF = (AGENT, ADMIN, RESPONSABLE)
RECENT_DAYS = 90  # une séance plus ancienne sort de la liste (reste dans le rapport)


def _bad(field, msg):
    return ApiError(msg, "validation_error", 400, fields={field: [msg]})


def trainings_for(user):
    """Un acteur voit les séances de son département destinées à son profil ; l'agent celles de son département ;
    l'administration et le responsable toutes."""
    qs = Training.objects.filter(date__gte=timezone.localdate() - timedelta(days=RECENT_DAYS)).order_by("date")
    if user.role in ACTORS:
        qs = qs.filter(department=user.department) if user.department else qs
        return [t for t in qs if user.role in t.audience]
    return list(qs.filter(department=user.department) if user.role == AGENT and user.department else qs)


def can_manage(user, t):
    return user.role == ADMIN or (user.role == AGENT and (not user.department or user.department == t.department))


@transaction.atomic
def create_training(actor, d):
    dep = d["department"]
    if actor.role == AGENT and actor.department and dep != actor.department:
        raise ApiError("Cette formation est hors de votre département.", "forbidden", 403)
    if not Department.objects.filter(code=dep).exists():
        raise _bad("department", "Département inconnu.")
    if d["theme"] not in Training.THEMES:
        raise _bad("theme", "Thème inconnu.")
    audience = sorted(set(d["audience"]))
    if not audience or any(a not in ACTORS for a in audience):
        raise _bad("audience", "Public visé : producteur, transformateur, distributeur ou gestionnaire de coopérative.")
    if d["date"] < timezone.localdate():
        raise _bad("date", "La date ne peut pas être passée.")
    t = Training.objects.create(title=d["title"].strip(), theme=d["theme"], department=dep, date=d["date"],
                                place=d["place"].strip(), seats=d["seats"], audience=audience, created_by=actor)
    record(actor, "training.create", t, department=dep, seats=t.seats)
    return t


@transaction.atomic
def register(actor, t):
    if actor.role not in t.audience:
        raise ApiError("Cette formation ne vise pas votre profil.", "forbidden", 403)
    if t.date < timezone.localdate():
        raise ApiError("Cette formation a déjà eu lieu.", "invalid_status", 400)
    if t.registrations.filter(user=actor).exists():
        raise ApiError("Vous êtes déjà inscrit.", "already_registered", 409)
    if t.registrations.count() >= t.seats:
        raise ApiError("Cette formation est complète.", "full", 409)
    r = TrainingRegistration.objects.create(training=t, user=actor)
    record(actor, "training.register", t)
    return r


@transaction.atomic
def unregister(actor, t):
    r = t.registrations.filter(user=actor).first()
    if r is None:
        raise ApiError("Introuvable.", "not_found", 404)
    if t.date <= timezone.localdate() or r.attended is not None:
        raise ApiError("Il est trop tard pour annuler l'inscription.", "invalid_status", 400)
    r.delete()
    record(actor, "training.unregister", t)


@transaction.atomic
def mark_attendance(actor, t, registration, present):
    if not can_manage(actor, t):
        raise ApiError("Introuvable.", "not_found", 404)
    if t.date > timezone.localdate():
        raise ApiError("La présence s'enregistre à partir du jour de la formation.", "invalid_status", 400)
    registration.attended, registration.marked_by, registration.marked_at = present, actor, timezone.now()
    registration.save(update_fields=["attended", "marked_by", "marked_at"])
    record(actor, "training.attendance", t, registration=str(registration.id), present=present)
    return registration


def counts(trainings):
    """Inscrits, présents et absents de chaque séance, en une requête."""
    out = {t.id: {"registered": 0, "present": 0, "absent": 0} for t in trainings}
    for row in TrainingRegistration.objects.filter(training__in=[t.id for t in trainings]).values(
            "training_id", "attended").annotate(n=Count("id")):
        c = out[row["training_id"]]
        c["registered"] += row["n"]
        if row["attended"] is True:
            c["present"] += row["n"]
        elif row["attended"] is False:
            c["absent"] += row["n"]
    return out


def report(actor):
    """Par département : séances, inscrits, présents, absents et présence à enregistrer (séances passées)."""
    qs = Training.objects.all()
    if actor.role == AGENT and actor.department:
        qs = qs.filter(department=actor.department)
    ts = list(qs)
    c = counts(ts)
    today = timezone.localdate()
    rows = defaultdict(lambda: {"sessions": 0, "upcoming": 0, "seats": 0, "registered": 0, "present": 0, "absent": 0,
                                "to_record": 0})
    for t in ts:
        r = rows[t.department]
        r["sessions"] += 1
        r["seats"] += t.seats
        r["upcoming"] += t.date >= today
        r["registered"] += c[t.id]["registered"]
        r["present"] += c[t.id]["present"]
        r["absent"] += c[t.id]["absent"]
        r["to_record"] += c[t.id]["registered"] - c[t.id]["present"] - c[t.id]["absent"] if t.date <= today else 0
    out = [{"department": dep, **r, "attendance_pct": round(r["present"] / (r["present"] + r["absent"]) * 100)
            if r["present"] + r["absent"] else None} for dep, r in sorted(rows.items())]
    keys = ("sessions", "upcoming", "seats", "registered", "present", "absent", "to_record")
    total = {k: sum(r[k] for r in out) for k in keys}
    total["attendance_pct"] = round(total["present"] / (total["present"] + total["absent"]) * 100) \
        if total["present"] + total["absent"] else None
    return {"results": out, "total": total}
