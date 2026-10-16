"""Scénario de démonstration (section 15, étapes 1 à 10) rejoué contre un serveur lancé sur 127.0.0.1:8000.
Usage : python tests/e2e_backend.py [base_url]   (nécessite DEMO_MODE=true, seed_demo et import_poc_farms)."""
import re
import sys

import httpx

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000") + "/api/v1"
PWD = "AgriDemo-2026!"
c = httpx.Client(timeout=120)
results = []


def login(phone, password=None):
    r = c.post(f"{BASE}/auth/otp/request", json={"phone": phone})
    assert r.status_code == 200, r.text
    inbox = c.get(f"{BASE}/demo/otp-inbox", params={"phone": phone}).json()
    code = re.search(r"\b(\d{6})\b", inbox[0]["body"]).group(1)
    body = {"phone": phone, "code": code}
    if password:
        body["password"] = password
    r = c.post(f"{BASE}/auth/otp/verify", json=body)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access']}"}


def step(name):
    def deco(fn):
        try:
            fn()
            results.append((name, True, ""))
            print(f"OK     {name}")
        except Exception as e:  # noqa: BLE001
            results.append((name, False, repr(e)))
            print(f"ÉCHEC  {name} : {e!r}")
        return fn
    return deco


ctx = {}


@step("1. Inscription d'un producteur (NPI valide, consentement, en attente)")
def s1():
    r = c.post(f"{BASE}/producers/register", json={
        "npi": "1000000002", "first_name": "Awa", "last_name": "SABI", "sex": "F", "birth_date": "1990-07-01",
        "department": "alibori", "commune": "banikoara", "phone": "0197000099", "language": "fr",
        "consent_accepted": True, "consent_text_version": "v1"})
    if r.status_code == 409:  # scénario déjà rejoué : on reprend la fiche existante
        ctx["producer_id"] = r.json()["existing"]["id"]
        return
    assert r.status_code == 201, r.text
    assert r.json()["status"] == "en_attente" and r.json()["code"].startswith("BJ-AGR-2026-")
    ctx["producer_id"] = r.json()["id"]


@step("2. L'agent ATDA de l'Alibori voit et valide la fiche ; notification au producteur")
def s2():
    h = ctx["agent"] = login("0197000002", PWD)
    lst = c.get(f"{BASE}/producers", params={"search": "SABI"}, headers=h).json()["results"]
    assert any(p["id"] == ctx["producer_id"] for p in lst), lst
    r = c.post(f"{BASE}/producers/{ctx['producer_id']}/validate", headers=h)
    assert r.status_code == 200 and r.json()["status"] == "valide", r.text
    hp = ctx["prod"] = login("0197000099")
    notes = c.get(f"{BASE}/notifications", headers=hp).json()["results"]
    assert any("validée" in n["body"] for n in notes), notes


@step("3. Parcelle dessinée (surface calculée) et campagne de maïs")
def s3():
    h = ctx["prod"]
    geom = {"type": "Polygon", "coordinates": [[[2.43, 11.29], [2.439, 11.29], [2.439, 11.299], [2.43, 11.299],
                                                [2.43, 11.29]]]}
    r = c.post(f"{BASE}/parcels", headers=h, json={"name": "Champ e2e", "geometry": geom,
                                                   "land_type": "pluvial_plateau", "tenure": "propriete"})
    assert r.status_code == 201, r.text
    assert 90 < r.json()["area_ha"] < 110, r.json()["area_ha"]
    r = c.post(f"{BASE}/campaigns", headers=h, json={"parcel": r.json()["id"], "value_chain": "mais",
                                                     "season": "2026-pluie-1", "stage": "semis"})
    assert r.status_code == 201, r.text


@step("4. Assistant : réponse citée ; question de dosage renvoyée à un agent")
def s4():
    h = ctx["prod"]
    r = c.post(f"{BASE}/assistant/ask", headers=h, json={"question": "Quand semer le maïs à Banikoara ?"}).json()
    assert r["status"] == "answered" and r["citations"], r
    assert r["disclaimer"] == "Conseil indicatif, vérifiez avec votre agent ATDA"
    r = c.post(f"{BASE}/assistant/ask", headers=h,
               json={"question": "Quelle dose d'insecticide pour la chenille légionnaire ?"}).json()
    assert r["status"] == "escalated", r


@step("5. Alerte ravageur à l'Alibori, SMS simulés livrés")
def s5():
    h = ctx["agent"]
    r = c.post(f"{BASE}/alerts", headers=h, json={
        "title": "Chenille légionnaire", "message": "Surveillez vos champs de maïs et signalez les dégâts à l'ATDA.",
        "category": "ravageur", "severity": "avertissement", "department": "alibori", "value_chains": ["mais"]})
    assert r.status_code == 201, r.text
    s = c.post(f"{BASE}/alerts/{r.json()['id']}/send", headers=h).json()
    assert s["sent"] >= 1 and s["delivered"] == s["sent"], s
    out = c.get(f"{BASE}/outbox", headers=h, params={"channel": "sms"}).json()["results"]
    assert any("Chenille" in o["body"] and o["status"] == "livre" and "****" in o["to"] for o in out), out[:2]


