"""Carte des acteurs : un registre de couches GeoJSON (TDR § 3.1, suivi-évaluation : cartographie des acteurs).

Une couche = une fonction `build(user, department, value_chain)` qui renvoie des entités GeoJSON. Une autre application
ajoute la sienne avec `register(...)` (par exemple depuis `ready()`), sans toucher à la vue.

Règles : jamais le téléphone ni le nom d'une personne ; une organisation ou une coopérative n'a pas de position propre,
elle est placée au centre de son département (une entité par département, `precision: "departement"`) ; les parcelles
(codes producteur, sans nom) ne sont offertes qu'au personnel qui les voit déjà.
"""
from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Callable

from shapely.geometry import shape

from apps.cooperatives.models import Cooperative, Organisation
from apps.core.permissions import ADMIN, AGENT, PRODUCTEUR
from apps.lands.services import schemes_for
from apps.parcels.api import parcels_for
from apps.parcels.models import Campaign
from apps.production.models import Site
from apps.referentiel.models import Department

MAX_PARCELS = 2000  # au-delà, la couche est tronquée et le dit (`truncated`)
MAX_NAMES = 20  # noms listés dans un regroupement par département


@dataclass(frozen=True)
class Layer:
    id: str
    label: str
    build: Callable
    chain_filter: bool = False  # la couche tient compte du filtre filière (sinon le filtre est sans effet sur elle)
    allowed: Callable | None = None  # `allowed(user)` ; absent : tout utilisateur connecté


LAYERS: dict[str, Layer] = {}


def register(layer_id, label, build, *, chain_filter=False, allowed=None):
    """Ajoute (ou remplace) une couche. `build(user, department, value_chain)` -> liste d'entités, ou
    `(entités, infos)` avec `infos` = {"truncated": bool, "not_placed": int}."""
    LAYERS[layer_id] = Layer(layer_id, label, build, chain_filter, allowed)


def feature(layer_id, lon, lat, **props):
    return {"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(lon, 5), round(lat, 5)]},
            "properties": {"layer": layer_id, **props}}


def _sites(user, dep, vc):
    qs = Site.objects.all()
    if dep:
        qs = qs.filter(department=dep)
    return [feature("sites", s.lon, s.lat, id=str(s.id), kind=s.kind, name=s.name, department=s.department,
                    commune=s.commune, capacity_t=s.capacity_t) for s in qs.order_by("name")]


def _schemes(user, dep, vc):
    qs = schemes_for(user).filter(lat__isnull=False, lon__isnull=False)
    if dep:
        qs = qs.filter(department=dep)
    return [feature("schemes", s.lon, s.lat, id=str(s.id), kind=s.kind, name=s.name, status=s.status,
                    department=s.department, commune=s.commune, area_available_ha=s.area_available_ha) for s in qs]


def clusters(layer_id, items):
    """Un point par département (au centre du département) pour des entités qui n'ont pas de position propre.
    `items` : (département, nom, étiquette). Un département vide (organisation nationale) n'a pas de point."""
    by = defaultdict(list)
    for dep, name, tag in items:
        by[dep].append((name, tag))
    centres = {d.code: d for d in Department.objects.filter(code__in=[k for k in by if k])}
    feats = [feature(layer_id, centres[dep].lon, centres[dep].lat, department=dep, precision="departement",
                     count=len(rows), names=sorted(n for n, _ in rows)[:MAX_NAMES],
                     by_tag=dict(Counter(t for _, t in rows)))
             for dep, rows in sorted(by.items()) if dep in centres]
    return feats, {"not_placed": sum(len(r) for k, r in by.items() if k not in centres)}


def _with_chain(qs, vc):
    return [o for o in qs if not vc or vc in (o.value_chains or [])]  # liste JSON : filtrée ici (SQLite)


def _organisations(user, dep, vc):
    qs = Organisation.objects.filter(**({"department": dep} if dep else {}))
    return clusters("organisations", [(o.department, o.name, o.kind) for o in _with_chain(qs, vc)])


def _cooperatives(user, dep, vc):
    qs = Cooperative.objects.filter(**({"department": dep} if dep else {}))
    return clusters("cooperatives", [(c.department, c.name, "cooperative") for c in _with_chain(qs, vc)])


def _parcels(user, dep, vc):
    qs = parcels_for(user).select_related("producer")
    if dep:
        qs = qs.filter(department=dep)
    if vc:
        qs = qs.filter(campaigns__value_chain=vc).distinct()
    rows = list(qs.order_by("id")[:MAX_PARCELS + 1])
    chains = defaultdict(set)
    for pid, v in Campaign.objects.filter(parcel__in=[p.id for p in rows[:MAX_PARCELS]]).values_list("parcel_id",
                                                                                                    "value_chain"):
        chains[pid].add(v)
    feats = []
    for p in rows[:MAX_PARCELS]:
        try:
            c = shape(p.geometry).centroid
        except Exception:  # tracé illisible : la parcelle est ignorée, pas la carte
            continue
        if not c.is_empty:
            feats.append(feature("parcels", c.x, c.y, producer=p.producer.code, department=p.department,
                                 area_ha=round(p.area_ha, 2), value_chains=sorted(chains[p.id])))
    return feats, {"truncated": len(rows) > MAX_PARCELS}


register("sites", "Sites : magasins, unités de transformation, points de vente, centres semenciers", _sites)
register("schemes", "Aménagements", _schemes)
register("organisations", "Organisations de filière (par département)", _organisations, chain_filter=True)
register("cooperatives", "Coopératives (par département)", _cooperatives, chain_filter=True)
register("parcels", "Parcelles (code producteur, personnel)", _parcels, chain_filter=True,
         allowed=lambda u: u.role in (AGENT, ADMIN))


def actors(user, department=None, value_chain=None, wanted=None):
    """Collection GeoJSON des couches offertes à `user` (ou seulement `wanted`). Le producteur et l'agent restent
    dans leur département, comme pour les aménagements."""
    if user.role in (AGENT, PRODUCTEUR) and user.department:
        department = user.department
    feats, layers = [], []
    for layer in LAYERS.values():
        if layer.allowed and not layer.allowed(user):
            continue
        meta = {"id": layer.id, "label": layer.label, "chain_filter": layer.chain_filter, "count": None}
        if wanted is None or layer.id in wanted:
            out = layer.build(user, department, value_chain)
            got, info = out if isinstance(out, tuple) else (out, {})
            feats += got
            meta.update(count=sum(f["properties"].get("count", 1) for f in got), **info)
        layers.append(meta)
    return {"type": "FeatureCollection", "features": feats, "layers": layers,
            "filters": {"department": department, "value_chain": value_chain}}
