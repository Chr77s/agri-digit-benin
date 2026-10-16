#!/usr/bin/env bash
# Agri-Digit Bénin : installation et démarrage du prototype (Linux, macOS)
set -euo pipefail
cd "$(dirname "$0")"

PY=${PYTHON:-python3.11}
command -v "$PY" >/dev/null || PY=python3

echo "[1/5] Environnement Python"
[ -x backend/.venv/bin/python ] || "$PY" -m venv backend/.venv
backend/.venv/bin/python -m pip install -q -r backend/requirements.lock
[ -f backend/.env ] || cp backend/.env.example backend/.env

echo "[2/5] Base de données et données de démonstration"
FIRST=0; [ -f backend/db.sqlite3 ] || FIRST=1
(cd backend && .venv/bin/python manage.py migrate --noinput \
  && .venv/bin/python manage.py seed_demo \
  && { [ "$FIRST" = 0 ] || .venv/bin/python manage.py import_poc_farms; })

echo "[3/5] Dépendances du frontend"
[ -d frontend/node_modules ] || (cd frontend && npm ci)

echo "[4/5] Démarrage API (8000) et frontend (5173)"
(cd backend && .venv/bin/python manage.py runserver 127.0.0.1:8000) &
API_PID=$!
trap 'kill $API_PID 2>/dev/null' EXIT
echo "[5/5] Ouvrez http://localhost:5173  (comptes : docs/DEMO.md)"
cd frontend && npm run dev -- --host 127.0.0.1 --port 5173
