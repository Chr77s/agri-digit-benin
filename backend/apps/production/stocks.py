"""Stocks et anticipation des ruptures (TDR § 3.1, distribution) : à partir des lots et de leurs sorties (transferts et
transformations), le stock actuel, la sortie moyenne par jour et les jours de couverture par détenteur, produit et site.
Pas de modèle prédictif : stock divisé par la sortie moyenne observée. Sans sortie observée, la couverture n'est pas
calculable (jamais une couverture infinie présentée comme une bonne nouvelle)."""
from collections import defaultdict
from datetime import timedelta

from django.db.models import Q
from django.utils import timezone

from apps.accounts.models import User
from apps.audit.services import record
from apps.core.permissions import AGENT

from .lots import HOLDERS
from .models import Lot, StockAlertSent

WINDOW_DAYS = 30  # période d'observation des sorties
MIN_WINDOW_DAYS = 7  # un détenteur récent n'est pas jugé sur un seul jour de sorties
CRITICAL_DAYS = 7
LOW_DAYS = 15
ALERT_EVERY_DAYS = 7  # une alerte par produit et par semaine au plus
SEVERITY = {"rupture": 0, "critique": 1, "bas": 2, "ok": 3, "non_calculable": 4}


def level(stock_kg, daily_kg):
    if daily_kg <= 0:
        return "non_calculable"
    if stock_kg <= 0.001:
        return "rupture"
    days = stock_kg / daily_kg
    return "critique" if days < CRITICAL_DAYS else "bas" if days < LOW_DAYS else "ok"


def lots_for(user):
    """Le détenteur : ses lots. L'agent : ceux de son département (site, à défaut département du détenteur). Le
    responsable et l'administration : tous."""
    if user.role in HOLDERS:
        return Lot.objects.filter(holder=user)
    if user.role == AGENT and user.department:
        return Lot.objects.filter(Q(site__department=user.department) |
                                  Q(site__isnull=True, holder__department=user.department))
    return Lot.objects.all()


def groups(lots, today=None):
    """Une ligne par détenteur, filière, produit et site, avec stock, sorties et niveau."""
    today = today or timezone.localdate()
    since = timezone.now() - timedelta(days=WINDOW_DAYS)
    out = {}
    held = list(lots.select_related("holder", "site"))
    by_id = {x.id: x for x in held}
    for x in held:
        k = (x.holder_id, x.value_chain, x.product, x.site_id)
        g = out.setdefault(k, {"holder": x.holder_id, "value_chain": x.value_chain, "product": x.product,
                               "site": str(x.site_id) if x.site_id else None,
                               "site_name": x.site.name if x.site else None,
                               "department": x.site.department if x.site else x.holder.department,
                               "stock_kg": 0.0, "outflow_kg": 0.0, "first": x.created_at.date()})
        if x.status == "en_stock":
            g["stock_kg"] += x.quantity_kg
        g["first"] = min(g["first"], x.created_at.date())
    # sorties : lot enfant créé dans la période ; transfert (autre détenteur) = quantité remise, transformation (même
    # détenteur) = quantité du lot parent consommé
    for link in Lot.parents.through.objects.filter(from_lot__created_at__gte=since, to_lot__in=lots.values("pk")) \
            .select_related("from_lot"):
        parent, child = by_id[link.to_lot_id], link.from_lot
        g = out[(parent.holder_id, parent.value_chain, parent.product, parent.site_id)]
        g["outflow_kg"] += child.quantity_kg if child.holder_id != parent.holder_id else parent.quantity_kg
    rows = []
    for g in out.values():
        days = min(WINDOW_DAYS, max(MIN_WINDOW_DAYS, (today - g.pop("first")).days))
        daily = g["outflow_kg"] / days
        lv = level(g["stock_kg"], daily)
        rows.append({**g, "stock_kg": round(g["stock_kg"], 1), "outflow_kg": round(g["outflow_kg"], 1),
                     "observed_days": days, "daily_outflow_kg": round(daily, 2),
                     "days_cover": round(g["stock_kg"] / daily, 1) if daily > 0 and g["stock_kg"] > 0.001 else
                     (0.0 if lv == "rupture" else None), "level": lv, "_daily": daily})
    return sorted(rows, key=lambda r: (SEVERITY[r["level"]], r["days_cover"] if r["days_cover"] is not None else 0,
                                       r["product"]))


