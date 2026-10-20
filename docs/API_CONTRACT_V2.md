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

## Recouvrement et revenu (TDR § 3.1 : recouvrement des appuis, paiement en un clic, suivi du revenu)

- `POST /supports` accepte `repay_installments` (1 à 12, défaut 3) et `repay_first_due` (date non passée ; défaut : 90 jours après la confirmation). Une créance `appui` s'ouvre quand le producteur **confirme la réception** d'un appui `repayable` (jamais à la remise). Un don n'ouvre rien.
- `GET /claims` (curseur, `?kind=appui|pret|plateau`) -> créances visibles : `{id, kind, label, amount_xof, paid_xof, outstanding_xof, overdue_xof, status (solde|en_retard|en_cours), debtor, department, next_due_on, next_amount_xof, installments[{rank, due_on, amount_xof, paid_xof, status (payee|en_retard|partielle|a_venir)}]}`. Le débiteur voit les siennes ; l'institution financière ses prêts ; l'agent ATDA les appuis et équipements de son département ; administrateur, responsable de programme et auditeur tous les appuis et équipements, **jamais les prêts**. `debtor` est le code du producteur, jamais son téléphone.
- `POST /claims {kind: "pret", producer, label, amount_xof, installments?, first_due?}` (institution financière, producteur ayant un consentement crédit actif, sinon 404) ; `{kind: "plateau", debtor_phone, ...}` (agent dans son périmètre, administrateur ; débiteur = transformateur). Échéancier en parts égales tous les 30 jours, le reste sur la dernière. Journalisé `claim.open`, le débiteur est prévenu.
- `GET /claims/{id}` -> la créance et `payments[]`. `GET /claims/portfolio` -> `{total, by_kind, by_department}` avec `count, amount_xof, paid_xof, outstanding_xof, overdue_xof, overdue_count, recovery_rate` (part des échéances échues déjà payées ; `null` tant qu'aucune n'est échue).
- `POST /claims/{id}/pay {payer_phone, amount_xof?}` (débiteur seul ; sans montant : la prochaine échéance ou son reste) -> 201 `{id, status: "en_attente", reference "AGR-…"}` ; 409 `payment_pending` s'il y en a déjà un, 400 `settled`, `amount_over_limit`, `validation_error`. `GET /claim-payments/{id}` rafraîchit auprès du fournisseur (FakePay, SIMULÉ) ; à la réussite le montant est imputé sur les échéances les plus anciennes et créancier et débiteur sont prévenus.
- Rappels : `manage.py remind_claims` (à planifier chaque jour) prévient des échéances dans 7 jours ou en retard, une fois par semaine au plus.
- Score de crédit : le facteur « Appuis remboursés » vaut la part des échéances échues payées (appuis et prêts) ; 0,5 tant qu'aucune n'est échue (`docs/MODEL_CARD.md`).
- `GET|POST /expenses`, `DELETE /expenses/{id}` (producteur ; `GET ?producer=` pour l'agent) : `{campaign?, category (intrants|main_oeuvre|mecanisation|transport|autre), label?, amount_xof, spent_on}`, pas de date future.
- `GET /revenue?season=` (producteur ; agent et administrateur avec `?producer=`) -> `{sales_xof, expenses_xof, repayments_xof, net_xof, net_per_ha_xof, unpriced_harvests, free_supports_xof, market_received_xof, seasons[], by_campaign[]}`. Ventes = `sold_kg × sale_price_xof_per_kg` des récoltes ; une vente sans prix n'est pas devinée (`unpriced_harvests`). Dépenses sans campagne et remboursements ne comptent que sans filtre de campagne.

## Terres, aménagements, sols et climat (TDR § 3.1 : aménagements, analyses des sols et des terres, risques climatiques)

- `PATCH /parcels/{id} {arable_ha}` (producteur, agent) : superficie exploitable déclarée, entre 0 et `area_ha` (mesurée par le serveur) ; `null` = toute la surface. `Parcel` renvoie aussi `arable_ha`.
- `GET /schemes` (`?kind=bas_fond|irrigue|plateau`) -> `{results: [{id, name, kind, department, commune, lat, lon, area_available_ha, area_arable_ha, area_used_ha, status (projet|operationnel|a_rehabiliter|en_travaux), works[]}]}` ; l'agent et le producteur ne voient que leur département. `POST /schemes` (agent dans son secteur, administrateur) exige `exploitée ≤ exploitable ≤ disponible` ; `PATCH /schemes/{id}` modifie les superficies et l'état (`projet|operationnel|a_rehabiliter`), 409 `works_running` tant que des travaux sont en cours.
- `POST /schemes/{id}/works {type (rehabilitation|nouvel_amenagement|entretien), title, planned_on?, cost_xof?, contractor?, notes?}` ; `PATCH /works/{id} {status (en_cours|termine|abandonne), progress_pct, cost_xof, contractor, notes}`. Transitions : `planifie → en_cours → termine`, `planifie|en_cours → abandonne` ; des travaux clos ne se modifient plus. Effet sur l'aménagement (sauf entretien) : réhabilitation planifiée → `a_rehabiliter`, en cours → `en_travaux`, terminés → `operationnel`, abandonnés → `a_rehabiliter` (réhabilitation) ou `projet` (nouvel aménagement). Un nouvel aménagement ne s'ouvre que sur un aménagement `projet`.
- `GET /land-use?season=` (agent, administrateur, responsable, auditeur) -> `{season, seasons[], parcels[{department, land_type, count, available_ha, arable_ha, used_ha}], schemes[{kind, count, available_ha, arable_ha, used_ha}]}`. Exploitée = exploitable des parcelles qui portent une campagne de la saison (la plus récente par défaut).
- `GET|POST /soil-analyses` (`?parcel=`) : `POST {parcel, sampled_on, laboratory?, ph (3 à 10), organic_matter_pct, phosphorus_ppm?, texture?}` par l'agent seulement (403 pour le producteur), pas de date future ; la réponse porte `findings[{code, level (ok|attention|alerte), text}]` et `reference`. Les textes ne contiennent aucune dose. `GET /soil-analyses/summary` -> par département : `analyses, ph_mean, acid_share, low_organic_share, low_phosphorus_share`.
- `GET /climate-risks` (producteur : ses parcelles ; agent et administrateur : `?producer=`) -> par parcelle `{stage, land_type, risks: {stress_hydrique, secheresse, inondation}: {level (faible|moyen|eleve), ...mesures}, advice[], source, simulated, updated_at}`. `GET /climate-risks/departments` (agent : son département ; administrateur, responsable, auditeur : les douze) : même évaluation au centre du département. `simulated: true` quand Open-Meteo ne répond pas. Modèle et seuils : `docs/MODEL_CARD.md` § 5.

## Suivi-évaluation, couverture nationale, carte des acteurs, qualité des modèles (TDR § 3.1 et § 3.4)

**SEA détaillé** (agent dans son département, administrateur, responsable de programme, représentant MTDI ; `?department=` pour les rôles nationaux). Producteurs validés seulement. Toute case de moins de 5 personnes est `null` avec `masked: true` pour tout rôle autre que l'administrateur ; un `null` s'affiche « non disponible » ou « masqué », jamais 0.
- `GET /dashboard/sea/production?season=` -> `{scope, source, updated_at, min_cell, seasons[], rows[{value_chain, season, masked, producers, parcels, quantity_kg, yield_kg_ha}]}`. Quantités récoltées (corrigées par l'agent quand il a vérifié) ; rendement = quantité ÷ surface des parcelles récoltées.
- `GET /dashboard/sea/workforce` -> `{scope, source, min_cell, age_limit: 35, by_department[], by_value_chain[]}`, chaque ligne `{key, total, f_u35, f_o35, m_u35, m_o35, masked}` (femmes/hommes, moins de 35 ans / 35 ans et plus). Quand une seule case est sous 5, la plus petite autre case de la ligne est masquée aussi. Un producteur de deux filières compte dans les deux.
- `GET /dashboard/sea/impact?season=` -> `{scope, source, min_group: 5, window_days: 365, warning, overall, excluded, cells[], by_program[]}`. Traités : appui `confirme` dans les 365 jours avant la première récolte ; témoins : aucun appui remis dans cette période ; `excluded` = appui remis mais non confirmé avant la récolte. `cells[{department, value_chain, season, n_treated, n_control, mean_treated, mean_control, gap_pct, available}]` (rendements en kg/ha, écart en %) ; `overall` et `by_program[{program, name, n_treated, gap_pct, available, cells_used}]` : moyenne des écarts des cellules où les deux groupes ont au moins 5 producteurs, pondérée par les traités. Sinon `available: false`, `gap_pct: null`. `warning` : la comparaison n'est pas causale (aucun tirage au hasard).

**Couverture de la consommation nationale** (lecture : administrateur, responsable, auditeur, agent ; écriture : administrateur, responsable).
- `GET /national-coverage?value_chain=` -> `{thresholds: {coverage_min_pct: 80, imports_rise_pct: 20, production_drop_pct: 15}, demo_source, can_edit, chains[{value_chain, series[], latest}], alerts[]}`. Une ligne : `{id, year, production_t, consumption_t, imports_t, exports_t, coverage_pct, import_dependency_pct, production_change_pct, consumption_change_pct, imports_change_pct, coverage_change_pts, source, demo, updated_at}` ; une valeur inconnue ou un calcul impossible vaut `null`, une variation n'existe que si l'année précédente est saisie. `alerts[{value_chain, year, kind (couverture_faible|importations_en_hausse|production_en_baisse), value, threshold, source, demo}]` : veille sur la dernière année saisie de chaque filière. `demo: true` quand la source commence par « Données de démonstration (non officielles) ».
- `POST /national-coverage {value_chain, year, production_t?, consumption_t?, imports_t?, exports_t?, source}` -> 201 (même corps que le GET de la filière). Source obligatoire (3 caractères au moins), valeurs ≥ 0, année passée, au moins une valeur ; remplace la ligne (filière, année). `POST /national-coverage/import {rows: [...]}` : 1 à 500 lignes, contrôlées une à une ; une erreur refuse tout (400 `validation_error`, `fields.rows[i]`) ; 201 `{imported, ...}`. `DELETE /national-coverage/{id}` -> 204. Journalisé : `national_stat.save|import|delete`.

**Carte des acteurs**
- `GET /map/actors?layers=a,b&department=&value_chain=` (tout utilisateur connecté) -> GeoJSON `FeatureCollection` avec `features[]` (`properties.layer` ∈ `sites`, `schemes`, `organisations`, `cooperatives`, `parcels`) et, hors norme GeoJSON, `layers[{id, label, chain_filter, count, truncated?, not_placed?}]` (couches offertes à l'utilisateur) et `filters`. `sites` : `{id, kind, name, department, commune, capacity_t}` ; `schemes` : `{id, kind, name, status, department, commune, area_available_ha}` ; `organisations` et `cooperatives` : une entité par département, au centre du département (`precision: "departement"`, `count`, `names[]` jusqu'à 20, `by_tag`) ; `parcels` (agent et administrateur seulement, 2 000 au plus, `truncated`) : `{producer: code, department, area_ha, value_chains[]}`. Aucun téléphone, aucun nom de personne. L'agent et le producteur sont bornés à leur département. 400 sur une couche inconnue.
- Extension : une autre application ajoute une couche avec `apps.observatory.actors_map.register(id, label, build, chain_filter=False, allowed=None)` où `build(user, department, value_chain)` renvoie des entités GeoJSON (`actors_map.feature(...)`) ou `(entités, {"truncated": bool, "not_placed": int})`.

**Qualité des modèles**
- `GET /models/quality` (administrateur, responsable, agronome, auditeur) -> `{min_n: 5, reliable_n: 30, models[diagnostic, rendement, credit], not_measured[{id, reason}]}`. Toute mesure : `{value, n, reliable}` ; `value: null` sous 5 cas. `diagnostic` : `simulated`, `total`, `escalated_share`, `escalated_low_confidence`, `escalated_by_producer`, `reviewed`, `confirmed_share`, `corrected`, `trend[{month, total, escalated, reviewed, confirmed, confirmed_share}]`. `rendement` : `overall`, `verified` et `by_value_chain[]` = `{n, reliable, mae_kg, mape_pct, bias_pct}` (biais = estimation − récolte), `declaration_gap`, `demo_reference`. `credit` : `measurable`, `reason`, `debtors`, `due`, `min_due: 30`, `paid_share`, `bands[{label, debtors, due, paid_share}]` ; non mesurable (« aucune issue de crédit… ») tant que 30 échéances échues ne sont pas atteintes.
- `Diagnosis` garde la réponse du modèle dans `predicted_pathology` (la relecture de l'agronome remplace `pathology`).
- Jeu d'entraînement : `manage.py export_training_set <diagnostic|rendement> --output <dossier> [--with-images]` (pas une route). Cadre : `docs/REENTRAINEMENT.md`.
