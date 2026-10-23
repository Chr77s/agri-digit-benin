from apps.audit.models import AuditLog
from apps.markets.models import Survey, SurveyResponse
from conftest import client_for

QUESTIONS = ["Qualité du produit", "Prix", "Accueil du vendeur"]


def _create(client, **extra):
    body = {"title": "Satisfaction des acheteurs de farine", "value_chain": "mais", "department": "alibori",
            "questions": QUESTIONS, **extra}
    return client.post("/api/v1/surveys", body, format="json")


def _answer(code, ratings=(5, 4, 3), **extra):
    return client_for().post(f"/api/v1/public/surveys/{code}/respond", {"ratings": list(ratings), **extra},
                             format="json")


def test_staff_create_surveys_inside_their_zone(users, producer):
    agent = client_for(users["agent"])
    r = _create(agent)
    assert r.status_code == 201
    s = r.json()
    assert len(s["code"]) == 6 and s["path"] == f"/enquete/{s['code']}" and s["questions"] == QUESTIONS
    assert AuditLog.objects.filter(action="survey.create", actor=users["agent"]).count() == 1
    assert _create(agent, department="zou").status_code == 403  # hors de son département
    assert _create(agent, department="").json()["department"] == "alibori"  # l'agent crée dans son département
    assert _create(client_for(users["admin"]), department="").status_code == 201  # enquête nationale
    assert _create(client_for(users["resp"]), department="zou").status_code == 201
    for who in ("transf", "distrib", "gest", "auditeur"):
        assert _create(client_for(users[who])).status_code == 403, who
    assert _create(client_for(producer.user)).status_code == 403
    for bad in ({"questions": []}, {"questions": ["x"] * 11}, {"questions": ["  "]}, {"value_chain": "inconnue"},
                {"title": ""}):
        assert _create(agent, **bad).status_code == 400, bad
    # l'agent d'un autre département ne voit pas l'enquête de l'agent d'Alibori
    assert client_for(users["agent_zou"]).get(f"/api/v1/surveys/{s['id']}/results").status_code == 404
    mine = client_for(users["agent2"]).get("/api/v1/surveys").json()["results"]
    assert s["id"] in {x["id"] for x in mine}  # un collègue du même département la voit


def test_public_answer_without_account_and_without_personal_data(users):
    s = _create(client_for(users["agent"])).json()
    anon = client_for()
    page = anon.get(f"/api/v1/public/surveys/{s['code'].lower()}").json()  # le code se saisit en minuscules aussi
    assert page["title"] == s["title"] and page["questions"] == QUESTIONS and "id" not in page
    assert anon.get("/api/v1/public/surveys/ZZZZZZ").status_code == 404
    ok = _answer(s["code"], comment="Très bonne farine.", department="alibori", commune="banikoara", channel="agent")
    assert ok.status_code == 201
    saved = SurveyResponse.objects.get()
    assert saved.ratings == [5, 4, 3] and saved.comment == "Très bonne farine." and saved.channel == "agent"
    # la réponse ne porte ni adresse, ni téléphone, ni compte
    assert {f.name for f in SurveyResponse._meta.get_fields()} == {
        "id", "survey", "ratings", "comment", "department", "commune", "channel", "device_hash", "created_at"}
    for bad in ({"ratings": [5, 4]}, {"ratings": [5, 4, 6]}, {"ratings": [0, 4, 3]}, {"ratings": [5, "a", 3]},
                {"department": "atlantide"}, {"department": "alibori", "commune": "cotonou"},
                {"comment": "x" * 501}, {"channel": "sms"}):
        body = {"ratings": [5, 4, 3], **bad}
        assert anon.post(f"/api/v1/public/surveys/{s['code']}/respond", body, format="json").status_code == 400, bad
    assert SurveyResponse.objects.count() == 1


