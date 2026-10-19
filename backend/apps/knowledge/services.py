import re
import unicodedata

import snowballstemmer
from django.db import transaction
from django.utils import timezone
from rank_bm25 import BM25Okapi

from apps.audit.services import record
from apps.core.errors import ApiError

from .models import KnowledgeDoc, KnowledgeDocVersion

_stem = snowballstemmer.stemmer("french")
STOP = set("le la les un une des de du d l a à au aux et ou en est que qui quoi quand comment pour par sur dans "
           "ce cet cette ces mon ma mes je tu il elle on nous vous ils elles ne pas plus se sa son ses y faut "
           "dois doit peut quel quelle quels quelles avec sans".split())
_index = {"bm25": None, "docs": []}


def tokens(text):
    t = unicodedata.normalize("NFKD", text.lower()).encode("ascii", "ignore").decode()
    return [_stem.stemWord(w) for w in re.findall(r"[a-z0-9]+", t) if w not in STOP and len(w) > 1]


def rebuild_index():
    docs = list(KnowledgeDoc.objects.filter(status="publie").values("id", "value_chain", "title", "body", "source",
                                                                    "version"))
    corpus = [tokens(d["title"] + " " + d["title"] + " " + d["body"]) for d in docs]
    _index["docs"] = docs
    _index["bm25"] = BM25Okapi(corpus) if corpus else None


def search(question, value_chain=None, k=3):
    if _index["bm25"] is None:
        rebuild_index()
    if _index["bm25"] is None:
        return []
    scores = _index["bm25"].get_scores(tokens(question))
    ranked = sorted(zip(scores, _index["docs"], strict=True), key=lambda x: -x[0])
    if value_chain:
        ranked = [r for r in ranked if r[1]["value_chain"] == value_chain]
    return [(float(s), d) for s, d in ranked[:k]]


def author_of(doc):
    """Auteur de la version en cours (premier instantané de ce numéro de version)."""
    v = doc.versions.filter(version=doc.version).order_by("created_at").first()
    return v.author if v else doc.created_by


def _snapshot(doc, actor):
    KnowledgeDocVersion.objects.create(doc=doc, version=doc.version, title=doc.title, body=doc.body,
                                       source=doc.source, status=doc.status, author=actor)


@transaction.atomic
def create(actor, d):
    doc = KnowledgeDoc.objects.create(created_by=actor, **d)
    _snapshot(doc, actor)
    record(actor, "knowledge.create", doc)
    return doc


@transaction.atomic
def edit(actor, doc, d):
    was_published = doc.status == "publie"
    for k, v in d.items():
        setattr(doc, k, v)
    doc.version += 1
    doc.status = "brouillon"
    doc.reviewed_by, doc.reviewed_at = None, None  # la nouvelle version repart en relecture
    doc.save()
    _snapshot(doc, actor)
    record(actor, "knowledge.edit", doc, version=doc.version)
    if was_published:
        transaction.on_commit(rebuild_index)
    return doc


@transaction.atomic
def review(actor, doc):
    if doc.status != "brouillon":
        raise ApiError("Seul un brouillon peut être relu.", "invalid_status", 400)
    if author_of(doc) == actor:
        raise ApiError("La relecture revient à une autre personne que l'auteur de cette version.", "same_author", 400)
    doc.status, doc.reviewed_by, doc.reviewed_at = "relu", actor, timezone.now()
    doc.save(update_fields=["status", "reviewed_by", "reviewed_at", "updated_at"])
    record(actor, "knowledge.review", doc)
    return doc


@transaction.atomic
def publish(actor, doc):
    if doc.status != "relu":
        raise ApiError("La fiche doit être relue avant publication.", "invalid_status", 400)
    doc.status = "publie"
    doc.save(update_fields=["status", "updated_at"])
    _snapshot(doc, actor)
    record(actor, "knowledge.publish", doc, version=doc.version)
    transaction.on_commit(rebuild_index)
    return doc
