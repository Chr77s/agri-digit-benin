import csv
import hashlib
import io
import json
from datetime import date, timedelta

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.utils import timezone
from PIL import Image

from apps.diagnosis.models import Diagnosis
from apps.observatory import quality
from apps.observatory.testkit import make_harvest, make_producer
from apps.producers.models import Consent
from apps.production import recovery
from apps.production.models import Claim, Installment
from conftest import client_for

URL = "/api/v1/models/quality"


@pytest.fixture(autouse=True)
def _media(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path / "media"


def _diag(owner, status, predicted="chenille_legionnaire", label=None, conf=0.9, image="", **extra):
    return Diagnosis.objects.create(owner=owner, value_chain="mais", image=image, pathology=label or predicted,
                                    pathology_label="x", predicted_pathology=predicted, confidence=conf, status=status,
                                    reviewed_at=timezone.now() if status == "revu" else None, **extra)


def _model(data, mid):
    return next(m for m in data["models"] if m["id"] == mid)


def test_a_new_diagnosis_remembers_what_the_model_said(users, producer, settings):
    settings.DIAGNOSIS_THRESHOLD = 0.99  # toujours renvoyé à l'agronome
    img = io.BytesIO()
    Image.new("RGB", (30, 30), (10, 120, 40)).save(img, "JPEG")
    r = client_for(producer.user).post("/api/v1/diagnoses", {
        "image": SimpleUploadedFile("p.jpg", img.getvalue(), content_type="image/jpeg"), "value_chain": "mais"},
        format="multipart")
    assert r.status_code == 201
    d = Diagnosis.objects.get()
    predicted = d.pathology
    assert d.predicted_pathology == predicted != ""
    client_for(users["agronome"]).post(f"/api/v1/diagnoses/{d.id}/review", {"pathology": "newcastle_volaille"},
                                       format="json")
    d.refresh_from_db()
    assert d.status == "revu" and d.pathology == "newcastle_volaille" and d.predicted_pathology == predicted


def test_diagnosis_quality_confirmation_escalation_and_trend(users, producer):
    owner = producer.user
    for _ in range(6):
        _diag(owner, "revu")  # confirmé : même pathologie
    for _ in range(2):
        _diag(owner, "revu", label="striure_mais")  # corrigé par l'agronome
    for _ in range(2):
        _diag(owner, "revu", predicted="", label="striure_mais")  # relu avant le champ : réponse du modèle perdue
    for _ in range(4):
        _diag(owner, "auto")
    _diag(owner, "transmis_agronome", conf=0.3)  # douteux pour le modèle
    out = client_for(users["agronome"]).get(URL).json()
    d = _model(out, "diagnostic")
    assert d["simulated"] is True and d["total"] == 15
    assert d["reviewed"] == 8 and d["corrected"] == 2  # les 2 relus sans réponse du modèle ne comptent pas
    assert d["confirmed_share"] == {"value": 75.0, "n": 8, "reliable": False}
    assert d["escalated_share"]["value"] == round(100 * 11 / 15, 1)
    assert d["escalated_low_confidence"] == 1 and d["escalated_by_producer"] == 10
    assert [t["month"] for t in d["trend"]] == [timezone.localdate().strftime("%Y-%m")] and d["trend"][0]["total"] == 15


def test_diagnosis_quality_has_no_value_under_five_cases(users, producer):
    for _ in range(3):
        _diag(producer.user, "revu")
    d = _model(client_for(users["admin"]).get(URL).json(), "diagnostic")
    assert d["confirmed_share"] == {"value": None, "n": 3, "reliable": False}  # jamais 0 ni 100 sur 3 cas
    assert d["escalated_share"]["value"] is None


def test_quality_is_empty_but_honest_without_data(users):
    out = client_for(users["admin"]).get(URL).json()
    assert out["min_n"] == 5 and out["reliable_n"] == 30
    d, y, c = (_model(out, m) for m in ("diagnostic", "rendement", "credit"))
    assert d["total"] == 0 and d["confirmed_share"]["value"] is None and d["trend"] == []
    assert y["overall"] == {"n": 0, "mae_kg": None, "mape_pct": None, "bias_pct": None, "reliable": False}
    assert c["measurable"] is False and c["reason"] == "aucune issue de crédit : aucune échéance échue"
    assert c["bands"] == [] and c["paid_share"] is None
    assert {m["id"] for m in out["not_measured"]} == {"risque_climatique", "sols", "selection"}


def test_yield_error_against_declared_then_corrected_harvest(users):
    for _ in range(6):
        make_harvest(make_producer(), kg=1000, estimated=1500.0, check_status="confirmee")
    for _ in range(2):
        make_harvest(make_producer(), kg=800, estimated=1000.0, declared_kg=1600, check_status="corrigee")
    make_harvest(make_producer(), kg=500, estimated=None)  # sans estimation : ignoré
    y = _model(client_for(users["resp"]).get(URL).json(), "rendement")
    assert y["overall"]["n"] == 8
    assert y["overall"]["mae_kg"] == round((6 * 500 + 2 * 200) / 8, 1)  # 425,0 kg
    assert y["overall"]["mape_pct"] == round(100 * (6 * 0.5 + 2 * 0.25) / 8, 1)  # 43,8 %
    assert y["overall"]["bias_pct"] == y["overall"]["mape_pct"]  # toujours au-dessus de la récolte
    assert y["verified"]["n"] == 8
    assert y["by_value_chain"][0]["value_chain"] == "mais" and y["by_value_chain"][0]["n"] == 8
    assert y["declaration_gap"] == {"n": 2, "mean_pct": None}  # 2 corrections seulement : pas de moyenne


def test_credit_quality_needs_enough_due_installments_and_consent(users):
    today = date.today()
    consented = []
    for i in range(8):
        p = make_producer(user=True)
        Consent.objects.create(producer=p, type="credit", text_version="v1")
        consented.append(p)
        claim = Claim.objects.create(kind="appui", debtor=p.user, label="Intrants", amount_xof=40000)
        for rank in range(1, 5):  # 4 échéances échues par débiteur : 32 au total
            Installment.objects.create(claim=claim, rank=rank, due_on=today - timedelta(days=30 * rank),
                                       amount_xof=10000, paid_xof=10000 if i < 6 and rank <= 3 else 0)
    stranger = make_producer(user=True)  # sans consentement crédit : jamais évalué
    claim = Claim.objects.create(kind="appui", debtor=stranger.user, label="x", amount_xof=10000)
    Installment.objects.create(claim=claim, rank=1, due_on=today - timedelta(days=1), amount_xof=10000, paid_xof=0)
    c = _model(client_for(users["auditeur"]).get(URL).json(), "credit")
    assert c["measurable"] is True and c["debtors"] == 8 and c["due"] == 32
    assert c["paid_share"] == round(100 * 18 / 32, 1)  # 6 débiteurs x 3 échéances payées
    assert sum(b["debtors"] for b in c["bands"]) == 8
    band = next(b for b in c["bands"] if b["debtors"])
    assert band["paid_share"] == c["paid_share"] and band["due"] == 32
    assert [b["paid_share"] for b in c["bands"] if not b["debtors"]] == [None] * 3  # tranche vide : pas de valeur


def test_credit_quality_not_measurable_below_the_threshold(users):
    p = make_producer(user=True)
    Consent.objects.create(producer=p, type="credit", text_version="v1")
    claim = Claim.objects.create(kind="pret", debtor=p.user, label="Prêt", amount_xof=30000)
    for rank in range(1, 4):
        Installment.objects.create(claim=claim, rank=rank, due_on=date.today() - timedelta(days=rank),
                                   amount_xof=10000, paid_xof=10000)
    c = quality.credit_quality()
    assert c["measurable"] is False and c["due"] == 3 and "30" in c["reason"] and c["bands"] == []
    assert recovery.repayment_rate(p.user) == 1.0  # le score de la grille, lui, tient compte du remboursement


def test_quality_page_is_for_four_roles(users):
    for who in ("admin", "resp", "agronome", "auditeur"):
        assert client_for(users[who]).get(URL).status_code == 200
    for who in ("agent", "financier", "transf", "gest"):
        assert client_for(users[who]).get(URL).status_code == 403


# ---------- jeux d'entraînement pseudonymisés ----------

def _png(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    buf = io.BytesIO()
    Image.new("RGB", (8, 8), (200, 30, 30)).save(buf, "PNG")
    path.write_bytes(buf.getvalue())
    return hashlib.sha256(buf.getvalue()).hexdigest()


def _read(out):
    csv_file = next(out.glob("*.csv"))
    desc = json.loads(next(out.glob("*.description.json")).read_text(encoding="utf-8"))
    return list(csv.DictReader(csv_file.open(encoding="utf-8"))), desc, csv_file.read_text(encoding="utf-8")


def test_diagnostic_training_set_is_pseudonymised(producer, settings, tmp_path):
    digest = _png(settings.MEDIA_ROOT / "diagnoses" / "a.png")
    d = _diag(producer.user, "revu", label="striure_mais", image="diagnoses/a.png")
    _diag(producer.user, "revu", image="diagnoses/absente.png")  # image purgée : ignorée et comptée
    _diag(producer.user, "auto", image="diagnoses/a.png")  # pas relu : pas d'étiquette, pas dans le jeu
    other = make_producer(user=True)  # consentement retiré : jamais exporté
    Consent.objects.filter(producer=other).update(withdrawn_at=timezone.now())
    _png(settings.MEDIA_ROOT / "diagnoses" / "b.png")
    _diag(other.user, "revu", image="diagnoses/b.png")
    out = tmp_path / "out"
    call_command("export_training_set", "diagnostic", output=str(out), with_images=True)
    rows, desc, raw = _read(out)
    assert len(rows) == 1 and desc["rows"] == 1 and desc["skipped"] == {"image_absente": 1}
    r = rows[0]
    assert r["image_sha256"] == digest and r["label"] == "striure_mais"
    assert r["model_prediction"] == "chenille_legionnaire"
    assert r["image_file"] == f"images/{digest}.png" and (out / r["image_file"]).exists()
    assert r["record_id"] != str(d.id) and len(r["record_id"]) == 16 and r["department"] == "alibori"
    for secret in (producer.phone, producer.last_name, producer.first_name, producer.npi, producer.code, str(d.id),
                   str(producer.user.id)):
        assert secret not in raw and secret not in json.dumps(desc, ensure_ascii=False)
    assert desc["label_counts"] == {"striure_mais": 1} and desc["csv_sha256"] == hashlib.sha256(
        (next(out.glob("*.csv"))).read_bytes()).hexdigest()
    assert "NPI" in desc["excluded_data"] and desc["schema_version"] == 1


def test_diagnostic_training_set_copies_no_image_by_default(producer, settings, tmp_path):
    _png(settings.MEDIA_ROOT / "diagnoses" / "a.png")
    _diag(producer.user, "revu", image="diagnoses/a.png")
    out = tmp_path / "out"
    call_command("export_training_set", "diagnostic", output=str(out))
    rows, _, _ = _read(out)
    assert rows[0]["image_file"] == "" and not (out / "images").exists()


def test_yield_training_set_has_no_identity_or_exact_position(producer, tmp_path):
    h = make_harvest(producer, kg=1200, ha=2.34, estimated=1500.0, check_status="corrigee", declared_kg=2000)
    make_harvest(producer, kg=900, estimated=1000.0, season="2025-pluie-1")
    other = make_producer(consent=False)  # sans consentement actif : jamais exporté
    make_harvest(other, kg=100, estimated=200.0)
    out = tmp_path / "out"
    call_command("export_training_set", "rendement", output=str(out))
    rows, desc, raw = _read(out)
    assert len(rows) == 2 and desc["rows"] == 2
    r = next(x for x in rows if x["season"] == "2026-pluie-1")
    assert r["area_ha"] == "2.3" and r["quantity_kg"] == "1200.0" and r["declared_kg"] == "2000.0"
    assert r["label_quality"] == "corrigee" and r["harvest_month"] == "2026-09" and r["record_id"] != str(h.id)
    assert {x["label_quality"] for x in rows} == {"corrigee", "declaree"}
    for secret in (producer.phone, producer.last_name, producer.npi, producer.code, str(h.id), "geometry", "11.3"):
        assert secret not in raw
    assert set(rows[0]) == set(desc["fields"])


def test_training_export_is_journalised_and_rejects_unknown_kinds(producer, tmp_path):
    from django.core.management.base import CommandError

    from apps.audit.models import AuditLog

    call_command("export_training_set", "rendement", output=str(tmp_path / "o"))
    assert AuditLog.objects.filter(action="training_set.export").count() == 1
    with pytest.raises(CommandError):
        call_command("export_training_set", "sol", output=str(tmp_path / "o"))
