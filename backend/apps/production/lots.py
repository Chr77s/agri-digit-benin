"""Traçabilité des flux de matières (TDR § 1 et 3.1) : sites géolocalisés, lots créés depuis une récolte, transférés,
transformés ; chaque lot remonte jusqu'aux producteurs, parcelles et intrants. Chaque étape est journalisée."""
import secrets

from django.db import transaction
from django.db.models import Sum

from apps.accounts.models import User
from apps.audit.services import record
from apps.cooperatives.models import Membership
from apps.cooperatives.selectors import BUREAU
from apps.core.errors import ApiError

from .models import Harvest, Lot, Site, Support

HOLDERS = ("producteur", "gestionnaire_cooperative", "transformateur", "distributeur")
READERS = ("agent_atda", "admin_maep")


def _code():
    return "LOT-" + secrets.token_hex(3).upper()


def _site(actor, site_id):
    if not site_id:
        return None
    s = Site.objects.filter(pk=site_id, owner=actor).first()
    if s is None:
        raise ApiError("Site inconnu ou qui ne vous appartient pas.", "validation_error", 400,
                       fields={"site": ["Inconnu."]})
    return s


@transaction.atomic
def create_site(actor, d):
    if d["kind"] not in Site.KINDS:
        raise ApiError("Type de site inconnu.", "validation_error", 400, fields={"kind": ["Inconnu."]})
    if not (5.5 <= d["lat"] <= 12.5 and 0.5 <= d["lon"] <= 4.0):  # emprise du Bénin, avec marge
        raise ApiError("Coordonnées hors du Bénin.", "validation_error", 400, fields={"lat": ["Hors du Bénin."]})
    s = Site.objects.create(owner=actor, **d)
    record(actor, "site.create", s, kind=s.kind, department=s.department)
    return s


def can_collect(actor, harvest):
    """Le producteur pour sa récolte ; le gestionnaire ou le bureau d'une coopérative dont il est membre actif."""
    producer = harvest.campaign.parcel.producer
    if actor.role == "producteur" and producer.user_id == actor.id:
        return True
    coops = Membership.objects.filter(producer=producer, left_at__isnull=True).values("cooperative_id")
    if actor.role == "gestionnaire_cooperative":
        return coops.filter(cooperative__manager=actor).exists()
    if actor.role == "producteur":
        return Membership.objects.filter(producer__user=actor, left_at__isnull=True, role__in=BUREAU,
                                         cooperative_id__in=coops).exists()
    return False


@transaction.atomic
def collect(actor, harvest, quantity_kg, site_id=None):
    """Met en lot tout ou partie d'une récolte stockée (circuit de collecte)."""
    if not can_collect(actor, harvest):
        raise ApiError("Introuvable.", "not_found", 404)
    already = harvest.lots.aggregate(s=Sum("quantity_kg"))["s"] or 0
    if quantity_kg <= 0 or quantity_kg > harvest.stored_kg - already:
        raise ApiError(f"Quantité possible : {max(0, harvest.stored_kg - already):g} kg (stock déclaré non encore "
                       f"collecté).", "validation_error", 400, fields={"quantity_kg": ["Au-delà du stock."]})
    lot = Lot.objects.create(code=_code(), value_chain=harvest.campaign.value_chain,
                             product=f"{harvest.campaign.value_chain} (récolte)", quantity_kg=quantity_kg, holder=actor,
                             site=_site(actor, site_id), harvest=harvest, created_by=actor)
    record(actor, "lot.collect", lot, harvest=str(harvest.id), quantity_kg=quantity_kg)
    return lot


def _own_lot(actor, lot):
    if lot.holder_id != actor.id or lot.status != "en_stock":
        raise ApiError("Ce lot n'est pas disponible chez vous.", "invalid_status", 400)


@transaction.atomic
def transfer(actor, lot, to_phone, quantity_kg):
    """Remet tout ou partie d'un lot à un autre acteur (vente, livraison) : un lot enfant naît chez lui."""
    _own_lot(actor, lot)
    to = User.objects.filter(phone=to_phone, is_active=True, role__in=HOLDERS).exclude(pk=actor.pk).first()
    if to is None:
        raise ApiError("Destinataire inconnu (producteur, coopérative, transformateur ou distributeur).",
                       "validation_error", 400, fields={"to_phone": ["Inconnu."]})
    if quantity_kg <= 0 or quantity_kg > lot.quantity_kg:
        raise ApiError(f"Quantité possible : {lot.quantity_kg:g} kg.", "validation_error", 400,
                       fields={"quantity_kg": ["Au-delà du lot."]})
    child = Lot.objects.create(code=_code(), value_chain=lot.value_chain, product=lot.product, quantity_kg=quantity_kg,
                               holder=to, site=None, created_by=actor)
    child.parents.add(lot)
    lot.quantity_kg = round(lot.quantity_kg - quantity_kg, 3)
    lot.status = "transfere" if lot.quantity_kg == 0 else "en_stock"
    lot.save(update_fields=["quantity_kg", "status"])
    record(actor, "lot.transfer", child, parent=lot.code, to=to.phone, quantity_kg=quantity_kg)
    return child


