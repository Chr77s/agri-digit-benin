"""Analyses prospectives des marchés (TDR § 3.1) : tendance des prix à partir des relevés et offre attendue à partir des
campagnes en cours. Heuristique statistique lisible, sans apprentissage : voir docs/MODEL_CARD.md § 6."""
from collections import defaultdict
from datetime import timedelta
from statistics import mean

from django.db.models import Sum
from django.utils import timezone

from apps.parcels.models import Campaign
from apps.production.models import Harvest, ReferenceYield
from apps.production.services import estimate

from .models import PriceObservation

WINDOW_DAYS = 28  # 4 semaines : fenêtre de la moyenne mobile et de la variation
TREND_PCT = 5  # variation au-delà de laquelle le prix « monte » ou « baisse »
MIN_OBSERVATIONS = 6  # sous ce nombre de relevés (ou 14 jours d'écart), on ne projette rien
MIN_SPAN_DAYS = 14
HORIZON_DAYS = 28
MASK_BELOW = 5  # producteurs : en dessous, l'offre attendue n'est pas montrée hors du personnel


def stats(points, today):
    """Moyenne mobile, variation, tendance, fiabilité et projection d'une série de (date, prix) sur 8 semaines."""
    pts = sorted((d, p) for d, p in points if today - timedelta(days=2 * WINDOW_DAYS) < d <= today)
    cur = [p for d, p in pts if d > today - timedelta(days=WINDOW_DAYS)]
    prev = [p for d, p in pts if d <= today - timedelta(days=WINDOW_DAYS)]
    n, span = len(pts), (pts[-1][0] - pts[0][0]).days if pts else 0
    variation = round((mean(cur) - mean(prev)) / mean(prev) * 100, 1) if cur and prev else None
    trend = None if variation is None else "hausse" if variation > TREND_PCT else "baisse" \
        if variation < -TREND_PCT else "stable"
    enough = n >= MIN_OBSERVATIONS and span >= MIN_SPAN_DAYS
    reliability = "insuffisante" if not enough else "faible" if n < 10 else "moyenne" if n < 20 else "bonne"
    out = {"observations": n, "span_days": span, "moving_avg_xof": round(mean(cur)) if cur else None,
           "variation_pct": variation, "trend": trend, "reliability": reliability, "projection": None}
    if enough:
        # droite des moindres carrés sur les relevés, lue à 4 semaines ; marge = 2 écarts-types des résidus
        xs = [(d - today).days for d, _ in pts]
        xm, ym = mean(xs), mean(p for _, p in pts)
        var = sum((x - xm) ** 2 for x in xs)
        slope = sum((x - xm) * (p - ym) for x, (_, p) in zip(xs, pts, strict=True)) / var
        at = ym + slope * (HORIZON_DAYS - xm)
        resid = [p - (ym + slope * (x - xm)) for x, (_, p) in zip(xs, pts, strict=True)]
        margin = 2 * (sum(r * r for r in resid) / max(1, n - 2)) ** 0.5
        out["projection"] = {"horizon_days": HORIZON_DAYS, "price_xof": max(0, round(at)),
                             "low_xof": max(0, round(at - margin)), "high_xof": max(0, round(at + margin))}
    return out


def interpret(label, st):
    """Lecture en français, prudente : une indication, jamais une prévision garantie."""
    if st["reliability"] == "insuffisante":
        return (f"{label} : {st['observations']} relevé(s) sur {st['span_days']} jour(s), c'est trop peu pour dégager "
                f"une tendance ou projeter les prix (il faut au moins {MIN_OBSERVATIONS} relevés répartis sur "
                f"{MIN_SPAN_DAYS} jours).")
    v = st["variation_pct"]
    num = f"{abs(v):g}".replace(".", ",") if v is not None else ""  # virgule décimale française
    move = "Pas de relevé les 4 semaines précédentes : variation non calculable." if v is None else \
        {"hausse": f"Hausse de {num} % sur 4 semaines.", "baisse": f"Baisse de {num} % sur 4 semaines.",
         "stable": f"Prix stable ({'+' if v >= 0 else '−'}{num} % sur 4 semaines)."}[st["trend"]]
    return (f"{label} : prix moyen des 4 dernières semaines {st['moving_avg_xof']} FCFA/kg. {move} Indicatif, "
            f"fiabilité {st['reliability']} ({st['observations']} relevés) : ne garantit pas l'évolution à venir.")


