#!/usr/bin/env bash
# Agri-Digit Bénin : installation et lancement de la démonstration (Linux, macOS)
#   ./start.sh          installe ce qui manque, puis lance la démonstration
#   ./start.sh reset    remet les données de démonstration à zéro, puis lance
set -euo pipefail
cd "$(dirname "$0")"

PY=${PYTHON:-python3.11}
command -v "$PY" >/dev/null || PY=python3
command -v node >/dev/null || { echo "Node.js 20 ou plus est introuvable."; exit 1; }

echo "[1/5] Environnement Python"
[ -x backend/.venv/bin/python ] || "$PY" -m venv backend/.venv
backend/.venv/bin/python -m pip install -q -r backend/requirements.lock
[ -f backend/.env ] || cp backend/.env.example backend/.env

echo "[2/5] Base de données et données de démonstration"
if [ "${1:-}" = reset ]; then
  if [ -f backend/db.demo-vierge.sqlite3 ]; then cp backend/db.demo-vierge.sqlite3 backend/db.sqlite3
  else rm -f backend/db.sqlite3; fi
fi
FIRST=0; [ -f backend/db.sqlite3 ] || FIRST=1
(cd backend && .venv/bin/python manage.py migrate --noinput && .venv/bin/python manage.py seed_demo)
if [ "$FIRST" = 1 ]; then
  echo "Import des 200 000 fermes du POC : une à deux minutes, une seule fois."
  (cd backend && .venv/bin/python manage.py import_poc_farms)
  cp backend/db.sqlite3 backend/db.demo-vierge.sqlite3
fi

echo "[3/5] Dépendances du frontend"
[ -d frontend/node_modules ] || (cd frontend && npm ci)

echo "[4/5] Démarrage API (8000) et frontend (5173)"
(cd backend && .venv/bin/python manage.py runserver 127.0.0.1:8000) &
API_PID=$!
trap 'kill $API_PID 2>/dev/null' EXIT
echo "[5/5] Ouvrez http://localhost:5173  (guide pas à pas : docs/DEMO.md ; données neuves : ./start.sh reset)"
cd frontend && npm run dev -- --host 127.0.0.1 --port 5173
