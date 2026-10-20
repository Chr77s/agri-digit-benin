"""Prestations aux exploitations (TDR § 3.1) : matériel des producteurs, mécanisation, semences certifiées, PMEA."""
import re
import secrets

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.audit.services import record
from apps.core.errors import ApiError
from apps.core.permissions import ADMIN, AGENT, in_scope
from apps.production.models import Expense
from apps.production.services import create_support
from integrations.notifications import get_channel

from .models import Equipment, MechRequest, Pmea, SeedDistribution, SeedLot


def _bad(field, msg):
    return ApiError(msg, "validation_error", 400, fields={field: [msg]})


def _tell(user, title, body):
    get_channel("in_app").send(user.phone, body, user=user, title=title)


def place_of(user):
    """Département et commune d'un acteur : sa fiche producteur s'il en a une, sinon son compte."""
    p = getattr(user, "producer", None)
    return (p.department, p.commune) if p else (user.department, user.commune)


def owner_label(user):
    p = getattr(user, "producer", None)
    return p.code if p else (user.full_name or "—")


# ---------- Matériel ----------
@transaction.atomic
def create_equipment(actor, d):
    if d["kind"] not in Equipment.KINDS:
        raise _bad("kind", "Type de matériel inconnu.")
    if d.get("for_hire") and not d.get("hire_rate_xof_per_ha"):
        raise _bad("hire_rate_xof_per_ha", "Indiquez le tarif par hectare pour proposer ce matériel à la location.")
    if d.get("acquired_year") and not 1950 <= d["acquired_year"] <= timezone.localdate().year:
        raise _bad("acquired_year", "Année d'acquisition invalide.")
    dep, commune = place_of(actor)
    if not dep:
        raise ApiError("Votre département est inconnu : demandez à votre agent de compléter votre fiche.",
                       "no_department", 400)
    e = Equipment.objects.create(owner=actor, department=dep, commune=commune, **d)
    record(actor, "equipment.create", e, kind=e.kind, for_hire=e.for_hire)
    return e


@transaction.atomic
def update_equipment(actor, e, d):
    for k, v in d.items():
        setattr(e, k, v)
    if e.for_hire and not e.hire_rate_xof_per_ha:
        raise _bad("hire_rate_xof_per_ha", "Indiquez le tarif par hectare pour proposer ce matériel à la location.")
    e.save()
    record(actor, "equipment.update", e, fields=sorted(d))
    return e


def equipment_summary(user):
    """Par département et type : nombre d'exemplaires et part proposée à la location."""
    qs = Equipment.objects.all()
    if user.role == AGENT and user.department:
        qs = qs.filter(department=user.department)
    rows = {}
    for e in qs:
        r = rows.setdefault((e.department, e.kind), {"department": e.department, "kind": e.kind, "owners": set(),
                                                     "units": 0, "for_hire_units": 0})
        r["owners"].add(e.owner_id)
        r["units"] += e.quantity
        r["for_hire_units"] += e.quantity if e.for_hire else 0
    return [{**r, "owners": len(r["owners"])} for _, r in sorted(rows.items())]


# ---------- Mécanisation ----------
@transaction.atomic
def create_request(actor, equipment, d):
    if not equipment.for_hire:
        raise ApiError("Ce matériel n'est pas proposé à la location.", "not_for_hire", 400)
    if equipment.owner_id == actor.id:
        raise ApiError("Vous ne pouvez pas demander votre propre matériel.", "own_equipment", 400)
    if d["operation"] not in MechRequest.OPERATIONS:
        raise _bad("operation", "Opération inconnue.")
    if d["wished_on"] < timezone.localdate():
        raise _bad("wished_on", "La date souhaitée ne peut pas être passée.")
    if MechRequest.objects.filter(requester=actor, equipment=equipment, status__in=("demandee", "acceptee")).exists():
        raise ApiError("Une demande est déjà en cours pour ce matériel.", "duplicate", 409)
    r = MechRequest.objects.create(requester=actor, equipment=equipment,
                                   estimate_xof=round(d["area_ha"] * equipment.hire_rate_xof_per_ha), **d)
    record(actor, "mech.request", r, equipment=str(equipment.id), area_ha=r.area_ha)
    _tell(equipment.owner, "Demande de prestation", f"Agri-Digit : demande de {r.area_ha:g} ha ({r.operation}) pour "
                                                    f"le {r.wished_on:%d/%m/%Y}.")
    return r


@transaction.atomic
def decide_request(actor, r, accept):
    if r.equipment.owner_id != actor.id:
        raise ApiError("Seul le propriétaire du matériel peut répondre.", "forbidden", 403)
    if r.status != "demandee":
        raise ApiError("Cette demande a déjà reçu une réponse.", "invalid_status", 400)
    r.status, r.decided_at = ("acceptee" if accept else "refusee"), timezone.now()
    r.save(update_fields=["status", "decided_at"])
    record(actor, "mech." + ("accept" if accept else "refuse"), r)
    _tell(r.requester, "Demande de prestation", "Votre demande est acceptée : le numéro du prestataire est visible."
          if accept else "Votre demande de prestation a été refusée.")
    return r


