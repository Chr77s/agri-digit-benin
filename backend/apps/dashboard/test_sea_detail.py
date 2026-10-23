from datetime import date

from apps.observatory.testkit import make_harvest, make_producer, make_support
from apps.programs.models import Program
from conftest import client_for

BASE = "/api/v1/dashboard/sea/"
PROD, WORK, IMPACT = BASE + "production", BASE + "workforce", BASE + "impact"


def test_production_by_chain_and_season_masks_small_cells(users):
    for _ in range(6):
        make_harvest(make_producer(), kg=1500, ha=1.5)  # alibori : 6 producteurs, 1 000 kg/ha
    for _ in range(3):
        make_harvest(make_producer("zou"), kg=900, ha=1.0, chain="riz")
    make_harvest(make_producer(), kg=500, ha=1.0, season="2025-pluie-1")
    make_producer()  # validé sans récolte : jamais compté
    admin, resp = client_for(users["admin"]), client_for(users["resp"])
    rows = {(r["value_chain"], r["season"]): r for r in admin.get(PROD).json()["rows"]}
    assert rows[("mais", "2026-pluie-1")] == {
        "value_chain": "mais", "season": "2026-pluie-1", "masked": False, "producers": 6, "parcels": 6,
        "quantity_kg": 9000.0, "yield_kg_ha": 1000.0}
    assert rows[("riz", "2026-pluie-1")]["quantity_kg"] == 2700.0  # l'administration voit tout
    seen = {(r["value_chain"], r["season"]): r for r in resp.get(PROD).json()["rows"]}
    assert seen[("riz", "2026-pluie-1")]["masked"] and seen[("riz", "2026-pluie-1")]["quantity_kg"] is None
    assert seen[("riz", "2026-pluie-1")]["yield_kg_ha"] is None  # masqué, jamais 0
    assert seen[("mais", "2025-pluie-1")]["quantity_kg"] is None  # un seul producteur
    only = resp.get(PROD + "?season=2025-pluie-1").json()
    assert [r["season"] for r in only["rows"]] == ["2025-pluie-1"]
    assert only["seasons"] == ["2026-pluie-1", "2025-pluie-1"]
    agent = client_for(users["agent_zou"]).get(PROD).json()  # borné à son département
    assert agent["scope"]["department"] == "zou" and [r["value_chain"] for r in agent["rows"]] == ["riz"]
    assert client_for(users["transf"]).get(PROD).status_code == 403


def test_workforce_by_sex_and_age_with_complementary_suppression(users):
    born_young, born_old = date(date.today().year - 25, 6, 1), date(date.today().year - 50, 6, 1)
    for sex, born, n in [("F", born_young, 6), ("F", born_old, 5), ("M", born_young, 5), ("M", born_old, 3)]:
        for _ in range(n):
            make_harvest(make_producer(sex=sex, born=born))
    make_producer(status="en_attente")  # pas validé : pas compté
    admin = client_for(users["admin"]).get(WORK).json()
    row = {r["key"]: r for r in admin["by_department"]}["alibori"]
    assert (row["total"], row["f_u35"], row["f_o35"], row["m_u35"], row["m_o35"]) == (19, 6, 5, 5, 3)
    assert admin["by_value_chain"][0]["key"] == "mais" and admin["by_value_chain"][0]["total"] == 19
    seen = client_for(users["resp"]).get(WORK).json()
    row = {r["key"]: r for r in seen["by_department"]}["alibori"]
    assert row["total"] == 19 and row["m_o35"] is None and row["masked"]
    # une seule case sous 5 se déduirait du total : la plus petite des autres est masquée aussi
    assert [row[c] for c in ("f_u35", "f_o35", "m_u35")].count(None) == 1
    assert client_for(users["agent"]).get(WORK).json()["scope"]["department"] == "alibori"


def test_workforce_hides_a_whole_row_under_five(users):
    for _ in range(3):
        make_producer("zou")
    row = {r["key"]: r for r in client_for(users["resp"]).get(WORK).json()["by_department"]}["zou"]
    assert row["total"] is None and row["f_u35"] is None and row["masked"]
    assert {r["key"]: r for r in client_for(users["admin"]).get(WORK).json()["by_department"]}["zou"]["total"] == 3


def _group(n, kg, treated, dep="alibori", program=None, **kw):
    for _ in range(n):
        p = make_producer(dep)
        make_harvest(p, kg=kg, ha=1.0, dep=dep, **kw)
        if treated:
            make_support(p, program=program)


def test_impact_compares_within_department_chain_and_season_and_is_not_causal(users):
    prog = Program.objects.create(name="Subvention maïs [démo]")
    _group(6, 2000, True, program=prog)
    _group(6, 1000, False)
    _group(3, 5000, True, dep="zou")  # moins de 5 par groupe : « non disponible », jamais 0
    _group(3, 1000, False, dep="zou")
    _group(2, 9000, False, chain="riz")  # autre filière : ne sert pas de témoin au maïs
    unconfirmed = make_producer()
    make_harvest(unconfirmed, kg=100, ha=1.0)
    make_support(unconfirmed, confirmed=None)  # remis, jamais confirmé : ni traité ni témoin
    late = make_producer()
    make_harvest(late, kg=1000, ha=1.0)
    make_support(late, created=date(2026, 10, 1), confirmed=date(2026, 10, 2))  # après la récolte : témoin
    out = client_for(users["admin"]).get(IMPACT).json()
    assert "non causale" in out["warning"] and out["excluded"] == 1 and out["window_days"] == 365
    cells = {(c["department"], c["value_chain"]): c for c in out["cells"]}
    ali = cells[("alibori", "mais")]
    assert (ali["n_treated"], ali["n_control"], ali["gap_pct"], ali["available"]) == (6, 7, 100.0, True)
    assert ali["mean_treated"] == 2000.0 and ali["mean_control"] == 1000.0
    zou = cells[("zou", "mais")]
    assert zou["available"] is False and zou["gap_pct"] is None and zou["mean_treated"] is None
    assert (zou["n_treated"], zou["n_control"]) == (3, 3)
    assert cells[("alibori", "riz")]["n_treated"] == 0 and cells[("alibori", "riz")]["gap_pct"] is None
    assert out["overall"]["gap_pct"] == 100.0 and out["overall"]["cells_used"] == 1
    assert out["by_program"] == [{"program": str(prog.id), "name": "Subvention maïs [démo]", "n_treated": 6,
                                  "gap_pct": 100.0, "available": True, "cells_used": 1}]
    seen = {(c["department"], c["value_chain"]): c for c in client_for(users["resp"]).get(IMPACT).json()["cells"]}
    assert seen[("zou", "mais")]["n_treated"] is None and seen[("alibori", "mais")]["n_treated"] == 6
    assert client_for(users["auditeur"]).get(IMPACT).status_code == 403


def test_impact_ignores_supports_older_than_the_window(users):
    _group(6, 1000, False)
    for _ in range(6):
        p = make_producer()
        make_harvest(p, kg=3000, ha=1.0)
        make_support(p, created=date(2024, 1, 1), confirmed=date(2024, 1, 5))  # plus de 12 mois avant la récolte
    out = client_for(users["admin"]).get(IMPACT).json()
    assert out["cells"][0]["n_treated"] == 0 and out["cells"][0]["n_control"] == 12
    assert out["overall"]["available"] is False and out["overall"]["gap_pct"] is None
