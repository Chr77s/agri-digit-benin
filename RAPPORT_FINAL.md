# Rapport final : prototype Agri-Digit Bénin

Date : 16 octobre 2026. Prototype de démonstration, données non officielles.

## Lancer la démonstration

1. Double-cliquer sur `start.bat`. Linux ou macOS : lancer `./start.sh`. Le premier lancement prend quelques minutes : il installe les dépendances, crée la base, charge les données de démonstration et importe les 200 873 fermes du POC (environ 40 s).
2. Ouvrir http://localhost:5173.
3. Se connecter avec un des comptes de [docs/DEMO.md](docs/DEMO.md). Le code à 6 chiffres s'affiche dans le bandeau « Simulation » de la page de connexion. Les comptes du personnel ont le mot de passe `AgriDemo-2026!`.

Comptes : producteur 0197000001, agent ATDA Alibori 0197000002, agronome INRAB 0197000003, responsable de programme 0197000004, administrateur MAEP 0197000005, auditeur CoPil 0197000006, agent financier 0197000007, gestionnaire de coopérative 0197000008, transformateur 0197000009, distributeur 0197000010, représentant MTDI 0197000011. Inscription d'une nouvelle productrice : NPI 1000000002 (Awa SABI, née le 1990-07-01), téléphone 0197000099.

**Avant la démonstration sur ce PC :**
- Fermer les applications inutiles, ou redémarrer l'Explorateur Windows. Le poste n'a que 3,5 Go de mémoire, et l'Explorateur en occupait plus de 3 Go pendant le développement.
- Le serveur de développement Vite tourne avec `node --no-opt` pour cette raison.
- Le build de production (`vite build`) a réussi à 16h00 (10 s, 33 fichiers précachés), après avoir échoué faute de mémoire à 14h05. Pendant les vérifications, fermer l'Explorateur et les navigateurs libère assez de mémoire.
- La base `backend/db.sqlite3` contient encore les données laissées par les essais d'intégration (8 diagnostics, 3 récoltes, 4 appuis, 4 paiements simulés, une adhésion terminée, un programme « Programme test intégration »). Pour repartir d'une base propre, supprimer `backend/db.sqlite3` puis relancer `start.bat` (la base est recréée et les fermes du POC sont réimportées).

Vérification finale (16/10/2026, 16h00) :
- pytest : 38 tests sur 38 ;
- scénario de bout en bout par l'API : 17 étapes sur 17 (les 10 d'origine, plus carte, coopérative, appui et récolte, marché et paiement, diagnostic, langues, satellite, SEA, interopérabilité et conflit) ;
- `tsc --noEmit` : aucune erreur sur les 53 fichiers du frontend ; Vitest : 8 tests sur 8 ; `vite build` : réussi ;
- parcours joués dans le navigateur intégré contre l'API réelle, pour les rôles producteur, agent ATDA, gestionnaire, transformateur, distributeur, représentant MTDI, agronome, responsable de programme et administrateur : les erreurs de console observées sont celles qui ont été provoquées volontairement (400, 403, 404, 409) ;
- non joué : le remboursement par l'administrateur à l'écran (il exige l'identifiant du paiement, qu'aucun écran ne donne) et le conflit de version sur la modification d'un producteur hors ligne (même code que pour les campagnes, joué pour les campagnes seulement) ;
- les spécifications Playwright (`frontend/e2e/demo.spec.ts` et `p2.spec.ts`) sont écrites mais n'ont jamais été exécutées : le navigateur de test n'est pas installé.

## Ce qui est réel

