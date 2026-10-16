# Architecture

## Style

Monolithe modulaire, un dépôt : `backend/` (Django 5 LTS, Django REST Framework), `frontend/` (React, Vite, TypeScript), `infra/` (Docker), `docs/`. Un seul déploiement, simple à transférer aux équipes du MAEP ; chaque module peut être extrait plus tard.

```
navigateur (PWA)  --/api-->  nginx (web)  --proxy-->  api Django (gunicorn :8000)  -->  PostgreSQL 16 (db)
     |  IndexedDB (file de synchronisation hors ligne)                 |  SQLite en repli local
     |  Web Speech API (voix FR)                                       |  integrations/ (ANIP, paiement, SMS, LLM, diagnostic, X-Road)
```

En local sans Docker : Vite (5173) proxifie `/api` vers `127.0.0.1:8000`, base SQLite.

## Modules backend (`backend/apps/`)

| Module | Rôle |
| --- | --- |
| `core` | erreurs au format du contrat, pagination par curseur, permissions par rôle et périmètre |
| `accounts` | utilisateurs, rôles, périmètres, connexion par code à usage unique, JWT |
| `audit` | journal d'audit non modifiable, écrit dans la même transaction que l'action |
| `referentiel` | filières, départements et communes |
| `producers` | inscription, vérification ANIP, consentements, versions, validation |
| `parcels` | parcelles GeoJSON (surface calculée par shapely et pyproj), campagnes |
| `knowledge` | fiches, versions, cycle brouillon, relu, publié ; import de `backend/data/knowledge/` |
| `assistant` | recherche BM25 (rank-bm25, racinisation française), `LLMBackend`, garde-fous |
| `alerts` | alertes, double validation des urgences, notifications, outbox |
| `programs` | programmes, candidatures, sélection, contestations, crédit (P1) |
| `farms` | import en flux des données POC, agrégats, requête par bbox |
| `dashboard` | indicateurs par rôle et périmètre, chacun avec source et date |
| `exports` | exports CSV avec motif, journalisés |

Dans chaque module : `models`, `services` (règles métier), `selectors` (lectures), `api` (vues et sérialiseurs), `tests`. Les vues ne portent aucune règle métier.

## Intégrations (`backend/integrations/`)

Une interface par intégration, une version simulée, une version réelle vide : `AnipClient`, `PaymentProvider` (FakePay ; FedaPay, KKiaPay, CinetPay vides), `NotificationChannel` (InApp réel ; SMS et vocal simulés vers `outbox`), `LLMBackend` (extractif, Ollama, Anthropic), `DiagnosisBackend` (simulé), `XRoadAdapter` (vide). Détail : `MOCKS.md`.

## Frontend

Organisation par fonctionnalité (`src/features/producers`, `parcels`, etc.), `shared/ui` pour le design system, `shared/api` pour le client typé. Aucun appel réseau dans les composants : hooks TanStack Query. Hors ligne : vite-plugin-pwa et Dexie. Langues : i18next (`fr` complet, `fon` et `bba` partiels non validés, `yo` et `dnd` vides).

## Flux principaux

1. Inscription : formulaire, `POST /producers/register`, `AnipClient.verify`, création `producer` (en attente) + `consent` + audit, notification à l'agent du périmètre.
2. Validation : l'agent valide, version enregistrée, notification au producteur (in-app et SMS simulé).
3. Assistant : question, retrait des données personnelles, détection des sujets à risque (dosage : escalade), BM25 sur les fiches publiées, génération par le premier `LLMBackend` disponible, réponse avec citation et mention indicative, journal sans donnée personnelle.
4. Alerte : création, seconde validation si urgente, envoi par canal, statut par message dans `outbox`.
5. Sélection : poids figés, calcul sur les exploitations POC, proposition, validation motivée par un autre agent, contestation.
6. Données POC : import serveur en flux au chargement, jamais envoyé au navigateur ; agrégats et bbox paginés.

## Choix et options écartées

| Retenu | Écarté | Raison |
| --- | --- | --- |
| Django + DRF | FastAPI seul | authentification, administration et migrations à réécrire |
| SPA React + Vite | Next.js | rendu serveur inutile, plus lourd hors ligne |
| PWA | Flutter | décision PWA d'abord, un seul code |
| Monolithe modulaire | microservices | coût et délai sans bénéfice à cette échelle |
| GeoJSON en JSON + shapely | GeoDjango | GDAL fragile sous Windows ; PostGIS reste une option de production |
| BM25 en mémoire | pgvector, embeddings externes | corpus petit, aucun service externe, aucune donnée hors du pays |
| Leaflet + OpenStreetMap | Google Maps, Firebase | services propriétaires, transferts hors du pays |
| Tâches synchrones et commandes de gestion | django-q2, Celery + Redis | délai du prototype ; Celery et Redis pour la production |

Décisions datées : `DECISIONS.md`.
