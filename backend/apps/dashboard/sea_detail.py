"""Suivi-évaluation détaillé (TDR § 3.1) : production par filière et saison, effectifs, impact des appuis.

Calculs sur les producteurs validés. Une cellule de moins de MIN_CELL personnes est masquée pour tout rôle autre que
l'administration ; ce qui manque de données est `None` (« non disponible »), jamais 0.
"""
from collections import defaultdict
from datetime import timedelta
from statistics import fmean

from django.db.models import Count, Max, Min, Q, Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.permissions import ADMIN, AGENT, RESPONSABLE, roles
from apps.parcels.models import Campaign
from apps.producers.models import Producer
from apps.production.models import Support
from apps.referentiel.models import Department

from .api import REGISTRY, under_35_cutoff

READERS = (AGENT, ADMIN, RESPONSABLE, "repr_mtdi")
MIN_CELL = 5  # sous ce nombre de personnes, la cellule est masquée (et un groupe trop petit ne se compare pas)
SUPPORT_WINDOW_DAYS = 365  # un appui compte s'il a été confirmé dans les 12 mois qui précèdent la récolte
WARNING = ("Comparaison non causale : les appuis ne sont pas attribués au hasard (ils suivent des programmes, des "
           "critères, des départements), donc les producteurs appuyés et les autres peuvent différer pour d'autres "
           "raisons que l'appui. L'écart décrit une différence observée, pas l'effet de l'appui.")


def _scope(request):
    u = request.user
    dep = u.department if u.role == AGENT else request.query_params.get("department")
    name = Department.objects.filter(code=dep).values_list("name", flat=True).first() if dep else "National"
    return dep, {"department": dep, "name": name}


def _harvested(dep):
    """Une ligne par campagne d'un producteur validé ayant au moins une récolte (quantité corrigée par l'agent)."""
    qs = Campaign.objects.filter(parcel__producer__status="valide", harvests__isnull=False)
    if dep:
        qs = qs.filter(parcel__department=dep)
    return qs.values("id", "value_chain", "season", "parcel__area_ha", "parcel__department", "parcel__producer_id") \
        .annotate(kg=Sum("harvests__quantity_kg"), first=Min("harvests__harvested_at"), upd=Max("harvests__created_at"))


@api_view(["GET"])
@permission_classes([roles(*READERS)])
def production(request):
    """Production par filière et saison : quantités récoltées, rendement moyen par hectare, producteurs, parcelles."""
    dep, scope = _scope(request)
    season = request.query_params.get("season") or None
    admin = request.user.role == ADMIN
    acc = defaultdict(lambda: {"kg": 0.0, "ha": 0.0, "producers": set(), "parcels": 0})
    seasons, upd = set(), None
    for r in _harvested(dep):
        seasons.add(r["season"])
        upd = max(upd, r["upd"]) if upd else r["upd"]
        if season and r["season"] != season:
            continue
        a = acc[(r["value_chain"], r["season"])]
        a["kg"] += r["kg"]
        a["ha"] += r["parcel__area_ha"]
        a["producers"].add(r["parcel__producer_id"])
        a["parcels"] += 1  # une seule culture par parcelle et par saison : une campagne = une parcelle
    keys = sorted(sorted(acc), key=lambda k: k[1], reverse=True)  # saison récente d'abord, puis filière
    rows = []
    for vc, s in keys:
        a = acc[(vc, s)]
        hide = not admin and len(a["producers"]) < MIN_CELL
        rows.append({"value_chain": vc, "season": s, "masked": hide, "producers": None if hide else len(a["producers"]),
                     "parcels": None if hide else a["parcels"], "quantity_kg": None if hide else round(a["kg"], 1),
                     "yield_kg_ha": None if hide or not a["ha"] else round(a["kg"] / a["ha"], 1)})
    return Response({"scope": scope, "source": REGISTRY, "updated_at": upd, "min_cell": MIN_CELL,
                     "seasons": sorted(seasons, reverse=True), "rows": rows})


CELLS = ("f_u35", "f_o35", "m_u35", "m_o35")


def _mask_row(row, admin):
    """Masque les cases de moins de MIN_CELL personnes. Une seule case masquée se déduirait du total : on masque alors
    aussi la plus petite des autres (suppression complémentaire, limitée à la ligne)."""
    hidden = set() if admin else {c for c in CELLS if row[c] < MIN_CELL}
    if len(hidden) == 1 and row["total"] >= MIN_CELL:
        hidden.add(min((c for c in CELLS if c not in hidden), key=row.get))
    hide_total = not admin and row["total"] < MIN_CELL
    out = {c: None if c in hidden or hide_total else row[c] for c in CELLS}
    return {"key": row["key"], "total": None if hide_total else row["total"], **out,
            "masked": hide_total or bool(hidden)}


def _by_sex_and_age(qs, field, admin):
    young = Q(birth_date__gt=under_35_cutoff())
    parts = {"f_u35": Q(sex="F") & young, "f_o35": Q(sex="F") & ~young,
             "m_u35": Q(sex="M") & young, "m_o35": Q(sex="M") & ~young}
    agg = {k: Count("id", distinct=True, filter=q) for k, q in parts.items()}
    rows = qs.values(field).annotate(total=Count("id", distinct=True), **agg).order_by(field)
    return [_mask_row({"key": r[field], **{k: r[k] for k in ("total", *CELLS)}}, admin) for r in rows]


