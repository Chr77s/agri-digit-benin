#!/bin/sh
# Démarrage du conteneur : contrôles de configuration, migrations, puis gunicorn.
set -eu
cd /app/backend

# Hors développement, on refuse de démarrer avec une configuration qui exposerait les comptes.
case "${DEBUG:-false}" in
  true|True|1) ;;
  *)
    case "${SECRET_KEY:-}" in
      ""|dev-insecure-key-change-me|change-me*)
        echo "SECRET_KEY absente ou par défaut : démarrage refusé." >&2; exit 1 ;;
    esac
    case "${DATABASE_URL:-}" in
      postgres://*|postgresql://*) ;;
      *) echo "DATABASE_URL doit être une adresse PostgreSQL (Supabase) : démarrage refusé." >&2; exit 1 ;;
    esac
    if [ "${DEMO_MODE:-false}" = "true" ] && [ "${ALLOW_DEMO_MODE:-false}" != "true" ]; then
      echo "DEMO_MODE=true rend lisibles les codes de connexion de tous les comptes : démarrage refusé." >&2
      echo "Pour une démonstration volontaire, ajouter ALLOW_DEMO_MODE=true." >&2
      exit 1
    fi
    ;;
esac

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  python manage.py migrate --noinput
fi

# Données de démonstration : à activer une seule fois, sur une base neuve.
if [ "${SEED_DEMO:-false}" = "true" ]; then
  python manage.py seed_demo
fi

exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers "${WEB_CONCURRENCY:-2}" \
  --timeout "${GUNICORN_TIMEOUT:-60}" \
  --access-logfile -
