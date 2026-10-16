# Contrat d'API v1 (source de vérité pour backend et frontend)

Base : `/api/v1`. JSON, dates ISO 8601, UUID partout, montants en XOF (entiers). Le frontend passe par le proxy Vite (`/api` -> `http://127.0.0.1:8000`), donc même origine.

Erreurs : `{"detail": "message lisible en français", "code": "code_machine", "fields": {"champ": ["message"]}}` (fields facultatif). 400 validation, 401 non connecté, 403 interdit, 404 introuvable (aussi pour une donnée hors périmètre, IDOR), 409 doublon, 429 trop d'essais.

Listes paginées : `{"next": "<url|null>", "previous": "<url|null>", "results": [...]}` (pagination par curseur, `page_size` 20 par défaut, max 100).

Chaque réponse d'indicateur porte `source` et `updated_at`. Une valeur absente vaut `null` (le frontend affiche "non disponible").

## Comptes de démonstration (créés par `python manage.py seed_demo`)

| Rôle | Téléphone | Mot de passe | Périmètre |
| --- | --- | --- | --- |
| producteur | 0197000001 | (aucun, code seul) | Banikoara, Alibori |
| agent_atda | 0197000002 | AgriDemo-2026! | département Alibori |
| agronome_inrab | 0197000003 | AgriDemo-2026! | national |
| responsable_programme | 0197000004 | AgriDemo-2026! | national |
| admin_maep | 0197000005 | AgriDemo-2026! | national |
| auditeur_copil | 0197000006 | AgriDemo-2026! | national |
| agent_financier | 0197000007 | AgriDemo-2026! | national |

Téléphone béninois : 10 chiffres commençant par `01`. Code à usage unique : 6 chiffres, valable 10 min, 5 échecs = blocage 15 min.

## NPI de démonstration (`AnipClient` simulé)