def test_robot_trap_and_one_answer_per_device(users):
    s = _create(client_for(users["agent"])).json()
    trap = _answer(s["code"], website="http://spam.example")
    assert trap.status_code == 201 and SurveyResponse.objects.count() == 0  # accepté en apparence, rien de gardé
    device = "d" * 32
    assert _answer(s["code"], device=device).status_code == 201
    again = _answer(s["code"], device=device)
    assert again.status_code == 409 and again.json()["code"] == "already_answered"
    assert _answer(s["code"], device="e" * 32).status_code == 201  # un autre appareil
    assert SurveyResponse.objects.count() == 2
    assert "d" * 32 not in "".join(SurveyResponse.objects.values_list("device_hash", flat=True))  # empreinte seulement
    other = _create(client_for(users["agent"])).json()
    assert _answer(other["code"], device=device).status_code == 201  # le jeton ne relie pas deux enquêtes


def test_answers_are_rate_limited_per_address(users, settings):
    s = _create(client_for(users["agent"])).json()
    settings.SURVEY_THROTTLE_RATE = "3/min"
    codes = [_answer(s["code"]).status_code for _ in range(5)]
    assert codes == [201, 201, 201, 429, 429]


def test_closed_survey_refuses_answers(users):
    agent = client_for(users["agent"])
    s = _create(agent).json()
    assert _answer(s["code"]).status_code == 201
    assert agent.post(f"/api/v1/surveys/{s['id']}/close", {}, format="json").json()["status"] == "close"
    assert agent.post(f"/api/v1/surveys/{s['id']}/close", {}, format="json").status_code == 400
    r = _answer(s["code"])
    assert r.status_code == 409 and r.json()["code"] == "survey_closed"
    assert client_for().get(f"/api/v1/public/surveys/{s['code']}").json()["status"] == "close"
    row = agent.get("/api/v1/surveys").json()["results"][0]
    assert row["responses"] == 1 and row["status"] == "close"
    assert client_for(users["transf"]).post(f"/api/v1/surveys/{s['id']}/close", {}, format="json").status_code == 403


def test_results_are_aggregated_and_small_cells_are_masked(users, producer):
    agent = client_for(users["agent"])
    s = _create(agent).json()
    obj = Survey.objects.get(pk=s["id"])
    for i in range(5):  # Alibori : 5 réponses, juste assez pour être montrées
        SurveyResponse.objects.create(survey=obj, ratings=[5 - i % 2, 4, 3], department="alibori",
                                      comment="Livraison tardive" if i == 0 else "")
    for _ in range(2):  # Zou : 2 réponses seulement
        SurveyResponse.objects.create(survey=obj, ratings=[1, 1, 1], department="zou", comment="Prix trop haut")
    r = client_for(users["resp"]).get(f"/api/v1/surveys/{s['id']}/results").json()
    assert r["responses"] == 7 and r["low_sample"] is False
    q1 = r["questions"][0]
    assert q1["mean"] == 3.57 and q1["distribution"] == {"1": 2, "2": 0, "3": 0, "4": 2, "5": 3}
    deps = {d["department"]: d for d in r["by_department"]}
    assert deps["alibori"]["masked"] is False and deps["alibori"]["means"] == [4.6, 4.0, 3.0]
    assert deps["zou"]["masked"] is True and deps["zou"]["means"] is None and deps["zou"]["responses"] == 2
    assert sorted(c["text"] for c in r["comments"]) == ["Livraison tardive", "Prix trop haut", "Prix trop haut"]
    assert set(r["comments"][0]) == {"text", "date"}  # ni lieu ni appareil à côté d'un commentaire libre
    for who in ("transf", "distrib", "gest", "agent_zou", "agronome"):
        assert client_for(users[who]).get(f"/api/v1/surveys/{s['id']}/results").status_code in (403, 404), who
    assert client_for(producer.user).get(f"/api/v1/surveys/{s['id']}/results").status_code == 403
    assert client_for().get(f"/api/v1/surveys/{s['id']}/results").status_code == 401
    few = _create(agent).json()
    SurveyResponse.objects.create(survey=Survey.objects.get(pk=few["id"]), ratings=[3, 3, 3])
    assert agent.get(f"/api/v1/surveys/{few['id']}/results").json()["low_sample"] is True
