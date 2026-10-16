"""Scénario de démonstration (section 15, étapes 1 à 10) rejoué contre un serveur lancé sur 127.0.0.1:8000.
Usage : python tests/e2e_backend.py [base_url]   (nécessite DEMO_MODE=true, seed_demo et import_poc_farms)."""
import io
import re
import sys
import time

import httpx
from PIL import Image

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


def first_campaign():
    body = c.get(f"{BASE}/campaigns", headers=ctx["prod"]).json()  # liste simple ou page, selon le contrat
    return (body["results"] if isinstance(body, dict) else body)[0]


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


@step("11. Carte du producteur, vérification publique sans donnée personnelle")
def s11():
    r = c.get(f"{BASE}/producers/{ctx['producer_id']}/card", headers=ctx["prod"])
    assert r.status_code == 200 and len(r.json()["verification_code"]) == 8, r.text
    pub = c.get(f"{BASE}/verify/{r.json()['verification_code']}")
    assert pub.status_code == 200 and set(pub.json()) == {"status", "full_name"}, pub.text
    assert c.get(f"{BASE}/verify/ZZZZZZZZ").status_code == 404


@step("12. Coopérative : le gestionnaire inscrit le producteur comme membre")
def s12():
    hg = ctx["gest"] = login("0197000008", PWD)
    coops = c.get(f"{BASE}/cooperatives", headers=hg).json()["results"]
    assert len(coops) == 1 and "Banikoara" in coops[0]["name"], coops
    code = c.get(f"{BASE}/producers/{ctx['producer_id']}", headers=ctx["agent"]).json()["code"]
    r = c.post(f"{BASE}/cooperatives/{coops[0]['id']}/members", headers=hg, json={"producer": code, "role": "membre"})
    assert r.status_code in (201, 409), r.text  # 409 si le scénario a déjà été rejoué
    mine = c.get(f"{BASE}/memberships/mine", headers=ctx["prod"]).json()["results"]
    assert mine and mine[0]["left_at"] is None, mine


@step("13. Appui remis puis confirmé ; récolte très éloignée du rendement de référence signalée")
def s13():
    r = c.post(f"{BASE}/supports", headers=ctx["agent"], json={
        "producer": ctx["producer_id"], "item": "Semences de maïs", "quantity": 25, "unit": "kg", "value_xof": 30000,
        "repayable": False})
    assert r.status_code == 201 and r.json()["status"] == "remis", r.text
    r = c.post(f"{BASE}/supports/{r.json()['id']}/confirm", headers=ctx["prod"])
    assert r.status_code == 200 and r.json()["status"] == "confirme", r.text
    camp = first_campaign()["id"]
    r = c.post(f"{BASE}/harvests", headers=ctx["prod"], json={
        "campaign": camp, "harvested_at": "2026-10-10", "quantity_kg": 900000, "stored_kg": 100, "sold_kg": 100})
    assert r.status_code == 201 and r.json()["flagged"] is True, r.text
    flagged = c.get(f"{BASE}/harvests", headers=ctx["agent"], params={"flagged": "true"}).json()["results"]
    assert flagged, flagged


@step("14. Marché : offre, mise en relation, acceptation, paiement FakePay réussi avec reçu")
def s14():
    hs, hb = login("0197000009", PWD), login("0197000010", PWD)
    r = c.post(f"{BASE}/offers", headers=hs, json={
        "type": "offre", "value_chain": "mais", "quantity_kg": 2000, "price_xof_per_kg": 240, "department": "borgou",
        "commune": "parakou", "description": "e2e"})
    assert r.status_code == 201, r.text
    m = c.post(f"{BASE}/offers/{r.json()['id']}/contact", headers=hb, json={"message": "Intéressé"}).json()
    assert "*" in m["counterpart_phone"], m  # numéro masqué avant acceptation
    acc = c.post(f"{BASE}/matches/{m['id']}/accept", headers=hs).json()
    assert acc["status"] == "acceptee" and acc["counterpart_phone"] == "0197000010", acc
    p = c.post(f"{BASE}/payments", headers=hb, json={"match": m["id"], "amount_xof": 100000,
                                                      "payer_phone": "0197000011"})
    assert p.status_code == 201 and p.json()["status"] == "en_attente", p.text
    for _ in range(20):
        got = c.get(f"{BASE}/payments/{p.json()['id']}", headers=hb).json()
        if got["status"] != "en_attente":
            break
        time.sleep(0.5)
    assert got["status"] == "reussi" and got["receipt"]["amount_xof"] == 100000, got
    over = c.post(f"{BASE}/payments", headers=hb, json={"match": m["id"], "amount_xof": 600000,
                                                         "payer_phone": "0197000011"})
    assert over.status_code == 400 and over.json()["code"] == "amount_over_limit", over.text


