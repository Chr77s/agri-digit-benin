"""Passerelles opérateur (USSD, SMS entrants). SIMULÉES dans le prototype : ouvertes en DEMO_MODE pour le
simulateur de l'application, sinon réservées à la passerelle qui présente USSD_GATEWAY_KEY."""
import hmac
import re

from django.conf import settings
from django.http import Http404, HttpResponse
from rest_framework import serializers
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle

from integrations.notifications import get_channel

from . import services


class GatewayThrottle(SimpleRateThrottle):
    scope = "ussd"

    def get_rate(self):
        return "120/min"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


def _allowed(request):
    key = settings.USSD_GATEWAY_KEY
    given = request.headers.get("X-Gateway-Key", "")
    return settings.DEMO_MODE or (bool(key) and hmac.compare_digest(given.encode(), key.encode()))


def local_phone(raw):
    """+229 01 97 00 00 01 -> 0197000001 (format des comptes)."""
    d = re.sub(r"\D", "", raw or "")
    return d[3:] if len(d) == 13 and d.startswith("229") else d


class UssdIn(serializers.Serializer):
    sessionId = serializers.CharField(max_length=100)
    phoneNumber = serializers.CharField(max_length=20)
    text = serializers.CharField(allow_blank=True, required=False, default="", max_length=300)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([GatewayThrottle])
def ussd_gateway(request):
    if not _allowed(request):
        raise Http404
    s = UssdIn(data=request.data)
    s.is_valid(raise_exception=True)
    more, text = services.handle(local_phone(s.validated_data["phoneNumber"]), s.validated_data["text"])
    return HttpResponse(f"{'CON' if more else 'END'} {text}", content_type="text/plain; charset=utf-8")


class SmsIn(serializers.Serializer):
    sender = serializers.CharField(max_length=20)
    text = serializers.CharField(max_length=480)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([GatewayThrottle])
def sms_inbound(request):
    if not _allowed(request):
        raise Http404
    s = SmsIn(data=request.data)
    s.is_valid(raise_exception=True)
    phone = local_phone(s.validated_data["sender"])
    reply, dep = services.sms_reply(phone, s.validated_data["text"])
    get_channel("sms").send(phone, reply, department=dep)  # réponse simulée : visible dans la boîte d'envoi
    return Response({"to": phone, "reply": reply})
