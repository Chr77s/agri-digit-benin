from django.db.models import Count, Q
from django.http import Http404
from rest_framework.exceptions import PermissionDenied

from apps.core.permissions import ADMIN, AGENT

from .models import Cooperative, Membership

COOP_MANAGER = "gestionnaire_cooperative"


def cooperatives_for(user):
    """Admin : toutes ; agent : son département ; gestionnaire : seulement les siennes ; autres rôles : 403."""
    qs = Cooperative.objects.select_related("manager").annotate(
        members_count=Count("memberships", filter=Q(memberships__left_at__isnull=True)))
    if user.role == ADMIN:
        return qs
    if user.role == AGENT:
        return qs.filter(department=user.department)
    if user.role == COOP_MANAGER:
        return qs.filter(manager=user)
    raise PermissionDenied()


def get_cooperative(user, pk):
    c = cooperatives_for(user).filter(pk=pk).first()
    if c is None:
        raise Http404
    return c


def search(qs, params):
    if d := params.get("department"):
        qs = qs.filter(department=d)
    if s := params.get("search"):
        qs = qs.filter(name__icontains=s)
    return qs


def get_membership(user, pk):
    m = Membership.objects.select_related("producer", "cooperative").filter(
        pk=pk, cooperative__in=cooperatives_for(user)).first()
    if m is None:
        raise Http404
    return m
