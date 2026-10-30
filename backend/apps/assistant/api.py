from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.errors import ApiError
from apps.core.permissions import ADMIN, AGENT, AGRONOME, PRODUCTEUR, RESPONSABLE, roles
from integrations.llm import DEFAULT_PERSONA

from . import services

USERS = roles(PRODUCTEUR, AGENT, AGRONOME, RESPONSABLE, ADMIN)


class TurnSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["user", "assistant"])
    content = serializers.CharField(max_length=2000, allow_blank=True)


class AskSerializer(serializers.Serializer):
    question = serializers.CharField(max_length=1000)
    value_chain = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    language = serializers.CharField(required=False, default="fr")
    # derniers échanges de la conversation (gardés dans le téléphone) : le serveur ne les conserve pas
    history = serializers.ListField(child=TurnSerializer(), required=False, max_length=20)


class ProfileSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=40)
    persona = serializers.CharField(max_length=1500)


@api_view(["POST"])
@permission_classes([USERS])
def ask(request):
    s = AskSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    d = s.validated_data
    return Response(services.ask(request.user, d["question"], d.get("value_chain") or None, d["language"],
                                 d.get("history", []), markdown=True))


@api_view(["GET", "PUT"])
@permission_classes([USERS])
def profile(request):
    """Nom du chatbot pour tous ; personnalité lisible et modifiable par l'administrateur seulement."""
    if request.method == "PUT":
        if request.user.role != ADMIN:
            raise ApiError("Seul l'administrateur règle la personnalité de l'assistant.", "forbidden", 403)
        s = ProfileSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        services.save_profile(request.user, s.validated_data["name"], s.validated_data["persona"])
    name, persona = services.get_profile()
    if request.user.role != ADMIN:
        return Response({"name": name})
    return Response({"name": name, "persona": persona, "default_persona": DEFAULT_PERSONA})
