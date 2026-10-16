from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.permissions import ADMIN, AGENT, AGRONOME, PRODUCTEUR, RESPONSABLE, roles

from . import services


class AskSerializer(serializers.Serializer):
    question = serializers.CharField(max_length=1000)
    value_chain = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    language = serializers.CharField(required=False, default="fr")


@api_view(["POST"])
@permission_classes([roles(PRODUCTEUR, AGENT, AGRONOME, RESPONSABLE, ADMIN)])
def ask(request):
    s = AskSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    d = s.validated_data
    return Response(services.ask(request.user, d["question"], d.get("value_chain") or None, d["language"]))
