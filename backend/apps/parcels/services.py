from django.db import transaction
from pyproj import Transformer
from shapely.geometry import shape
from shapely.ops import transform

from apps.audit.services import record
from apps.core.errors import ApiError

from .models import Campaign, Parcel

_to_utm = Transformer.from_crs("EPSG:4326", "EPSG:32631", always_xy=True).transform
OVERLAP_RATIO = 0.20


def to_utm(geojson):
    try:
        if geojson.get("type") != "Polygon":
            raise ValueError
        geom = shape(geojson)
    except Exception:
        raise ApiError("Géométrie invalide : un polygone GeoJSON est attendu.", "invalid_geometry", 400,
                       fields={"geometry": ["Polygone GeoJSON invalide."]})
    if not geom.is_valid or geom.is_empty:
        raise ApiError("Le polygone se recoupe ou est vide.", "invalid_geometry", 400,
                       fields={"geometry": ["Polygone invalide."]})
    return transform(_to_utm, geom)


def area_ha(geojson):
    return round(to_utm(geojson).area / 10_000, 4)


def overlaps(geom_utm, department, exclude=None):
    """Parcelles du même département recouvertes à plus de 20 % (de l'une ou de l'autre)."""
    hits = []
    for pid, g in Parcel.objects.filter(department=department).exclude(pk=exclude).values_list("id", "geometry"):
        other = transform(_to_utm, shape(g))
        if not geom_utm.intersects(other):
            continue
        inter = geom_utm.intersection(other).area
        if inter / min(geom_utm.area, other.area) > OVERLAP_RATIO:
            hits.append(str(pid))
    return hits


@transaction.atomic
def create_parcel(actor, producer, d):
    g = to_utm(d["geometry"])
    hits = overlaps(g, producer.department)
    p = Parcel.objects.create(producer=producer, name=d["name"], geometry=d["geometry"], land_type=d["land_type"],
                              tenure=d["tenure"], area_ha=round(g.area / 10_000, 4), overlap_warning=bool(hits),
                              overlap_with=hits, department=producer.department)
    record(actor, "parcel.create", p, area_ha=p.area_ha, overlap=bool(hits))
    return p


@transaction.atomic
def create_campaign(actor, parcel, d):
    if Campaign.objects.filter(parcel=parcel, season=d["season"]).exists():
        raise ApiError("Une culture principale existe déjà pour cette parcelle et cette saison.", "campaign_exists",
                       400)
    c = Campaign.objects.create(parcel=parcel, **d)
    record(actor, "campaign.create", c, value_chain=c.value_chain, season=c.season)
    return c


@transaction.atomic
def set_stage(actor, campaign, stage, forced=False, base_version=None):
    campaign.stage = stage
    campaign.version += 1
    campaign.save(update_fields=["stage", "version"])
    record(actor, "campaign.stage", campaign, stage=stage, forced=forced, base_version=base_version,
           new_version=campaign.version)
    return campaign
