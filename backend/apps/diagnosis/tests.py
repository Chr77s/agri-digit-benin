import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from apps.diagnosis.models import Diagnosis
from apps.diagnosis.services import image_path, purge
from conftest import client_for, make_user


def _jpeg_with_gps():
    img = Image.new("RGB", (40, 40), (30, 160, 60))
    exif = Image.Exif()
    exif[0x8825] = {1: "N"}  # bloc GPS
    out = io.BytesIO()
    img.save(out, "JPEG", exif=exif)
    return out.getvalue()


@pytest.fixture(autouse=True)
def _media(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path


def _post(user, data=None):
    return client_for(user).post("/api/v1/diagnoses", {
        "image": SimpleUploadedFile("p.jpg", data or _jpeg_with_gps(), content_type="image/jpeg"),
        "value_chain": "mais"}, format="multipart")


def test_low_confidence_goes_to_agronomist_and_exif_is_stripped(users, producer, settings):
    settings.DIAGNOSIS_THRESHOLD = 0.99
    r = _post(producer.user)
    assert r.status_code == 201 and r.json()["status"] == "transmis_agronome" and r.json()["simulation"] is True
    d = Diagnosis.objects.get()
    assert not Image.open(image_path(d)).getexif()  # EXIF et GPS supprimés
    assert client_for(producer.user).get(f"/api/v1/diagnoses/{d.id}/image").status_code == 200
    assert client_for(users["agent"]).get(f"/api/v1/diagnoses/{d.id}/image").status_code == 403
    assert len(client_for(users["agronome"]).get("/api/v1/diagnoses").json()["results"]) == 1
    rev = client_for(users["agronome"]).post(f"/api/v1/diagnoses/{d.id}/review",
                                             {"pathology": "striure_mais", "comment": "Voir l'agent."}, format="json")
    assert rev.status_code == 200 and rev.json()["status"] == "revu"


def test_high_confidence_is_auto_and_bad_files_refused(users, producer, settings):
    settings.DIAGNOSIS_THRESHOLD = 0
    assert _post(producer.user).json()["status"] == "auto"
    assert _post(producer.user, b"pas une image").status_code == 400
    assert client_for(users["agronome"]).get("/api/v1/diagnoses").json()["results"] == []  # rien à relire


def test_unsure_producer_asks_an_agronomist_with_a_note(users, producer, settings):
    settings.DIAGNOSIS_THRESHOLD = 0
    d_id = _post(producer.user).json()["id"]
    assert client_for(users["agronome"]).get("/api/v1/diagnoses").json()["results"] == []
    url = f"/api/v1/diagnoses/{d_id}/ask-agronome"
    assert client_for(users["agent"]).post(url, {}, format="json").status_code == 403  # réservé au producteur
    r = client_for(producer.user).post(url, {"note": "Les feuilles du centre sont trouées."}, format="json")
    assert r.status_code == 200 and r.json()["status"] == "transmis_agronome"
    queue = client_for(users["agronome"]).get("/api/v1/diagnoses").json()["results"]
    assert [q["producer_note"] for q in queue] == ["Les feuilles du centre sont trouées."]
    assert client_for(producer.user).post(url, {}, format="json").status_code == 400  # déjà transmis, pas deux fois
    rev = client_for(users["agronome"]).post(f"/api/v1/diagnoses/{d_id}/review",
                                             {"pathology": "autre", "comment": "ok"}, format="json")
    assert rev.json()["status"] == "revu"
    assert client_for(producer.user).post(url, {}, format="json").status_code == 400  # ni après la relecture


def test_ask_agronomist_refuses_someone_elses_diagnosis(users, producer, settings):
    settings.DIAGNOSIS_THRESHOLD = 0
    d_id = _post(producer.user).json()["id"]
    other = make_user("0197000098", "producteur")
    assert client_for(other).post(f"/api/v1/diagnoses/{d_id}/ask-agronome", {}, format="json").status_code == 404


def test_retention_purge(producer):
    _post(producer.user)
    d = Diagnosis.objects.get()
    path = image_path(d)
    Diagnosis.objects.filter(pk=d.pk).update(created_at="2020-01-01T00:00:00Z")
    assert purge(90) == 1 and not path.exists() and not Diagnosis.objects.exists()
