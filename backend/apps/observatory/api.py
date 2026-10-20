from datetime import date

from django.http import Http404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.errors import ApiError
from apps.core.permissions import ADMIN, AGENT, AGRONOME, AUDITEUR, RESPONSABLE, roles
from apps.referentiel.models import ValueChain

from . import actors_map, quality, services
from .models import NationalStat

READERS = (ADMIN, RESPONSABLE, AUDITEUR, AGENT)
WRITERS = (ADMIN, RESPONSABLE)
QUALITY_READERS = (ADMIN, RESPONSABLE, AGRONOME, AUDITEUR)


class StatIn(serializers.Serializer):
    value_chain = serializers.SlugRelatedField(slug_field="code", queryset=ValueChain.objects.all())
    year = serializers.IntegerField(min_value=1990)
    production_t = serializers.FloatField(min_value=0, required=False, allow_null=True)
    consumption_t = serializers.FloatField(min_value=0, required=False, allow_null=True)
    imports_t = serializers.FloatField(min_value=0, required=False, allow_null=True)
    exports_t = serializers.FloatField(min_value=0, required=False, allow_null=True)
    source = serializers.CharField(min_length=3, max_length=300)

    def validate_year(self, v):
        if v > date.today().year:
            raise serializers.ValidationError("Une statistique ne peut pas porter sur une année à venir.")
        return v

    def validate(self, d):
        d["value_chain"] = d["value_chain"].code
        if all(d.get(k) is None for k in services.VALUES):
            raise serializers.ValidationError("Saisissez au moins une valeur (production, consommation, importations "
                                              "ou exportations).")
        return d


@api_view(["GET", "POST"])
@permission_classes([roles(*READERS)])
def national_coverage(request):
    """GET : couverture, importations, tendances et veille. POST : saisie d'une ligne (administration, responsable)."""
    if request.method == "GET":
        return Response({**services.overview(request.query_params.get("value_chain") or None),
                         "can_edit": request.user.role in WRITERS})
    if request.user.role not in WRITERS:
        raise ApiError("Seule l'administration ou le responsable de programme saisit une statistique nationale.",
                       "forbidden", 403)
    s = StatIn(data=request.data)
    s.is_valid(raise_exception=True)
    services.save_stat(request.user, s.validated_data)
    return Response(services.overview(s.validated_data["value_chain"]), status=201)


@api_view(["POST"])
@permission_classes([roles(*WRITERS)])
def national_import(request):
    """Import en lot `{rows: [...]}` : validé ligne par ligne, tout ou rien."""
    rows = request.data.get("rows") if isinstance(request.data, dict) else None
    if not isinstance(rows, list):
        raise ApiError("Le lot doit être un objet {\"rows\": [...]}.", "validation_error", 400)
    if len(rows) > services.MAX_IMPORT_ROWS:
        raise ApiError(f"Un import contient au plus {services.MAX_IMPORT_ROWS} lignes.", "validation_error", 400)
    s = StatIn(data=rows, many=True)
    if not s.is_valid():
        raise ApiError("Import refusé : corrigez les lignes signalées (rien n'a été enregistré).", "validation_error",
                       400, fields={"rows": s.errors})
    done = services.import_stats(request.user, [dict(r) for r in s.validated_data])
    return Response({"imported": len(done), **services.overview()}, status=201)


@api_view(["DELETE"])
@permission_classes([roles(*WRITERS)])
def national_stat_delete(request, pk):
    s = NationalStat.objects.filter(pk=pk).first()
    if s is None:
        raise Http404
    services.delete_stat(request.user, s)
    return Response(status=204)


@api_view(["GET"])
def map_actors(request):
    """Carte des acteurs : GeoJSON par couche (registre `actors_map.LAYERS`), `?layers=&department=&value_chain=`."""
    wanted = {x for x in (request.query_params.get("layers") or "").split(",") if x} or None
    unknown = (wanted or set()) - set(actors_map.LAYERS)
    if unknown:
        raise ApiError(f"Couche inconnue : {', '.join(sorted(unknown))}.", "validation_error", 400)
    return Response(actors_map.actors(request.user, request.query_params.get("department") or None,
                                      request.query_params.get("value_chain") or None, wanted))


@api_view(["GET"])
@permission_classes([roles(*QUALITY_READERS)])
def models_quality(request):
    return Response(quality.quality())
