"""Qualité mesurée des modèles, sur les données de la plateforme (TDR § 3.4 : cadre de réentraînement).

Chaque mesure dit sur combien de cas elle repose (`n`). Sous MIN_N elle n'a pas de valeur (« non disponible », jamais
0) ; sous RELIABLE_N elle est indicative (`reliable: false`). Cadre complet : docs/REENTRAINEMENT.md.
Agrégation faite en Python : à passer en SQL si les récoltes dépassent quelques dizaines de milliers.
"""
from collections import defaultdict
from datetime import date
from statistics import fmean

from django.conf import settings
from django.db.models import Count, F
from django.db.models.functions import TruncMonth

from apps.credit.services import compute
from apps.diagnosis.models import Diagnosis
from apps.production.models import Claim, Harvest, ReferenceYield
from integrations.diagnosis import SimulatedDiagnosis, get_backend

MIN_N = 5
RELIABLE_N = 30
CREDIT_MIN_DUE = 30  # échéances échues nécessaires avant de parler de la qualité du score
BANDS = [(0, 40, "moins de 40"), (40, 60, "40 à 59"), (60, 80, "60 à 79"), (80, 101, "80 et plus")]

# Modèles qu'aucune donnée de la plateforme ne permet de mesurer aujourd'hui : dit tel quel, jamais un chiffre inventé.
NOT_MEASURED = [
    {"id": "risque_climatique", "reason": "Modèle à règles sur la météo. Aucun sinistre ni dégât climatique observé "
                                          "n'est enregistré : rien à comparer aux alertes."},
    {"id": "sols", "reason": "Lecture par seuils généraux non validés. Aucune référence de l'INRAB n'est chargée : "
                             "la lecture ne peut pas être comparée à un avis d'expert."},
    {"id": "selection", "reason": "Grille appliquée aux fermes du POC. Aucune issue (récolte, remboursement) n'est "
                                  "rattachée aux bénéficiaires sélectionnés."},
]


def _share(part, n):
    """Part en % de `part` sur `n` cas, sans valeur sous MIN_N."""
    return {"value": round(100 * part / n, 1) if n >= MIN_N else None, "n": n, "reliable": n >= RELIABLE_N}


def _by_month(qs):
    rows = qs.annotate(m=TruncMonth("created_at")).values("m").annotate(n=Count("id"))
    return {r["m"]: r["n"] for r in rows}


def diagnosis_quality():
    """Part des diagnostics renvoyée à l'agronome, part confirmée par lui, tendance mensuelle. Les diagnostics relus
    sont ceux que le modèle jugeait douteux ou que le producteur a contestés : leur taux de confirmation sous-estime
    la justesse sur les cas où le modèle est sûr."""
    d = Diagnosis.objects
    total = d.count()
    sent = d.filter(status__in=("transmis_agronome", "revu"))
    n_sent = sent.count()
    low = sent.filter(confidence__lt=settings.DIAGNOSIS_THRESHOLD).count()
    # avant l'ajout du champ, la réponse du modèle est perdue pour les diagnostics relus
    reviewed = d.filter(status="revu").exclude(predicted_pathology="")
    confirmed = reviewed.filter(pathology=F("predicted_pathology"))
    n_rev, n_conf = reviewed.count(), confirmed.count()
    t_all, t_sent, t_rev, t_conf = (_by_month(q) for q in (d.all(), sent, reviewed, confirmed))
    trend = [{"month": m.strftime("%Y-%m"), "total": t_all[m], "escalated": t_sent.get(m, 0),
              "reviewed": t_rev.get(m, 0), "confirmed": t_conf.get(m, 0),
              "confirmed_share": _share(t_conf.get(m, 0), t_rev.get(m, 0))["value"]} for m in sorted(t_all)]
    return {"id": "diagnostic", "simulated": isinstance(get_backend(), SimulatedDiagnosis), "total": total,
            "threshold": settings.DIAGNOSIS_THRESHOLD, "escalated_share": _share(n_sent, total),
            "escalated_low_confidence": low, "escalated_by_producer": n_sent - low,
            "reviewed": n_rev, "confirmed_share": _share(n_conf, n_rev), "corrected": n_rev - n_conf, "trend": trend}


