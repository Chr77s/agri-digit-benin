import pytest
from django.core.management import call_command

from apps.audit.models import AuditLog
from conftest import client_for


def test_audit_log_immutable(users, producer):
    log = AuditLog.objects.first()
    assert log.action == "producer.register"
    log.action = "x"
    with pytest.raises(PermissionError):
        log.save()
    with pytest.raises(PermissionError):
        log.delete()
    with pytest.raises(PermissionError):
        AuditLog.objects.all().delete()
    with pytest.raises(PermissionError):
        AuditLog.objects.update(action="x")
    call_command("purge_retention")
    assert AuditLog.objects.count() == 1


def test_audit_read_permissions(users, producer):
    r = client_for(users["auditeur"]).get("/api/v1/audit-logs", {"action": "producer.register"})
    assert r.status_code == 200 and r.json()["results"][0]["object_id"] == str(producer.id)
    assert client_for(users["agent"]).get("/api/v1/audit-logs").status_code == 403
    assert client_for(producer.user).get("/api/v1/audit-logs").status_code == 403


def test_export_with_reason_and_dashboard(users, producer, farms):
    adm = client_for(users["admin"])
    assert adm.post("/api/v1/exports", {"dataset": "producers", "reason": "court"}, format="json").status_code == 400
    r = adm.post("/api/v1/exports", {"dataset": "producers", "reason": "Contrôle du CoPil"}, format="json")
    assert r.status_code == 200 and "SABI" in r.content.decode("utf-8")
    assert AuditLog.objects.filter(action="export.csv", details__reason="Contrôle du CoPil").exists()
    assert client_for(users["agent"]).post("/api/v1/exports", {}, format="json").status_code == 403
    d = adm.get("/api/v1/dashboard", {"department": "alibori"}).json()
    assert all("source" in i and "updated_at" in i for i in d["indicators"])
    assert next(i for i in d["indicators"] if i["key"] == "maize_yield")["value"] is None
    agg = adm.get("/api/v1/farms/aggregates").json()
    assert agg[0]["farms"] == 40 and agg[0]["source"]
    assert len(adm.get("/api/v1/farms", {"bbox": "2,11,3,12"}).json()["results"]) == 20
    assert client_for(users["auditeur"]).get("/api/v1/dashboard").status_code == 403


def test_referentiels_public():
    c = client_for()
    chains = c.get("/api/v1/ref/value-chains").json()
    assert len(chains) == 13 and sum(not v["reserve"] for v in chains) == 10
    deps = c.get("/api/v1/ref/departments").json()
    assert len(deps) == 12 and sum(len(d["communes"]) for d in deps) == 77
