import re

from django.conf import settings
from django.db.models import Q
from django.http import Http404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.errors import ApiError
from apps.core.permissions import ADMIN, PRODUCTEUR, roles

from . import services
from .models import ROLES, User

COOKIE_PATH = "/api/v1/auth/"


class UserSerializer(serializers.ModelSerializer):
    producer_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "phone", "full_name", "role", "department", "commune", "producer_id", "language",
                  "is_active"]

    def get_producer_id(self, u):
        p = getattr(u, "producer", None)
        return str(p.id) if p else None


def _phone(value):
    if not re.match(settings.PHONE_REGEX, value or ""):
        raise serializers.ValidationError("Téléphone béninois attendu : 10 chiffres commençant par 01.")
    return value


class OtpRequestSerializer(serializers.Serializer):
    phone = serializers.CharField(validators=[_phone])


class OtpVerifySerializer(serializers.Serializer):
    phone = serializers.CharField(validators=[_phone])
    code = serializers.RegexField(r"^\d{6}$")
    password = serializers.CharField(required=False, allow_blank=True)


class OtpThrottle(SimpleRateThrottle):
    scope = "otp"

    def get_rate(self):
        return settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["otp"]

    def get_cache_key(self, request, view):
        return f"throttle_otp_{self.get_ident(request)}"


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([OtpThrottle])
def otp_request(request):
    s = OtpRequestSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    requires_password = services.request_otp(s.validated_data["phone"])
    return Response({"detail": "Code envoyé", "requires_password": bool(requires_password)})


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([OtpThrottle])
def otp_verify(request):
    s = OtpVerifySerializer(data=request.data)
    s.is_valid(raise_exception=True)
    user = services.verify_otp(**s.validated_data)
    refresh = RefreshToken.for_user(user)
    resp = Response({"access": str(refresh.access_token), "user": UserSerializer(user).data})
    resp.set_cookie("refresh", str(refresh), httponly=True, samesite="Lax", path=COOKIE_PATH,
                    secure=request.is_secure(), max_age=7 * 24 * 3600)
    return resp


@api_view(["POST"])
@permission_classes([AllowAny])
def refresh(request):
    try:
        token = RefreshToken(request.COOKIES.get("refresh", ""))
    except TokenError:
        raise ApiError("Session expirée, reconnectez-vous.", "not_authenticated", 401)
    # compte fermé ou suspendu : le cookie encore valide ne rouvre pas l'accès
    if not User.objects.filter(id=token.get("user_id"), is_active=True).exists():
        raise ApiError("Session expirée, reconnectez-vous.", "not_authenticated", 401)
    return Response({"access": str(token.access_token)})


@api_view(["POST"])
@permission_classes([AllowAny])
def logout(request):
    resp = Response({"detail": "Déconnecté"})
    resp.delete_cookie("refresh", path=COOKIE_PATH)
    return resp


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(UserSerializer(request.user).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def otp_inbox(request):
    """SIMULATION (DEMO_MODE) : derniers SMS de code envoyés à ce téléphone."""
    if not settings.DEMO_MODE:
        raise Http404
    from apps.alerts.models import Outbox

    phone = request.query_params.get("phone", "")
    codes = Q(body__contains="code de connexion") | Q(body__contains="code de confirmation")
    rows = Outbox.objects.filter(codes, to=phone, channel="sms").order_by("-created_at")
    return Response([{"body": o.body, "created_at": o.created_at} for o in rows[:5]])


class PhoneChangeRequestSerializer(serializers.Serializer):
    new_phone = serializers.CharField(validators=[_phone])


class PhoneChangeConfirmSerializer(serializers.Serializer):
    code = serializers.RegexField(r"^\d{6}$")


def _session(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "user": UserSerializer(user).data}


@api_view(["POST"])
@permission_classes([roles(PRODUCTEUR)])
@throttle_classes([OtpThrottle])
def phone_change_request(request):
    """Producteur : code envoyé par SMS (simulé) au nouveau numéro. Les comptes du personnel passent par l'admin."""
    s = PhoneChangeRequestSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    services.request_phone_change(request.user, s.validated_data["new_phone"])
    return Response({"detail": "Code envoyé au nouveau numéro"})


@api_view(["POST"])
@permission_classes([roles(PRODUCTEUR)])
@throttle_classes([OtpThrottle])
def phone_change_confirm(request):
    s = PhoneChangeConfirmSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    return Response(_session(services.confirm_phone_change(request.user, s.validated_data["code"])))


class AdminUserSerializer(serializers.Serializer):
    phone = serializers.CharField(validators=[_phone])
    full_name = serializers.CharField(max_length=150)
    role = serializers.ChoiceField(choices=ROLES)
    department = serializers.CharField(required=False, allow_blank=True, default="")
    commune = serializers.CharField(required=False, allow_blank=True, default="")
    password = serializers.CharField(required=False, min_length=10, write_only=True)


class AdminUserPatchSerializer(serializers.Serializer):
    is_active = serializers.BooleanField(required=False)
    role = serializers.ChoiceField(choices=ROLES, required=False)
    department = serializers.CharField(required=False, allow_blank=True)
    commune = serializers.CharField(required=False, allow_blank=True)


@api_view(["GET", "POST"])
@permission_classes([roles(ADMIN)])
def admin_users(request):
    if request.method == "GET":
        return Response(UserSerializer(User.objects.order_by("phone"), many=True).data)
    s = AdminUserSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    return Response(UserSerializer(services.create_user(request.user, dict(s.validated_data))).data, status=201)


@api_view(["PATCH"])
@permission_classes([roles(ADMIN)])
def admin_user_detail(request, pk):
    user = User.objects.filter(pk=pk).first()
    if user is None:
        raise Http404
    s = AdminUserPatchSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    return Response(UserSerializer(services.update_user(request.user, user, s.validated_data)).data)