@transaction.atomic
def transform(actor, parents, product, quantity_kg, site_id=None):
    """Plusieurs lots bruts deviennent un produit transformé (rendement libre, à déclarer)."""
    if not parents:
        raise ApiError("Choisissez au moins un lot.", "validation_error", 400, fields={"parents": ["Obligatoire."]})
    for p in parents:
        _own_lot(actor, p)
    if not product.strip() or quantity_kg <= 0:
        raise ApiError("Indiquez le produit et la quantité obtenue.", "validation_error", 400)
    lot = Lot.objects.create(code=_code(), value_chain=parents[0].value_chain, product=product.strip()[:120],
                             quantity_kg=quantity_kg, holder=actor, site=_site(actor, site_id), created_by=actor)
    lot.parents.set(parents)
    Lot.objects.filter(pk__in=[p.pk for p in parents]).update(status="transforme")
    record(actor, "lot.transform", lot, parents=[p.code for p in parents], quantity_kg=quantity_kg)
    return lot


def visible(actor, lot):
    """Le détenteur et tous ceux qui l'ont tenu en amont ou en aval ; l'agent du département d'origine ; l'admin."""
    if actor.role == "admin_maep":
        return True
    nodes = chain(lot)
    if any(n.holder_id == actor.id for n in nodes):
        return True
    return actor.role == "agent_atda" and any(
        n.harvest and n.harvest.campaign.parcel.department == actor.department for n in nodes)


def chain(lot):
    """Le lot, ses ancêtres jusqu'aux récoltes, puis ses descendants."""
    seen, todo = {}, [lot]
    while todo:
        n = todo.pop()
        if n.pk in seen:
            continue
        seen[n.pk] = n
        todo += list(n.parents.select_related("holder", "site", "harvest__campaign__parcel__producer"))
    down = [lot]
    while down:
        n = down.pop()
        for c in n.children.select_related("holder", "site"):
            if c.pk not in seen:
                seen[c.pk] = c
                down.append(c)
    return list(seen.values())


def trace(lot):
    nodes = sorted(chain(lot), key=lambda n: n.created_at)
    origins = []
    for n in nodes:
        if n.harvest:
            h, p = n.harvest, n.harvest.campaign.parcel.producer
            inputs = Support.objects.filter(producer=p, created_at__date__lte=h.harvested_at).values(
                "item", "quantity", "unit")  # intrants reçus avant la récolte
            origins.append({"lot": n.code, "producer_code": p.code, "commune": p.commune, "department": p.department,
                            "parcel": n.harvest.campaign.parcel.name, "season": h.campaign.season,
                            "harvested_at": h.harvested_at, "inputs": [
                                f"{i['item']} ({i['quantity'].normalize():f} {i['unit']})" for i in inputs]})
    return {"lot": lot.code, "origins": origins, "steps": [
        {"code": n.code, "product": n.product, "quantity_kg": n.quantity_kg, "status": n.status,
         "holder_role": n.holder.role, "site": n.site.name if n.site else None, "created_at": n.created_at,
         "parents": [p.code for p in n.parents.all()]} for n in nodes]}


def harvests_collectable(actor):
    """Récoltes avec du stock non encore mis en lot que l'acteur peut collecter."""
    if actor.role == "producteur":
        mine = Harvest.objects.filter(campaign__parcel__producer__user=actor)
        coops = Membership.objects.filter(producer__user=actor, left_at__isnull=True, role__in=BUREAU).values(
            "cooperative_id")
    elif actor.role == "gestionnaire_cooperative":
        mine = Harvest.objects.none()
        coops = Membership.objects.filter(cooperative__manager=actor).values("cooperative_id")
    else:
        return Harvest.objects.none()
    members = Membership.objects.filter(cooperative_id__in=coops, left_at__isnull=True).values("producer_id")
    qs = (mine | Harvest.objects.filter(campaign__parcel__producer_id__in=members)).distinct()
    return qs.select_related("campaign__parcel__producer").annotate(collected=Sum("lots__quantity_kg"))
