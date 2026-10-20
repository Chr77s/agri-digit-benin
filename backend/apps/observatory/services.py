"""Couverture de la consommation nationale, importations, tendances et veille (TDR § 3.1, suivi-évaluation).

Les chiffres sont saisis (source obligatoire) ; le code calcule des rapports et des alertes, sans rien inventer.
"""
from collections import defaultdict

from django.db import transaction

from apps.audit.services import record
from apps.core.errors import ApiError

from .models import NationalStat

VALUES = ("production_t", "consumption_t", "imports_t", "exports_t")
MAX_IMPORT_ROWS = 500
# Seuils de la veille (repères de pilotage, à faire valider par le MAEP) ; renvoyés avec chaque réponse.
THRESHOLDS = {"coverage_min_pct": 80, "imports_rise_pct": 20, "production_drop_pct": 15}


def _ratio(a, b):
    return round(100 * a / b, 1) if a is not None and b else None


def _change(new, old):
    return round(100 * (new - old) / old, 1) if new is not None and old else None


def series(stats):
    """Lignes calculées pour UNE filière, par année. Une variation n'existe que si l'année précédente est saisie."""
    out, prev = [], None
    for s in sorted(stats, key=lambda s: s.year):
        p = prev if prev and prev.year == s.year - 1 else None
        row = {"id": str(s.id), "year": s.year, **{k: getattr(s, k) for k in VALUES},
               "coverage_pct": _ratio(s.production_t, s.consumption_t),
               "import_dependency_pct": _ratio(s.imports_t, s.consumption_t),
               "production_change_pct": _change(s.production_t, p.production_t if p else None),
               "consumption_change_pct": _change(s.consumption_t, p.consumption_t if p else None),
               "imports_change_pct": _change(s.imports_t, p.imports_t if p else None),
               "source": s.source, "demo": s.is_demo, "updated_at": s.updated_at}
        before = out[-1]["coverage_pct"] if p and out else None
        row["coverage_change_pts"] = None if before is None or row["coverage_pct"] is None \
            else round(row["coverage_pct"] - before, 1)
        out.append(row)
        prev = s
    return out


def alerts(value_chain, row):
    """Veille sur la dernière année saisie d'une filière."""
    t, found = THRESHOLDS, []

    def add(kind, value, threshold):
        found.append({"value_chain": value_chain, "year": row["year"], "kind": kind, "value": value,
                      "threshold": threshold, "source": row["source"], "demo": row["demo"]})

    if row["coverage_pct"] is not None and row["coverage_pct"] < t["coverage_min_pct"]:
        add("couverture_faible", row["coverage_pct"], t["coverage_min_pct"])
    if row["imports_change_pct"] is not None and row["imports_change_pct"] > t["imports_rise_pct"]:
        add("importations_en_hausse", row["imports_change_pct"], t["imports_rise_pct"])
    if row["production_change_pct"] is not None and row["production_change_pct"] < -t["production_drop_pct"]:
        add("production_en_baisse", row["production_change_pct"], -t["production_drop_pct"])
    return found


def overview(value_chain=None):
    qs = NationalStat.objects.all()
    if value_chain:
        qs = qs.filter(value_chain=value_chain)
    by = defaultdict(list)
    for s in qs:
        by[s.value_chain].append(s)
    chains = [{"value_chain": vc, "series": rows, "latest": rows[-1]}
              for vc, rows in ((vc, series(stats)) for vc, stats in sorted(by.items()))]
    return {"thresholds": THRESHOLDS, "demo_source": NationalStat.DEMO_SOURCE, "chains": chains,
            "alerts": [a for c in chains for a in alerts(c["value_chain"], c["latest"])]}


def _upsert(actor, d):
    return NationalStat.objects.update_or_create(
        value_chain=d["value_chain"], year=d["year"],
        defaults={**{k: d.get(k) for k in VALUES}, "source": d["source"], "updated_by": actor})


@transaction.atomic
def save_stat(actor, d):
    """Crée ou remplace la ligne (filière, année) : les valeurs absentes de `d` redeviennent « non disponibles »."""
    s, created = _upsert(actor, d)
    record(actor, "national_stat.save", s, value_chain=s.value_chain, year=s.year, created=created)
    return s


@transaction.atomic
def import_stats(actor, rows):
    """Import en lot, tout ou rien (les lignes ont déjà été validées une à une)."""
    if not 0 < len(rows) <= MAX_IMPORT_ROWS:
        raise ApiError(f"Un import contient de 1 à {MAX_IMPORT_ROWS} lignes.", "validation_error", 400)
    keys = [(r["value_chain"], r["year"]) for r in rows]
    if len(set(keys)) != len(keys):
        raise ApiError("Une même filière et une même année figurent deux fois dans le lot.", "validation_error", 400)
    done = [_upsert(actor, r) for r in rows]
    record(actor, "national_stat.import", object_type="NationalStat", object_id="lot", rows=len(rows),
           created=sum(1 for _, c in done if c), keys=[f"{v}:{y}" for v, y in keys])
    return [s for s, _ in done]


@transaction.atomic
def delete_stat(actor, s):
    record(actor, "national_stat.delete", s, value_chain=s.value_chain, year=s.year)
    s.delete()