@step("15. Diagnostic par photo simulé : métadonnées retirées, résultat marqué simulation")
def s15():
    img = Image.new("RGB", (32, 32), (40, 150, 60))
    exif = Image.Exif()
    exif[0x8825] = {1: "N"}
    buf = io.BytesIO()
    img.save(buf, "JPEG", exif=exif)
    r = c.post(f"{BASE}/diagnoses", headers=ctx["prod"], data={"value_chain": "mais"},
               files={"image": ("plante.jpg", buf.getvalue(), "image/jpeg")})
    assert r.status_code == 201 and r.json()["simulation"] is True, r.text
    assert r.json()["status"] in ("auto", "transmis_agronome"), r.json()
    stored = c.get(f"{BASE}/diagnoses/{r.json()['id']}/image", headers=ctx["prod"])
    assert stored.status_code == 200 and not Image.open(io.BytesIO(stored.content)).getexif()
    bad = c.post(f"{BASE}/diagnoses", headers=ctx["prod"], data={"value_chain": "mais"},
                 files={"image": ("x.jpg", b"pas une image", "image/jpeg")})
    assert bad.status_code == 400, bad.text


@step("16. Validation linguistique : entrées à traduire, langue fermée aux producteurs")
def s16():
    hr = login("0197000011", PWD)
    summary = c.get(f"{BASE}/translations/summary", headers=hr).json()
    fon = next(s for s in summary if s["language"] == "fon")
    assert fon["total"] > 0 and fon["open_to_producers"] is False, fon
    assert c.get(f"{BASE}/i18n/fon.json").json() == {}  # aucune traduction inventée : repli sur le français
    assert c.get(f"{BASE}/translations", headers=ctx["prod"]).status_code == 403


@step("17. Satellite, indicateurs SEA, interopérabilité et conflit hors ligne")
def s17():
    sat = c.get(f"{BASE}/satellite", headers=ctx["admin"]).json()
    assert "non officielles" in sat["source"] and len(sat["results"]) == 12, sat["source"]
    sea = c.get(f"{BASE}/dashboard/sea", headers=ctx["admin"]).json()["indicators"]
    assert all("source" in i and "updated_at" in i for i in sea) and len(sea) >= 10, sea
    assert c.get(f"{BASE}/interop/xroad/aggregates").status_code == 401
    r = c.get(f"{BASE}/interop/xroad/aggregates", headers=ctx["admin"])
    assert r.status_code == 200 and "phone" not in r.text and "0197" not in r.text, r.text[:200]
    camp = first_campaign()
    stale = c.patch(f"{BASE}/campaigns/{camp['id']}", headers=ctx["agent"],
                    json={"stage": "croissance", "base_version": camp["version"] - 1})
    assert stale.status_code == 409 and stale.json()["code"] == "conflict", stale.text
    forced = c.patch(f"{BASE}/campaigns/{camp['id']}", headers=ctx["agent"],
                     json={"stage": "croissance", "base_version": camp["version"] - 1, "force": True})
    assert forced.status_code == 200, forced.text


ok = sum(1 for _, s, _ in results if s)
print(f"\n{ok}/{len(results)} étapes OK")
sys.exit(0 if ok == len(results) else 1)
