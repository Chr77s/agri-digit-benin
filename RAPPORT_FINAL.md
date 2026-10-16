# Rapport final : prototype Agri-Digit Bénin

Date : 16 octobre 2026. Prototype de démonstration, données non officielles.

## Lancer la démonstration

1. Double-cliquer sur `start.bat`. Linux ou macOS : lancer `./start.sh`. Le premier lancement prend quelques minutes : il installe les dépendances, crée la base, charge les données de démonstration et importe les 200 873 fermes du POC (environ 40 s).
2. Ouvrir http://localhost:5173.
3. Se connecter avec un des comptes de [docs/DEMO.md](docs/DEMO.md). Le code à 6 chiffres s'affiche dans le bandeau « Simulation » de la page de connexion. Les comptes du personnel ont le mot de passe `AgriDemo-2026!`.

Comptes : producteur 0197000001, agent ATDA Alibori 0197000002, agronome INRAB 0197000003, responsable de programme 0197000004, administrateur MAEP 0197000005, auditeur CoPil 0197000006, agent financier 0197000007. Inscription d'une nouvelle productrice : NPI 1000000002 (Awa SABI, née le 1990-07-01), téléphone 0197000099.

**Avant la démonstration sur ce PC :**
- Fermer les applications inutiles, ou redémarrer l'Explorateur Windows. Le poste n'a que 3,5 Go de mémoire, et l'Explorateur en occupait plus de 3 Go pendant le développement.
- Le serveur de développement Vite tourne avec `node --no-opt` pour cette raison.
- Le build de production (`npm run build`) a réussi à 14h05, puis a échoué faute de mémoire. Il est à relancer sur un poste normal.

Vérification finale (16/10/2026, 14h35) :
- scénario de bout en bout par l'API : 10 étapes sur 10 réussies ;
- page de connexion servie par Vite, avec le proxy vers l'API ;
- code de connexion affiché dans le bandeau Simulation.

## Ce qui est réel

- **Backend Django :** 14 modules, chacun découpé en modèles, règles métier, lectures, API et tests.
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
- **Tests :** pytest 24/24 ; scénario de bout en bout par l'API 10/10 (`backend/tests/e2e_backend.py`).
- **Frontend :** React et TypeScript, organisé par fonctionnalité, avec une navigation par rôle et les jetons de design de la section 12 (contrastes vérifiés par `frontend/scripts/contrast.mjs`). Application installable, avec une file de saisie hors ligne pour les parcelles et les campagnes.

## Ce qui est simulé (voir [docs/MOCKS.md](docs/MOCKS.md))

- Vérification d'identité ANIP : fiches fictives.
- SMS et appels vocaux : écrits dans une boîte d'envoi consultable, rien n'est envoyé.
- Mobile Money : fournisseur `FakePay`. Les adaptateurs FedaPay, KKiaPay et CinetPay sont vides.
- X-Road et diagnostic par photo : interfaces seulement.
- Fermes du POC : département déduit du centre départemental le plus proche, sans commune. La localisation est approximative.
- Fiches marquées `a_sourcer` : non validées, et non utilisées par l'assistant tant qu'elles ne sont pas publiées.

## Ce qui reste, par priorité

- **P1 :**
  - carte producteur avec code de vérification (UC-07) ;
  - appuis et récoltes (UC-10, UC-11) ;
  - offres et paiement simulé à l'écran (UC-21) ;
  - suivi satellite (UC-23) ;
  - résolution des conflits de synchronisation hors ligne par l'agent (UC-25) ;
  - écran de diagnostic par photo (UC-13) ;
  - tests Playwright (spécification écrite, navigateur non installé faute de mémoire sur le poste).
- **P2 :**
  - coopératives (UC-06) ;
  - validation linguistique (UC-15) ;
  - traductions fon et bariba (vides, avec repli sur le français) ;
  - filières de réserve ;
  - indicateurs de suivi-évaluation détaillés.
- **Technique :**
  - client TypeScript généré depuis `docs/openapi.json` : le schéma est incomplet, car les vues sont des fonctions ;
  - django-q2 pour les tâches de fond ;
  - jointure spatiale des fermes sur les limites administratives officielles ;
  - recherche vectorielle.

## Écarts par rapport au TDR et au cahier des charges

- **Interopérabilité X-Road, SONAMA et FNDA :** le prototype fournit les formats (REST, OpenAPI, CSV, GeoJSON), mais aucun raccordement.
- **Langues nationales :** la structure est prête, mais aucun texte fon ou bariba n'est validé.
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
