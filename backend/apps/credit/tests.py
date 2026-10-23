from apps.audit.models import AuditLog
from conftest import client_for


def test_credit_consent_score_and_audit(users, producer):
    fin = client_for(users["financier"])
    url = f"/api/v1/credit/scores/{producer.id}"
    assert fin.get(url).status_code == 404  # pas de consentement
    assert fin.get("/api/v1/credit/consented-producers").json()["results"] == []
    p = client_for(producer.user)
    assert p.post("/api/v1/credit/consent").status_code == 201
    r = fin.get(url)
    assert r.status_code == 200
    d = r.json()
    assert 0 <= d["score"] <= 100 and len(d["factors"]) == 5 and "art. 401" in d["disclaimer"]
    assert abs(sum(f["weight"] for f in d["factors"]) - 1) < 1e-9
    assert {"name", "weight", "value", "contribution"} <= set(d["factors"][0])
    assert AuditLog.objects.filter(action="credit.score_view", object_id=str(producer.id)).count() == 1
    lst = fin.get("/api/v1/credit/consented-producers").json()["results"]
    assert lst[0].pop("consented_at")
    assert lst == [{"id": str(producer.id), "code": producer.code, "first_name": "Awa", "last_name": "SABI",
                    "commune": "banikoara"}]
    for role in ("agent", "admin", "auditeur", "resp"):
        assert client_for(users[role]).get(url).status_code == 403
    assert p.get(url).status_code == 403
    assert fin.post("/api/v1/credit/consent").status_code == 403
    assert p.post("/api/v1/credit/consent/withdraw").status_code == 200
    assert fin.get(url).status_code == 404
    assert p.post("/api/v1/credit/consent/withdraw").json()["code"] == "no_consent"
