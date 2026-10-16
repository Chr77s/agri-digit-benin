import sys
from datetime import date

import numpy as np
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.audit.services import record
from apps.core.errors import ApiError
from apps.farms.models import FarmPOC
from apps.producers.services import notify

from .models import Application, Contest, Program, SelectionCandidate, SelectionRun

NON_SELECTED_SAMPLE = 2000  # non retenus conservés (les mieux classés) pour consultation et contestation


@transaction.atomic
def create_program(actor, d):
    p = Program.objects.create(created_by=actor, **d)
    record(actor, "program.create", p)
    return p


def apply(actor, program):
    producer = getattr(actor, "producer", None)
    if producer is None:
        raise ApiError("Aucune fiche producteur associée à ce compte.", "no_producer", 400)
    if program.closes_at < date.today():
        raise ApiError(f"Ce programme est clos depuis le {program.closes_at:%d/%m/%Y}. Les candidatures ne sont plus "
                       f"acceptées.", "program_closed", 400)
    if producer.status != "valide":
        raise ApiError("Votre inscription doit être validée avant de candidater.", "producer_not_validated", 400)
    try:
        with transaction.atomic():
            a = Application.objects.create(program=program, producer=producer)
            record(actor, "application.create", a, program=str(program.id))
    except IntegrityError:
        raise ApiError("Vous avez déjà candidaté à ce programme.", "duplicate", 409)
    return a


@transaction.atomic
def decide(actor, app, status, reason):
    if status == "refusee" and not reason:
        raise ApiError("Le motif est obligatoire pour un refus.", "reason_required", 400)
    app.status, app.reason, app.decided_by = status, reason, actor
    app.save(update_fields=["status", "reason", "decided_by"])
    record(actor, "application.decide", app, status=status, reason=reason)
    notify(app.producer, "Candidature", f"Agri-Digit : votre candidature « {app.program.name} » est {status}.")
    return app


def _norm(values, invert=False):
    lo, hi = values.min(), values.max()
    span = (hi - lo) or 1.0
    return ((hi - values) if invert else (values - lo)) / span


def run_selection(actor, program, department, target_count, weights):
    """Score = somme pondérée normalisée (min-max) ; le résultat est une PROPOSITION à valider par un agent."""
    total_w = sum(weights.values())
    if total_w <= 0:
        raise ApiError("Les pondérations doivent être positives.", "validation_error", 400)
    w = {k: v / total_w for k, v in weights.items()}
    qs = FarmPOC.objects.filter(is_maize=True)  # MODEL_CARD : maïs détecté seulement
    if department:
        qs = qs.filter(department=department)
    # mémoire contenue (~200 000 fermes) : colonnes numériques en tableaux numpy, lecture par itérateur
    ids, deps, coms, conf, road, area = [], [], [], [], [], []
    for f, d, c, mc, rd, ar in qs.values_list("farm_id", "department", "commune", "maize_confidence",
                                              "road_distance_m", "area_ha").iterator(chunk_size=5000):
        ids.append(f)
        deps.append(sys.intern(d))
        coms.append(sys.intern(c))
        conf.append(mc)
        road.append(rd)
        area.append(ar)
    if not ids:
        raise ApiError("Aucune ferme disponible pour ce périmètre (lancez import_poc_farms).", "no_data", 400)
    conf, road, area = np.array(conf), np.array(road), np.array(area)
    area = np.minimum(area, np.percentile(area, 99))  # plafond au 99e centile (MODEL_CARD)
    scores = w["confidence"] * _norm(conf) + w["road_distance"] * _norm(road, invert=True) + w["area"] * _norm(area)
    order = np.argsort(-scores, kind="stable")
    n = len(ids)
    keep = min(n, target_count + NON_SELECTED_SAMPLE)
    with transaction.atomic():
        run = SelectionRun.objects.create(program=program, department=department or "", target_count=target_count,
                                          weights=weights, created_by=actor, total_count=n,
                                          selected_count=min(target_count, n))
        SelectionCandidate.objects.bulk_create(
            [SelectionCandidate(run=run, farm_id=ids[i], department=deps[i], commune=coms[i],
                                score=round(float(scores[i]), 5), rank=rank + 1, selected=rank < target_count,
                                confidence=float(conf[i]), road_distance_m=float(road[i]), area_ha=float(area[i]))
             for rank, i in enumerate(order[:keep].tolist())], batch_size=5000)
        record(actor, "selection.run", run, weights=weights, target_count=target_count, total=n)
    return run


@transaction.atomic
def validate_run(actor, run, reason):
    if run.created_by_id == actor.id:
        raise ApiError("La validation doit être faite par un autre utilisateur que le lanceur.",
                       "second_validation_required", 403)
    if not reason:
        raise ApiError("Le motif de validation est obligatoire.", "reason_required", 400)
    if run.status == "validee":
        raise ApiError("Sélection déjà validée.", "invalid_status", 400)
    run.status, run.validated_by, run.validation_reason, run.validated_at = "validee", actor, reason, timezone.now()
    run.save(update_fields=["status", "validated_by", "validation_reason", "validated_at"])
    record(actor, "selection.validate", run, reason=reason)
    return run


@transaction.atomic
def contest(actor, run, farm_id, reason):
    if not reason:
        raise ApiError("Le motif de la contestation est obligatoire.", "reason_required", 400)
    if SelectionCandidate.objects.filter(run=run, farm_id=farm_id, selected=True).exists():
        raise ApiError("Cette ferme est retenue : rien à contester.", "farm_selected", 400)
    farms = FarmPOC.objects.filter(farm_id=farm_id)
    if run.department:
        farms = farms.filter(department=run.department)
    if not farms.exists():
        raise ApiError("Ferme inconnue pour cette sélection.", "farm_unknown", 400)
    c = Contest.objects.create(run=run, farm_id=farm_id, reason=reason, created_by=actor)
    record(actor, "selection.contest", c, farm_id=farm_id)
    return c


@transaction.atomic
def decide_contest(actor, c, status, reason):
    """UC-17 : décision humaine motivée sur une contestation (art. 401), notifiée au producteur."""
    if status not in ("acceptee", "rejetee"):
        raise ApiError("Statut invalide.", "validation_error", 400, fields={"status": ["acceptee ou rejetee."]})
    if not reason:
        raise ApiError("Le motif de la décision est obligatoire.", "reason_required", 400,
                       fields={"reason": ["Obligatoire."]})
    if c.status != "deposee":
        raise ApiError("Contestation déjà traitée.", "invalid_status", 400)
    c.status, c.decision_reason, c.decided_by, c.decided_at = status, reason, actor, timezone.now()
    c.save(update_fields=["status", "decision_reason", "decided_by", "decided_at"])
    record(actor, "selection.contest_decide", c, status=status, reason=reason)
    producer = getattr(c.created_by, "producer", None)
    label = "acceptée" if status == "acceptee" else "rejetée"
    if producer is not None:
        notify(producer, "Contestation", f"Agri-Digit : votre contestation (ferme {c.farm_id}) est {label}. "
                                         f"Motif : {reason}")
    return c