@step("6. Sélection de 2 000 bénéficiaires, validation par un agent, contestation")
def s6():
    h = ctx["resp"] = login("0197000004", PWD)
    r = c.post(f"{BASE}/selection-runs", headers=h, json={
        "target_count": 2000, "weights": {"confidence": 0.4, "road_distance": 0.3, "area": 0.3}})
    assert r.status_code == 201, r.text
    run = r.json()
    assert run["status"] == "proposition" and run["selected_count"] == 2000, run
    r = c.post(f"{BASE}/selection-runs/{run['id']}/validate", headers=h, json={"reason": "auto"})
    assert r.status_code == 403, "le lanceur ne doit pas pouvoir valider"
    r = c.post(f"{BASE}/selection-runs/{run['id']}/validate", headers=ctx["agent"],
               json={"reason": "Critères conformes au programme"})
    assert r.status_code == 200 and r.json()["status"] == "validee", r.text
    excl = c.get(f"{BASE}/selection-runs/{run['id']}/candidates", headers=h,
                 params={"selected": "false", "page_size": 1}).json()["results"][0]
    r = c.post(f"{BASE}/selection-runs/{run['id']}/contest", headers=ctx["prod"],
               json={"farm_id": excl["farm_id"], "reason": "Ma parcelle est bien cultivée en maïs."})
    assert r.status_code == 201 and r.json()["status"] == "deposee", r.text


@step("7. Candidature à une subvention ouverte, refus clair sur programme clos")
def s7():
    h = ctx["prod"]
    progs = {p["name"]: p for p in c.get(f"{BASE}/programs", headers=h).json()}
    r = c.post(f"{BASE}/programs/{progs['Subvention intrants maïs 2026']['id']}/apply", headers=h)
    assert r.status_code in (201, 409), r.text
    r = c.post(f"{BASE}/programs/{progs['Appui coton 2025']['id']}/apply", headers=h)
    assert r.status_code == 400 and r.json()["code"] == "program_closed", r.text
    assert "31/12/2025" in r.json()["detail"]


@step("8. Consentement crédit, l'agent financier consulte le score, consultation journalisée")
def s8():
    r = c.post(f"{BASE}/credit/consent", headers=ctx["prod"])
    assert r.status_code == 201, r.text
    hf = login("0197000007", PWD)
    lst = c.get(f"{BASE}/credit/consented-producers", headers=hf).json()["results"]
    assert any(p["id"] == ctx["producer_id"] for p in lst), lst
    r = c.get(f"{BASE}/credit/scores/{ctx['producer_id']}", headers=hf)
    assert r.status_code == 200 and len(r.json()["factors"]) == 5 and "401" in r.json()["disclaimer"], r.text
    assert c.get(f"{BASE}/credit/scores/{ctx['producer_id']}", headers=ctx["agent"]).status_code == 403
    ha = login("0197000006", PWD)
    logs = c.get(f"{BASE}/audit-logs", headers=ha, params={"action": "credit.score_view"}).json()["results"]
    assert logs and logs[0]["object_id"] == ctx["producer_id"], logs[:1]


@step("9. L'auditeur lit le journal ; l'administrateur exporte un CSV avec motif")
def s9():
    ha = login("0197000006", PWD)
    r = c.get(f"{BASE}/audit-logs", headers=ha)
    assert r.status_code == 200 and r.json()["results"], r.text
    assert c.get(f"{BASE}/producers", headers=ha).status_code == 403
    hadm = ctx["admin"] = login("0197000005", PWD)
    r = c.post(f"{BASE}/exports", headers=hadm, json={"dataset": "producers", "reason": "Contrôle CoPil e2e"})
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/csv"), r.text[:200]
    logs = c.get(f"{BASE}/audit-logs", headers=ha, params={"action": "export.csv"}).json()["results"]
    assert logs and logs[0]["details"]["reason"] == "Contrôle CoPil e2e", logs[:1]


@step("10. Tableau de bord de l'Alibori, source et date sur chaque chiffre")
def s10():
    r = c.get(f"{BASE}/dashboard", headers=ctx["admin"], params={"department": "alibori"})
    assert r.status_code == 200, r.text
    inds = r.json()["indicators"]
    assert inds and all("source" in i and "updated_at" in i for i in inds), inds
    assert any(i["key"] == "farms_detected" and i["value"] for i in inds), inds


ok = sum(1 for _, s, _ in results if s)
print(f"\n{ok}/{len(results)} étapes OK")
sys.exit(0 if ok == len(results) else 1)
