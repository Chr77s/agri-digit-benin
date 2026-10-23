import hashlib
import hmac
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.audit.services import record
from apps.core.errors import ApiError
from integrations.notifications import get_channel

from .models import User

OTP_TTL = timedelta(minutes=10)
LOCK_TTL = timedelta(minutes=15)
MAX_FAILURES = 5


def _hash(phone, code):
    return hmac.new(settings.SECRET_KEY.encode(), f"{phone}:{code}".encode(), hashlib.sha256).hexdigest()


def _check_lock(user):
    if user.locked_until and user.locked_until > timezone.now():
        raise ApiError("Compte bloqué après 5 échecs. Réessayez dans 15 minutes.", "locked", 429)


def request_otp(phone):
    user = User.objects.filter(phone=phone, is_active=True).first()
    if user is None:  # réponse identique pour ne pas révéler l'existence du compte
        return False
    _check_lock(user)
    code = f"{secrets.randbelow(10**6):06d}"
    user.otp_hash = _hash(phone, code)
    user.otp_expires_at = timezone.now() + OTP_TTL
    user.save(update_fields=["otp_hash", "otp_expires_at"])
    get_channel("sms").send(phone, f"Agri-Digit : votre code de connexion est {code}. Il expire dans 10 minutes.")
    return user.requires_password


def _fail(user, detail, code):
    user.otp_failures += 1
    fields = ["otp_failures"]
    if user.otp_failures >= MAX_FAILURES:
        user.locked_until = timezone.now() + LOCK_TTL
        user.otp_failures = 0
        user.otp_hash = ""
        fields += ["locked_until", "otp_hash"]
        user.save(update_fields=fields)
        record(user, "auth.locked", user)
        raise ApiError("Compte bloqué après 5 échecs. Réessayez dans 15 minutes.", "locked", 429)
    user.save(update_fields=fields)
    raise ApiError(detail, code, 400)


def verify_otp(phone, code, password=None):
    # pas de transaction englobante : un échec doit rester enregistré (compteur de blocage)
    user = User.objects.filter(phone=phone, is_active=True).first()
    if user is None or not user.otp_hash:
        raise ApiError("Code invalide ou expiré.", "invalid_code", 400)
    _check_lock(user)
    if user.otp_expires_at is None or user.otp_expires_at < timezone.now():
        raise ApiError("Code expiré, demandez-en un nouveau.", "code_expired", 400)
    if not hmac.compare_digest(user.otp_hash, _hash(phone, code or "")):
        _fail(user, "Code incorrect.", "invalid_code")
    if user.requires_password and not (password and user.check_password(password)):
        _fail(user, "Mot de passe incorrect.", "invalid_password")
    with transaction.atomic():
        user.otp_hash = ""
        user.otp_failures = 0
        user.last_login = timezone.now()
        user.save(update_fields=["otp_hash", "otp_failures", "last_login"])
        record(user, "auth.login", user)
    return user


@transaction.atomic
def create_user(actor, data):
    if User.objects.filter(phone=data["phone"]).exists():
        raise ApiError("Ce téléphone est déjà utilisé.", "duplicate", 409)
    password = data.pop("password", None)
    user = User.objects.create_user(password=password, **data)
    record(actor, "user.create", user, role=user.role)
    return user


@transaction.atomic
def update_user(actor, user, data):
    for k, v in data.items():
        setattr(user, k, v)
    user.save()
    record(actor, "user.update", user, fields=sorted(data))
    return user


def _phone_taken(phone):
    from apps.producers.models import Producer

    return User.objects.filter(phone=phone).exists() or Producer.objects.filter(phone=phone).exists()


def request_phone_change(user, new_phone):
    if new_phone == user.phone:
        raise ApiError("C'est déjà votre numéro.", "same_phone", 400, fields={"new_phone": ["Numéro identique."]})
    if _phone_taken(new_phone):
        raise ApiError("Ce numéro est déjà utilisé par un compte.", "duplicate", 409)
    _check_lock(user)
    code = f"{secrets.randbelow(10**6):06d}"
    user.pending_phone = new_phone
    user.otp_hash = _hash(new_phone, code)
    user.otp_expires_at = timezone.now() + OTP_TTL
    user.save(update_fields=["pending_phone", "otp_hash", "otp_expires_at"])
    get_channel("sms").send(new_phone, f"Agri-Digit : votre code de confirmation du nouveau numéro est {code}. "
                                       "Il expire dans 10 minutes.")
    record(user, "user.phone_change_request", user)


def confirm_phone_change(user, code):
    # même règle que la connexion : un échec reste enregistré (5 échecs = blocage)
    _check_lock(user)
    new_phone = user.pending_phone
    if not new_phone or not user.otp_hash:
        raise ApiError("Aucun changement de numéro en cours.", "no_pending_change", 400)
    if user.otp_expires_at is None or user.otp_expires_at < timezone.now():
        raise ApiError("Code expiré, demandez-en un nouveau.", "code_expired", 400)
    if not hmac.compare_digest(user.otp_hash, _hash(new_phone, code or "")):
        _fail(user, "Code incorrect.", "invalid_code")
    with transaction.atomic():
        if _phone_taken(new_phone):  # pris entre la demande et la confirmation
            raise ApiError("Ce numéro est déjà utilisé par un compte.", "duplicate", 409)
        old = user.phone
        user.phone, user.pending_phone, user.otp_hash, user.otp_failures = new_phone, "", "", 0
        user.save(update_fields=["phone", "pending_phone", "otp_hash", "otp_failures"])
        p = getattr(user, "producer", None)
        if p is not None:
            from apps.producers.services import change_phone

            change_phone(user, p, new_phone)
        record(user, "user.phone_change", user, producer=p.code if p else None)
    get_channel("sms").send(old, "Agri-Digit : le numéro de votre compte vient d'être changé. "
                                 "Si ce n'est pas vous, contactez votre agent ATDA.")
    return user
