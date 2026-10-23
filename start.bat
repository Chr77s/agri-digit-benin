@echo off
rem Agri-Digit Benin : installation et lancement de la demonstration (Windows)
rem   start.bat          installe ce qui manque, puis lance la demonstration
rem   start.bat reset    remet les donnees de demonstration a zero, puis lance
rem   Pour ne pas ouvrir le navigateur : set AGRI_NO_BROWSER=1
setlocal
cd /d "%~dp0"

echo [1/5] Verification des outils
where node >nul 2>&1 || (echo Node.js 20 ou plus est introuvable. Installez-le depuis nodejs.org & goto :err)
if not exist backend\.venv\Scripts\python.exe (
  py -3.11 --version >nul 2>&1 || (echo Python 3.11 est introuvable. Installez-le depuis python.org & goto :err)
  py -3.11 -m venv backend\.venv || goto :err
)
netstat -ano | findstr /R /C:":8000 .*LISTENING" /C:":5173 .*LISTENING" >nul && (
  echo Le port 8000 ou 5173 est deja utilise : une demonstration tourne peut-etre deja.
  echo Fermez les fenetres "Agri-Digit API" et "Agri-Digit Web", puis relancez.
  goto :err
)

echo [2/5] Dependances Python
backend\.venv\Scripts\python -m pip install -q -r backend\requirements.lock || goto :err
if not exist backend\.env copy backend\.env.example backend\.env >nul

echo [3/5] Base de donnees et donnees de demonstration
pushd backend
if /i "%~1"=="reset" (
  if exist db.demo-vierge.sqlite3 (copy /y db.demo-vierge.sqlite3 db.sqlite3 >nul) else (del db.sqlite3 2>nul)
)
set FIRST=0
if not exist db.sqlite3 set FIRST=1
.venv\Scripts\python manage.py migrate --noinput || goto :errp
.venv\Scripts\python manage.py seed_demo || goto :errp
if "%FIRST%"=="1" (
  echo Import des 200 000 fermes du POC : une a deux minutes, une seule fois.
  .venv\Scripts\python manage.py import_poc_farms || goto :errp
  copy /y db.sqlite3 db.demo-vierge.sqlite3 >nul
)
popd

echo [4/5] Dependances du frontend
if not exist frontend\node_modules (
  pushd frontend
  call npm ci || goto :errp
  popd
)

echo [5/5] Demarrage de l'API (8000) et du frontend (5173)
start "Agri-Digit API" cmd /k "cd /d %~dp0backend && .venv\Scripts\python manage.py runserver 127.0.0.1:8000"
start "Agri-Digit Web" cmd /k "cd /d %~dp0frontend && npm run dev -- --host 127.0.0.1 --port 5173"

set /a N=0
:wait
set OK=1
curl -sf -o nul http://127.0.0.1:8000/api/v1/ref/departments || set OK=0
curl -sf -o nul http://127.0.0.1:5173/ || set OK=0
if "%OK%"=="1" goto :ready
set /a N+=1
if %N% geq 90 goto :slow
ping -n 2 127.0.0.1 >nul
goto :wait

:slow
echo Le demarrage est plus long que prevu : regardez les deux fenetres noires, puis ouvrez http://localhost:5173
goto :end

:ready
if not defined AGRI_NO_BROWSER start http://localhost:5173
echo.
echo La demonstration tourne sur http://localhost:5173  (guide pas a pas : docs\DEMO.md)
echo Pour l'arreter : fermez les fenetres "Agri-Digit API" et "Agri-Digit Web".
echo Pour repartir de donnees neuves : start.bat reset

:end
exit /b 0

:errp
popd
:err
echo.
echo Echec du lancement. Voir le message ci-dessus.
pause
exit /b 1
