"""Services, innovations et financements présentés aux acteurs ; financements mobilisés par filière."""
from django.db.models import Sum
from django.http import Http404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.audit.services import record
from apps.core.errors import ApiError
from apps.core.permissions import ADMIN, AGENT, roles
from apps.referentiel.data import ALL_VALUE_CHAIN_CODES

from .models import Publication

AUTHORS = (ADMIN, AGENT, "responsable_programme", "agent_financier", "agronome_inrab")


class PublicationSerializer(serializers.ModelSerializer):
    kind = serializers.ChoiceField(choices=Publication.KINDS)
    value_chains = serializers.ListField(child=serializers.ChoiceField(choices=ALL_VALUE_CHAIN_CODES), required=False)

    class Meta:
        model = Publication
        fields = ["id", "kind", "title", "body", "provider", "value_chains", "departments", "amount_xof", "link",
                  "active", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate(self, d):
        if d["kind"] == "financement" and not d.get("amount_xof"):
            raise serializers.ValidationError({"amount_xof": ["Montant obligatoire pour un financement."]})
        return d


def _visible(user):
    """Le producteur et les autres acteurs voient ce qui concerne leur département (ou tout le pays)."""
    if user.role in AUTHORS and user.role != AGENT:
        return list(Publication.objects.all())
    dep = user.department or getattr(getattr(user, "producer", None), "department", "")
    # shortcut: filtre en Python (SQLite ne cherche pas dans une liste JSON), à passer en SQL avec PostgreSQL
    return [p for p in Publication.objects.filter(active=True) if not p.departments or dep in p.departments]


@api_view(["GET", "POST"])
def publication_list(request):
    u = request.user
    if request.method == "POST":
        if u.role not in AUTHORS:
            raise ApiError("Publication réservée au MAEP, aux agents et aux partenaires.", "forbidden", 403)
        s = PublicationSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        p = s.save(published_by=u)
        record(u, "publication.create", p, kind=p.kind)
        return Response(PublicationSerializer(p).data, status=201)
    k = request.query_params.get("kind")
    qs = [p for p in _visible(u) if not k or p.kind == k]
    return Response({"results": PublicationSerializer(qs, many=True).data})


@api_view(["POST"])
@permission_classes([roles(*AUTHORS)])
def publication_archive(request, pk):
    p = Publication.objects.filter(pk=pk).first()
    if p is None:
        raise Http404
    p.active = False
    p.save(update_fields=["active"])
    record(request.user, "publication.archive", p)
    return Response(PublicationSerializer(p).data)


def financing_by_chain():
    """Financements mobilisés publiés + valeur des appuis remis, par filière (XOF)."""
    from apps.production.models import Support

    out = {}
    for p in Publication.objects.filter(kind="financement"):
        for vc in p.value_chains or ["toutes"]:
            out[vc] = out.get(vc, 0) + p.amount_xof // max(1, len(p.value_chains or [1]))
    return {"by_chain": out, "published_total": sum(out.values()),
            "supports_total": Support.objects.aggregate(v=Sum("value_xof"))["v"] or 0}


@api_view(["GET"])
@permission_classes([roles(ADMIN, "responsable_programme", "auditeur_copil", "agent_financier")])
def financing(request):
    return Response(financing_by_chain())
