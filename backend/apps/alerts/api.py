from django.db.models import Count, Max, Q
from django.http import Http404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.pagination import Cursor
from apps.core.permissions import ADMIN, AGENT, PRODUCTEUR, roles
from apps.producers.selectors import producers_for
from apps.referentiel.data import ALL_VALUE_CHAIN_CODES

from . import services
from .models import Alert, Notification, Outbox

VALUE_CHAINS = ALL_VALUE_CHAIN_CODES


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


# ---- Messagerie producteur <-> agent ATDA ----

class ChatSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    body = serializers.CharField()
    created_at = serializers.DateTimeField()
    read_at = serializers.DateTimeField()
    from_producer = serializers.SerializerMethodField()
    mine = serializers.SerializerMethodField()

    def get_from_producer(self, m):
        return m.author.role == PRODUCTEUR

    def get_mine(self, m):
        return m.author_id == self.context["user"].id


def _thread(request, producer):
    if request.method == "POST":
        services.post_chat(request.user, producer, request.data.get("body"))
    else:
        services.read_chat(request.user, producer)
    qs = producer.chat.select_related("author")
    return Response({"producer": {"id": str(producer.id), "code": producer.code,
                                  "name": f"{producer.first_name} {producer.last_name}"},
                     "results": ChatSerializer(qs, many=True, context={"user": request.user}).data},
                    status=201 if request.method == "POST" else 200)


@api_view(["GET", "POST"])
@permission_classes([roles(PRODUCTEUR)])
def chat_mine(request):
    producer = getattr(request.user, "producer", None)
    if producer is None or producer.status != "valide":
        return Response({"detail": "La messagerie s'ouvre quand votre fiche est validée.", "code": "not_validated"},
                        status=400)
    return _thread(request, producer)


@api_view(["GET"])
@permission_classes([roles(AGENT)])
def chat_threads(request):
    """Fils du secteur de l'agent, les plus récents d'abord, avec le nombre de messages non lus du producteur."""
    qs = producers_for(request.user).filter(chat__isnull=False).annotate(
        last_at=Max("chat__created_at"),
        unread=Count("chat", filter=Q(chat__author__role=PRODUCTEUR, chat__read_at__isnull=True))).order_by("-last_at")
    return Response({"results": [{"producer_id": str(p.id), "code": p.code, "name": f"{p.first_name} {p.last_name}",
                                  "commune": p.commune, "last_at": p.last_at, "unread": p.unread} for p in qs]})


@api_view(["GET", "POST"])
@permission_classes([roles(AGENT)])
def chat_thread(request, producer_id):
    producer = producers_for(request.user).filter(pk=producer_id).first()
    if producer is None:
        raise Http404
    return _thread(request, producer)