@transaction.atomic
def complete_request(actor, r, area_done_ha):
    if r.equipment.owner_id != actor.id:
        raise ApiError("Seul le propriétaire du matériel peut clore la prestation.", "forbidden", 403)
    if r.status != "acceptee":
        raise ApiError("Seule une demande acceptée peut être réalisée.", "invalid_status", 400)
    if not 0 < area_done_ha <= r.area_ha * 1.5:
        raise _bad("area_done_ha", "Surface réellement travaillée invalide (au plus 1,5 fois la surface demandée).")
    r.area_done_ha = area_done_ha
    r.price_xof = round(area_done_ha * r.equipment.hire_rate_xof_per_ha)
    r.status, r.done_at = "realisee", timezone.now()
    r.save(update_fields=["area_done_ha", "price_xof", "status", "done_at"])
    producer = getattr(r.requester, "producer", None)
    if producer and r.price_xof:  # le coût entre dans le revenu du producteur
        Expense.objects.create(producer=producer, category="mecanisation", amount_xof=r.price_xof,
                               label=f"{r.operation} · {r.area_done_ha:g} ha", spent_on=timezone.localdate())
    record(actor, "mech.complete", r, area_done_ha=area_done_ha, price_xof=r.price_xof)
    _tell(r.requester, "Prestation réalisée", f"Agri-Digit : {area_done_ha:g} ha travaillés, {r.price_xof} FCFA à "
                                              f"régler directement au prestataire.")
    return r


@transaction.atomic
def cancel_request(actor, r):
    if r.requester_id != actor.id:
        raise ApiError("Introuvable.", "not_found", 404)
    if r.status not in ("demandee", "acceptee"):
        raise ApiError("Cette demande ne peut plus être annulée.", "invalid_status", 400)
    r.status = "annulee"
    r.save(update_fields=["status"])
    record(actor, "mech.cancel", r)
    _tell(r.equipment.owner, "Demande annulée", "Agri-Digit : une demande de prestation a été annulée.")
    return r


# ---------- Semences certifiées ----------
@transaction.atomic
def create_seed_lot(actor, d):
    if d["category"] not in SeedLot.CATEGORIES:
        raise _bad("category", "Catégorie de semences inconnue.")
    if d["produced_on"] > timezone.localdate():
        raise _bad("produced_on", "La date de production ne peut pas être dans le futur.")
    if not in_scope(actor, d["department"]):
        raise ApiError("Ce centre est hors de votre secteur.", "forbidden", 403)
    lot = SeedLot.objects.create(code="SEM-" + secrets.token_hex(3).upper(), available_kg=d["quantity_kg"],
                                 created_by=actor, **d)
    record(actor, "seed.lot_create", lot, value_chain=lot.value_chain, category=lot.category, kg=lot.quantity_kg)
    return lot


@transaction.atomic
def distribute_seeds(actor, lot, producer, quantity_kg, value_xof=0, repayable=False):
    """Remet des semences certifiées à un producteur : un appui est créé (à confirmer par le producteur, remboursable
    si besoin) et le stock du lot diminue. Le code du lot reste dans l'appui, pour la traçabilité."""
    lot = SeedLot.objects.select_for_update().get(pk=lot.pk)
    if quantity_kg <= 0 or quantity_kg > lot.available_kg:
        raise _bad("quantity_kg", f"Quantité entre 0 et {lot.available_kg:g} kg (reste du lot).")
    cat = lot.category.replace("_", "-").upper()
    item = f"Semences certifiées {lot.variety} ({cat}) · {lot.code}"
    support = create_support(actor, producer, {"item": item[:150], "quantity": quantity_kg, "unit": "kg",
                                               "value_xof": value_xof, "repayable": repayable})
    lot.available_kg = round(lot.available_kg - quantity_kg, 3)
    lot.save(update_fields=["available_kg"])
    dist = SeedDistribution.objects.create(lot=lot, producer=producer, support=support, quantity_kg=quantity_kg,
                                           created_by=actor)
    record(actor, "seed.distribute", dist, lot=lot.code, producer=producer.code, kg=quantity_kg)
    return dist


# ---------- PMEA ----------
PMEA_WRITERS = (AGENT, ADMIN, "transformateur", "distributeur", "gestionnaire_cooperative")


@transaction.atomic
def create_pmea(actor, d):
    if not set(d["services"]) <= set(Pmea.SERVICES) or not d["services"]:
        raise _bad("services", "Choisissez au moins un service parmi la liste.")
    if not re.match(settings.PHONE_REGEX, d["phone"]):
        raise _bad("phone", "Format attendu : 01XXXXXXXX.")
    staff = actor.role in (AGENT, ADMIN)
    if staff and not in_scope(actor, d["department"], d.get("commune")):
        raise ApiError("Cette entreprise est hors de votre secteur.", "forbidden", 403)
    p = Pmea.objects.create(owner=actor, verified=False, **d)
    record(actor, "pmea.create", p, department=p.department)
    return p


@transaction.atomic
def verify_pmea(actor, p):
    if not in_scope(actor, p.department, p.commune):
        raise ApiError("Cette entreprise est hors de votre secteur.", "forbidden", 403)
    p.verified, p.verified_by = True, actor
    p.save(update_fields=["verified", "verified_by"])
    record(actor, "pmea.verify", p)
    if p.owner_id:
        _tell(p.owner, "Entreprise vérifiée", f"Agri-Digit : « {p.name} » figure maintenant dans l'annuaire.")
    return p


def pmea_visible(user, department=None, service=None):
    """Annuaire : les entreprises vérifiées pour tous ; les non vérifiées seulement pour le personnel et leur auteur."""
    qs = Pmea.objects.order_by("name")
    if user.role not in (AGENT, ADMIN):
        qs = qs.filter(Q(verified=True) | Q(owner=user))
    elif user.role == AGENT and user.department:
        qs = qs.filter(department=user.department)
    if department:
        qs = qs.filter(department=department)
    out = list(qs)
    return [p for p in out if not service or service in p.services]

