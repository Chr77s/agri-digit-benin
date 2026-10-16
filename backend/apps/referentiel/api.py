from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Department, ValueChain


@api_view(["GET"])
@permission_classes([AllowAny])
def value_chains(request):
    rows = ValueChain.objects.order_by("code")
    return Response([{"code": v.code, "name": v.name, "reserve": v.reserve} for v in rows])


@api_view(["GET"])
@permission_classes([AllowAny])
def departments(request):
    deps = Department.objects.prefetch_related("communes").order_by("name")
    return Response([
        {"code": d.code, "name": d.name,
         "communes": [{"code": c.code, "name": c.name} for c in sorted(d.communes.all(), key=lambda c: c.name)]}
        for d in deps
    ])