def summary(rows):
    return {k: sum(1 for r in rows if r["level"] == k) for k in SEVERITY}


def mine(user):
    rows = groups(lots_for(user))
    for r in rows:
        r.pop("holder"), r.pop("_daily")
    return rows


def aggregate(user):
    """Par département et filière, sans identité : stock, sortie par jour, couverture et détenteurs en alerte."""
    rows = groups(lots_for(user))
    cells = defaultdict(lambda: {"holders": set(), "at_risk": set(), "groups": 0, "stock_kg": 0.0, "outflow_kg": 0.0,
                                 "daily": 0.0})
    for r in rows:
        c = cells[(r["department"], r["value_chain"])]
        c["holders"].add(r["holder"])
        c["groups"] += 1
        c["stock_kg"] += r["stock_kg"]
        c["outflow_kg"] += r["outflow_kg"]
        c["daily"] += r["_daily"]
        if r["level"] in ("rupture", "critique"):
            c["at_risk"].add(r["holder"])
    out = []
    for (dep, chain), c in cells.items():
        lv = level(c["stock_kg"], c["daily"])
        out.append({"department": dep, "value_chain": chain, "holders": len(c["holders"]), "groups": c["groups"],
                    "at_risk_holders": len(c["at_risk"]), "stock_kg": round(c["stock_kg"], 1),
                    "outflow_kg": round(c["outflow_kg"], 1), "daily_outflow_kg": round(c["daily"], 2),
                    "days_cover": round(c["stock_kg"] / c["daily"], 1) if c["daily"] > 0 and c["stock_kg"] > 0.001
                    else (0.0 if lv == "rupture" else None), "level": lv})
    return sorted(out, key=lambda r: (SEVERITY[r["level"]], -r["at_risk_holders"], r["department"], r["value_chain"]))


def _message(r):
    where = f" ({r['site_name']})" if r["site_name"] else ""
    if r["level"] == "rupture":
        return (f"Agri-Digit : plus de stock de « {r['product']} »{where}, alors que {r['outflow_kg']:g} kg en sont "
                f"sortis ces {r['observed_days']} derniers jours.")
    days = f"{r['days_cover']:g}".replace(".", ",")
    return (f"Agri-Digit : stock de « {r['product']} »{where} critique, environ {days} jours de couverture "
            f"({r['stock_kg']:g} kg) au rythme des {r['observed_days']} derniers jours.")


def alert_holders(now=None):
    """Prévient les détenteurs en rupture ou en niveau critique, un message par produit et par semaine au plus (le
    site le plus mal loti est cité). Renvoie le nombre de messages envoyés."""
    from .recovery import _tell

    now = now or timezone.now()
    worst = {}
    for r in groups(Lot.objects.all()):
        if r["level"] in ("rupture", "critique"):
            k = (r["holder"], r["product"])
            if k not in worst or SEVERITY[r["level"]] < SEVERITY[worst[k]["level"]]:
                worst[k] = r
    n = 0
    for (holder_id, product), r in worst.items():
        if StockAlertSent.objects.filter(holder_id=holder_id, product=product,
                                         sent_at__gte=now - timedelta(days=ALERT_EVERY_DAYS)).exists():
            continue
        holder = User.objects.filter(pk=holder_id, is_active=True).first()
        if holder is None:
            continue
        _tell(holder, "Stock critique" if r["level"] == "critique" else "Rupture de stock", _message(r))
        StockAlertSent.objects.create(holder=holder, product=product, level=r["level"], sent_at=now)
        record(None, "stock.alert", holder, product=product, level=r["level"])
        n += 1
    return n
