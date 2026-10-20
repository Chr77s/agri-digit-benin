"""Constructeurs de données pour les tests du suivi-évaluation et de l'observatoire (aucun appel d'API)."""
from datetime import date, datetime, time

from django.utils import timezone

from apps.accounts.models import User
from apps.parcels.models import Campaign, Parcel
from apps.producers.models import Consent, Producer
from apps.production.models import Harvest, Support

GEO = {"type": "Polygon", "coordinates": [[[2.43, 11.3], [2.44, 11.3], [2.44, 11.31], [2.43, 11.3]]]}
_n = iter(range(1, 10_000))


def make_producer(dep="alibori", sex="F", born=date(1990, 1, 1), status="valide", user=False, consent=True):
    i = next(_n)
    u = User.objects.create_user(phone=f"09{i:08d}", password="x", role="producteur", department=dep) if user else None
    p = Producer.objects.create(code=f"T-{i:05d}", npi=f"8{i:09d}", first_name=f"Prenom{i}", last_name=f"Nom{i}",
                                sex=sex, birth_date=born, department=dep, commune="c", phone=f"09{i:08d}",
                                status=status, user=u)
    if consent:
        Consent.objects.create(producer=p, type="donnees_personnelles", text_version="v1")
    return p


def make_harvest(p, kg=1500.0, ha=1.0, chain="mais", season="2026-pluie-1", on=date(2026, 9, 1), dep=None,
                 estimated=None, **extra):
    parcel = Parcel.objects.create(producer=p, name="Champ", department=dep or p.department, geometry=GEO,
                                   land_type="pluvial_plateau", tenure="coutumier", area_ha=ha)
    camp = Campaign.objects.create(parcel=parcel, value_chain=chain, season=season, stage="recolte")
    return Harvest.objects.create(campaign=camp, harvested_at=on, quantity_kg=kg, estimated_kg=estimated, **extra)


def _at(day):
    return timezone.make_aware(datetime.combine(day, time(12, 0)))


def make_support(p, created=date(2026, 6, 1), confirmed=date(2026, 6, 5), program=None):
    """Appui remis le `created` ; confirmé le `confirmed` (None : jamais confirmé)."""
    s = Support.objects.create(producer=p, program=program, item="Semences", quantity=10, unit="kg", value_xof=10000,
                               status="confirme" if confirmed else "remis")
    Support.objects.filter(pk=s.pk).update(created_at=_at(created), confirmed_at=_at(confirmed) if confirmed else None)
    return s
