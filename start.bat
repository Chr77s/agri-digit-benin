@echo off
rem Agri-Digit Benin : installation et demarrage du prototype (Windows)
setlocal
cd /d "%~dp0"

echo [1/5] Environnement Python (3.11)
if not exist backend\.venv\Scripts\python.exe (
  py -3.11 -m venv backend\.venv || (echo Python 3.11 introuvable. Installez-le depuis python.org & pause & exit /b 1)
)
backend\.venv\Scripts\python -m pip install -q -r backend\requirements.lock || goto :err
if not exist backend\.env copy backend\.env.example backend\.env >nul

echo [2/5] Base de donnees et donnees de demonstration
pushd backend
.venv\Scripts\python manage.py migrate --noinput || goto :errp
.venv\Scripts\python manage.py seed_demo || goto :errp
.venv\Scripts\python manage.py import_poc_farms || goto :errp
popd

echo [3/5] Dependances du frontend
pushd frontend
if not exist node_modules call npm ci || goto :errp
popd

echo [4/5] Demarrage de l'API (port 8000) et du frontend (port 5173)
start "Agri-Digit API" cmd /k "cd /d %~dp0backend && .venv\Scripts\python manage.py runserver 127.0.0.1:8000"
start "Agri-Digit Web" cmd /k "cd /d %~dp0frontend && npm run dev -- --host 127.0.0.1 --port 5173"

echo [5/5] Ouvrez http://localhost:5173  (comptes : docs\DEMO.md)
timeout /t 6 >nul
start http://localhost:5173
exit /b 0

:errp
popd
:err
echo Echec de l'installation. Voir le message ci-dessus.
pause
exit /b 1