def price_trends(chain, department=None, today=None):
    """Par marché, forme et produit, puis tous marchés confondus (`market` vide)."""
    today = today or timezone.localdate()
    qs = PriceObservation.objects.filter(value_chain=chain, observed_on__lte=today,
                                         observed_on__gt=today - timedelta(days=2 * WINDOW_DAYS))
    if department:
        qs = qs.filter(department=department)
    series, pooled = defaultdict(list), defaultdict(list)
    names, products = {}, {}
    for o in qs:
        mk = " ".join(o.market.split()).casefold()
        series[(mk, o.form, o.product.casefold())].append((o.observed_on, o.price_xof_per_kg))
        pooled[(o.form, o.product.casefold())].append((o.observed_on, o.price_xof_per_kg))
        names[(mk, o.form, o.product.casefold())] = (o.market, o.department, o.product)
        products[(o.form, o.product.casefold())] = o.product
    rows = []
    for (form, prod), pts in sorted(pooled.items()):
        st = stats(pts, today)
        rows.append({"market": None, "department": department or "", "form": form, "product": products[(form, prod)],
                     **st, "text": interpret(f"{products[(form, prod)]}, tous marchés", st)})
    for key, pts in sorted(series.items(), key=lambda kv: names[kv[0]]):
        market, dep, product = names[key]
        st = stats(pts, today)
        rows.append({"market": market, "department": dep, "form": key[1], "product": product, **st,
                     "text": interpret(f"{product}, {market}", st)})
    return rows


def expected_supply(chain, department=None, staff=True):
    """Offre attendue : rendement estimé (rendement de référence × superficie) des campagnes de la saison la plus
    récente de la filière qui n'ont encore aucune récolte déclarée, par département, avec ce qui est déjà récolté et la
    récolte de la saison précédente. Hors du personnel, une cellule de moins de 5 producteurs est masquée."""
    seasons = sorted(Campaign.objects.filter(value_chain=chain).values_list("season", flat=True).distinct())
    if not seasons:
        return []
    season = seasons[-1]
    qs = Campaign.objects.filter(value_chain=chain, season=season).select_related("parcel")
    if department:
        qs = qs.filter(parcel__department=department)
    source = ReferenceYield.objects.filter(value_chain=chain).values_list("source", flat=True).first()
    done = {h["campaign_id"]: h["kg"] for h in
            Harvest.objects.filter(campaign__in=qs).values("campaign_id").annotate(kg=Sum("quantity_kg"))}
    cells = defaultdict(lambda: {"campaigns": 0, "expected_kg": 0.0, "harvested_kg": 0.0, "without_estimate": 0,
                                 "producers": set()})
    for c in qs:
        cell = cells[c.parcel.department]
        cell["producers"].add(c.parcel.producer_id)
        if c.id in done:
            cell["harvested_kg"] += done[c.id]
            continue
        est = estimate(c)
        cell["campaigns"] += 1
        if est is None:
            cell["without_estimate"] += 1
        else:
            cell["expected_kg"] += est
    out = []
    for dep, cell in sorted(cells.items()):
        before = [s for s in seasons if s < season]
        prev_kg = prev_season = None
        for s in reversed(before):  # la saison précédente qui a des récoltes dans ce département
            kg = Harvest.objects.filter(campaign__value_chain=chain, campaign__season=s,
                                        campaign__parcel__department=dep).aggregate(k=Sum("quantity_kg"))["k"]
            if kg:
                prev_kg, prev_season = kg, s
                break
        total = cell["expected_kg"] + cell["harvested_kg"]
        masked = not staff and len(cell["producers"]) < MASK_BELOW
        row = {"value_chain": chain, "department": dep, "season": season, "producers": len(cell["producers"]),
               "campaigns_pending": cell["campaigns"], "without_estimate": cell["without_estimate"],
               "yield_source": source, "previous_season": prev_season, "masked": masked,
               "expected_kg": None, "harvested_kg": None, "season_total_kg": None, "previous_harvest_kg": None,
               "change_pct": None}
        if masked:
            row["producers"] = None  # le nombre exact (< 5) permettrait lui aussi de reconnaître des personnes
        else:
            row.update(expected_kg=round(cell["expected_kg"]), harvested_kg=round(cell["harvested_kg"]),
                       season_total_kg=round(total), previous_harvest_kg=round(prev_kg) if prev_kg else None,
                       change_pct=round((total - prev_kg) / prev_kg * 100, 1) if prev_kg and total else None)
        out.append(row)
    return out
