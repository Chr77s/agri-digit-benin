from conftest import client_for


def test_workflow_and_assistant(users, producer):
    ag = client_for(users["agronome"])
    r = ag.post("/api/v1/knowledge", {"value_chain": "mais", "title": "Quand semer le maïs à Banikoara",
                                      "body": "Semer le maïs au début de la saison des pluies, de juin à juillet.",
                                      "source": "INRAB test", "language": "fr"}, format="json")
    assert r.status_code == 201 and r.json()["status"] == "brouillon"
    doc = r.json()["id"]
    assert client_for(users["agent"]).post("/api/v1/knowledge", {}, format="json").status_code == 403
    assert ag.post(f"/api/v1/knowledge/{doc}/publish").json()["code"] == "invalid_status"
    # relecture par une autre personne que l'auteur de la version
    assert ag.post(f"/api/v1/knowledge/{doc}/review").json()["code"] == "same_author"
    adm = client_for(users["admin"])
    r = adm.post(f"/api/v1/knowledge/{doc}/review").json()
    assert r["status"] == "relu" and r["reviewed_by_name"] == users["admin"].full_name and r["reviewed_at"]
    assert ag.post(f"/api/v1/knowledge/{doc}/publish").json()["status"] == "publie"
    assert client_for(users["auditeur"]).get("/api/v1/knowledge").status_code == 403
    p = client_for(producer.user)
    assert len(p.get("/api/v1/knowledge").json()["results"]) == 1
    from apps.knowledge.models import KnowledgeDoc
    from apps.knowledge.services import rebuild_index

    for i, (vc, t) in enumerate([("riz", "Repiquage du riz en bas-fond"), ("coton", "Démariage du coton"),
                                 ("manioc", "Bouturage du manioc"), ("soja", "Récolte du soja")]):
        KnowledgeDoc.objects.create(value_chain=vc, title=t, body=t + f" fiche {i}.", source="s", status="publie")
    rebuild_index()
    r = p.post("/api/v1/assistant/ask", {"question": "Quand semer le maïs à Banikoara ?"}, format="json").json()
    assert r["status"] == "answered" and r["citations"][0]["doc_id"] == doc and r["backend"]
    assert r["disclaimer"] == "Conseil indicatif, vérifiez avec votre agent ATDA"
    r = p.post("/api/v1/assistant/ask", {"question": "Quelle dose d'insecticide pour la chenille ?"},
               format="json").json()
    assert r["status"] == "escalated" and not r["citations"]
    r = p.post("/api/v1/assistant/ask", {"question": "Prix du ciment à Lagos"}, format="json").json()
    assert r["status"] == "unknown"
    r = ag.patch(f"/api/v1/knowledge/{doc}", {"body": "Nouveau texte."}, format="json")
    assert r.json()["version"] == 2 and r.json()["status"] == "brouillon"
    assert len(ag.get(f"/api/v1/knowledge/{doc}/versions").json()) == 3
    from apps.assistant.models import AssistantLog

    assert not AssistantLog.objects.filter(question__contains="0197").exists()


def test_dosage_guard_variants():
    from apps.assistant.services import is_dosage_question

    assert is_dosage_question("Combien de ml de pesticide par pulvérisateur ?")
    assert is_dosage_question("Posologie du vermifuge pour mes chèvres")
    assert not is_dosage_question("Quand semer le maïs ?")
