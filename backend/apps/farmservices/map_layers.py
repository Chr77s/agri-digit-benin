"""Couches de la carte des acteurs (apps/observatory/actors_map.py) fournies par ce module : PMEA et matériel loué.

Ni l'une ni l'autre n'a de position propre : chaque couche est regroupée au centre du département, sans nom de
personne ni téléphone.
"""
from apps.observatory.actors_map import clusters, register

from .models import Equipment
from .services import pmea_visible


def _pmea(user, dep, vc):
    rows = [p for p in pmea_visible(user, dep) if not vc or vc in (p.value_chains or [])]
    return clusters("pmea", [(p.department, p.name, p.services[0]) for p in rows])


def _equipment(user, dep, vc):
    qs = Equipment.objects.filter(for_hire=True, **({"department": dep} if dep else {}))
    return clusters("equipment", [(e.department, e.kind, e.kind) for e in qs])


register("pmea", "Entreprises agricoles vérifiées (par département)", _pmea, chain_filter=True)
register("equipment", "Matériel proposé à la location (par département)", _equipment)
