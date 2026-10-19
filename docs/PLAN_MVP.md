# Plan MVP : de la maquette à l'application

État au 2026-10-19 : les 57 pages web des maquettes (`maquettes/web/`) ont leur page dans l'application (refonte phase 1, commits `6191392` à `c0c6aef`). Restent l'application mobile (`maquettes/mobile/`, 85 écrans en 16 parcours), le canal téléphone simple (USSD et SMS), les fonctions serveur promises par les pages, et la vérification de bout en bout.

## Règle commune : ne pas s'éloigner de l'existant

- **Mêmes routes, mêmes pages.** L'application mobile est la PWA actuelle sous 640 px, pas une deuxième application. Un écran mobile qui correspond à une page existante adapte cette page ; seul un parcours absent de l'application (tracé GPS, viseur photo, premier lancement…) crée une page, dans le dossier `features/<module>` qui lui correspond.
- **Kit et composants existants** : `shared/ui` (`kit.tsx`, `index.tsx`, `kit.css`, `Icon`), jetons `tokens.ts`, coque `app/Layout.tsx`. Pas de nouvelle bibliothèque, pas de nouvelle dépendance npm ou Python.
- **API existante** : client `shared/api/client.ts`, types `shared/api/types.ts`, file hors ligne `features/outbox/offlineQueue.ts`. Côté serveur, un nouveau besoin s'ajoute au module concerné de `backend/apps/` avec son découpage `models / services / selectors / api / tests`, et entre dans `docs/API_CONTRACT_V2.md`.
- **Textes** : un fichier par lot dans `frontend/src/i18n/fr/` ; le test `i18n/keys.test.ts` doit rester vert.
- **Simulations** : ce qui est simulé aujourd'hui (ANIP, SMS, Mobile Money, satellite, diagnostic) le reste et l'affiche (`MOCKS.md`).
- **Aucun bouton qui ne fait rien** : une fonction que le serveur n'offre pas renvoie vers la personne qui peut la faire (règle de la page Profil, `DECISIONS.md`).
- Chaque lot : commits structurés sur sa branche, typecheck, tests frontend et backend verts, décisions notées dans `docs/DECISIONS.md`.

## Lots

| Lot | Contenu (parcours de `maquettes/mobile/` ou besoin) | Dépend de | Vague |
| --- | --- | --- | --- |
| 1. Coque mobile et parcours de base | Coque sous 640 px (barre d'onglets du bas, en-tête), premier lancement (langue écoutée, 3 écrans d'introduction, autorisations), compte et inscription au téléphone, accueil et accueil hors ligne, messages, notifications, profil et réglages, écrans d'état (chargement, vide, erreur, hors ligne, succès), file d'envoi et données hors ligne | – | 1 |
| 5. Téléphone simple : USSD et SMS | Module serveur `ussd` (sessions, menus : prix, code de connexion, appuis), commandes SMS entrantes, alertes SMS, simulateur de téléphone dans l'application (comme la boîte d'envoi) | – | 1 |
| 6. Serveur restant et pilotage | Changement de numéro avec code SMS, fermeture du compte par retrait du consentement, empreintes chaînées du journal d'audit et sa vérification, revue des pages pilotage contre les maquettes (diagnostics agronome, crédit, programmes, fiches) | – | 1 |
| 2. Champ : parcelles, campagne, assistant, diagnostic, météo | Tracé GPS d'une parcelle (début, fin), détail de parcelle, nouvelle campagne, calendrier et tâches, déclaration de récolte, assistant (vocal, historique, langue, renvoi à l'agent), viseur photo, analyse, résultat, conseils, historique, météo, alerte météo, prix, satellite | Lot 1 | 2 |
| 3. Marché, appuis, programmes, coopératives, carte | Mes offres, nouvelle offre, offre groupée, acheteurs, négociation, paiement, reçu, appuis et confirmation, programmes, candidature, décision, contestation, coopératives et adhésion, carte, partage et vérification | Lot 1 | 2 |
| 4. Mode agent terrain | Accueil agent mobile, inscrire un producteur hors ligne, valider, remise d'appui, synchronisation et conflits ; revue des pages web agent contre les maquettes | Lot 1 | 2 |
| 7. Intégration et livraison | Fusion des branches, Playwright sur le parcours de `DEMO.md` (mobile et web), `docker-compose`, mise à jour de `DEMO.md`, `README.md`, `RAPPORT_FINAL.md` | Tous | 3 |

La vague 2 attend la coque mobile du lot 1. Une session à la fois : le poste de développement a 3,5 Go de mémoire, et deux sessions en parallèle l'ont saturé (lot 5 arrêté, typecheck du lot 1 interrompu).

## Avancement (fin de la session du 19 octobre)

| Lot | État | Écarts restants (raisons dans `DECISIONS.md`) |
| --- | --- | --- |
| 1. Coque mobile et parcours de base | fait | |
| 5. Téléphone simple : USSD et SMS | fait | |
| 6. Serveur restant et pilotage | fait | carte de densité du tableau de bord, jeu d'export des fermes POC, filtres des exports |
| 2. Champ | fait | viseur plein écran, analyse en étapes, plusieurs photos et photo hors ligne du diagnostic |
| 3. Marché, appuis, programmes, coopératives, carte | fait | photo et négociation par propositions sur les annonces, offre groupée avec la part de chaque membre, QR code, enregistrement de la carte en image |
| 4. Mode agent terrain | fait | secteur entier disponible hors ligne (à instruire avec l'APDP), photo du producteur, position du domicile, carte scannée, preuve de remise (photo et signature) |
| 7. Intégration et livraison | en partie | spécifications Playwright à exécuter sur un poste qui peut installer le navigateur ; `docker-compose` non rejoué ; mise à jour de `DEMO.md`, `PROJECT_MAP.md` et `RAPPORT_FINAL.md` faite |

Ajouts hors liste, trouvés en comparant les maquettes aux pages : récoltes signalées vérifiées par l'agent (confirmée, corrigée, visite), contestation d'un refus de candidature, demandes d'adhésion aux coopératives, signalement d'un appui incomplet, « Pas sûr ? » du diagnostic.

## Hors code (voir `ACTIONS_HUMAINES.md`)

Habilitation ANIP et X-Road, identifiant d'expéditeur SMS (ARCEP) et code USSD court auprès d'un opérateur, compte marchand Mobile Money, déclarations APDP, relecture INRAB et ATDA, validation du fon et du bariba par le MTDI.
