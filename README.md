# Agri-Digit Bénin, prototype de démonstration

Plateforme multi-filières du MAEP (registre des producteurs, parcelles, campagnes, assistant de conseil, alertes, programmes et sélection des bénéficiaires, tableau de bord, audit). Prototype de démonstration, données non officielles.

## Démarrer en 3 commandes

Windows : double-cliquer sur `start.bat` (le navigateur s'ouvre tout seul). Pour repartir de données neuves : `start.bat reset` dans un terminal. Linux ou macOS :

```bash
git clone <depot> agri-digit-benin
cd agri-digit-benin
./start.sh
```

Puis ouvrir http://localhost:5173. Comptes, données à saisir et scénario : [docs/DEMO.md](docs/DEMO.md). Le code de connexion s'affiche dans le bandeau « Simulation » de la page de connexion.

Prérequis : Python 3.11, Node 20 ou plus. Pas de Docker : la base est SQLite, dans `backend/db.sqlite3`. Le premier lancement installe tout (5 à 10 minutes, accès à Internet nécessaire) ; les suivants prennent quelques secondes.

## Organisation

| Dossier | Contenu |
| --- | --- |
| `backend/` | Django 5.2 + DRF, modules dans `backend/apps/`, intégrations (ANIP, paiement, SMS, LLM, diagnostic, X-Road) dans `backend/integrations/` |
| `frontend/` | Vite + React + TypeScript, PWA, organisé par fonctionnalité (`src/features/`) |
| `infra/` | fichiers Docker et nginx pour un déploiement ultérieur, non utilisés ni testés (la démonstration n'en a pas besoin) |
| `docs/` | contrat d'API, décisions, conformité (loi 2017-20), mocks, UML, démonstration |

## Tests

```bash
cd backend && .venv/Scripts/python -m pytest
```

```bash
cd frontend && npm test
```

Scénario de bout en bout par l'API (serveur lancé) : `backend/.venv/Scripts/python backend/tests/e2e_backend.py`.

Documentation : [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/API_CONTRACT.md](docs/API_CONTRACT.md), API interactive sur http://127.0.0.1:8000/api/docs/. Bilan : [RAPPORT_FINAL.md](RAPPORT_FINAL.md).
