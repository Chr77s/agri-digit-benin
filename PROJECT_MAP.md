# Carte du projet

## Backend (`backend/`, Django 5.2 + DRF, `/api/v1`)

Chaque module : `models`, `services` (règles métier), `selectors` (lectures), `api` (vues), `tests`.

| Module | Rôle | UC |
| --- | --- | --- |
| `apps/accounts` | Utilisateur (téléphone), rôles, périmètre, code à usage unique, JWT, `seed_demo` | 01, 02 |
| `apps/audit` | Journal non modifiable, rétention, `purge_retention` | 03 |
| `apps/referentiel` | 10 filières, 12 départements, 77 communes | |
| `apps/producers` | Inscription (ANIP simulé), consentements, validation, versions | 04, 05 |
| `apps/parcels` | Parcelles GeoJSON, surface serveur (UTM 31N), chevauchement, campagnes | 08, 09 |
| `apps/knowledge` | Fiches, workflow brouillon/relu/publié, index BM25 | 14 |
| `apps/assistant` | Questions, citations, garde-fou dosage, journal sans donnée personnelle | 12 |
| `apps/alerts` | Alertes, seconde validation, notifications, boîte d'envoi simulée | 16 |
| `apps/programs` | Programmes, candidatures, sélection des bénéficiaires, contestations | 17, 18 |
| `apps/credit` | Consentement crédit, score explicable, consultation journalisée | 19, 20 |
| `apps/farms` | Fermes du POC (import en flux), agrégats | 22, 23 |
| `apps/dashboard` | Indicateurs avec source et date | 22 |
| `apps/exports` | Export CSV avec motif | 24 |
| `apps/core` | Erreurs, pagination, permissions, périmètre | |
| `integrations/` | `anip`, `payment` (FakePay), `notifications` (SMS/vocal simulés), `llm`, `diagnosis`, `xroad` | |
| `tests/e2e_backend.py` | Scénario de démonstration rejoué par l'API | |

## Frontend (`frontend/`, Vite + React + TypeScript, PWA)

`src/features/<auth|producers|parcels|campaigns|assistant|knowledge|alerts|outbox|programs|selection|credit|dashboard|audit|admin|consents|legal>`, `src/shared/ui` (design system, jetons dans `tokens.ts`), `src/shared/api` (client et types), `src/i18n` (fr, fon, bba, yo, dnd).

## Infra et docs

`infra/` (docker-compose PostgreSQL + API + Nginx), `.github/workflows/ci.yml`, `docs/` (contrat d'API, décisions, conformité, mocks, UML, démo), `start.bat` / `start.sh`.
