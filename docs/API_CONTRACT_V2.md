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
- Demande d'adhésion : `GET /cooperatives/nearby` (producteur) liste les coopératives de son département dont il n'est pas membre, sans téléphone du gestionnaire, avec `request_status` (`en_attente|acceptee|refusee|null`) et `request_reason`. `POST /cooperatives/{id}/join-request {message?}` (producteur validé, même département) -> 201, 409 si déjà membre ou demande en attente ; le gestionnaire (à défaut les agents du département) est prévenu. `GET /join-requests?status=&cooperative=` (producteur : les siennes ; gestionnaire, agent, admin : leur périmètre). `POST /join-requests/{id}/decide {status: acceptee|refusee, reason}` (gestionnaire, agent, admin) : motif obligatoire pour un refus, l'acceptation crée l'adhésion (rôle `membre`), le producteur est prévenu. Une demande déjà traitée -> 400 `invalid_status`.

## UC-07 Carte producteur

- `GET /producers/{id}/card` (producteur lui-même, agent du périmètre) -> `{code, full_name, commune, department, status, verification_code (8 caractères), verify_url, issued_at}`. Seulement pour une fiche `valide`, sinon 400 `not_validated`.
- `GET /verify/{verification_code}` (public, limité en débit) -> `{status, full_name}` seulement. Code inconnu -> 404.

## UC-10 Appuis

- `POST /supports {producer, program?, item, quantity, unit, value_xof, repayable: bool}` (agent du périmètre) -> statut `remis`.
- `GET /supports?producer=` (producteur : les siens ; agent : périmètre).
- `POST /supports/{id}/confirm` (producteur concerné) -> statut `confirme`, `confirmed_at`. Notification à l'agent.
- `POST /supports/{id}/report {kind: manque|rien_recu}` (producteur concerné, appui encore `remis`) : l'appui reste à confirmer, l'agent qui l'a remis est prévenu, action journalisée (`support.issue`). 400 `invalid_kind` ou `invalid_status` (déjà confirmé).

## UC-11 Récolte et post-récolte

