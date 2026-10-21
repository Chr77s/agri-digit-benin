from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.permissions import ADMIN, AGENT, RESPONSABLE, roles

from . import lots, stocks

STAFF = (AGENT, RESPONSABLE, ADMIN)


@api_view(["GET"])
@permission_classes([roles(*lots.HOLDERS, *STAFF)])
def outlook(request):
    """Le détenteur : ses stocks par produit et site avec les jours de couverture. L'agent (son département), le
    responsable et l'administration : l'ensemble, agrégé par département et filière, sans identité."""
    u = request.user
    rows = stocks.mine(u) if u.role in lots.HOLDERS else stocks.aggregate(u)
    return Response({
        "scope": "mine" if u.role in lots.HOLDERS else "aggregate", "window_days": stocks.WINDOW_DAYS,
        "thresholds": {"critical_days": stocks.CRITICAL_DAYS, "low_days": stocks.LOW_DAYS},
        "summary": stocks.summary(rows), "results": rows})
