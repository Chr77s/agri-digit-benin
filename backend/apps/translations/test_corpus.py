from apps.translations.models import CorpusEntry
from conftest import client_for

# Chaînes de test arbitraires : ce n'est PAS du fon (aucun texte en langue nationale n'est inventé ici).
Q = "tst-alpha tst-beta tst-gamma tst-delta"
A = "tst-reponse-validee"


def test_native_answer_only_after_validation_by_a_second_speaker(users, producer):
    p, r1, r2 = client_for(producer.user), client_for(users["repr"]), client_for(users["repr2"])
    ask = {"question": Q, "language": "fon"}
    first = p.post("/api/v1/assistant/ask", ask, format="json").json()
    assert first["language"] == "fr" and first["language_notice"] == "no_validated_answer"
    queue = r1.get("/api/v1/corpus?language=fon&status=a_traduire").json()["results"]
    assert queue[0]["french_question"] == Q and queue[0]["asked_count"] == 1  # la question attend le MTDI
    p.post("/api/v1/assistant/ask", ask, format="json")
    assert r1.get("/api/v1/corpus?status=a_traduire").json()["results"][0]["asked_count"] == 2
    eid = queue[0]["id"]
    assert r1.post(f"/api/v1/corpus/{eid}/answer", {"question": Q}, format="json").status_code == 400  # réponse requise
    r1.post(f"/api/v1/corpus/{eid}/answer", {"question": Q, "answer": A, "french_answer": "Semer en juin.",
                                            "paraphrases": ["tst-alpha tst-beta tst-gamma"]}, format="json")
    assert p.post("/api/v1/assistant/ask", ask, format="json").json()["language"] == "fr"  # pas encore validée
    assert r1.post(f"/api/v1/corpus/{eid}/validate", {}, format="json").json()["code"] == "same_author"
    assert r2.post(f"/api/v1/corpus/{eid}/validate", {}, format="json").json()["status"] == "valide"
    got = p.post("/api/v1/assistant/ask", ask, format="json").json()
    assert got["language"] == "fon" and got["answer"] == A and got["backend"] == "corpus"
    stats = {s["language"]: s for s in r1.get("/api/v1/corpus/stats").json()["results"]}
    assert stats["fon"]["valid"] == 1 and stats["fon"]["accuracy"] == 100.0 and stats["bba"]["accuracy"] is None
    assert p.get("/api/v1/corpus").status_code == 403
    assert CorpusEntry.objects.filter(language="fon").count() == 1
