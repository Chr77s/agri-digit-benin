from django.http import Http404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.pagination import Cursor
from apps.core.permissions import ADMIN, AGENT, roles

from . import services
from .models import Alert, Notification, Outbox

VALUE_CHAINS = ["coton", "anacarde", "ananas", "mais", "riz", "soja", "manioc", "niebe", "elevage",
                "peche_aquaculture"]


class AlertSerializer(serializers.ModelSerializer):
    created_by = serializers.CharField(source="created_by.phone", read_only=True)
    approved_by = serializers.CharField(source="approved_by.phone", read_only=True, default=None)

    class Meta:
        model = Alert
        fields = ["id", "title", "message", "category", "severity", "department", "communes", "value_chains",
                  "status", "created_by", "approved_by", "stats", "created_at", "sent_at"]
        read_only_fields = ["status", "stats", "sent_at"]


class AlertInSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=150)
    message = serializers.CharField(max_length=1000)
    category = serializers.ChoiceField(choices=["meteo", "ravageur", "programme", "marche"])
    severity = serializers.ChoiceField(choices=["info", "avertissement", "urgent"])
    department = serializers.CharField(max_length=40)
    communes = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    value_chains = serializers.ListField(child=serializers.ChoiceField(choices=VALUE_CHAINS), required=False,
                                         default=list)


class OutboxSerializer(serializers.ModelSerializer):
    to = serializers.SerializerMethodField()

    class Meta:
        model = Outbox
        fields = ["id", "channel", "to", "body", "segments", "encoding", "status", "created_at"]

    def get_to(self, o):
        return o.to[:2] + "****" + o.to[-4:] if len(o.to) >= 6 else "****"


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "title", "body", "channel", "status", "created_at", "read_at"]


def alerts_for(user):
    qs = Alert.objects.select_related("created_by", "approved_by")
    return qs.filter(department=user.department) if user.role == AGENT else qs


def _get(user, pk):
    a = alerts_for(user).filter(pk=pk).first()
    if a is None:
        raise Http404
    return a


@api_view(["GET", "POST"])
@permission_classes([roles(AGENT, ADMIN)])
def alert_list(request):
    if request.method == "GET":
        return Response(AlertSerializer(alerts_for(request.user).order_by("-created_at"), many=True).data)
    s = AlertInSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    return Response(AlertSerializer(services.create(request.user, s.validated_data)).data, status=201)


@api_view(["POST"])
@permission_classes([roles(AGENT, ADMIN)])
def alert_approve(request, pk):
    return Response(AlertSerializer(services.approve(request.user, _get(request.user, pk))).data)


@api_view(["POST"])
@permission_classes([roles(AGENT, ADMIN)])
def alert_send(request, pk):
    return Response(services.send(request.user, _get(request.user, pk)))


@api_view(["GET"])
def notification_list(request):
    pg = Cursor()
    qs = Notification.objects.filter(user=request.user)
    return pg.get_paginated_response(NotificationSerializer(pg.paginate_queryset(qs, request), many=True).data)


@api_view(["POST"])
def notification_read(request, pk):
    n = Notification.objects.filter(pk=pk, user=request.user).first()
    if n is None:
        raise Http404
    n.status, n.read_at = "lu", timezone.now()
    n.save(update_fields=["status", "read_at"])
    return Response(NotificationSerializer(n).data)


@api_view(["GET"])
@permission_classes([roles(AGENT, ADMIN)])
def outbox_list(request):
    # l'agent ne voit que les messages de son département (jamais les codes de connexion)
    qs = Outbox.objects.filter(department=request.user.department) if request.user.role == AGENT \
        else Outbox.objects.all()
    if ch := request.query_params.get("channel"):
        qs = qs.filter(channel=ch)
    pg = Cursor()
    return pg.get_paginated_response(OutboxSerializer(pg.paginate_queryset(qs, request), many=True).data)
