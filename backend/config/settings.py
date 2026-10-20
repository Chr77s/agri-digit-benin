import os
from datetime import timedelta
from pathlib import Path

import environ
import structlog

os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")  # PC cible à faible mémoire
BASE_DIR = Path(__file__).resolve().parent.parent
env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env")

DEBUG = env.bool("DEBUG", default=False)
SECRET_KEY = env("SECRET_KEY", default="dev-insecure-key-change-me")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["127.0.0.1", "localhost", "testserver"])
DEMO_MODE = env.bool("DEMO_MODE", default=False)
# passerelle USSD/SMS de l'opérateur (vide = fermée hors DEMO_MODE)
USSD_GATEWAY_KEY = env("USSD_GATEWAY_KEY", default="")
NPI_REGEX = env("NPI_REGEX", default=r"^\d{10}$")
PHONE_REGEX = r"^01\d{8}$"

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "django_filters",
    "corsheaders",
    "drf_spectacular",
    "apps.core",
    "apps.accounts",
    "apps.audit",
    "apps.referentiel",
    "apps.producers",
    "apps.parcels",
    "apps.knowledge",
    "apps.assistant",
    "apps.alerts",
    "apps.programs",
    "apps.farms",
    "apps.dashboard",
    "apps.exports",
    "apps.credit",
    "apps.diagnosis",
    "apps.translations",
    "apps.market",
    "apps.satellite",
    "apps.cooperatives",
    "apps.production",
    "apps.ussd",
    "apps.interop",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
ROOT_URLCONF = "config.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]
WSGI_APPLICATION = "config.wsgi.application"
DATABASES = {"default": env.db("DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}")}
# Un chemin SQLite relatif part de backend/, quel que soit le dossier de lancement.
_db = DATABASES["default"]
if _db["ENGINE"].endswith("sqlite3") and _db["NAME"] != ":memory:" and not Path(_db["NAME"]).is_absolute():
    _db["NAME"] = str(BASE_DIR / _db["NAME"])
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 10}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
]
LANGUAGE_CODE = "fr"
TIME_ZONE = "Africa/Porto-Novo"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=["http://localhost:5173"])
CORS_ALLOW_CREDENTIALS = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SESSION_COOKIE_HTTPONLY = True

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework_simplejwt.authentication.JWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.Cursor",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "apps.core.errors.handler",
    "DEFAULT_THROTTLE_RATES": {"otp": env("OTP_THROTTLE_RATE", default="30/min")},
}
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "USER_ID_FIELD": "id",
}
SPECTACULAR_SETTINGS = {"TITLE": "Agri-Digit Bénin API", "VERSION": "1.0.0", "SERVE_INCLUDE_SCHEMA": False}

# Intégrations (implémentation choisie par configuration)
ANIP_BACKEND = env("ANIP_BACKEND", default="mock")
PAYMENT_BACKEND = env("PAYMENT_BACKEND", default="fakepay")
LLM_BACKEND = env("LLM_BACKEND", default="auto")
WEATHER_BACKEND = env("WEATHER_BACKEND", default="open-meteo")  # "demo" : valeurs simulées
WEATHER_URL = env("WEATHER_URL", default="https://api.open-meteo.com/v1/forecast")
OLLAMA_URL = env("OLLAMA_URL", default="http://localhost:11434")
OLLAMA_MODEL = env("OLLAMA_MODEL", default="qwen2.5:3b")
OPENAI_BASE_URL = env("OPENAI_BASE_URL", default="http://glm-gateway.tail577250.ts.net:4000/v1")
OPENAI_API_KEY = env("OPENAI_API_KEY", default="")  # renseignée : l'assistant passe par la passerelle
OPENAI_MODEL = env("OPENAI_MODEL", default="")  # vide : premier modèle annoncé par la passerelle
ANTHROPIC_API_KEY = env("ANTHROPIC_API_KEY", default="")
ANTHROPIC_BASE_URL = env("ANTHROPIC_BASE_URL", default="https://api.anthropic.com")  # serveur Claude du réseau local
ANTHROPIC_MODEL = env("ANTHROPIC_MODEL", default="claude-haiku-4-5")
ASSISTANT_MIN_SCORE = env.float("ASSISTANT_MIN_SCORE", default=1.0)
AUDIT_RETENTION_DAYS = env.int("AUDIT_RETENTION_DAYS", default=1825)
# compte fermé (consentement « données personnelles » retiré) : délai avant effacement, à fixer avec le DPO
PRODUCER_RETENTION_DAYS = env.int("PRODUCER_RETENTION_DAYS", default=365)
# UC-24 : clés des partenaires d'interopérabilité (vide = partenaire désactivé)
INTEROP_KEYS = {p: env(f"INTEROP_KEY_{p.upper()}", default="") for p in ("xroad", "sonama", "fnda")}
VERIFY_THROTTLE_RATE = env("VERIFY_THROTTLE_RATE", default="30/min")
# P1/P2 : diagnostic, langues, marché (agent B)
MEDIA_ROOT = Path(env("MEDIA_ROOT", default=str(BASE_DIR / "media")))
DIAGNOSIS_THRESHOLD = env.float("DIAGNOSIS_THRESHOLD", default=0.6)
DIAGNOSIS_MAX_BYTES = env.int("DIAGNOSIS_MAX_BYTES", default=5 * 1024 * 1024)
DIAGNOSIS_RETENTION_DAYS = env.int("DIAGNOSIS_RETENTION_DAYS", default=90)
LANGUAGE_OPEN_THRESHOLD = env.float("LANGUAGE_OPEN_THRESHOLD", default=0.8)
PAYMENT_MAX_XOF = env.int("PAYMENT_MAX_XOF", default=500000)
FAKEPAY_DELAY_S = env.float("FAKEPAY_DELAY_S", default=3.0)

structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ]
)
