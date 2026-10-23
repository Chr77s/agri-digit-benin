"""Aménagements et travaux, analyses de sol, utilisation des terres (TDR § 3.1 : aménagements, sols et terres)."""
from django.db import transaction
from django.db.models import Count, Sum
from django.utils import timezone

from apps.audit.services import record
from apps.core.errors import ApiError
from apps.core.permissions import AGENT, PRODUCTEUR, in_scope
from apps.parcels.models import Campaign, Parcel

from .models import Scheme, SoilAnalysis, Works


def _bad(field, msg):
    return ApiError(msg, "validation_error", 400, fields={field: [msg]})


def schemes_for(user):
    """Les aménagements sont publics dans le département ; l'agent et le producteur ne voient que le leur."""
    qs = Scheme.objects.prefetch_related("works").order_by("name")
    return qs.filter(department=user.department) if user.role in (AGENT, PRODUCTEUR) and user.department else qs


def _check_areas(available, arable, used):
    if not 0 <= used <= arable <= available:
        raise _bad("area_used_ha", "Il faut : exploitée ≤ exploitable ≤ disponible.")


@transaction.atomic
def create_scheme(actor, d):
    if not in_scope(actor, d["department"], d.get("commune")):
        raise ApiError("Cet aménagement est hors de votre secteur.", "forbidden", 403)
    _check_areas(d["area_available_ha"], d["area_arable_ha"], d.get("area_used_ha", 0))
    s = Scheme.objects.create(created_by=actor, **d)
    record(actor, "scheme.create", s, kind=s.kind, area_available_ha=s.area_available_ha)
    return s


@transaction.atomic
def update_scheme(actor, s, d):
    if not in_scope(actor, s.department, s.commune):
        raise ApiError("Cet aménagement est hors de votre secteur.", "forbidden", 403)
    if "status" in d and s.status == "en_travaux":
        raise ApiError("Des travaux sont en cours : leur état décide de celui de l'aménagement.", "works_running", 409)
    for k, v in d.items():
        setattr(s, k, v)
    _check_areas(s.area_available_ha, s.area_arable_ha, s.area_used_ha)
    s.save()
    record(actor, "scheme.update", s, fields=sorted(d))
    return s


@transaction.atomic
def create_works(actor, s, d):
    if not in_scope(actor, s.department, s.commune):
        raise ApiError("Cet aménagement est hors de votre secteur.", "forbidden", 403)
    if d["type"] == "nouvel_amenagement" and s.status != "projet":
        raise _bad("type", "Un nouvel aménagement se fait sur un aménagement au stade de projet.")
    w = Works.objects.create(scheme=s, created_by=actor, **d)
    if w.type == "rehabilitation" and s.status == "operationnel":
        s.status = "a_rehabiliter"
        s.save(update_fields=["status"])
    record(actor, "works.create", w, scheme=str(s.id), type=w.type)
    return w


# état visé -> états de départ permis ; termine et abandonne sont définitifs
WORKS_MOVES = {"en_cours": ("planifie",), "termine": ("en_cours",), "abandonne": ("planifie", "en_cours")}


@transaction.atomic
def update_works(actor, w, d):
    s = w.scheme
    if not in_scope(actor, s.department, s.commune):
        raise ApiError("Cet aménagement est hors de votre secteur.", "forbidden", 403)
    today = timezone.localdate()
    status = d.pop("status", None)
    if status and status != w.status:
        if w.status not in WORKS_MOVES.get(status, ()):
            raise ApiError("Ce changement d'état n'est pas possible.", "invalid_status", 400)
        w.status = status
        if status == "en_cours":
            w.started_on = w.started_on or today
        elif status == "termine":
            w.finished_on, w.progress_pct = w.finished_on or today, 100
        if w.type != "entretien":  # l'entretien d'un périmètre n'arrête pas sa mise en valeur
            s.status = {"en_cours": "en_travaux", "termine": "operationnel",
                        "abandonne": "a_rehabiliter" if w.type == "rehabilitation" else "projet"}[status]
            s.save(update_fields=["status"])
    elif w.status in ("termine", "abandonne") and d:
        raise ApiError("Ces travaux sont clos.", "invalid_status", 400)
    for k, v in d.items():
        setattr(w, k, v)
    w.save()
    record(actor, "works.update", w, status=w.status, progress_pct=w.progress_pct)
    return w


# Repères généraux d'interprétation (pH eau, matière organique, phosphore Bray 1), à valider par l'INRAB. Aucun dosage :
# la recommandation chiffrée revient à l'agent ou à l'INRAB.
SOIL_REFERENCE = "Repères généraux, à valider par l'INRAB ; aucune dose n'est donnée ici."


