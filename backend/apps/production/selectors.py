from apps.producers.selectors import producers_for

from .models import Harvest, Support


def supports_for(user):
    # producers_for applique la matrice : producteur = lui-même, agent = périmètre, autres rôles = 403
    return Support.objects.select_related("producer", "program").filter(producer__in=producers_for(user))


def harvests_for(user):
    return Harvest.objects.select_related("campaign__parcel__producer").filter(
        campaign__parcel__producer__in=producers_for(user))
