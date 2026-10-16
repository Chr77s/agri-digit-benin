from django.db.models import Q
from django.http import Http404
from rest_framework.exceptions import PermissionDenied

from apps.core.permissions import ADMIN, AGENT, FINANCIER, PRODUCTEUR

from .models import Producer


def producers_for(user):
    """Producteurs visibles selon le rôle (matrice section 8)."""
    qs = Producer.objects.all()
    if user.role == ADMIN:
        return qs
    if user.role == AGENT:
        qs = qs.filter(department=user.department)
        return qs.filter(commune=user.commune) if user.commune else qs
    if user.role == PRODUCTEUR:
        return qs.filter(user=user)
    if user.role == FINANCIER:
        return qs.filter(consents__type="credit", consents__withdrawn_at__isnull=True).distinct()
    raise PermissionDenied()


def get_producer(user, pk):
    p = producers_for(user).filter(pk=pk).first()
    if p is None:
        raise Http404
    return p


def search(qs, params):
    for f in ("status", "department", "commune"):
        if v := params.get(f):
            qs = qs.filter(**{f: v})
    if s := params.get("search"):
        qs = qs.filter(Q(first_name__icontains=s) | Q(last_name__icontains=s) | Q(code__icontains=s)
                       | Q(npi=s) | Q(phone=s))
    return qs
