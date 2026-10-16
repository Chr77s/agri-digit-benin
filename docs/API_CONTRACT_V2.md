# Contrat d'API v2 : fonctionnalités complémentaires (P1 et P2)

Complète `API_CONTRACT.md` (mêmes conventions : `/api/v1`, erreurs `{detail, code, fields}`, UUID, XOF entiers, 404 hors périmètre). Les listes nouvelles sont paginées par curseur `{next, previous, results}`.

## Nouveaux comptes de démonstration (mot de passe `AgriDemo-2026!`)

| Rôle | Téléphone | Périmètre |
| --- | --- | --- |
| gestionnaire_cooperative | 0197000008 | coopérative « Coopérative des producteurs de maïs de Banikoara » |
| transformateur | 0197000009 | Parakou, Borgou |
| distributeur | 0197000010 | Cotonou, Littoral |
| repr_mtdi | 0197000011 | national |

## Filières de réserve

`/ref/value-chains` renvoie aussi `igname`, `maraichage`, `palmier_huile` avec `reserve: true`. Les 10 filières principales ont `reserve: false`.

## UC-06 Coopératives

- `GET /cooperatives?department=&search=`, `POST /cooperatives {name, department, commune, value_chains, registration_number?}` (agent, admin).
- `GET /cooperatives/{id}` -> `{id, name, department, commune, value_chains, members_count, manager_phone}`.
- `GET /cooperatives/{id}/members?active=true|false` -> `{id, producer_id, producer_code, producer_name, role: membre|president|tresorier|secretaire, joined_at, left_at|null}`.
- `POST /cooperatives/{id}/members {producer, role}` (agent, gestionnaire de cette coopérative). Un producteur peut appartenir à plusieurs coopératives. Doublon actif -> 409.
- `POST /memberships/{id}/end {reason}` : renseigne `left_at`, l'historique est conservé.
- Le gestionnaire ne voit que ses coopératives. Le producteur voit ses adhésions via `GET /memberships/mine`.

## UC-07 Carte producteur

- `GET /producers/{id}/card` (producteur lui-même, agent du périmètre) -> `{code, full_name, commune, department, status, verification_code (8 caractères), verify_url, issued_at}`. Seulement pour une fiche `valide`, sinon 400 `not_validated`.
- `GET /verify/{verification_code}` (public, limité en débit) -> `{status, full_name}` seulement. Code inconnu -> 404.

## UC-10 Appuis

- `POST /supports {producer, program?, item, quantity, unit, value_xof, repayable: bool}` (agent du périmètre) -> statut `remis`.
- `GET /supports?producer=` (producteur : les siens ; agent : périmètre).
- `POST /supports/{id}/confirm` (producteur concerné) -> statut `confirme`, `confirmed_at`. Notification à l'agent.

## UC-11 Récolte et post-récolte

- `POST /harvests {campaign, harvested_at, quantity_kg, stored_kg, sold_kg, sale_price_xof_per_kg?}` (producteur ou agent). `stored_kg + sold_kg <= quantity_kg` sinon 400.
- Réponse : `{..., estimated_kg, deviation_pct, flagged: bool}`. Rendement de référence par filière (kg/ha, table paramétrable en base, valeurs de démonstration marquées) × surface de la parcelle. Écart absolu > 50 % -> `flagged: true` et signalement à l'agent.
- `GET /harvests?campaign=&flagged=`.

## UC-13 Diagnostic par photo (simulé)

- `POST /diagnoses` multipart `{image (jpeg|png, 5 Mo max), value_chain}` -> `{id, pathology, pathology_label, confidence, status: auto|transmis_agronome|revu, advice, simulation: true}`. Seuil 0,6 (`DIAGNOSIS_THRESHOLD`) : en dessous, `transmis_agronome`. Les métadonnées EXIF (dont GPS) sont supprimées avant stockage. Aucune détection de visage : le texte d'aide demande de ne photographier que la plante.
- `GET /diagnoses` (producteur : les siens ; agronome : tous ceux `transmis_agronome`).
- `POST /diagnoses/{id}/review {pathology, comment}` (agronome) -> `revu`, notification au producteur.
- Image servie seulement à son propriétaire et à l'agronome : `GET /diagnoses/{id}/image`. Suppression automatique par `purge_retention` (90 jours par défaut).

## UC-15 Validation linguistique