@api_view(["GET"])
@permission_classes([roles(*READERS)])
def workforce(request):
    """Effectifs de producteurs validés par sexe et tranche d'âge (moins de 35 ans / 35 ans et plus)."""
    dep, scope = _scope(request)
    admin = request.user.role == ADMIN
    valid = Producer.objects.filter(status="valide", **({"department": dep} if dep else {}))
    chains = valid.filter(parcels__campaigns__isnull=False)  # un producteur de deux filières compte dans les deux
    return Response({
        "scope": scope, "source": REGISTRY, "min_cell": MIN_CELL, "age_limit": 35,
        "by_department": _by_sex_and_age(valid, "department", admin),
        "by_value_chain": _by_sex_and_age(chains, "parcels__campaigns__value_chain", admin)})


def _n(n, admin):
    return n if admin or n >= MIN_CELL else None


def _compare(pairs):
    """Écart moyen de rendement entre traités et témoins, cellule par cellule (même département, filière et saison),
    pondéré par le nombre de traités. Une cellule où un groupe a moins de MIN_CELL producteurs ne compte pas."""
    ok = [(t, c) for t, c in pairs if len(t) >= MIN_CELL and len(c) >= MIN_CELL and fmean(c) > 0]
    nt = sum(len(t) for t, _ in ok)
    gap = sum(len(t) * 100 * (fmean(t) - fmean(c)) / fmean(c) for t, c in ok) / nt if ok else None
    return {"cells_used": len(ok), "n_treated": nt, "n_control": sum(len(c) for _, c in ok),
            "gap_pct": None if gap is None else round(gap, 1), "available": gap is not None}


def _group(first, sups):
    """'t' si un appui confirmé précède la récolte (12 mois au plus), 'c' si aucun appui n'a été remis dans cette
    période, None si un appui a été remis sans être confirmé avant la récolte (ni traité ni témoin)."""
    lo = first - timedelta(days=SUPPORT_WINDOW_DAYS)
    got = [s for s in sups
           if s["status"] == "confirme" and s["confirmed_at"] and lo <= s["confirmed_at"].date() < first]
    if got:
        return "t", got
    return (None, []) if any(lo <= s["created_at"].date() < first for s in sups) else ("c", [])


@api_view(["GET"])
@permission_classes([roles(*READERS)])
def impact(request):
    """Rendement par hectare des producteurs qui ont reçu et confirmé un appui avant la récolte, comparé à celui des
    producteurs du même département, de la même filière et de la même saison qui n'en ont pas reçu."""
    dep, scope = _scope(request)
    season = request.query_params.get("season") or None
    admin = request.user.role == ADMIN
    units = {}  # (département, filière, saison, producteur) -> quantité, surface, première récolte
    seasons = set()
    for r in _harvested(dep):
        seasons.add(r["season"])
        if season and r["season"] != season:
            continue
        u = units.setdefault((r["parcel__department"], r["value_chain"], r["season"], r["parcel__producer_id"]),
                             {"kg": 0.0, "ha": 0.0, "first": r["first"]})
        u["kg"] += r["kg"]
        u["ha"] += r["parcel__area_ha"]
        u["first"] = min(u["first"], r["first"])
    sups = defaultdict(list)
    for s in Support.objects.filter(producer__status="valide", **({"producer__department": dep} if dep else {})) \
            .values("producer_id", "status", "program_id", "program__name", "created_at", "confirmed_at"):
        sups[s["producer_id"]].append(s)
    cells = defaultdict(lambda: {"t": [], "c": [], "p": defaultdict(list)})
    excluded, names = 0, {}
    for (d, vc, s, pid), u in units.items():
        if u["ha"] <= 0:
            continue
        kind, got = _group(u["first"], sups.get(pid, []))
        if kind is None:
            excluded += 1
            continue
        y = u["kg"] / u["ha"]
        cells[(d, vc, s)][kind].append(y)
        for g in got:
            if g["program_id"]:
                names[g["program_id"]] = g["program__name"]
        for prog in {g["program_id"] for g in got if g["program_id"]}:
            cells[(d, vc, s)]["p"][prog].append(y)
    out = []
    for (d, vc, s), c in sorted(cells.items()):
        cmp = _compare([(c["t"], c["c"])])
        ok = cmp["available"]
        out.append({"department": d, "value_chain": vc, "season": s, "n_treated": _n(len(c["t"]), admin),
                    "n_control": _n(len(c["c"]), admin), "available": ok, "gap_pct": cmp["gap_pct"],
                    "mean_treated": round(fmean(c["t"]), 1) if ok else None,
                    "mean_control": round(fmean(c["c"]), 1) if ok else None})
    by_program = []
    for pid, name in sorted(names.items(), key=lambda kv: kv[1]):
        pairs = [(c["p"][pid], c["c"]) for c in cells.values() if pid in c["p"]]
        n_t = sum(len(t) for t, _ in pairs)
        cmp = _compare(pairs)
        by_program.append({"program": str(pid), "name": name, "n_treated": _n(n_t, admin), "gap_pct": cmp["gap_pct"],
                           "available": cmp["available"], "cells_used": cmp["cells_used"]})
    total = _compare([(c["t"], c["c"]) for c in cells.values()])
    overall = {**total, "n_treated": _n(total["n_treated"], admin), "n_control": _n(total["n_control"], admin)}
    return Response({"scope": scope, "source": REGISTRY, "min_group": MIN_CELL, "window_days": SUPPORT_WINDOW_DAYS,
                     "warning": WARNING, "seasons": sorted(seasons, reverse=True), "overall": overall,
                     "excluded": excluded, "cells": out, "by_program": by_program})