def interpret(a):
    out = []

    def add(code, level, text):
        out.append({"code": code, "level": level, "text": text})

    if a.ph < 5.0:
        add("ph", "alerte", "Sol très acide : de nombreuses cultures y poussent mal. Demandez à l'agent ATDA si un "
                            "amendement convient.")
    elif a.ph < 5.5:
        add("ph", "attention", "Sol acide : surveillez la culture et demandez conseil à l'agent ATDA.")
    elif a.ph > 7.8:
        add("ph", "alerte", "Sol très alcalin : certains éléments y sont mal absorbés. Demandez conseil à l'agent "
                            "ATDA.")
    elif a.ph > 7.0:
        add("ph", "attention", "Sol légèrement alcalin : adapté à peu de cultures, demandez conseil.")
    else:
        add("ph", "ok", "Acidité favorable à la plupart des cultures.")
    if a.organic_matter_pct < 1.0:
        add("organic_matter", "alerte", "Matière organique très faible : le sol retient mal l'eau et les éléments. "
                                        "Les apports de matière organique et les rotations aident.")
    elif a.organic_matter_pct < 2.0:
        add("organic_matter", "attention", "Matière organique faible : pensez aux résidus de culture et à la rotation.")
    else:
        add("organic_matter", "ok", "Matière organique suffisante.")
    if a.phosphorus_ppm is not None:
        if a.phosphorus_ppm < 8:
            add("phosphorus", "alerte", "Phosphore assimilable faible : demandez à l'agent ATDA quel apport convient.")
        elif a.phosphorus_ppm < 15:
            add("phosphorus", "attention", "Phosphore assimilable moyen : à surveiller selon la culture.")
        else:
            add("phosphorus", "ok", "Phosphore assimilable suffisant.")
    if a.texture == "sableux":
        add("texture", "attention", "Sol sableux : l'eau et les éléments passent vite, les apports sont à fractionner.")
    elif a.texture == "argileux":
        add("texture", "attention", "Sol argileux : risque d'engorgement en saison des pluies, travailler sur butte ou "
                                    "billon.")
    return out


@transaction.atomic
def create_soil(actor, parcel, d):
    if d["sampled_on"] > timezone.localdate():
        raise _bad("sampled_on", "La date de prélèvement ne peut pas être dans le futur.")
    a = SoilAnalysis.objects.create(parcel=parcel, recorded_by=actor, **d)
    record(actor, "soil.create", a, parcel=str(parcel.id), ph=a.ph)
    return a


def soil_summary(user):
    """Par département : nombre d'analyses et part des sols acides, pauvres en matière organique et en phosphore."""
    qs = SoilAnalysis.objects.all()
    if user.role == AGENT and user.department:
        qs = qs.filter(parcel__department=user.department)
    out = []
    for dep in sorted(set(qs.values_list("parcel__department", flat=True))):
        rows = list(qs.filter(parcel__department=dep))
        n = len(rows)
        with_p = [r for r in rows if r.phosphorus_ppm is not None]
        out.append({"department": dep, "analyses": n, "ph_mean": round(sum(r.ph for r in rows) / n, 2),
                    "acid_share": round(sum(r.ph < 5.5 for r in rows) / n, 3),
                    "low_organic_share": round(sum(r.organic_matter_pct < 2.0 for r in rows) / n, 3),
                    "low_phosphorus_share": round(sum(r.phosphorus_ppm < 15 for r in with_p) / len(with_p), 3)
                    if with_p else None})
    return out


def land_use(user, season=None):
    """Superficies disponibles (mesurées), exploitables (déclarées) et exploitées (portant une campagne de la saison),
    par département et type de terrain, puis par type d'aménagement."""
    parcels = Parcel.objects.all()
    if user.role == AGENT and user.department:
        parcels = parcels.filter(department=user.department)
    camps = Campaign.objects.filter(parcel__in=parcels)
    seasons = sorted(set(camps.values_list("season", flat=True)))
    season = season or (seasons[-1] if seasons else None)
    used_ids = set(camps.filter(season=season).values_list("parcel_id", flat=True)) if season else set()
    rows = {}
    for p in parcels.values("id", "department", "land_type", "area_ha", "arable_ha"):
        arable = p["area_ha"] if p["arable_ha"] is None else p["arable_ha"]
        r = rows.setdefault((p["department"], p["land_type"]), {
            "department": p["department"], "land_type": p["land_type"], "count": 0, "available_ha": 0.0,
            "arable_ha": 0.0, "used_ha": 0.0})
        r["count"] += 1
        r["available_ha"] += p["area_ha"]
        r["arable_ha"] += arable
        r["used_ha"] += arable if p["id"] in used_ids else 0
    for r in rows.values():
        for k in ("available_ha", "arable_ha", "used_ha"):
            r[k] = round(r[k], 2)
    sch = Scheme.objects.all()
    if user.role == AGENT and user.department:
        sch = sch.filter(department=user.department)
    schemes = [{"kind": x["kind"], "count": x["n"], "available_ha": round(x["a"], 2), "arable_ha": round(x["b"], 2),
                "used_ha": round(x["c"], 2)}
               for x in sch.values("kind").annotate(n=Count("id"), a=Sum("area_available_ha"),
                                                    b=Sum("area_arable_ha"), c=Sum("area_used_ha")).order_by("kind")]
    return {"season": season, "seasons": seasons, "parcels": sorted(rows.values(), key=lambda r: (r["department"],
                                                                                                    r["land_type"])),
            "schemes": schemes}