- Table `TranslationEntry {key, language: fon|bba|yo|dnd, source_text (fr), text, status: a_traduire|propose|valide|rejete, average_score, reviews_count}`. `seed_demo` crée une entrée par clé de `frontend/src/i18n/fr.json` pour `fon` et `bba`.
- `GET /translations?language=&status=` (repr_mtdi, admin).
- `PATCH /translations/{id} {text}` (repr_mtdi) -> `propose`.
- `POST /translations/{id}/review {score: 1..5, comment}` (repr_mtdi, pas l'auteur du texte) ; `score >= 4` passe à `valide`, `<= 2` à `rejete`.
- `GET /translations/summary` -> `[{language, total, valide, average_score, open_to_producers}]`. Une langue est ouverte aux producteurs si au moins 80 % des clés sont `valide` (`LANGUAGE_OPEN_THRESHOLD`).
- `GET /i18n/{language}.json` (public) -> dictionnaire clé -> texte des seules entrées `valide`, `{}` si la langue n'est pas ouverte. Le frontend fusionne ce dictionnaire, avec repli sur le français.

## UC-17 Contestation par le producteur

- `GET /selection-runs` pour un producteur : seulement les sélections `validee`, sans les candidats.
- `POST /selection-runs/{id}/contest {farm_id, reason}` autorisé au producteur. `GET /contests/mine`.
- `POST /contests/{id}/decide {status: acceptee|rejetee, reason}` (agent, admin) : motif obligatoire, notification au producteur.

## UC-21 Offres, mise en relation, paiement simulé

- `GET /offers?type=offre|demande&value_chain=&department=`, `POST /offers {type, value_chain, quantity_kg, price_xof_per_kg, department, commune, description}` (producteur, transformateur, distributeur, gestionnaire de coopérative). Statuts : `ouverte|en_relation|conclue|retiree`.
- `POST /offers/{id}/contact {message}` -> `Match {id, offer, requester, status: proposee|acceptee|refusee}`. Le téléphone de l'autre partie n'est révélé qu'après acceptation. `POST /matches/{id}/accept`, `POST /matches/{id}/refuse`. `GET /matches/mine`.
- `POST /payments {match, amount_xof, payer_phone}` via `PaymentProvider` (`FakePay`). Plafond `PAYMENT_MAX_XOF` (500 000) -> 400 `amount_over_limit`. Réponse `{id, status: en_attente, provider: "FakePay", reference}`.
- `GET /payments/{id}` : FakePay passe `en_attente` -> `reussi` après environ 3 s. Les numéros se terminant par `0` échouent (`echoue`), pour la démonstration. Champ `receipt {reference, amount_xof, payer_masked, payee_masked, paid_at}` si réussi.
- `POST /payments/{id}/refund` (admin) -> `rembourse`. Toutes les transitions sont journalisées dans l'audit.

## UC-23 Suivi satellite (données de démonstration)

- `GET /satellite?department=` -> `{source: "Données de démonstration (POC), non officielles", results: [{department, commune|null, ndvi, soil_moisture_pct, acquired_at, sensor: "Sentinel-2 (démonstration)"}]}`. Valeurs générées de façon déterministe et datées.

## UC-24 Interopérabilité

- `GET /interop/{partner}/aggregates` où `partner` vaut `xroad|sonama|fnda`, en-tête `X-Api-Key` (clé dans `.env` : `INTEROP_KEY_<PARTNER>`), ou admin connecté. Renvoie des agrégats pseudonymisés par département et filière (producteurs validés, surface, campagnes), sans aucune donnée personnelle. Chaque appel est journalisé.
- `POST /exports` accepte aussi `dataset: cooperatives|harvests|supports`.

## UC-22 Indicateurs de suivi-évaluation

- `GET /dashboard/sea?department=` -> `{scope, indicators: [{key, label, value|null, unit, source, updated_at, breakdown?: [{label, value}]}]}`. Indicateurs : producteurs validés par filière, part de femmes, part de moins de 35 ans, surface par filière, campagnes par stade, taux d'acceptation des candidatures, taux de livraison des alertes, appuis remis et confirmés (valeur XOF), récoltes signalées, questions à l'assistant et taux d'escalade.

## UC-25 Conflits hors ligne

- `PATCH /producers/{id}` et `PATCH /campaigns/{id}` acceptent `base_version` (entier, version lue par le client). Si la version serveur est plus récente : 409 `{code: "conflict", server: <objet courant>, server_version}`. Le client renvoie avec `force: true` après choix de l'agent (le choix est journalisé).
- Chaque objet renvoie `version` (entier).