| NPI | Prénom | Nom | Naissance | Cas |
| --- | --- | --- | --- | --- |
| 1000000001 | Bio | GOUNOU | 1985-03-12 | valide (déjà inscrit : producteur de démo 0197000001) |
| 1000000002 | Awa | SABI | 1990-07-01 | valide, libre (pour le scénario d'inscription) |
| 1000000003 | Koffi | HOUNSOU | 1978-11-20 | valide, libre |
| 1000000004 | Mariam | ZATO | 2011-05-04 | valide, mineure (< 16 ans, consentement parental) |
| 1000000005..1000000045 | | | | fiches des ~40 producteurs du seed |
| 9999999999 | | | | service ANIP indisponible (503 simulé) |
| tout autre | | | | NPI inconnu |

Format NPI : 10 chiffres (regex configurable `NPI_REGEX` dans `.env`).

## Auth
- `POST /auth/otp/request` `{phone}` -> 200 `{"detail": "Code envoyé", "requires_password": bool}`. Le code est écrit dans l'outbox (canal `sms`).
- `POST /auth/otp/verify` `{phone, code, password?}` -> 200 `{"access": "<jwt>", "user": User}` + cookie `refresh` HttpOnly SameSite=Lax path `/api/v1/auth/`.
- `POST /auth/refresh` (cookie) -> `{"access"}` ; `POST /auth/logout`.
- `GET /auth/me` -> `User`.
- `GET /demo/otp-inbox?phone=` (seulement si `DEMO_MODE=true`) -> `[{"body","created_at"}]` derniers codes de ce téléphone. Affiché sur la page de connexion dans un bandeau "Simulation".

`User` = `{id, phone, full_name, role, department, commune, producer_id|null, language}`.

## Référentiels (public)
- `GET /ref/value-chains` -> `[{code, name}]` codes : `coton, anacarde, ananas, mais, riz, soja, manioc, niebe, elevage, peche_aquaculture`.
- `GET /ref/departments` -> `[{code, name, communes: [{code, name}]}]` 12 départements, communes réelles.

## Producteurs
- `POST /producers/register` (public ou agent) `{npi, first_name, last_name, sex: "F"|"M", birth_date, department, commune, phone, language: "fr"|"fon"|"bba"|"yo"|"dnd", consent_accepted: true, consent_text_version: "v1", guardian_name?, guardian_npi?, guardian_consent?}` -> 201 `Producer`. Statut `en_attente`. 409 `{"detail","code":"duplicate","existing":{"id","code"}}`. 400 codes ANIP : `npi_unknown`, `name_mismatch`, `birthdate_mismatch` ; 503 `anip_unavailable`. Mineur sans consentement parental -> 400 `guardian_required`.
- `GET /producers?status=&department=&commune=&search=` (agent : son périmètre ; admin : tout ; producteur : lui-même).
- `GET /producers/{id}` ; `PATCH /producers/{id}` (correction agent, crée une version).
- `POST /producers/{id}/validate` ; `POST /producers/{id}/reject {reason}` (motif obligatoire). Notification au producteur.
- `GET /producers/{id}/versions`.
- `GET /consents/mine` ; `POST /consents/{id}/withdraw`.

`Producer` = `{id, code (BJ-AGR-2026-000123), npi, first_name, last_name, sex, birth_date, department, commune, phone, language, status: en_attente|valide|rejete, reject_reason, created_at, validated_at}`.

## Administration des comptes (admin_maep)
- `GET /admin/users` ; `POST /admin/users {phone, full_name, role, department?, commune?, password?}` ; `PATCH /admin/users/{id} {is_active?, role?, department?, commune?}`.

## Journal d'audit (auditeur_copil, admin_maep ; lecture seule)
- `GET /audit-logs?action=&actor=` -> `{id, at, actor_phone, actor_role, action, object_type, object_id, details}`.

## Parcelles et campagnes
- `GET /parcels?producer=` ; `POST /parcels {producer?, name, geometry: GeoJSON Polygon, land_type: pluvial_plateau|bas_fond|irrigue, tenure: propriete|location|pret|coutumier|autre}` -> `{id, ..., area_ha (calculée serveur), overlap_warning: bool, overlap_with: [id]}`. Le producteur crée pour lui-même.
- `GET /campaigns?parcel=` ; `POST /campaigns {parcel, value_chain, season ("2026-pluie-1"), stage: semis|croissance|floraison|recolte}` (une seule culture principale par parcelle et saison -> 400 sinon) ; `PATCH /campaigns/{id} {stage}`.

## Assistant
- `POST /assistant/ask {question, value_chain?, language?}` -> `{status: answered|unknown|escalated, answer, citations: [{doc_id, title, source, version}], disclaimer: "Conseil indicatif, vérifiez avec votre agent ATDA", backend: "extractive"|"ollama"|"anthropic"}`.

## Base de connaissances
- `GET /knowledge?value_chain=&status=&search=` ; `POST /knowledge {value_chain, title, body, source, language}` (agronome_inrab) ; `PATCH /knowledge/{id}` (nouvelle version) ; `POST /knowledge/{id}/review` ; `POST /knowledge/{id}/publish` ; `GET /knowledge/{id}/versions`.
- `KnowledgeDoc` = `{id, value_chain, title, body, source, version, status: brouillon|relu|publie, language, language_validation: valide|non_valide, updated_at}`.

## Alertes et notifications
- `GET /alerts` ; `POST /alerts {title, message, category: meteo|ravageur|programme|marche, severity: info|avertissement|urgent, department, communes: [], value_chains: []}` -> statut `brouillon` ; urgent : `en_attente_validation`.
- `POST /alerts/{id}/approve` (second agent ou admin, pas le créateur) ; `POST /alerts/{id}/send` -> `{sent, delivered, failed}`.
- `GET /notifications` (mes notifications in-app) ; `POST /notifications/{id}/read`.
- `GET /outbox?channel=` (agent, admin) -> `{id, channel: sms|voice, to (masqué 01****0001), body, segments, encoding: GSM-7|UCS-2, status: livre|echoue|lu, created_at}`.

## Programmes et sélection
- `GET /programs` ; `POST /programs {name, description, conditions, value_chains, closes_at}` (responsable_programme).
- `POST /programs/{id}/apply` (producteur) -> 201 `Application` ; clos -> 400 `{"code":"program_closed","detail":"Ce programme est clos depuis le JJ/MM/AAAA. Les candidatures ne sont plus acceptées."}`.
- `GET /applications` ; `POST /applications/{id}/decide {status: en_instruction|acceptee|refusee, reason}` (motif obligatoire si refusée).
- `POST /selection-runs {program?, department?, target_count, weights: {confidence, road_distance, area}}` -> `SelectionRun {id, weights, target_count, status: proposition|validee, selected_count, created_by, validated_by, validation_reason, created_at}`.
- `GET /selection-runs/{id}/candidates?selected=true|false` -> `{farm_id, department, commune, score, rank, selected, confidence, road_distance_m, area_ha}`.
- `POST /selection-runs/{id}/validate {reason}` (agent ou admin, pas le lanceur).
- `POST /selection-runs/{id}/contest {farm_id, reason}` -> `Contest {id, status: deposee}` ; `GET /selection-runs/{id}/contests`.

## Données POC et tableau de bord
- `GET /farms/aggregates?level=department|commune&department=` -> `[{name, farms, maize_ha, source, updated_at}]`.
- `GET /farms?bbox=minLon,minLat,maxLon,maxLat` (paginé).
- `GET /dashboard?department=` -> `{scope, indicators: [{key, label, value|null, unit, source, updated_at}]}`.

## Exports (admin_maep)
- `POST /exports {dataset: producers|parcels|farms_aggregates, reason}` (motif obligatoire, min 10 caractères) -> fichier CSV (`text/csv`), journalisé.

## Crédit (P1)
- `POST /credit/consent` / `POST /credit/consent/withdraw` (producteur) ; `GET /credit/scores/{producer_id}` (agent_financier, seulement si consentement actif) -> `{score, factors: [{name, weight, value, contribution}], disclaimer}` ; chaque consultation journalisée.
