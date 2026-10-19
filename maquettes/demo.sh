#!/bin/sh
# Lance la demonstration des maquettes (macOS / Linux) : sh maquettes/demo.sh
cd "$(dirname "$0")/.."
(sleep 1; (open "http://127.0.0.1:8765/maquettes/index.html" || xdg-open "http://127.0.0.1:8765/maquettes/index.html")) >/dev/null 2>&1 &
python3 -m http.server 8765 --bind 127.0.0.1