- `POST /harvests {campaign, harvested_at, quantity_kg, stored_kg, sold_kg, sale_price_xof_per_kg?}` (producteur ou agent). `stored_kg + sold_kg <= quantity_kg` sinon 400.
- Réponse : `{..., estimated_kg, deviation_pct, flagged: bool}`. Rendement de référence par filière (kg/ha, table paramétrable en base, valeurs de démonstration marquées) × surface de la parcelle. Écart absolu > 50 % -> `flagged: true` et signalement à l'agent.
- `GET /harvests?campaign=&flagged=&to_check=` : `to_check=true` renvoie les récoltes signalées pas encore tranchées (`check_status` `a_verifier` ou `visite`), `to_check=false` celles vérifiées (`confirmee`, `corrigee`). Chaque récolte porte `check_status`, `check_reason`, `checked_at` et `declared_kg` (quantité d'origine quand l'agent l'a corrigée).
- `POST /harvests/{id}/check {conclusion: confirmee|corrigee|visite, reason, quantity_kg?}` (agent du périmètre, administrateur) : motif obligatoire ; `corrigee` exige `quantity_kg` (au moins stock + ventes déclarés), garde l'originale dans `declared_kg` et recalcule l'écart et le signalement ; `visite` laisse la récolte à vérifier. Le producteur est prévenu d'une confirmation ou d'une correction. 400 `invalid_status` si la récolte n'est pas à vérifier, 403 pour un autre rôle. Action journalisée (`harvest.check`). L'indicateur SEA `harvests_flagged` compte les récoltes à vérifier.

## UC-13 Diagnostic par photo (simulé)

- `POST /diagnoses` multipart `{image (jpeg|png, 5 Mo max), value_chain}` -> `{id, pathology, pathology_label, confidence, status: auto|transmis_agronome|revu, advice, simulation: true}`. Seuil 0,6 (`DIAGNOSIS_THRESHOLD`) : en dessous, `transmis_agronome`. Les métadonnées EXIF (dont GPS) sont supprimées avant stockage. Aucune détection de visage : le texte d'aide demande de ne photographier que la plante.
- `GET /diagnoses` (producteur : les siens ; agronome : tous ceux `transmis_agronome`).
- `POST /diagnoses/{id}/review {pathology, comment}` (agronome) -> `revu`, notification au producteur.
- `POST /diagnoses/{id}/ask-agronome {note?}` (producteur propriétaire, note de 500 caractères au plus) : un diagnostic `auto` passe à `transmis_agronome` avec `producer_note`, lisible de l'agronome ; 400 `invalid_status` s'il est déjà transmis ou revu. Action journalisée (`diagnosis.ask_agronome`).
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
- Les cellules de moins de 5 producteurs sont masquées (`producers`, `area_ha`, `campaigns` à `null`, `masked: true`).
- Clés : une clé active par partenaire, gardée hachée (SHA-256) ; la clé de configuration `INTEROP_KEY_<PARTENAIRE>` reste acceptée. `POST /interop/keys/{partenaire}/renew` (administrateur) -> 201 `{key}` affichée une seule fois, les clés précédentes sont révoquées ; `POST /interop/keys/{partenaire}/revoke` -> `{revoked}`.
- `GET /interop/connectors` (administrateur) -> par partenaire `{configured, last_exchange_at, calls_24h, failures_24h, avg_ms, key: {masked, created_at, last_used_at} | null}`.
- `GET /interop/exchanges?partner=&failed=1` (administrateur, paginé) -> `{at, partner, ok, via, rows, status, ip}` ; un refus de clé est journalisé (`interop.denied`, adresse tronquée).

## UC-22 Indicateurs de suivi-évaluation

- `GET /dashboard/sea?department=` -> `{scope, indicators: [{key, label, value|null, unit, source, updated_at, breakdown?: [{label, value}]}]}`. Indicateurs : producteurs validés par filière, part de femmes, part de moins de 35 ans, surface par filière, campagnes par stade, taux d'acceptation des candidatures, taux de livraison des alertes, appuis remis et confirmés (valeur XOF), récoltes signalées, questions à l'assistant et taux d'escalade.

## UC-25 Conflits hors ligne

- `PATCH /producers/{id}` et `PATCH /campaigns/{id}` acceptent `base_version` (entier, version lue par le client). Si la version serveur est plus récente : 409 `{code: "conflict", server: <objet courant>, server_version}`. Le client renvoie avec `force: true` après choix de l'agent (le choix est journalisé).
- Chaque objet renvoie `version` (entier).

## UC-01 Changement de numéro (producteur)

- `POST /auth/phone-change/request {new_phone}` (producteur, limité en débit comme la connexion) -> code SMS (simulé) envoyé au nouveau numéro. 400 si le numéro est mal formé ou `same_phone` ; 409 `duplicate` s'il est déjà utilisé. Le personnel passe par l'administrateur (403).
- `POST /auth/phone-change/confirm {code}` (producteur) -> `{access, user}` : nouvelle session. 400 `no_pending_change`, `code_expired`, `invalid_code` (5 échecs = blocage, comme la connexion). La fiche producteur prend le numéro, avec une version « changement de numéro (code SMS) » ; l'ancien numéro reçoit un SMS d'avertissement ; action journalisée `user.phone_change`.
- `POST /consents/{id}/withdraw` sur le consentement `donnees_personnelles` ferme le compte : fiche `ferme`, connexion et renouvellement de session refusés (401), offres ouvertes `retiree`. Statuts de fiche possibles : `en_attente`, `valide`, `rejete`, `ferme`, `efface`.

## UC-03 Journal d'audit chaîné

- `GET /audit-logs` renvoie aussi `seq`, `prev_hash`, `hash`.
- `GET /audit-logs/verify` (auditeur, administrateur) -> `{ok, count, broken_seq, checked_at}` : recalcul de toute la chaîne ; `broken_seq` est le rang de la première entrée dont l'empreinte ou le lien ne correspond pas.

## UC-17 Programmes : brouillon, critères et calendrier

- `Program` ajoute `status` (`brouillon` | `publie`), `state` calculé (`brouillon`, `a_venir`, `ouvert`, `clos`), `opens_at`, `committee_at`, `departments` (vide = tout le Bénin), `max_area_ha` (total des parcelles), `planned_beneficiaries`, `require_campaign` (campagne déclarée sur une des filières du programme).
- `POST /programs` accepte `status: "brouillon"` (incomplet permis). Publier exige au moins une filière et une clôture au moins 14 jours après l'ouverture : sinon 400 avec `fields`.
- `PATCH /programs/{id}` (responsable, administrateur) : brouillon seulement (409 `published` sinon) ; `{"status": "publie"}` publie.
- `POST /programs/estimate {value_chains, departments, max_area_ha, require_campaign}` -> `{count}` de fiches validées qui remplissent ces critères.
- `POST /applications/{id}/contest {reason}` (producteur concerné) : conteste un refus, une seule fois et sous 15 jours après la décision (`decided_at`) ; la candidature repasse `en_instruction`, `contest_reason` et `contested_at` sont renseignés, les agents du département sont prévenus. 400 `invalid_status` (pas un refus), `already_contested`, `contest_window_closed`, `reason_required`. L'agent ou le responsable tranche de nouveau avec `decide`.
- Le producteur ne voit que les programmes publiés. `POST /programs/{id}/apply` refuse `not_published`, `not_open_yet`, `not_eligible` (critères non remplis).

## Téléphone simple : USSD et SMS (simulés)

- `POST /ussd/gateway {sessionId, phoneNumber, text}` -> `text/plain` « CON … » (l'écran attend une réponse) ou « END … » (fin). `text` est le chemin saisi depuis le début (« 4*1*1 »), comme les passerelles USSD courantes : aucun état côté serveur. Menus : 1 Météo, 2 Prix (6 filières), 3 Conseil (question libre, réponse de l'assistant), 4 Mes appuis (1 Je confirme, 2 Il en manque, 3 Rien reçu), 5 Langue. Textes sans accents, 182 caractères au plus. Conseil, appuis et langue : producteur validé seulement.
- `POST /sms/inbound {sender, text}` -> `{to, reply}` ; la réponse part aussi par le canal SMS simulé (boîte d'envoi). Commandes : `METEO`, `PRIX <FILIERE>` ; toute autre commande reçoit l'aide.
- Accès : ouvert en `DEMO_MODE` (simulateur de la boîte d'envoi), sinon réservé à la passerelle de l'opérateur qui présente `X-Gateway-Key: USSD_GATEWAY_KEY` ; sinon 404. 120 appels par minute et par adresse.
