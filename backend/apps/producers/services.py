import unicodedata
from datetime import date

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.audit.services import record
from apps.core.errors import ApiError
from apps.referentiel.services import commune_in_department
from integrations.anip import AnipUnavailable, get_client
from integrations.notifications import get_channel

from .models import Consent, Counter, Producer, ProducerVersion

SNAPSHOT_FIELDS = ["npi", "first_name", "last_name", "sex", "birth_date", "department", "commune", "phone",
                   "language", "status"]


def next_code(year=2026):
    with transaction.atomic():
        c, _ = Counter.objects.select_for_update().get_or_create(name=f"producer-{year}")
        c.value += 1
        c.save(update_fields=["value"])
        return f"BJ-AGR-{year}-{c.value:06d}"


def _norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    return " ".join(s.upper().replace("-", " ").split())


def _age(born, today=None):
    today = today or date.today()
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))


def snapshot(p):
    return {f: str(getattr(p, f)) for f in SNAPSHOT_FIELDS}


def _version(p, actor, reason=""):
    n = p.versions.count() + 1
    ProducerVersion.objects.create(producer=p, version=n, data=snapshot(p), changed_by=actor, reason=reason)


def notify(producer, title, body):
    if producer.user:
        get_channel("in_app").send(producer.phone, body, user=producer.user, title=title)
    get_channel("sms").send(producer.phone, body, department=producer.department)


def check_duplicates(npi, phone, exclude=None):
    qs = Producer.objects.exclude(pk=exclude) if exclude else Producer.objects.all()
    dup = qs.filter(npi=npi).first() or qs.filter(phone=phone).first()
    if dup:
        raise ApiError("Ce producteur est déjà inscrit (NPI ou téléphone).", "duplicate", 409,
                       existing={"id": str(dup.id), "code": dup.code})
    if not exclude and User.objects.filter(phone=phone).exists():
        raise ApiError("Ce téléphone est déjà utilisé par un compte.", "duplicate", 409, existing=None)


def verify_identity(d):
    try:
        rec = get_client().lookup(d["npi"])
    except AnipUnavailable:
        raise ApiError("Le service de vérification ANIP est indisponible. Réessayez plus tard.",
                       "anip_unavailable", 503)
    if rec is None:
        raise ApiError("NPI inconnu de l'ANIP.", "npi_unknown", 400, fields={"npi": ["NPI inconnu."]})
    if _norm(rec.first_name) != _norm(d["first_name"]) or _norm(rec.last_name) != _norm(d["last_name"]):
        raise ApiError("Le nom ne correspond pas à la fiche ANIP.", "name_mismatch", 400)
    if rec.birth_date != d["birth_date"]:
        raise ApiError("La date de naissance ne correspond pas à la fiche ANIP.", "birthdate_mismatch", 400)


@transaction.atomic
def register(actor, d):
    if not d.get("consent_accepted"):
        raise ApiError("Le consentement explicite est obligatoire.", "consent_required", 400)
    if not commune_in_department(d["department"], d["commune"]):
        raise ApiError("Commune inconnue pour ce département.", "invalid_commune", 400,
                       fields={"commune": ["Commune invalide."]})
    if actor and actor.is_authenticated and actor.role == "agent_atda" and actor.department != d["department"]:
        raise ApiError("Hors de votre périmètre.", "out_of_scope", 403)
    check_duplicates(d["npi"], d["phone"])
    verify_identity(d)
    minor = _age(d["birth_date"]) < 16
    if minor and not (d.get("guardian_name") and d.get("guardian_npi") and d.get("guardian_consent")):
        raise ApiError("Moins de 16 ans : le consentement du titulaire de l'autorité parentale est requis.",
                       "guardian_required", 400)
    user = User.objects.create_user(phone=d["phone"], full_name=f"{d['first_name']} {d['last_name']}",
                                    role="producteur", department=d["department"], commune=d["commune"],
                                    language=d["language"])
    p = Producer.objects.create(
        code=next_code(), npi=d["npi"], first_name=d["first_name"], last_name=d["last_name"], sex=d["sex"],
        birth_date=d["birth_date"], department=d["department"], commune=d["commune"], phone=d["phone"],
        language=d["language"], guardian_name=d.get("guardian_name", ""), guardian_npi=d.get("guardian_npi", ""),
        user=user)
    Consent.objects.create(producer=p, type="donnees_personnelles", text_version=d["consent_text_version"])
    if minor:
        Consent.objects.create(producer=p, type="parental", text_version=d["consent_text_version"])
    _version(p, actor if actor and actor.is_authenticated else None, "inscription")
    record(actor, "producer.register", p, minor=minor)
    return p


@transaction.atomic
def update(actor, p, data):
    if "npi" in data or "phone" in data:
        check_duplicates(data.get("npi", p.npi), data.get("phone", p.phone), exclude=p.pk)
    for k, v in data.items():
        setattr(p, k, v)
    p.save()
    _version(p, actor, "correction")
    record(actor, "producer.update", p, fields=sorted(data))
    return p


@transaction.atomic
def validate(actor, p):
    p.status, p.validated_at, p.reject_reason = "valide", timezone.now(), ""
    p.save(update_fields=["status", "validated_at", "reject_reason"])
    _version(p, actor, "validation")
    record(actor, "producer.validate", p)
    notify(p, "Inscription validée", f"Agri-Digit : votre inscription {p.code} est validée.")
    return p


@transaction.atomic
def reject(actor, p, reason):
    p.status, p.reject_reason = "rejete", reason
    p.save(update_fields=["status", "reject_reason"])
    _version(p, actor, "rejet")
    record(actor, "producer.reject", p, reason=reason)
    notify(p, "Inscription rejetée", f"Agri-Digit : votre inscription est rejetée. Motif : {reason}")
    return p


@transaction.atomic
def withdraw_consent(actor, consent):
    if consent.withdrawn_at is None:
        consent.withdrawn_at = timezone.now()
        consent.save(update_fields=["withdrawn_at"])
        record(actor, "consent.withdraw", consent, type=consent.type)
    return consent
