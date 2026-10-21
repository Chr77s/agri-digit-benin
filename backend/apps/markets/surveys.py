"""Enquêtes de satisfaction des consommateurs (TDR § 3.1, distribution) : le personnel crée l'enquête, le public répond
sans compte et sans donnée personnelle, le personnel lit des résultats agrégés (cellules de moins de 5 réponses
masquées)."""
import hashlib
import secrets
from collections import defaultdict
from statistics import mean

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone

from apps.audit.services import record
from apps.core.errors import ApiError
from apps.core.permissions import AGENT
from apps.referentiel.models import Commune, Department, ValueChain

from .models import Survey, SurveyResponse

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # sans 0/O/1/I : le code se lit et se dicte
CODE_LENGTH = 6
MAX_QUESTIONS = 10
MAX_COMMENT = 500
MIN_CELL = 5  # une ventilation de moins de 5 réponses n'est pas montrée


def _bad(field, msg):
    return ApiError(msg, "validation_error", 400, fields={field: [msg]})


def surveys_for(user):
    """L'agent voit les enquêtes de son département et les siennes ; les autres rôles autorisés, toutes."""
    qs = Survey.objects.order_by("-created_at")
    return qs.filter(Q(department=user.department) | Q(created_by=user)) if user.role == AGENT else qs


@transaction.atomic
def create_survey(actor, d):
    department = d.get("department") or ""
    if actor.role == AGENT:
        if department and department != actor.department:
            raise ApiError("Cette enquête est hors de votre département.", "forbidden", 403)
        department = actor.department
    chain = d.get("value_chain") or ""
    if chain and not ValueChain.objects.filter(code=chain).exists():
        raise _bad("value_chain", "Filière inconnue.")
    questions = [" ".join(q.split()) for q in d["questions"]]
    if not 1 <= len(questions) <= MAX_QUESTIONS or any(not q or len(q) > 200 for q in questions):
        raise _bad("questions", f"1 à {MAX_QUESTIONS} questions de 200 caractères au plus.")
    code = next(c for c in ("".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH)) for _ in range(20))
                if not Survey.objects.filter(code=c).exists())
    s = Survey.objects.create(code=code, title=d["title"].strip(), value_chain=chain, department=department,
                              questions=questions, created_by=actor)
    record(actor, "survey.create", s, code=s.code, questions=len(questions))
    return s


@transaction.atomic
def close_survey(actor, s):
    if s.status != "active":
        raise ApiError("Cette enquête est déjà close.", "invalid_status", 400)
    s.status, s.closed_at = "close", timezone.now()
    s.save(update_fields=["status", "closed_at"])
    record(actor, "survey.close", s, code=s.code)
    return s


def respond(survey, d):
    """Enregistre une réponse anonyme. Un jeton tiré au hasard par le navigateur (`device`), jamais lié à une personne,
    n'est gardé que sous forme d'empreinte, pour refuser une 2e réponse du même appareil (limite : un autre navigateur
    ou un stockage vidé permet de répondre encore, c'est le prix de l'absence de toute donnée personnelle)."""
    if survey.status != "active":
        raise ApiError("Cette enquête est close.", "survey_closed", 409)
    ratings = d["ratings"]
    if len(ratings) != len(survey.questions):
        raise _bad("ratings", f"Une note de 1 à 5 pour chacune des {len(survey.questions)} questions.")
    dep, commune = d.get("department") or survey.department, d.get("commune") or ""
    if dep and not Department.objects.filter(code=dep).exists():
        raise _bad("department", "Département inconnu.")
    if commune and not Commune.objects.filter(code=commune, department_id=dep).exists():
        raise _bad("commune", "Commune inconnue pour ce département.")
    device = hashlib.sha256(f"{survey.code}:{d['device']}".encode()).hexdigest() if d.get("device") else ""
    try:
        with transaction.atomic():
            if device and SurveyResponse.objects.filter(survey=survey, device_hash=device).exists():
                raise ApiError("Cet appareil a déjà répondu à cette enquête. Merci !", "already_answered", 409)
            return SurveyResponse.objects.create(survey=survey, ratings=ratings, comment=d.get("comment", "").strip(),
                                                 department=dep, commune=commune, channel=d.get("channel", "web"),
                                                 device_hash=device)
    except IntegrityError:  # deux envois simultanés du même appareil
        raise ApiError("Cet appareil a déjà répondu à cette enquête. Merci !", "already_answered", 409) from None


def _means(rows, n_questions):
    return [round(mean(r.ratings[i] for r in rows), 2) for i in range(n_questions)]


def results(survey):
    """Moyenne et répartition par question, ventilation par département (masquée sous 5 réponses) et commentaires
    libres, lisibles du personnel seulement et sans lieu ni appareil."""
    rows = list(survey.responses.order_by("-created_at"))
    nq = len(survey.questions)
    questions = []
    for i, text in enumerate(survey.questions):
        vals = [r.ratings[i] for r in rows]
        questions.append({"index": i, "text": text, "mean": round(mean(vals), 2) if vals else None,
                          "distribution": {str(k): vals.count(k) for k in range(1, 6)}})
    cells = defaultdict(list)
    for r in rows:
        cells[r.department].append(r)
    by_department = [{"department": dep, "responses": len(rs), "masked": len(rs) < MIN_CELL,
                      "means": None if len(rs) < MIN_CELL else _means(rs, nq)} for dep, rs in sorted(cells.items())]
    return {"code": survey.code, "title": survey.title, "status": survey.status, "responses": len(rows),
            "low_sample": len(rows) < MIN_CELL, "min_cell": MIN_CELL, "questions": questions,
            "by_department": by_department,
            "comments": [{"text": r.comment, "date": r.created_at.date()} for r in rows if r.comment]}
