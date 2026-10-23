import pytest
from django.core.management import CommandError, call_command

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


def test_audit_filters_object_and_dates(users, producer):
    c = client_for(users["auditeur"])
    ok = c.get("/api/v1/audit-logs", {"object_type": "Producer"}).json()["results"]
    assert ok and all(r["object_type"] == "Producer" for r in ok)
    assert c.get("/api/v1/audit-logs", {"object_type": "nothing"}).json()["results"] == []
    assert c.get("/api/v1/audit-logs", {"from": "2999-01-01"}).json()["results"] == []
    assert c.get("/api/v1/audit-logs", {"to": "2000-01-01"}).json()["results"] == []
    assert len(c.get("/api/v1/audit-logs", {"from": "2000-01-01", "to": "2999-01-01"}).json()["results"]) >= 1
    assert c.get("/api/v1/audit-logs", {"from": "pas-une-date", "to": "2026-02-31"}).status_code == 200


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


def test_audit_chain_detects_tampering_and_survives_purge(users, producer):
    from datetime import timedelta

    from django.db import connection
    from django.utils import timezone

    from apps.audit.services import record, verify_chain

    for i in range(3):
        record(users["admin"], "test.action", details={"i": i})
    r = client_for(users["auditeur"]).get("/api/v1/audit-logs/verify").json()
    assert r["ok"] and r["count"] == AuditLog.objects.count() and r["broken_seq"] is None
    assert client_for(users["agent"]).get("/api/v1/audit-logs/verify").status_code == 403
    entries = list(AuditLog.objects.order_by("seq"))
    assert [e.seq for e in entries] == list(range(1, len(entries) + 1))
    assert all(b.prev_hash == a.hash for a, b in zip(entries, entries[1:], strict=False))
    call_command("verify_audit_chain")

    # retouche directe en base (contourne l'interdiction du modèle) : la chaîne casse à cette entrée
    target = entries[2]
    with connection.cursor() as c:
        c.execute(f"UPDATE {AuditLog._meta.db_table} SET action = %s WHERE id = %s", ["autre", target.pk.hex])
    r = verify_chain()
    assert not r["ok"] and r["broken_seq"] == target.seq and r["count"] == target.seq - 1
    with pytest.raises(CommandError):
        call_command("verify_audit_chain")
    with connection.cursor() as c:
        c.execute(f"UPDATE {AuditLog._meta.db_table} SET action = %s WHERE id = %s", [target.action, target.pk.hex])
    assert verify_chain()["ok"]

    # purge de conservation des deux premières entrées : la vérification repart du maillon journalisé
    old = timezone.now() - timedelta(days=4000)
    with connection.cursor() as c:
        for e in entries[:2]:
            c.execute(f"UPDATE {AuditLog._meta.db_table} SET at = %s WHERE id = %s", [old, e.pk.hex])
    # l'empreinte inclut la date : les deux entrées antidatées ne sont plus vérifiables, mais elles vont être purgées
    call_command("purge_retention")
    assert not AuditLog.objects.filter(pk__in=[e.pk for e in entries[:2]]).exists()
    r = verify_chain()
    assert r["ok"], r

