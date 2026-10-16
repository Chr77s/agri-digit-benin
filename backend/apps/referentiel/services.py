from .data import DEPARTMENTS, RESERVE_VALUE_CHAINS, VALUE_CHAINS, slug
from .models import Commune, Department, ValueChain


def load_referentiels():
    for code, name in VALUE_CHAINS:
        ValueChain.objects.update_or_create(code=code, defaults={"name": name, "reserve": False})
    for code, name in RESERVE_VALUE_CHAINS:
        ValueChain.objects.update_or_create(code=code, defaults={"name": name, "reserve": True})
    for name, (lon, lat), communes in DEPARTMENTS:
        dep, _ = Department.objects.update_or_create(code=slug(name), defaults={"name": name, "lon": lon, "lat": lat})
        for c in communes:
            Commune.objects.update_or_create(code=slug(c), defaults={"name": c, "department": dep})


def commune_in_department(department, commune):
    return Commune.objects.filter(code=commune, department_id=department).exists()