def _errors(rows):
    """Écart de l'estimation à la quantité récoltée : absolu (kg), relatif (%) et biais (estimation − récolte)."""
    n = len(rows)
    if n < MIN_N:
        return {"n": n, "mae_kg": None, "mape_pct": None, "bias_pct": None, "reliable": False}
    return {"n": n, "reliable": n >= RELIABLE_N, "mae_kg": round(fmean(abs(e - q) for q, e, *_ in rows), 1),
            "mape_pct": round(100 * fmean(abs(e - q) / q for q, e, *_ in rows), 1),
            "bias_pct": round(100 * fmean((e - q) / q for q, e, *_ in rows), 1)}


def yield_quality():
    """Estimation de rendement (`Harvest.estimated_kg`, fixée à la déclaration) contre la quantité récoltée déclarée,
    corrigée par l'agent quand il l'a vérifiée. La « vérité » reste déclarative : ce n'est pas une pesée."""
    rows = list(Harvest.objects.filter(estimated_kg__gt=0, quantity_kg__gt=0).values_list(
        "quantity_kg", "estimated_kg", "declared_kg", "check_status", "campaign__value_chain"))
    by = defaultdict(list)
    for r in rows:
        by[r[4]].append(r)
    fixed = [(q, d) for q, _, d, *_ in rows if d]  # déclaration corrigée : d = quantité d'origine, q = corrigée
    return {"id": "rendement", "simulated": False, "overall": _errors(rows),
            # les récoltes vérifiées sont surtout celles que l'écart à l'estimation avait signalées : biais de sélection
            "verified": _errors([r for r in rows if r[3] in ("confirmee", "corrigee")]),
            "by_value_chain": [{"value_chain": vc, **_errors(sub)} for vc, sub in sorted(by.items())],
            "declaration_gap": {"n": len(fixed), "mean_pct": round(100 * fmean(abs(d - q) / q for q, d in fixed), 1)
                                if len(fixed) >= MIN_N else None},
            "demo_reference": ReferenceYield.objects.filter(source="demonstration").exists()}


def credit_quality(today=None):
    """Taux d'échéances échues payées par tranche de score (score sans le facteur de remboursement, pour que l'issue
    ne soit pas une donnée d'entrée). Producteurs avec un consentement crédit actif seulement ; score recalculé
    aujourd'hui, pas celui vu au moment du prêt."""
    today = today or date.today()
    claims = Claim.objects.filter(
        kind__in=("appui", "pret"), debtor__producer__consents__type="credit",
        debtor__producer__consents__withdrawn_at__isnull=True,
    ).select_related("debtor__producer").prefetch_related("installments").distinct()
    per = {}  # producteur -> [échéances échues, payées, producteur]
    for c in claims:
        p = getattr(c.debtor, "producer", None)
        for i in c.installments.all():
            if p is not None and i.due_on < today:
                row = per.setdefault(p.id, [0, 0, p])
                row[0] += 1
                row[1] += i.paid_xof >= i.amount_xof
    due, paid = sum(r[0] for r in per.values()), sum(r[1] for r in per.values())
    out = {"id": "credit", "simulated": False, "debtors": len(per), "due": due, "min_due": CREDIT_MIN_DUE,
           "measurable": due >= CREDIT_MIN_DUE, "reason": None, "paid_share": None, "bands": []}
    if not out["measurable"]:
        out["reason"] = ("aucune issue de crédit : aucune échéance échue" if due == 0 else
                         f"{due} échéance(s) échue(s) seulement ; il en faut au moins {CREDIT_MIN_DUE}")
        return out
    out["paid_share"] = _share(paid, due)["value"]
    scores = {pid: compute(r[2], ignore_repayment=True)["score"] for pid, r in per.items()}
    for lo, hi, label in BANDS:
        rows = [per[pid] for pid, s in scores.items() if lo <= s < hi]
        d = sum(r[0] for r in rows)
        out["bands"].append({"label": label, "debtors": len(rows), "due": d,
                             "paid_share": _share(sum(r[1] for r in rows), d)["value"] if len(rows) >= MIN_N else None})
    return out


def quality():
    return {"min_n": MIN_N, "reliable_n": RELIABLE_N,
            "models": [diagnosis_quality(), yield_quality(), credit_quality()], "not_measured": NOT_MEASURED}
