"""Relevés de prix réels (TDR § 3.1 : prix brut et transformé aux marchés) : saisie contrôlée, derniers prix par
marché, historique d'une filière, écart brut / transformé. Remplace les prix de démonstration dès qu'une filière a des
relevés."""
from collections import defaultdict
from datetime import timedelta
from statistics import mean

from django.db import transaction
from django.utils import timezone

from apps.audit.services import record
from apps.core.errors import ApiError
from apps.core.permissions import ADMIN, AGENT
from apps.referentiel.models import ValueChain

from .models import PriceObservation

PRICE_MAX = 20_000  # FCFA/kg : au-delà, la saisie est une erreur (l'anacarde décortiquée reste sous ce seuil)
FRESH_DAYS = 30  # un relevé plus ancien n'est plus « le prix du moment »
HISTORY_WEEKS = 12
WRITERS = (AGENT, ADMIN, "gestionnaire_cooperative", "transformateur", "distributeur")


def _bad(field, msg):
    return ApiError(msg, "validation_error", 400, fields={field: [msg]})


def _mkey(name):
    return " ".join(name.split()).casefold()


@transaction.atomic
def record_price(actor, d):
    """Un relevé par marché, filière, forme, produit et jour pour un même auteur. L'administration relève partout, les
    autres dans leur département."""
    if actor.role != ADMIN and actor.department != d["department"]:
        raise ApiError("Vous ne relevez que les prix de votre département.", "forbidden", 403)
    if not ValueChain.objects.filter(code=d["value_chain"]).exists():
        raise _bad("value_chain", "Filière inconnue.")
    if d["form"] not in PriceObservation.FORMS:
        raise _bad("form", "Forme inconnue (brut ou transforme).")
    if d["observed_on"] > timezone.localdate():
        raise _bad("observed_on", "La date du relevé ne peut pas être dans le futur.")
    if not 0 < d["price_xof_per_kg"] <= PRICE_MAX:
        raise _bad("price_xof_per_kg", f"Prix entre 1 et {PRICE_MAX} FCFA/kg.")
    market, product = " ".join(d["market"].split()), " ".join(d["product"].split())
    if not market or not product:
        raise _bad("market", "Indiquez le marché et le produit.")
    if PriceObservation.objects.filter(recorded_by=actor, value_chain=d["value_chain"], form=d["form"],
                                       observed_on=d["observed_on"], market__iexact=market,
                                       product__iexact=product).exists():
        raise ApiError("Ce relevé existe déjà pour ce jour.", "duplicate", 409)
    o = PriceObservation.objects.create(
        recorded_by=actor, market=market, product=product, department=d["department"], value_chain=d["value_chain"],
        form=d["form"], price_xof_per_kg=d["price_xof_per_kg"], observed_on=d["observed_on"])
    record(actor, "price.record", o, value_chain=o.value_chain, form=o.form, price_xof_per_kg=o.price_xof_per_kg)
    return o


def latest(chain, department=None, today=None, days=FRESH_DAYS):
    """Dernier relevé de chaque marché, forme et produit sur les `days` derniers jours, avec la variation en % par
    rapport au relevé précédent du même marché (vide s'il n'y en a pas)."""
    today = today or timezone.localdate()
    qs = PriceObservation.objects.filter(value_chain=chain, observed_on__lte=today,
                                         observed_on__gte=today - timedelta(days=days + 90))
    if department:
        qs = qs.filter(department=department)
    seen = defaultdict(list)
    for o in qs.order_by("-observed_on", "-created_at"):
        seen[(_mkey(o.market), o.form, _mkey(o.product))].append(o)
    out = []
    for obs in seen.values():
        cur = obs[0]
        if cur.observed_on < today - timedelta(days=days):
            continue
        prev = next((x for x in obs[1:] if x.observed_on < cur.observed_on), None)
        out.append({"market": cur.market, "department": cur.department, "form": cur.form, "product": cur.product,
                    "price": cur.price_xof_per_kg, "observed_on": cur.observed_on, "simulated": False,
                    "change": round((cur.price_xof_per_kg - prev.price_xof_per_kg) / prev.price_xof_per_kg * 100)
                    if prev else None})
    return sorted(out, key=lambda r: (r["form"], r["department"], r["market"]))


def history(chain, department=None, today=None, weeks=HISTORY_WEEKS):
    """Prix moyen par semaine (lundi de la semaine) et par forme, sur les dernières semaines."""
    today = today or timezone.localdate()
    monday = today - timedelta(days=today.weekday())
    start = monday - timedelta(weeks=weeks - 1)
    qs = PriceObservation.objects.filter(value_chain=chain, observed_on__gte=start, observed_on__lte=today)
    if department:
        qs = qs.filter(department=department)
    weeks_ = defaultdict(list)
    for o in qs:
        weeks_[(o.observed_on - timedelta(days=o.observed_on.weekday()), o.form)].append(o.price_xof_per_kg)
    return [{"week": w, "form": f, "price": round(mean(p)), "n": len(p)} for (w, f), p in sorted(weeks_.items())]


def margins(department=None, today=None):
    """Écart de prix entre le produit transformé et la matière brute, par filière, département et produit transformé :
    moyenne des derniers relevés de chaque marché. Écart de prix au kilo, sans tenir compte du rendement matière."""
    today = today or timezone.localdate()
    qs = PriceObservation.objects.filter(observed_on__lte=today, observed_on__gte=today - timedelta(days=FRESH_DAYS))
    if department:
        qs = qs.filter(department=department)
    last = {}  # (filière, département, forme, produit, marché) -> dernier relevé (le plus récent gagne)
    for o in qs.order_by("observed_on", "created_at"):
        last[(o.value_chain, o.department, o.form, _mkey(o.product), _mkey(o.market))] = o
    groups = defaultdict(list)
    for (chain, dep, form, product, _), o in last.items():
        groups[(chain, dep, form, product)].append(o)
    out = []
    for chain, dep in sorted({(k[0], k[1]) for k in groups}):
        raw = [o for k, v in groups.items() if k[:3] == (chain, dep, "brut") for o in v]
        if not raw:
            continue
        raw_price = round(mean(o.price_xof_per_kg for o in raw))
        for (c, d_, form, _), obs in sorted(groups.items()):
            if (c, d_, form) != (chain, dep, "transforme"):
                continue
            tp = round(mean(o.price_xof_per_kg for o in obs))
            out.append({"value_chain": chain, "department": dep, "product": obs[0].product, "raw_xof": raw_price,
                        "transformed_xof": tp, "gap_xof": tp - raw_price, "gap_pct": round((tp - raw_price) / raw_price
                                                                                         * 100),
                        "raw_markets": len(raw), "transformed_markets": len(obs),
                        "observed_on": max(o.observed_on for o in raw + obs)})
    return out


def overview(chain, department=None, today=None):
    """Prix d'une filière : relevés réels s'il y en a ; sinon valeurs de démonstration étiquetées `simulated`."""
    rows = latest(chain, department, today)
    if not rows and not latest(chain, None, today):  # aucune filière relevée : la démonstration prend le relais
        from integrations.market_data import demo_prices
        demo = [r for r in demo_prices(chain) if not department or r["department"] == department]
        return {"value_chain": chain, "simulated": True, "window_days": FRESH_DAYS, "latest": demo, "history": [],
                "source": "Démonstration : aucun relevé récent pour cette filière."}
    return {"value_chain": chain, "simulated": False, "window_days": FRESH_DAYS, "latest": rows,
            "history": history(chain, department, today),
            "source": "Relevés saisis par les agents ATDA et les acteurs de la filière."}
