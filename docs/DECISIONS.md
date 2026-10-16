# Journal des décisions

| Date | Décision | Raison | Impact |
| --- | --- | --- | --- |
| 2026-10-16 13:26 (UTC+1) | Lecture du MASTER PROMPT, démarrage. Échéance 15h00 : ~94 min. Niveau retenu : P0 complet, P1 si temps restant. | Plus de 60 min restantes. | Périmètre P0 prioritaire. |
| 2026-10-16 13:30 | Projet placé dans `C:\Users\Chris Nahum\Projets\agri-digit-benin` au lieu de `Documents\MTDI\Agri-Digit`. | La protection Windows « Dossiers contrôlés » empêche Python d'écrire dans Documents (base, migrations). | Aucun réglage de sécurité modifié. |
| 2026-10-16 13:28 | SQLite par défaut (`DATABASE_URL=sqlite:///db.sqlite3`), `docker-compose.yml` PostgreSQL 16 fourni. | Docker installé mais démon arrêté sur le PC. | Le code fonctionne sur les deux bases (GeoJSON en JSON). |
| 2026-10-16 13:28 | Python 3.11 (`py -3.11`) pour le venv backend. | Python 3.15 par défaut, trop récent pour certaines dépendances. | `start.bat` utilise `py -3.11`. |
| 2026-10-16 13:28 | Contrat d'API écrit à la main avant le code (`docs/API_CONTRACT.md`), OpenAPI généré ensuite par drf-spectacular. | Backend et frontend développés en parallèle par agents. | Le frontend suit le contrat ; client typé à la main au lieu d'`openapi-typescript` (gain de temps). |
| 2026-10-16 13:28 | Pas de django-q2 ni MSW dans le prototype : purge et envois exécutés en synchrone / commande de gestion. | Délai. | Évolution listée dans RAPPORT_FINAL. |
