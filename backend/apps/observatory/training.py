"""Jeux d'entraînement pseudonymisés pour le réentraînement des modèles (docs/REENTRAINEMENT.md § 3).

Aucun nom, téléphone, NPI, code producteur, identifiant de la base ni coordonnée exacte : l'identifiant d'une ligne est
une empreinte salée, l'image est référencée par l'empreinte SHA-256 de son contenu (copiée sous ce nom avec
`with_images`). Seules les données de producteurs dont le consentement « données personnelles » est actif sont reprises.
"""
import csv
import hashlib
import json
import shutil
from collections import Counter
from pathlib import Path

from django.conf import settings
from django.utils import timezone

from apps.audit.services import record
from apps.core.errors import ApiError
from apps.diagnosis.models import Diagnosis
from apps.diagnosis.services import image_path
from apps.production.models import Harvest

KINDS = ("diagnostic", "rendement")
SCHEMA_VERSION = 1
CONSENT = {"type": "donnees_personnelles", "withdrawn_at__isnull": True}
EXCLUDED = ["nom", "prénom", "téléphone", "NPI", "code producteur", "identifiant de la base", "coordonnées exactes",
            "date exacte", "métadonnées de l'image (EXIF retiré à l'enregistrement)"]

DIAGNOSTIC_FIELDS = {
    "record_id": "empreinte salée de l'identifiant du diagnostic (non réversible sans la clé du serveur)",
    "image_sha256": "empreinte SHA-256 de l'image enregistrée (JPEG ou PNG réencodé, sans EXIF)",
    "image_file": "chemin relatif de l'image dans le jeu (vide sans --with-images)",
    "value_chain": "filière de la photo", "label": "pathologie retenue par l'agronome (code de la liste)",
    "label_source": "toujours « agronome »",
    "model_prediction": "pathologie répondue par le modèle avant relecture",
    "model_confidence": "confiance du modèle (0 à 1)", "reviewed_month": "mois de la relecture (AAAA-MM)",
    "department": "département du producteur",
}
RENDEMENT_FIELDS = {
    "record_id": "empreinte salée de l'identifiant de la récolte", "value_chain": "filière",
    "season": "saison de la campagne", "department": "département de la parcelle",
    "land_type": "type de terrain", "area_ha": "surface mesurée, arrondie à 0,1 ha",
    "arable_ha": "surface exploitable déclarée, arrondie à 0,1 ha (vide si non déclarée)",
    "variety": "variété déclarée", "sown_month": "mois du semis (AAAA-MM, vide si inconnu)",
    "harvest_month": "mois de la récolte (AAAA-MM)",
    "quantity_kg": "quantité récoltée, corrigée par l'agent si vérifiée",
    "declared_kg": "quantité d'origine déclarée, si l'agent l'a corrigée",
    "estimated_kg": "estimation faite à la déclaration (rendement de référence × surface)",
    "label_quality": "declaree | confirmee | corrigee : fiabilité de la quantité (corrigee > confirmee > declaree)",
}


def pseudonym(kind, pk):
    return hashlib.sha256(f"{settings.SECRET_KEY}:{kind}:{pk}".encode()).hexdigest()[:16]


def _sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def _diagnostic_rows(out_dir, with_images):
    qs = (Diagnosis.objects.filter(status="revu", **{f"owner__producer__consents__{k}": v for k, v in CONSENT.items()})
          .exclude(predicted_pathology="").select_related("owner").distinct().order_by("created_at"))
    rows, skipped = [], Counter()
    for d in qs:
        path = image_path(d)
        if not d.image or not path.exists():
            skipped["image_absente"] += 1
            continue
        digest = _sha256(path)
        name = ""
        if with_images:
            name = f"images/{digest}{path.suffix}"
            (out_dir / "images").mkdir(exist_ok=True)
            shutil.copyfile(path, out_dir / name)
        rows.append({"record_id": pseudonym("diagnostic", d.pk), "image_sha256": digest, "image_file": name,
                     "value_chain": d.value_chain, "label": d.pathology, "label_source": "agronome",
                     "model_prediction": d.predicted_pathology, "model_confidence": d.confidence,
                     "reviewed_month": d.reviewed_at.strftime("%Y-%m") if d.reviewed_at else "",
                     "department": d.owner.department})
    return rows, dict(skipped), "label"


def _month(day):
    return day.strftime("%Y-%m") if day else ""


def _rendement_rows(out_dir, with_images):
    qs = (Harvest.objects.filter(estimated_kg__gt=0, quantity_kg__gt=0,
                                 **{f"campaign__parcel__producer__consents__{k}": v for k, v in CONSENT.items()})
          .select_related("campaign__parcel").distinct().order_by("created_at"))
    rows = []
    for h in qs:
        c, p = h.campaign, h.campaign.parcel
        rows.append({"record_id": pseudonym("rendement", h.pk), "value_chain": c.value_chain, "season": c.season,
                     "department": p.department, "land_type": p.land_type, "area_ha": round(p.area_ha, 1),
                     "arable_ha": None if p.arable_ha is None else round(p.arable_ha, 1), "variety": c.variety,
                     "sown_month": _month(c.sown_at), "harvest_month": _month(h.harvested_at),
                     "quantity_kg": h.quantity_kg, "declared_kg": h.declared_kg, "estimated_kg": h.estimated_kg,
                     "label_quality": h.check_status if h.check_status in ("confirmee", "corrigee") else "declaree"})
    return rows, {}, "label_quality"


def export(kind, output, with_images=False):
    """Écrit `jeu_<kind>_<date>.csv` et `jeu_<kind>_<date>.description.json` dans `output` ; renvoie leurs chemins."""
    if kind not in KINDS:
        raise ApiError(f"Jeu inconnu : {kind} (attendu : {', '.join(KINDS)}).", "validation_error", 400)
    out_dir = Path(output)
    out_dir.mkdir(parents=True, exist_ok=True)
    build, fields = ((_diagnostic_rows, DIAGNOSTIC_FIELDS) if kind == "diagnostic"
                     else (_rendement_rows, RENDEMENT_FIELDS))
    rows, skipped, label_key = build(out_dir, with_images)
    stem = f"jeu_{kind}_{timezone.localdate():%Y%m%d}"
    csv_path, desc_path = out_dir / f"{stem}.csv", out_dir / f"{stem}.description.json"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(fields))
        w.writeheader()
        w.writerows(rows)
    digest = _sha256(csv_path)
    desc = {"kind": kind, "schema_version": SCHEMA_VERSION, "generated_at": timezone.now().isoformat(),
            "rows": len(rows), "skipped": skipped, "csv_sha256": digest, "fields": fields,
            "label_counts": dict(Counter(r[label_key] for r in rows)), "excluded_data": EXCLUDED,
            "filters": ["producteurs avec consentement « données personnelles » actif"] + (
                ["diagnostics relus par un agronome, avec la réponse du modèle conservée"] if kind == "diagnostic" else
                ["récoltes avec une estimation et une quantité positives"]),
            "pseudonymisation": "record_id = SHA-256(clé du serveur : type : identifiant), 16 premiers caractères",
            "usage": "Réentraînement et évaluation des modèles de la plateforme, dans les conditions de "
                     "docs/REENTRAINEMENT.md (AIPD, avis de l'APDP, relecture INRAB). Ne pas diffuser."}
    desc_path.write_text(json.dumps(desc, ensure_ascii=False, indent=2), encoding="utf-8")
    record(None, "training_set.export", object_type="TrainingSet", object_id=digest[:16], kind=kind, rows=len(rows),
           with_images=with_images)
    return csv_path, desc_path, desc
