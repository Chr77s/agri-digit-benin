import secrets
import unicodedata
from datetime import date, timedelta

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
def update(actor, p, data, forced=False, base_version=None):
    if "npi" in data or "phone" in data:
        check_duplicates(data.get("npi", p.npi), data.get("phone", p.phone), exclude=p.pk)
    for k, v in data.items():
        setattr(p, k, v)
    p.version += 1
    p.save()
    _version(p, actor, "correction")
    record(actor, "producer.update", p, fields=sorted(data), forced=forced, base_version=base_version,
           new_version=p.version)
    return p


def change_phone(actor, p, phone):
    """Changement de numéro confirmé par code SMS (accounts) : visible dans l'historique de la fiche."""
    p.phone = phone
    p.version += 1
    p.save(update_fields=["phone", "version"])
    _version(p, actor, "changement de numéro (code SMS)")


@transaction.atomic
def validate(actor, p):
    p.status, p.validated_at, p.reject_reason = "valide", timezone.now(), ""
    p.version += 1
    p.save(update_fields=["status", "validated_at", "reject_reason", "version"])
    _version(p, actor, "validation")
    record(actor, "producer.validate", p)
    notify(p, "Inscription validée", f"Agri-Digit : votre inscription {p.code} est validée.")
    return p


@transaction.atomic
def reject(actor, p, reason):
    p.status, p.reject_reason = "rejete", reason
    p.version += 1
    p.save(update_fields=["status", "reject_reason", "version"])
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
        if consent.type == "donnees_personnelles":
            close_account(actor, consent.producer)
    return consent


def close_account(actor, p):
    """Retrait du consentement « données personnelles » : accès fermé, offres retirées ; effacement après le délai."""
    from apps.market.models import Offer

    p.status = "ferme"
    p.save(update_fields=["status"])
    if p.user:
        p.user.is_active = False
        p.user.save(update_fields=["is_active"])
        Offer.objects.filter(owner=p.user, status="ouverte").update(status="retiree")
    record(actor, "producer.close", p)


def erase_closed(days, now=None):
    """Efface l'identité des comptes fermés depuis plus de `days` jours ; parcelles et campagnes restent, anonymes."""
    limit = (now or timezone.now()) - timedelta(days=days)
    ids = Consent.objects.filter(type="donnees_personnelles", withdrawn_at__lt=limit,
                                 producer__status="ferme").values_list("producer_id", flat=True)
    n = 0
    for p in Producer.objects.filter(id__in=ids).select_related("user"):
        with transaction.atomic():
            tag = p.id.hex[:9].upper()  # unique et sans lien avec la personne
            p.npi, p.phone, p.first_name, p.last_name = f"X{tag}", f"X{tag}", "Compte", "effacé"
            p.sex, p.birth_date, p.guardian_name, p.guardian_npi = "", date(1900, 1, 1), "", ""
            p.verification_code, p.status = None, "efface"
            p.save()
            p.versions.all().delete()  # les versions copient l'identité
            if p.user:
                p.user.phone, p.user.full_name = f"X{tag}", "Compte effacé"
                p.user.save(update_fields=["phone", "full_name"])
            record(None, "producer.erase", p)
            n += 1
    return n


CARD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # sans 0/O ni 1/I, lisible à voix haute


@transaction.atomic
def issue_card(actor, p):
    """UC-07 : carte d'une fiche validée ; le code de vérification est créé une seule fois (aléatoire, 8 car.)."""
    if p.status != "valide":
        raise ApiError("La carte n'est disponible que pour une fiche validée.", "not_validated", 400)
    if not p.verification_code:
        code = "".join(secrets.choice(CARD_ALPHABET) for _ in range(8))
        while Producer.objects.filter(verification_code=code).exists():
            code = "".join(secrets.choice(CARD_ALPHABET) for _ in range(8))
        p.verification_code, p.card_issued_at = code, timezone.now()
        p.save(update_fields=["verification_code", "card_issued_at"])
        record(actor, "producer.card_issue", p)
    return p
