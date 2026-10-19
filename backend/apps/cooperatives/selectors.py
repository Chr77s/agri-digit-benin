from django.db.models import Count, Q
from django.http import Http404
from rest_framework.exceptions import PermissionDenied

from apps.core.permissions import ADMIN, AGENT

from .models import Cooperative, Membership, MembershipRequest

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


def nearby_for(producer):
    """Coopératives du département du producteur dont il n'est pas déjà membre, avec l'état de sa dernière demande."""
    mine = Membership.objects.filter(producer=producer, left_at__isnull=True).values("cooperative_id")
    qs = Cooperative.objects.filter(department=producer.department).exclude(pk__in=mine).annotate(
        members_count=Count("memberships", filter=Q(memberships__left_at__isnull=True))).order_by("name")
    last = {r.cooperative_id: r for r in producer.join_requests.order_by("created_at")}
    for c in qs:
        c.request = last.get(c.id)
    return qs


def join_requests_for(user):
    qs = MembershipRequest.objects.select_related("cooperative", "producer")
    if user.role == "producteur":
        return qs.filter(producer__user=user)
    return qs.filter(cooperative__in=cooperatives_for(user))


def get_membership(user, pk):
    m = Membership.objects.select_related("producer", "cooperative").filter(
        pk=pk, cooperative__in=cooperatives_for(user)).first()
    if m is None:
        raise Http404
    return m
