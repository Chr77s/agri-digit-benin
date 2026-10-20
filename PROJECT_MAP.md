# Carte du projet

## Backend (`backend/`, Django 5.2 + DRF, `/api/v1`)

Chaque module : `models`, `services` (règles métier), `selectors` (lectures), `api` (vues), `tests`.

| Module | Rôle | UC |
| --- | --- | --- |
| `apps/accounts` | Utilisateur (téléphone), rôles, périmètre, code à usage unique, JWT, `seed_demo` | 01, 02 |
| `apps/audit` | Journal non modifiable et chaîné par empreintes (vérification `GET /audit-logs/verify`), rétention, `purge_retention` | 03 |
| `apps/referentiel` | 10 filières, 12 départements, 77 communes | |
| `apps/producers` | Inscription (ANIP simulé), consentements, validation, versions | 04, 05 |
| `apps/parcels` | Parcelles GeoJSON, surface serveur (UTM 31N), chevauchement, campagnes | 08, 09 |
| `apps/knowledge` | Fiches, workflow brouillon/relu/publié, index BM25 | 14 |
| `apps/assistant` | Questions, citations, garde-fou dosage, journal sans donnée personnelle | 12 |
| `apps/alerts` | Alertes, seconde validation, notifications, boîte d'envoi simulée | 16 |
| `apps/programs` | Programmes (brouillon, critères, calendrier), candidatures et contestation d'un refus, sélection des bénéficiaires, contestations | 17, 18 |
| `apps/credit` | Consentement crédit, score explicable, consultation journalisée | 19, 20 |
| `apps/farms` | Fermes du POC (import en flux), agrégats | 22, 23 |
| `apps/dashboard` | Indicateurs avec source et date | 22 |
| `apps/exports` | Export CSV avec motif | 24 |
| `apps/cooperatives` | Coopératives, adhésions avec historique, demandes d'adhésion du producteur | 06 |
| `apps/production` | Appuis remis, confirmés ou signalés incomplets, récoltes et écart au rendement de référence ; sites et lots (`lots`) ; créances à échéances et remboursement en un clic (`recovery`, `recovery_api`) ; dépenses et revenu du producteur (`revenue`) | 10, 11 |
| `apps/diagnosis` | Diagnostic par photo simulé, EXIF retiré, « Pas sûr ? » vers l'agronome, relecture, purge | 13 |
| `apps/translations` | Entrées fon/bariba à valider, notes, ouverture à 80 % | 15 |
| `apps/market` | Offres, mise en relation, paiement FakePay | 21 |
| `apps/satellite` | NDVI et humidité de démonstration | 23 |
| `apps/interop` | Agrégats pseudonymisés pour X-Road, SONAMA, FNDA | 24 |
| `apps/lands` | Aménagements et travaux (réhabilitation, nouvel aménagement, entretien), analyses de sol et leur lecture, utilisation des terres (disponible, exploitable, exploitée), risques climatiques (`climate`) | |
| `apps/ussd` | Téléphone simple : menus USSD sans état (météo, prix, conseil, appuis, langue) et commandes SMS | |
| `apps/core` | Erreurs, pagination, permissions, périmètre | |
| `integrations/` | `anip`, `payment` (FakePay), `notifications` (SMS/vocal simulés), `llm`, `diagnosis`, `xroad`, `market_data` (météo et prix de démonstration partagés avec l'USSD) | |
| `tests/e2e_backend.py` | Scénario de démonstration rejoué par l'API | |

## Frontend (`frontend/`, Vite + React + TypeScript, PWA)

Une fonctionnalité par dossier de `src/features/` (accès, producteur, agent, pilotage, filière : voir `docs/PLAN_MVP.md`), `src/app` (routes, coque `Layout`), `src/shared/ui` (kit « Bénin Vert » : `kit.css`, `mobile.css`, jetons dans `tokens.ts`), `src/shared/api` (client et types), `src/i18n` (fr, fon, bba, yo, dnd ; textes français répartis en `src/i18n/fr/*.json`, contrôlés par `i18n/keys.test.ts`). Sous 640 px, la même PWA prend la présentation mobile de `maquettes/mobile/`. Maquettes de référence : `maquettes/`.

## Infra et docs

`infra/` (fichiers Docker et Nginx pour plus tard, non utilisés), `.github/workflows/ci.yml`, `docs/` (contrat d'API, décisions, conformité, mocks, UML, démo), `start.bat` / `start.sh`.