- **Backend Django :** 21 modules, chacun découpé en modèles, règles métier, lectures, API et tests.
- **Permissions :** vérifiées par le serveur (périmètre de l'agent, données du producteur, consentement pour l'agent financier). Une donnée hors périmètre renvoie 404.
- **Connexion :** code à usage unique haché, valable 10 minutes, bloqué 15 minutes après 5 échecs. Les comptes du personnel ont aussi un mot de passe. Jeton de rafraîchissement en cookie HttpOnly.
- **Producteurs :** inscription avec consentement daté et retirable, et parcours mineur avec consentement parental. Validation ou rejet motivé par l'agent, avec l'historique des versions.
- **Parcelles et campagnes :** la surface est calculée par le serveur (shapely, pyproj) ; un chevauchement de plus de 20 % déclenche une alerte de vérification. Une seule culture principale par parcelle et par saison.
- **Base de connaissances :** 86 fiches sur les 10 filières, dont 42 publiées avec une citation précise du recueil INRAB. Circuit brouillon, relu, publié, avec les versions conservées.
- **Assistant :** recherche BM25 en mode extractif, sans modèle externe. Il cite la fiche (titre, source, version), répond « je ne sais pas » hors corpus et renvoie à un agent toute question de dosage.
- **Alertes :** seconde validation pour les alertes urgentes, notifications dans l'application, découpage des SMS (GSM-7 ou Unicode).
- **Programmes :** candidatures avec date de clôture appliquée. La sélection de bénéficiaires sur les fermes du POC donne une proposition, avec les pondérations conservées. Elle doit être validée par une autre personne que celle qui l'a lancée, et elle peut être contestée.
- **Crédit :** score explicable (facteurs et poids affichés), seulement avec le consentement du producteur. Chaque consultation est inscrite au journal.
- **Pilotage :** journal d'audit non modifiable, export CSV avec motif obligatoire, tableau de bord avec la source et la date de chaque chiffre.
- **Coopératives (UC-06) :** adhésions avec historique conservé (sortie avec motif, ré-adhésion possible), un gestionnaire ne voit que ses coopératives.
- **Carte producteur (UC-07) :** code de vérification aléatoire de 8 caractères ; la vérification publique ne renvoie que le statut et le nom, avec limite de débit.
- **Appuis et récoltes (UC-10, UC-11) :** remise par l'agent, confirmation par le producteur ; une récolte à plus de 50 % d'écart du rendement de référence est signalée à l'agent. Les rendements de référence sont des valeurs de démonstration marquées comme telles.
- **Contestation par le producteur (UC-17), conflits hors ligne (UC-25) :** décision motivée de l'agent ; en cas de modification concurrente, l'agent choisit entre la version du serveur et la sienne, et le choix est journalisé.
- **Marché (UC-21) :** offres, mise en relation (téléphone masqué jusqu'à l'acceptation), paiement `FakePay` plafonné à 500 000 XOF avec reçu et remboursement, toutes les transitions au journal d'audit.
- **Langues (UC-15) :** table de traductions fon et bariba à saisir et à noter par les représentants du MTDI ; une langue s'ouvre aux producteurs à 80 % de clés validées. Aucune traduction n'est fournie. Tous les textes de l'interface (environ 915 clés) sont dans `frontend/src/i18n/fr.json`.
- **Indicateurs SEA (UC-22), interopérabilité (UC-24) :** chaque indicateur porte sa source et sa date, une valeur sans source s'affiche « non disponible » ; agrégats pseudonymisés pour X-Road, SONAMA et FNDA avec clé d'API par partenaire (vide = désactivé) et appels journalisés.
- **Filières de réserve :** igname, maraîchage et palmier à huile, acceptées partout où une filière est demandée.
- **Tests :** pytest 38/38 ; scénario de bout en bout par l'API 17/17 (`backend/tests/e2e_backend.py`) ; Vitest 8/8.
- **Frontend :** React et TypeScript, organisé par fonctionnalité, avec une navigation par rôle et les jetons de design de la section 12 (contrastes vérifiés par `frontend/scripts/contrast.mjs`). Application installable, avec une file de saisie hors ligne pour les parcelles et les campagnes.

## Ce qui est simulé (voir [docs/MOCKS.md](docs/MOCKS.md))

