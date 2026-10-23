import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.farms.models import FarmPOC
from apps.referentiel.services import load_referentiels

PWD = "AgriDemo-2026!"


@pytest.fixture(autouse=True)
def _setup(db, settings):
    settings.DEMO_MODE = True
    settings.WEATHER_BACKEND = "demo"  # aucun appel réseau pendant les tests
    settings.REST_FRAMEWORK = {**settings.REST_FRAMEWORK, "DEFAULT_THROTTLE_RATES": {"otp": "1000/min"}}
    cache.clear()
    load_referentiels()


def make_user(phone, role, department="", commune=""):
    return User.objects.create_user(phone=phone, password=PWD, role=role, department=department, commune=commune)


@pytest.fixture
def users():
    return {
        "agent": make_user("0197000002", "agent_atda", "alibori"),
        "agent2": make_user("0197000012", "agent_atda", "alibori"),
        "agent_zou": make_user("0197000022", "agent_atda", "zou"),
        "agronome": make_user("0197000003", "agronome_inrab"),
        "resp": make_user("0197000004", "responsable_programme"),
        "admin": make_user("0197000005", "admin_maep"),
        "auditeur": make_user("0197000006", "auditeur_copil"),
        "financier": make_user("0197000007", "agent_financier"),
        "gest": make_user("0197000008", "gestionnaire_cooperative", "alibori", "banikoara"),
        "transf": make_user("0197000009", "transformateur", "borgou", "parakou"),
        "distrib": make_user("0197000010", "distributeur", "littoral", "cotonou"),
        "repr": make_user("0197000011", "repr_mtdi"),
        "repr2": make_user("0197000021", "repr_mtdi"),
    }


def client_for(user=None):
    c = APIClient()
    if user is not None:
        c.force_authenticate(user)
    return c


REG = {"npi": "1000000002", "first_name": "Awa", "last_name": "SABI", "sex": "F", "birth_date": "1990-07-01",
       "department": "alibori", "commune": "banikoara", "phone": "0197000099", "language": "fr",
       "consent_accepted": True, "consent_text_version": "v1"}


@pytest.fixture
def producer():
    from apps.producers.models import Producer

    r = client_for().post("/api/v1/producers/register", REG, format="json")
    assert r.status_code == 201, r.content
    p = Producer.objects.get(pk=r.json()["id"])
    p.status = "valide"
    p.save()
    return p


@pytest.fixture
def farms():
    FarmPOC.objects.bulk_create([
        FarmPOC(farm_id=f"F{i}", lon=2.4, lat=11.3, department="alibori", commune="banikoara", is_maize=True,
                maize_confidence=0.5 + i / 100, road_distance_m=100 * i, area_ha=1 + i % 5, source="synthetique_demo")
        for i in range(40)])
