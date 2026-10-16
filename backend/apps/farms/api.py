from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.errors import ApiError
from apps.core.pagination import Cursor
from apps.core.permissions import ADMIN, AGENT, RESPONSABLE, roles

from . import selectors
from .models import FarmPOC

VIEWERS = roles(AGENT, ADMIN, RESPONSABLE)


class FarmSerializer(serializers.ModelSerializer):
    class Meta:
        model = FarmPOC
        fields = ["farm_id", "lon", "lat", "department", "commune", "is_maize", "maize_confidence",
                  "road_distance_m", "area_ha", "source"]


class FarmPagination(Cursor):
    ordering = "farm_id"


@api_view(["GET"])
@permission_classes([VIEWERS])
def farm_aggregates(request):
    dep = request.query_params.get("department")
    if request.user.role == AGENT:
        dep = request.user.department
    return Response(selectors.aggregates(request.query_params.get("level", "department"), dep))


@api_view(["GET"])
@permission_classes([VIEWERS])
def farm_list(request):
    qs = FarmPOC.objects.all()
    if request.user.role == AGENT:
        qs = qs.filter(department=request.user.department)
    if bbox := request.query_params.get("bbox"):
        try:
            a, b, c, d = (float(x) for x in bbox.split(","))
        except ValueError:
            raise ApiError("bbox attendu : minLon,minLat,maxLon,maxLat", "validation_error", 400)
        qs = qs.filter(lon__gte=a, lat__gte=b, lon__lte=c, lat__lte=d)
    pg = FarmPagination()
    return pg.get_paginated_response(FarmSerializer(pg.paginate_queryset(qs, request), many=True).data)