- Vérification d'identité ANIP : fiches fictives.
- SMS et appels vocaux : écrits dans une boîte d'envoi consultable, rien n'est envoyé.
- Mobile Money : fournisseur `FakePay`. Les adaptateurs FedaPay, KKiaPay et CinetPay sont vides.
- X-Road : interface seulement ; l'API d'agrégats (UC-24) est réelle mais protégée par des clés de démonstration.
- Diagnostic par photo : résultat déterministe tiré du hachage de l'image, aucun modèle ; marqué « simulation » partout. Les métadonnées de la photo (dont le GPS) sont bien supprimées avant stockage.
- Suivi satellite : NDVI et humidité générés de façon déterministe, datés, étiquetés « Données de démonstration (POC), non officielles ».
- Fermes du POC : département déduit du centre départemental le plus proche, sans commune. La localisation est approximative.
- Fiches marquées `a_sourcer` : non validées, et non utilisées par l'assistant tant qu'elles ne sont pas publiées.

## Ce qui reste, par priorité

- **À faire avant une vraie démonstration :**
  - exécuter les spécifications Playwright (installer Chromium sur un poste avec assez de mémoire) ;
  - remise à zéro de la base de démonstration (voir plus haut).
- **Fonctionnel :**
  - écran de liste des paiements pour que l'administrateur rembourse sans connaître l'identifiant ;
  - bouton « voir plus » sur les listes : les écrans chargent au plus 100 lignes (une liste de producteurs ou de candidats plus longue est tronquée) ;
  - le panneau « Conflits de saisie » affiche les stades bruts (`recolte`) au lieu des libellés ;
  - les codes de pathologie de la relecture agronome sont écrits dans le frontend, faute d'endpoint qui les expose ;
  - le seuil de 80 % de l'écran des langues est une constante du frontend, il ne vient pas du serveur.
- **Sécurité et confidentialité :**
  - seuil de petits effectifs sur les agrégats d'interopérabilité, à ajouter avant tout raccordement réel ;
  - le POC ne compte que 45 producteurs, donc les agrégats par département et filière sont très fins.
- **Technique :**
  - client TypeScript généré depuis `docs/openapi.json` : le schéma reste incomplet, car les vues sont des fonctions ;
  - django-q2 pour les tâches de fond ;
  - jointure spatiale des fermes sur les limites administratives officielles ;
  - recherche vectorielle ;
  - le bundle principal fait 579 ko (183 ko gzip) avec les 915 textes : à découper si la page de connexion dépasse le budget de 250 ko transférés.

## Écarts par rapport au TDR et au cahier des charges

- **Interopérabilité X-Road, SONAMA et FNDA :** le prototype fournit les formats (REST, OpenAPI, CSV, GeoJSON), mais aucun raccordement.
- **Langues nationales :** l'écran de validation et le chargement des dictionnaires sont prêts, mais aucun texte fon ou bariba n'est saisi ni validé.
- **Analyses prédictives :** non faites ; seule la grille de score transparente existe.
- **Formation et transfert de code :** le dépôt Git et la documentation existent ; la formation reste à organiser.
- **Projet hors de `Documents` :** le projet est dans `C:\Users\Chris Nahum\Projets\agri-digit-benin`, car la protection Windows bloque Python dans `Documents`.

## Démarches humaines

Voir [docs/ACTIONS_HUMAINES.md](docs/ACTIONS_HUMAINES.md) :
- habilitation ANIP et X-Road ;
- identifiant d'expéditeur SMS auprès de l'ARCEP ;
- compte marchand Mobile Money ;
- déclaration APDP et désignation du DPO ;
- relecture INRAB, ATDA et MTDI, dont la confirmation de la fenêtre de semis à Banikoara ;
- licence des modèles vocaux Meta MMS (CC-BY-NC) ;
- hébergement final avec le CoPil.
