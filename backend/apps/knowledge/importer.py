"""Import d'un document (PDF, Word, texte) en extraits de fiches. Les extraits arrivent en brouillon : ils suivent la
relecture par une autre personne puis la publication, comme toute fiche (aucun texte n'atteint l'assistant sans cela)."""
import io
import re
import uuid
import zipfile
from pathlib import PurePath
from xml.etree import ElementTree

from django.db import transaction

from apps.core.errors import ApiError

from . import services
from .models import KnowledgeDoc

MAX_BYTES = 5 * 1024 * 1024
MAX_CHUNKS = 200
CHUNK_CHARS = 1100  # un extrait tient dans le contexte du modèle avec ses voisins
MIN_CHARS = 60
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def _fail(detail, code="invalid_document"):
    raise ApiError(detail, code, 400)


def extract_text(name, data):
    ext = PurePath(name.lower()).suffix
    if ext == ".pdf":
        from pypdf import PdfReader

        try:
            reader = PdfReader(io.BytesIO(data))
            if reader.is_encrypted:
                _fail("Ce PDF est protégé par un mot de passe.")
            return "\n\n".join((p.extract_text() or "") for p in reader.pages)
        except ApiError:
            raise
        except Exception:
            _fail("Ce PDF est illisible.")
    if ext == ".docx":
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                info = z.getinfo("word/document.xml")
                if info.file_size > 30 * 1024 * 1024:
                    _fail("Ce document Word est trop volumineux une fois ouvert.")
                xml = z.read(info)
            if b"<!DOCTYPE" in xml or b"<!ENTITY" in xml:  # pas d'entités externes ni d'expansion
                _fail("Ce document Word contient des éléments non acceptés.")
            root = ElementTree.fromstring(xml)
        except ApiError:
            raise
        except Exception:
            _fail("Ce document Word est illisible.")
        return "\n".join("".join(t.text or "" for t in p.iter(W + "t")) for p in root.iter(W + "p"))
    if ext in (".txt", ".md"):
        try:
            return data.decode("utf-8-sig")
        except UnicodeDecodeError:
            return data.decode("cp1252", errors="replace")
    _fail("Formats acceptés : PDF, Word (.docx), texte (.txt) ou Markdown (.md).", "unsupported_format")


def chunk_text(text, size=CHUNK_CHARS):
    """Coupe aux paragraphes, puis aux phrases pour un paragraphe trop long ; aucun extrait ne dépasse `size` environ."""
    paras = [re.sub(r"[ \t]+", " ", p).strip() for p in re.split(r"\n\s*\n|\n", text)]
    pieces = []
    for p in filter(None, paras):
        if len(p) <= size:
            pieces.append(p)
            continue
        cur = ""
        for s in re.split(r"(?<=[.!?])\s+", p):
            if cur and len(cur) + len(s) + 1 > size:
                pieces.append(cur)
                cur = ""
            cur = f"{cur} {s}".strip()
            while len(cur) > size * 1.5:  # phrase sans ponctuation : coupe nette
                pieces.append(cur[:size])
                cur = cur[size:]
        if cur:
            pieces.append(cur)
    chunks, cur = [], ""
    for p in pieces:
        if cur and len(cur) + len(p) + 1 > size:
            chunks.append(cur)
            cur = ""
        cur = f"{cur}\n{p}".strip()
    if cur:
        chunks.append(cur)
    if len(chunks) > 1 and len(chunks[-1]) < MIN_CHARS:  # un reste minuscule rejoint l'extrait précédent
        chunks[-2] += "\n" + chunks.pop()
    return [c for c in chunks if len(c) >= MIN_CHARS]


def import_document(actor, filename, data, value_chain, title="", source=""):
    if len(data) > MAX_BYTES:
        _fail("Fichier trop volumineux (5 Mo au maximum).", "file_too_large")
    chunks = chunk_text(extract_text(filename, data))
    if not chunks:
        _fail("Aucun texte lisible dans ce fichier (un PDF scanné en image n'est pas lisible).", "no_text")
    if len(chunks) > MAX_CHUNKS:
        _fail(f"Document trop long ({len(chunks)} extraits, {MAX_CHUNKS} au maximum) : le découper.", "too_long")
    stem = PurePath(filename).stem
    title = (title or stem).strip()[:150]
    batch = uuid.uuid4()
    with transaction.atomic():
        for k, body in enumerate(chunks, 1):
            services.create(actor, {"value_chain": value_chain, "title": f"{title} (partie {k}/{len(chunks)})",
                                    "body": body, "source": (source or filename).strip()[:500], "batch": batch})
    return {"batch": str(batch), "title": title, "chunks": len(chunks)}


def batches():
    """Un résumé par fichier importé, du plus récent au plus ancien."""
    out = {}
    rows = KnowledgeDoc.objects.exclude(batch=None).values("batch", "title", "source", "value_chain", "status",
                                                            "created_at")
    for r in rows:
        b = out.setdefault(r["batch"], {"batch": str(r["batch"]), "title": re.sub(r" \(partie \d+/\d+\)$", "", r["title"]),
                                        "source": r["source"], "value_chain": r["value_chain"],
                                        "created_at": r["created_at"], "chunks": 0,
                                        "status": {"brouillon": 0, "relu": 0, "publie": 0}})
        b["chunks"] += 1
        b["status"][r["status"]] += 1
    return sorted(out.values(), key=lambda b: b["created_at"], reverse=True)


def _docs(batch, status):
    docs = list(KnowledgeDoc.objects.filter(batch=batch))
    if not docs:
        raise ApiError("Introuvable.", "not_found", 404)
    return [d for d in docs if d.status == status]


@transaction.atomic
def review_batch(actor, batch):
    docs = _docs(batch, "brouillon")
    for d in docs:  # services.review refuse l'auteur ; on le dit avant de rien changer
        if services.author_of(d) == actor:
            raise ApiError("La relecture revient à une autre personne que celle qui a importé ce fichier.", "same_author", 400)
    for d in docs:
        services.review(actor, d)
    return len(docs)


@transaction.atomic
def publish_batch(actor, batch):
    docs = _docs(batch, "relu")
    for d in docs:
        services.publish(actor, d)
    return len(docs)


@transaction.atomic
def delete_batch(actor, batch):
    """Retire un import qui n'est pas encore publié (une fiche publiée se corrige par une nouvelle version)."""
    docs = list(KnowledgeDoc.objects.filter(batch=batch))
    if not docs:
        raise ApiError("Introuvable.", "not_found", 404)
    if any(d.status == "publie" for d in docs):
        raise ApiError("Une partie est déjà publiée : elle ne peut plus être supprimée.", "invalid_status", 400)
    for d in docs:
        d.delete()
    return len(docs)
