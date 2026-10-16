from apps.translations.models import TranslationEntry
from apps.translations.services import seed_entries
from conftest import client_for


def test_translation_review_workflow_and_opening(users, settings):
    assert seed_entries() > 0 and seed_entries() == 0  # idempotent
    e = TranslationEntry.objects.filter(language="fon").first()
    repr_, other = client_for(users["repr"]), client_for(users["repr2"])
    r = client_for(users["admin"]).patch(f"/api/v1/translations/{e.id}", {"text": "x"}, format="json")
    assert r.status_code == 403
    r = repr_.patch(f"/api/v1/translations/{e.id}", {"text": "Texte fon proposé"}, format="json")
    assert r.json()["status"] == "propose"
    url = f"/api/v1/translations/{e.id}/review"
    assert repr_.post(url, {"score": 5}, format="json").status_code == 403  # pas l'auteur du texte
    assert other.post(url, {"score": 6}, format="json").status_code == 400
    assert other.post(url, {"score": 4}, format="json").json()["status"] == "valide"
    total = TranslationEntry.objects.filter(language="fon").count()
    fon = next(s for s in repr_.get("/api/v1/translations/summary").json() if s["language"] == "fon")
    assert fon["valide"] == 1 and fon["total"] == total and fon["open_to_producers"] is False
    assert client_for().get("/api/v1/i18n/fon.json").json() == {}  # langue non ouverte : repli sur le français
    settings.LANGUAGE_OPEN_THRESHOLD = 1 / total
    assert client_for().get("/api/v1/i18n/fon.json").json() == {e.key: "Texte fon proposé"}
    assert client_for().get("/api/v1/i18n/xx.json").status_code == 404
