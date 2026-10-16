"""UC-15 Validation linguistique par les représentants du MTDI."""
import json

from django.conf import settings
from django.db import transaction
from django.db.models import Avg, Count

from apps.audit.services import record
from apps.core.errors import ApiError

from .models import TranslationEntry, TranslationReview

SEED_LANGUAGES = ["fon", "bba"]
FR_JSON = settings.BASE_DIR.parent / "frontend" / "src" / "i18n" / "fr.json"


def flatten(d, prefix=""):
    out = {}
    for k, v in d.items():
        key = f"{prefix}{k}"
        out.update(flatten(v, key + ".") if isinstance(v, dict) else {key: str(v)})
    return out


def seed_entries(path=FR_JSON):
    """Une entrée `a_traduire` (texte vide) par clé du français, pour fon et bba. Idempotent."""
    keys = flatten(json.loads(path.read_text(encoding="utf-8")))
    n = 0
    for lang in SEED_LANGUAGES:
        existing = set(TranslationEntry.objects.filter(language=lang).values_list("key", flat=True))
        new = [TranslationEntry(key=k, language=lang, source_text=v) for k, v in keys.items() if k not in existing]
        TranslationEntry.objects.bulk_create(new)
        n += len(new)
    return n


@transaction.atomic
def propose(actor, e, text):
    e.text, e.status, e.author = text, "propose", actor
    e.average_score, e.reviews_count = None, 0
    e.save()
    record(actor, "translation.propose", e, key=e.key, language=e.language)
    return e


@transaction.atomic
def review(actor, e, score, comment):
    if e.status == "a_traduire" or not e.text:
        raise ApiError("Aucun texte proposé à noter.", "nothing_to_review", 400)
    if e.author_id == actor.id:
        raise ApiError("Vous ne pouvez pas noter votre propre traduction.", "own_translation", 403)
    if TranslationReview.objects.filter(entry=e, reviewer=actor, text=e.text).exists():
        raise ApiError("Vous avez déjà noté ce texte.", "already_reviewed", 409)
    TranslationReview.objects.create(entry=e, reviewer=actor, text=e.text, score=score, comment=comment)
    agg = e.reviews.filter(text=e.text).aggregate(avg=Avg("score"), n=Count("id"))
    e.average_score, e.reviews_count = round(agg["avg"], 2), agg["n"]
    if score >= 4:
        e.status = "valide"
    elif score <= 2:
        e.status = "rejete"
    e.save()
    record(actor, "translation.review", e, score=score, status=e.status)
    return e


def summary():
    out = []
    langs = sorted(set(TranslationEntry.objects.values_list("language", flat=True)) | set(SEED_LANGUAGES))
    for lang in langs:
        qs = TranslationEntry.objects.filter(language=lang)
        total = qs.count()
        valide = qs.filter(status="valide").count()
        avg = qs.filter(average_score__isnull=False).aggregate(a=Avg("average_score"))["a"]
        out.append({"language": lang, "total": total, "valide": valide,
                    "average_score": round(avg, 2) if avg is not None else None,
                    "open_to_producers": is_open(total, valide)})
    return out


def is_open(total, valide):
    return total > 0 and valide / total >= settings.LANGUAGE_OPEN_THRESHOLD


def dictionary(lang):
    """Clé -> texte des seules entrées validées, {} si la langue n'est pas ouverte aux producteurs."""
    qs = TranslationEntry.objects.filter(language=lang)
    valide = qs.filter(status="valide")
    if not is_open(qs.count(), valide.count()):
        return {}
    return dict(valide.values_list("key", "text"))
