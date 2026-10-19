"""UC-13 Diagnostic par photo (SIMULÉ). Image réencodée sans EXIF (dont GPS) avant stockage."""
import io
import uuid
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from PIL import Image, ImageOps, UnidentifiedImageError

from apps.audit.services import record
from apps.core.errors import ApiError
from integrations.diagnosis import PATHOLOGIES, get_backend
from integrations.notifications import get_channel

from .models import Diagnosis

FORMATS = {"JPEG": "jpg", "PNG": "png"}
HELP = "Photographiez seulement la plante ou l'animal malade, sans personne sur l'image."


def clean_image(data):
    """Valide (JPEG/PNG) et réencode : seuls les pixels sont conservés, aucune métadonnée."""
    try:
        img = Image.open(io.BytesIO(data))
        fmt = img.format
        img.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise ApiError("Image illisible : envoyez une photo JPEG ou PNG.", "invalid_image", 400) from None
    if fmt not in FORMATS:
        raise ApiError("Format non accepté : envoyez une photo JPEG ou PNG.", "invalid_image", 400)
    img = ImageOps.exif_transpose(img)  # applique la rotation avant de jeter l'EXIF
    out = io.BytesIO()
    if fmt == "JPEG":
        img.convert("RGB").save(out, "JPEG", quality=85)
    else:
        img.convert("RGBA" if "A" in img.getbands() else "RGB").save(out, "PNG")
    return out.getvalue(), FORMATS[fmt]


def image_path(d):
    return Path(settings.MEDIA_ROOT) / d.image


def create(user, upload, value_chain):
    if upload.size > settings.DIAGNOSIS_MAX_BYTES:
        raise ApiError("Image trop lourde (5 Mo au maximum).", "file_too_large", 400)
    raw = upload.read()
    clean, ext = clean_image(raw)
    res = get_backend().diagnose(raw, value_chain)
    status = "auto" if res["confidence"] >= settings.DIAGNOSIS_THRESHOLD else "transmis_agronome"
    rel = f"diagnoses/{uuid.uuid4().hex}.{ext}"
    dest = Path(settings.MEDIA_ROOT) / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(clean)
    try:
        with transaction.atomic():
            d = Diagnosis.objects.create(owner=user, value_chain=value_chain, image=rel, pathology=res["pathology"],
                                         pathology_label=res["label"], confidence=res["confidence"], status=status,
                                         advice=res["advice"])
            record(user, "diagnosis.create", d, status=status, confidence=d.confidence)
    except Exception:
        dest.unlink(missing_ok=True)
        raise
    return d


@transaction.atomic
def review(actor, d, pathology, comment):
    if d.status != "transmis_agronome":
        raise ApiError("Ce diagnostic n'attend pas de revue.", "invalid_status", 400)
    if pathology not in PATHOLOGIES and pathology != "autre":
        raise ApiError("Pathologie inconnue.", "validation_error", 400, fields={"pathology": ["Valeur inconnue."]})
    d.pathology = pathology
    d.pathology_label = PATHOLOGIES[pathology][0] if pathology in PATHOLOGIES else "Autre (voir commentaire)"
    d.status, d.reviewed_by, d.review_comment, d.reviewed_at = "revu", actor, comment, timezone.now()
    d.save()
    record(actor, "diagnosis.review", d, pathology=pathology)
    get_channel("in_app").send(d.owner.phone, f"Votre photo a été revue par un agronome : {d.pathology_label}. "
                               f"{comment}".strip(), user=d.owner, title="Diagnostic revu")
    return d


@transaction.atomic
def ask_agronome(actor, d, note):
    """« Pas sûr ? » : un diagnostic automatique passe chez l'agronome, avec le mot du producteur."""
    if d.status != "auto":
        raise ApiError("Ce diagnostic est déjà chez un agronome ou a été relu.", "invalid_status", 400)
    d.status, d.producer_note = "transmis_agronome", note
    d.save(update_fields=["status", "producer_note"])
    record(actor, "diagnosis.ask_agronome", d)
    return d


def purge(days):
    """Supprime images et diagnostics plus anciens que `days` jours. Renvoie le nombre supprimé."""
    old = Diagnosis.objects.filter(created_at__lt=timezone.now() - timedelta(days=days))
    n = 0
    for d in old:
        image_path(d).unlink(missing_ok=True)
        d.delete()
        n += 1
    return n
