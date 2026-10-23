# Backend Agri-Digit Bénin (Django + gunicorn), prévu pour PostgreSQL (Supabase) et un hébergeur de conteneurs.
# Construction depuis la racine du dépôt :  docker build -t agri-digit-api .
# Toute la configuration passe par des variables d'environnement : voir backend/.env.supabase.example
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app/backend

# Dépendances d'abord : cette couche n'est reconstruite que si requirements.txt change.
COPY backend/requirements.txt .
RUN pip install -r requirements.txt

COPY backend/ /app/backend/
# Le backend lit les clés de traduction du français (seed des traductions) : seul ce dossier est copié.
COPY frontend/src/i18n/ /app/frontend/src/i18n/
COPY docker/entrypoint.sh /entrypoint.sh

RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh \
    && useradd --create-home --uid 10001 app \
    && mkdir -p /app/backend/media /app/backend/staticfiles \
    && chown -R app /app
USER app

ENV PORT=8000 DEBUG=false
EXPOSE 8000

# Prêt = l'API répond et la base est joignable.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:%s/api/v1/ref/value-chains' % os.environ.get('PORT','8000'), timeout=4)"

ENTRYPOINT ["/entrypoint.sh"]
