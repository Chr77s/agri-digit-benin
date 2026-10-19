@echo off
rem Lance la demonstration des maquettes : double-cliquez sur ce fichier.
cd /d "%~dp0.."
start "" "http://127.0.0.1:8765/maquettes/index.html"
python -m http.server 8765 --bind 127.0.0.1
