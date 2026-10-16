# MASTER PROMPT : Agri-Digit Bénin, prototype fonctionnel

Copie tout ce fichier dans une session Claude Code ouverte à la racine d'un dossier vide (par exemple `agri-digit-benin`). Ensuite, ne réponds plus : l'agent doit aller au bout seul.

---

## 0. Ton rôle et ta façon de travailler

Tu es l'équipe technique complète (analyste, architecte, développeur backend, développeur frontend, designer, testeur, juriste du numérique) chargée de livrer un prototype fonctionnel de la plateforme Agri-Digit Bénin. Tu travailles seul, sans poser de question à l'utilisateur. Quand une décision manque, tu la prends toi-même en choisissant l'option la plus simple qui respecte les contraintes ci-dessous, puis tu la consignes dans `docs/DECISIONS.md` (date, décision, raison, impact). Tu ne t'arrêtes que si une action est physiquement impossible sans l'humain (voir section 17), et dans ce cas tu continues le reste du travail et tu listes le blocage dans `docs/ACTIONS_HUMAINES.md`.

Méthode : applique la méthode lucio-dev (spec d'abord, un artefact vérifiable par étape, tests et documentation écrits avec chaque brique, backend validé de bout en bout avant le frontend, frontend sur données simulées avant l'intégration). Les cas d'utilisation de la section 6 sont déjà validés par l'utilisateur : ne les rediscute pas. Si les skills `lucio-dev`, `droit-numerique-benin`, `uml`, `ui-ux-pro-max`, `frontend-design`, `fullstack-testing`, `project-map` sont disponibles dans ta session, utilise-les. Sinon, applique leurs principes décrits ici.

Règles d'honnêteté : ne présente jamais comme réel ce qui est simulé. Chaque mock est visible dans l'interface (bandeau "Simulation") et listé dans `docs/MOCKS.md`. N'invente aucune donnée officielle, aucun article de loi, aucune traduction que tu ne maîtrises pas : marque-la `non_valide`.

## 1. Contexte et échéance

- Le MAEP (Ministère de l'Agriculture, de l'Élevage et de la Pêche du Bénin) est maître d'ouvrage. Le MTDI est copilote technique et valide les langues nationales. L'INRAB et les ATDA fournissent le contenu agronomique. Le FNDA, la SONAMA et des institutions financières sont partenaires.
- Le TDR "Agri-Digit Bénin" exige : plateforme multi-filières (registre producteurs et coopératives avec GPS, production, intrants, récolte et post-récolte, transformation, distribution, gouvernance, suivi-évaluation), assistant conversationnel IA alimenté par les fiches d'itinéraires techniques, diagnostic phytosanitaire par image, scoring crédit, analyses prédictives, SEA, interopérabilité (X-Road), formation, code source transféré au MAEP, ouvert et sans système propriétaire exclusif.
- Échéance : un prototype fonctionnel doit être montrable au plus tard à 15h00, heure du Bénin (UTC+1). Au démarrage, lance `date` et calcule le temps restant. Si moins de 60 minutes restent, ne fais que le niveau P0 de la section 4. Fais un commit Git après chaque jalon pour qu'une démonstration soit toujours possible.

## 2. Décisions déjà arrêtées (ne pas rediscuter)

1. Nom du produit : Agri-Digit Bénin. Pied de page : "Prototype de démonstration, données non officielles".
2. Dix filières : coton, anacarde, ananas, maïs, riz, soja, manioc, niébé, élevage (volaille et ruminants), pêche et aquaculture. Réserve (si le temps le permet) : igname, maraîchage, palmier à huile.
3. Langues : français complet, puis fon et bariba. Les textes fon et bariba sont marqués `non_valide` (à relire par des locuteurs natifs du MTDI), avec repli automatique sur le français. Le yoruba et le dendi sont prévus dans la structure i18n mais vides.
4. Application web responsive en PWA, installable, avec saisie hors ligne et synchronisation.
5. SMS et vocal : simulés (boîte d'envoi visible dans l'interface d'administration). Le vocal du prototype utilise la synthèse et la reconnaissance vocale du navigateur (Web Speech API) en français. Une interface `NotificationChannel` permet de brancher plus tard un vrai fournisseur.
6. Mobile Money : dans le périmètre. Prototype avec un fournisseur simulé `FakePay` (bac à sable) derrière une interface `PaymentProvider`, avec des adaptateurs vides prêts pour un agrégateur (FedaPay, KKiaPay, CinetPay). Aucune clé réelle.
7. Identité : vérification ANIP par un mock fidèle `AnipClient` (jeux de fiches fictives). Le champ s'appelle NPI (numéro personnel d'identification). Le format exact est à confirmer avec l'ANIP : valide 10 chiffres par défaut, configurable.
8. Données : réutilise les données du POC en ligne (section 10).
9. Gouvernance du conseil : l'INRAB valide le fond agronomique, les ATDA valident l'adaptation locale, le MTDI valide la langue. Tout conseil portant sur un dosage de produit phytosanitaire ou vétérinaire est renvoyé à un agent humain, jamais généré. Le MAEP est responsable du traitement, le prestataire est sous-traitant.
10. Conformité : loi n° 2017-20 portant Code du numérique du Bénin (section 13).

## 3. Environnement sur le PC

1. Détecte le système (`uname`, `ver` ou équivalent), les versions de Node (cible 20 ou plus), Python (cible 3.11 ou plus), Git et Docker.
2. Si Docker est présent : PostgreSQL via `docker compose`. Sinon : SQLite (variable `DATABASE_URL`). Dans les deux cas les géométries sont du GeoJSON stocké en JSON (section 5). Le code doit fonctionner dans les deux cas.
3. Si un outil manque et que tu peux l'installer sans droits administrateur (pip, npm, venv), installe-le. Sinon, consigne dans `docs/ACTIONS_HUMAINES.md`.
4. Fournis `start.bat` (Windows) et `start.sh` (Linux et macOS) qui installent les dépendances, lancent la migration, chargent les données de démonstration, démarrent l'API (port 8000) et le frontend (port 5173), puis affichent l'adresse à ouvrir. Un seul double-clic ou une seule commande.
5. Le prototype doit tourner en local sans aucune clé secrète. Toute clé facultative va dans `.env` (fichier `.env.example` fourni).

## 4. Plan et priorités

Horloge relative au démarrage (T0). Adapte-la au temps restant.

- T0 à T0+10 min : dépôt Git, structure, `docs/` (DECISIONS, MOCKS, ACTIONS_HUMAINES), diagramme de cas d'utilisation et diagramme de classes en Mermaid (`docs/uml/`), contrat d'API en OpenAPI (généré par drf-spectacular, relu et figé dans `docs/openapi.json`).
- T0+10 à T0+40 : backend P0, tests pytest en même temps.
- T0+40 à T0+50 : validation de bout en bout du backend (script `tests/e2e_backend.py` qui rejoue le scénario de démonstration par l'API).
- T0+50 à T0+80 : frontend P0 sur données simulées puis branché sur l'API.
- T0+80 à T0+95 : PWA, hors ligne, accessibilité, passes de design, démo répétée.
- Ensuite : P1 puis P2 si du temps reste.

Niveaux de priorité

- P0, obligatoire pour la démonstration : UC-01, 02, 03 (journal), 04, 05, 08, 09, 12 (assistant), 14 (base de connaissances), 16 (alertes avec SMS simulés), 17, 18, 22, avec les 10 filières présentes dans les listes de choix et dans la base de connaissances.
- P1 : UC-07 (carte producteur avec code), 10, 11, 19, 20 (score et consentement), 21 (offres et paiement simulé), 23, 24 (exports CSV), 25 (hors ligne avec synchronisation), diagnostic par photo (UC-13) en mode simulé avec 10 pathologies de démonstration.
- P2 : UC-06 (coopératives), 15 (validation linguistique), fon et bariba au-delà des 40 textes essentiels, réserve de filières, indicateurs SEA détaillés.

## 5. Stack technique arrêtée (ne pas rediscuter)

Principes qui ont guidé le choix : 100 % open source (exigence du TDR), un monolithe modulaire simple à transférer aux développeurs du MAEP, tout doit tourner sur un PC Windows, Linux ou macOS sans service payant, installation reproductible, passage possible en production sur n'importe quel hébergement par conteneurs (l'hébergement final est décidé avec le CoPil). Verrouille toutes les versions dans les fichiers de verrouillage (`uv.lock` ou `requirements.lock`, `package-lock.json`) en prenant la dernière version stable ou LTS disponible au démarrage.

| Couche | Choix | Raison principale |
| --- | --- | --- |
| Style d'architecture | Monolithe modulaire, un dépôt, trois dossiers `backend/`, `frontend/`, `infra/` plus `docs/` | Un seul déploiement, simple à transférer et à former. Les modules sont découpés pour pouvoir être extraits plus tard. |
| Langage backend | Python 3.11 ou plus | Écosystème données, IA et SIG, déjà maîtrisé par l'équipe. |
| Framework backend | Django 5.x (version LTS) avec Django REST Framework | Authentification, permissions, migrations, internationalisation et administration fournies. Le back-office Django sert tout de suite à l'agronome INRAB pour gérer les fiches. Plus rapide et plus facile à transmettre que de tout assembler à la main. |
| Documentation d'API | drf-spectacular (OpenAPI 3) | Contrat d'API généré et versionné, base du client TypeScript. |
| Authentification | djangorestframework-simplejwt, code à usage unique maison (6 chiffres, hachés en base) | Jeton d'accès court en mémoire, jeton de rafraîchissement en cookie `HttpOnly`. |
| Filtres et pagination | django-filter, pagination par curseur | Recherche et listes volumineuses. |
| Base de données | PostgreSQL 16 ou plus par Docker, SQLite en repli automatique | Standard de l'équipe. Pas de GeoDjango (GDAL est pénible sous Windows) : les géométries sont du GeoJSON stocké en JSON, la surface est calculée avec `shapely` et `pyproj`. PostGIS reste une option documentée pour la production. |
| Tâches de fond | django-q2 avec le courtier en base de données | Pas de Redis nécessaire pour le prototype (purge de conservation, envois d'alertes, import de données). Celery et Redis restent la voie de production. |
| Recherche de fiches | `rank-bm25` avec `snowballstemmer` (français) sur un index construit au démarrage | Corpus petit, fonctionne partout sans service externe. La recherche vectorielle (pgvector) est une évolution de production. |
| Assistant IA | Interface `LLMBackend` : Ollama local (Qwen), sinon API Anthropic si une clé existe, sinon mode extractif sans modèle | La démonstration ne dépend de rien. Aucune donnée personnelle ne quitte le pays (article 391). |
| Scoring et prévisions | scikit-learn, grille de score transparente en v1 (facteurs et poids lisibles), fiche descriptive du modèle (`docs/MODEL_CARD.md`) | Explicable, contestable (article 401), calibrable plus tard sur des données réelles. |
| Diagnostic par photo | Interface `DiagnosisBackend`, version simulée au départ | Le vrai modèle d'image viendra avec des données béninoises validées par l'INRAB. |
| Géométrie et surfaces | shapely, pyproj côté serveur ; turf.js côté navigateur pour l'aperçu | Le serveur recalcule toujours la surface et fait foi. |
| Qualité Python | ruff, pytest, pytest-django, factory-boy, coverage, bandit, pip-audit | Tests, style et sécurité automatisés. |
| Langage frontend | TypeScript strict | Contrat de types avec l'API. |
| Framework frontend | React 18 ou 19 (celle qui est compatible avec toutes les dépendances) avec Vite, en application monopage. Pas de Next.js. | Application hors ligne installable, aucun besoin de rendu serveur, déploiement statique possible. |
| Routage et données | React Router, TanStack Query, client typé généré depuis l'OpenAPI avec `openapi-typescript` et `openapi-fetch` | Les types du frontend viennent du contrat d'API, donc pas de dérive. |
| Formulaires | react-hook-form avec zod | Validation identique et lisible côté navigateur. |
| Interface | Tailwind CSS 3 configuré uniquement avec les jetons de la section 12, composants accessibles Radix UI (non stylés) habillés par nos soins, TanStack Table pour les tableaux, lucide-react pour les icônes | Accessibilité prête à l'emploi, sans l'apparence générique d'un kit prêt à l'emploi. |
| Cartes et graphiques | Leaflet, react-leaflet, leaflet-draw ; Recharts | Cartographie libre, fonds de carte OpenStreetMap (avec attribution). |
| PWA et hors ligne | vite-plugin-pwa (Workbox), Dexie (IndexedDB) pour la file de synchronisation | Installable, saisie hors ligne, synchronisation au retour du réseau. |
| Internationalisation | i18next, fichiers `fr`, `fon`, `bba`, `yo`, `dnd` | Repli automatique sur le français. |
| Voix | Web Speech API du navigateur en français | Rien à installer. Module serveur MMS optionnel et désactivé (section 9). |
| Tests frontend | Vitest, Testing Library, MSW (données simulées pendant l'étape frontend), Playwright pour le parcours de démonstration, axe-core pour l'accessibilité | Respecte l'ordre lucio-dev : frontend validé sur simulation avant l'intégration. |
| Conteneurs | Docker et docker-compose (services `db`, `api`, `web`), image Nginx pour servir le frontend construit | Même livrable en démonstration locale et en production. |
| Intégration continue | GitHub Actions : ruff, pytest, bandit, pip-audit, vitest, build, npm audit, Playwright | Fichier fourni, exécuté plus tard par l'équipe. |
| Journalisation | structlog au format JSON, sans donnée personnelle ; Sentry facultatif, désactivé par défaut | Conforme aux articles 424 et 427. |
| Formats d'interopérabilité | REST JSON, OpenAPI 3, GeoJSON, CSV, dates ISO 8601, codes ISO pour pays et devises (XOF) | Prépare le raccordement X-Road, SONAMA et FNDA sans verrou propriétaire. |

Écartés, avec la raison : FastAPI seul (il faudrait réécrire l'authentification, l'administration et les migrations), Next.js (rendu serveur inutile ici et plus lourd hors ligne), Flutter (la décision est une PWA d'abord), microservices (coût et délai sans bénéfice à cette échelle), Firebase et Google Maps (services propriétaires et transferts de données hors du pays), GeoDjango (installation trop fragile sur le PC cible).

Règles d'architecture à respecter dans le code :
- Dans chaque module Django : `models`, `services` (règles métier), `selectors` (lectures), `api` (vues et sérialiseurs), `tests`. Les vues n'ont aucune règle métier.
- Les intégrations externes passent toutes par une interface dans `integrations/` (ANIP, paiement, notifications, LLM, diagnostic, X-Road), avec une version simulée et une version réelle vide.
- Chaque action sensible écrit dans le journal d'audit à l'intérieur de la même transaction.
- Le frontend s'organise par fonctionnalité (`features/producers`, `features/parcels`, etc.), avec `shared/ui` pour les composants du design system et `shared/api` pour le client généré.
- Aucun appel réseau dans les composants : tout passe par des hooks TanStack Query.
- Les variables de configuration viennent du fichier `.env` (modèle `.env.example`), jamais du code.

Arborescence cible :

```
agri-digit-benin/
  backend/        (projet Django, modules dans backend/apps/)
  frontend/       (Vite, React, TypeScript)
  infra/          (docker-compose.yml, Dockerfiles, nginx.conf, .github/workflows)
  docs/           (DECISIONS, MOCKS, CONFORMITE, uml/, openapi.json, etc.)
  start.bat  start.sh  README.md  RAPPORT_FINAL.md  PROJECT_MAP.md
```

## 6. Cas d'utilisation validés (règles métier)

Rôles : `producteur`, `agent_atda`, `gestionnaire_cooperative`, `transformateur`, `distributeur`, `agent_financier`, `agronome_inrab`, `repr_mtdi`, `responsable_programme`, `admin_maep`, `auditeur_copil`.

A. Comptes
- UC-01 Connexion par téléphone et code à 6 chiffres valable 10 minutes, 5 échecs bloquent 15 minutes. Les agents et administrateurs ont en plus un mot de passe fort. En mode démonstration, le code s'affiche dans la boîte d'envoi simulée.
- UC-02 L'administrateur crée, suspend, réaffecte des comptes. Chaque agent a un périmètre (département ou commune) qui filtre toutes ses données. Action journalisée.
- UC-03 Journal d'audit non modifiable (qui, quoi, quand, sur quelle donnée), consultable par l'auditeur du CoPil. Durée de conservation paramétrable, 5 ans par défaut.

B. Producteurs
- UC-04 Inscription : NPI, prénom, nom, sexe, date de naissance, commune, téléphone, langue préférée. NPI et téléphone uniques, un doublon propose la fiche existante. Le NPI est vérifié par `AnipClient` (nom et date de naissance doivent correspondre). Consentement explicite, daté, distinct, retirable (section 13). Une inscription faite par le producteur reste `en_attente`. Moins de 16 ans : parcours avec consentement d'un titulaire de l'autorité parentale.
- UC-05 L'agent valide, rejette avec motif obligatoire, ou corrige. Notification au producteur. Une fiche validée garde l'historique de ses versions.
- UC-06 (P2) Coopératives et membres, un producteur peut appartenir à plusieurs coopératives, historique conservé.
- UC-07 (P1) Carte numérique avec code de vérification. Un tiers qui scanne voit seulement statut et nom.

C. Parcelles et campagnes
- UC-08 Parcelle dessinée sur la carte ou relevée par GPS. Surface calculée automatiquement, jamais saisie. Type : pluvial plateau, bas-fond, irrigué. Statut foncier. Chevauchement de plus de 20 % avec une autre parcelle : alerte de vérification.
- UC-09 Campagne : une culture principale par parcelle et par saison, stades (semis, croissance, floraison, récolte) mis à jour par le producteur ou l'agent.
- UC-10 (P1) Appuis : l'agent enregistre une remise (programme, quantité, valeur, à rembourser ou non), le producteur confirme la réception.
- UC-11 (P1) Récolte et post-récolte : production, stockage, vente. Écart important avec le rendement estimé, signalement pour vérification.

D. Conseil et alertes
- UC-12 Assistant : question orale ou écrite dans la langue du producteur, réponse uniquement à partir des fiches publiées, citation de la fiche (titre, source, version), réponse "je ne sais pas" si aucune fiche ne couvre la question, renvoi à un agent pour les sujets à risque.
- UC-13 (P1) Diagnostic par photo : réponse avec niveau de confiance. En dessous du seuil (0,6 par défaut), la photo part chez un agronome. Aucune photo de visage conservée.
- UC-14 L'agronome INRAB publie et corrige les fiches : brouillon, relecture, publication. Seules les fiches publiées alimentent l'assistant. Versions conservées.
- UC-15 (P2) Le représentant MTDI note les réponses en fon et bariba. Le module n'est ouvert aux producteurs qu'au-dessus d'un seuil de qualité.
- UC-16 L'agent envoie une alerte (météo, ravageur, programme, marché) à une zone et à des cultures. Gravités : info, avertissement, urgent. Un message urgent demande une seconde validation. Envoi via `NotificationChannel` (SMS et vocal simulés, in-app réel) avec statut livré, échoué, lu.

E. Programmes, crédit, marché
- UC-17 Sélection des bénéficiaires : critères et pondérations fixés avant le calcul et conservés avec le résultat. Le résultat est une proposition. Un agent valide, un producteur exclu peut contester, chaque décision est motivée. Réutilise l'algorithme du POC (confiance de détection, distance à la route, taille de parcelle) comme critères par défaut.
- UC-18 Candidature : programmes avec conditions et date de clôture réelle, refus après clôture, statuts déposée, en instruction, acceptée, refusée (motif), notification à chaque changement.
- UC-19 (P1) Score de crédit seulement avec consentement explicite et révocable. Facteurs affichés en clair. Contestation d'une donnée possible. Le score est une aide : la décision finale revient à une personne.
- UC-20 (P1) L'agent financier voit score et facteurs d'un producteur qui l'a autorisé. Chaque consultation est journalisée. La décision de crédit reste hors plateforme.
- UC-21 (P1) Offres et demandes de produits, mise en relation, paiement Mobile Money simulé avec reçu et statut.

F. Pilotage
- UC-22 Tableau de bord par rôle et par périmètre. Chaque chiffre porte sa source et la date de mise à jour. Une donnée absente affiche "non disponible", jamais un zéro ni un tiret.
- UC-23 (P1) Suivi satellite par zone (NDVI, humidité), date d'acquisition visible. Utilise les valeurs du POC en les datant clairement comme "données de démonstration".
- UC-24 (P1) Exports CSV et API pour X-Road, SONAMA, FNDA. Export de données personnelles : motif et autorisation exigés, journalisé.
- UC-25 (P1) Hors ligne pour l'agent : saisie locale, synchronisation, conflit résolu par choix de l'agent.

## 7. Modèle de données minimal

`user`, `role`, `perimeter`, `producer`, `producer_version`, `consent` (type, date, version du texte, retiré le), `cooperative`, `membership`, `parcel` (géométrie, surface calculée, type), `campaign` (parcelle, filière, saison, stade), `input_support`, `harvest`, `value_chain` (les 10 filières), `knowledge_doc` (filière, titre, source, version, statut brouillon, relu, publié, langue, statut_validation_langue), `assistant_log` (question sans donnée personnelle, fiches citées, escalade), `alert`, `notification` (canal, statut), `program`, `application`, `selection_run` (pondérations, résultat, validé par), `credit_consent`, `credit_score` (facteurs), `offer`, `payment`, `audit_log`, `retention_policy`.

Tous les identifiants sont des UUID. Les identifiants lisibles (par exemple `BJ-AGR-2026-000123`) sont générés par une séquence en base, jamais par un calcul sur le nombre d'enregistrements.

## 8. Permissions

Matrice stricte, vérifiée côté serveur pour chaque endpoint : un producteur ne voit que ses données, un agent ne voit que son périmètre, un agent financier ne voit que les producteurs ayant consenti, l'auditeur ne voit que le journal, l'agronome INRAB n'écrit que la base de connaissances. Écris des tests qui vérifient chaque refus (403) et chaque tentative d'accès à la donnée d'un autre (IDOR).

## 9. Assistant, base de connaissances et langues

1. Base de connaissances : télécharge le recueil INRAB (https://www.inrab.bj/uploads_files/categories/files/Recueil-des-technologies-agricoles-prometteuses-d-velopp-es-par-le-syst-me-national-de-recherche-agricole-5fd745412517e.pdf) et d'autres documents publics de l'INRAB, des ATDA, du MAEP et de la FAO. Extrait les itinéraires techniques par filière (préparation du sol, variétés, semis, fertilisation, entretien, ravageurs, récolte, stockage). Découpe en passages avec citation précise de la source. Au minimum 8 passages par filière pour les 10 filières. Si une filière manque de source en ligne, écris une fiche de démonstration prudente, marquée `source: a_sourcer` et `statut: brouillon_non_valide`, qui ne contient aucun dosage chiffré.
2. Recherche : pose d'abord une recherche textuelle BM25 en mémoire (`rank-bm25` avec racinisation française, voir section 5). La recherche vectorielle locale (pgvector) est une évolution de production, à ne faire que si tout le reste est fini. Aucun appel à un service d'embedding externe.
3. Génération : adaptateur `LLMBackend` avec trois implémentations, choisies automatiquement dans cet ordre selon ce qui est disponible : (a) Ollama local si un service répond sur `localhost:11434` (modèle Qwen disponible), (b) API Anthropic si `ANTHROPIC_API_KEY` est défini, (c) mode "extractif" sans modèle, qui assemble la réponse à partir des passages trouvés. Le mode (c) doit toujours fonctionner pour que la démonstration ne dépende de rien.
4. Garde-fous : le contexte envoyé à un modèle ne contient jamais de nom, de téléphone, de NPI ni de position précise (seulement filière, commune, stade, saison). Refuse et renvoie à un agent pour tout dosage de pesticide ou de médicament vétérinaire. Affiche toujours "Conseil indicatif, vérifiez avec votre agent ATDA". Journalise chaque question sans donnée personnelle.
5. Langues : toute l'interface passe par i18next avec les fichiers `fr.json`, `fon.json`, `bba.json`, `yo.json`, `dnd.json`. Complète `fr.json` à 100 %. Pour `fon.json` et `bba.json`, traduis les 40 textes les plus utiles seulement si tu en es sûr, sinon laisse vide pour repli vers le français. Chaque texte non relu est listé dans `docs/LANGUES_A_VALIDER.md`. Pour la voix en fon et bariba, prévois un module serveur optionnel basé sur Meta MMS (modèles `facebook/mms-tts-fon`, `facebook/mms-1b-all`), désactivé par défaut. Attention : ces modèles sont sous licence CC-BY-NC 4.0, ce qui interdit un usage commercial ; consigne cet avertissement dans `docs/ACTIONS_HUMAINES.md` et ne l'active pas sans accord du MAEP et du MTDI.

## 9 bis. Diagnostic par photo (P1)

Interface `DiagnosisBackend` avec une implémentation simulée : l'image est acceptée, une réponse parmi 10 pathologies de démonstration est renvoyée avec un niveau de confiance fixe, et la mention "Simulation" est visible. L'image est stockée sans métadonnées de position ni de visage, avec suppression automatique après la durée de conservation.

## 10. Données à réutiliser

Le POC en ligne est `https://agri-dpi-bn.vercel.app`. Cherche d'abord s'il existe un dépôt local du POC sur ce PC (dossiers voisins, Téléchargements, Documents). Sinon, télécharge ces fichiers publics du site :

- `/data/farms_analyzed.json` (environ 17,8 Mo, 200 873 exploitations de 2 ha et plus avec détection du maïs, confiance, distance à la route, superficie)
- `/data/total_maize_ha.txt`
- les tuiles raster `/data/maize_tiles/{z}/{x}/{y}.png` pour les niveaux 6 et 7 seulement (si le téléchargement pose problème, ignore les tuiles et affiche les exploitations)

Ne charge jamais ce fichier dans le navigateur. Importe-le côté serveur à l'installation et expose des agrégats par département et par commune, plus une requête par zone géographique (bbox) paginée. Consigne la provenance dans `docs/DONNEES.md` avec la mention "source d'origine à documenter par l'équipe, données non officielles".

Les 12 parcelles et les 8 producteurs de démonstration du POC servent de point de départ aux données de seed. Étends le seed à environ 40 producteurs fictifs répartis dans les 12 départements, avec des noms béninois plausibles, des parcelles réelles dessinées dans les bons départements et des campagnes dans les 10 filières. Aucune donnée réelle de personne.

## 11. Mocks et interfaces d'intégration

- `AnipClient` : fiches fictives. NPI de démonstration fournis dans `docs/MOCKS.md`. Cas couverts : identité valide, NPI inconnu, nom différent, date de naissance différente, service indisponible.
- `PaymentProvider` : `FakePay` avec les statuts en attente, réussi, échoué, remboursé et un délai simulé. Les montants sont en FCFA, plafond de transaction paramétrable (500 000 par défaut).
- `NotificationChannel` : `InAppChannel` (réel), `SmsChannel` et `VoiceChannel` (simulés, écrivent dans une table `outbox` consultable). Longueur SMS prise en compte (160 caractères en GSM-7, 70 en Unicode, découpage en plusieurs messages).
- `XRoadAdapter` : interface vide documentée, aucun appel réel.

## 12. Design system et interdits visuels

Objectif : une interface sobre, rapide, lisible en plein soleil sur un téléphone d'entrée de gamme, qui ne ressemble pas à une page générée par une IA.

Jetons de design (définis une seule fois dans un fichier de tokens, rien d'autre dans les composants) :
- Fond clair chaud `#F7F5F0`, surfaces `#FFFFFF`, texte `#1B1F1A`, texte secondaire `#4A5148`, bordure `#D9D6CC`.
- Couleur de marque unique : vert profond `#1F5B3A` (survol `#17472D`). Avertissement : ocre `#8A5A00` sur `#FFF3D6`. Erreur : `#B3261E` sur `#FDECEA`. Succès : `#1F5B3A` sur `#E6F2EA`.
- Vérifie chaque couple texte et fond avec un script de ratio de contraste WCAG (au moins 4,5 pour le texte, 3 pour les grands éléments). Corrige ce qui échoue.
- Une seule famille de police sans serif embarquée (Source Sans 3), tailles 14, 16, 18, 22, 28 px, texte courant à 16 px au minimum.
- Rayon des coins 6 px. Bordures de 1 px. Une seule ombre très légère, réservée aux menus et boîtes de dialogue.
- Cibles tactiles de 44 px minimum. Focus clavier toujours visible (2 px).

Interdits explicites :
- Aucun dégradé, aucun flou d'arrière-plan, aucun effet de verre, aucune ombre colorée.
- Aucun emoji, nulle part. Icônes vectorielles uniquement, et seulement quand elles aident.
- Pas de grille de cartes de chiffres toutes identiques en haut de chaque page. Hiérarchise : un chiffre principal, le reste dans un tableau ou une phrase.
- Pas de compteurs animés, pas d'animation décorative. Le mouvement (150 ms) sert uniquement à expliquer un changement d'état. Respecte `prefers-reduced-motion`.
- Pas de vocabulaire marketing ("intelligent", "révolutionnaire", "dans la poche", "écosystème"). Les libellés décrivent l'action : "Enregistrer la parcelle", "Envoyer l'alerte".
- Pas de double barre de navigation. Une navigation par rôle, avec la page courante indiquée.
- Pas de maquette de téléphone dans une page web : l'application producteur est l'application elle-même.

Obligatoire :
- Chaque écran a ses états : chargement (squelette), vide (explique quoi faire), erreur (avec action de reprise), succès (avec la suite logique).
- Formulaires : une étiquette visible et liée à chaque champ, erreurs à côté du champ, message d'erreur qui dit comment corriger, valeurs conservées après erreur, saisie guidée (clavier numérique pour le téléphone, listes pour les départements et communes).
- Tableaux : recherche, filtres, tri, pagination, export CSV, colonnes redimensionnées pour mobile (carte ou ligne résumée).
- Accessibilité : navigation clavier complète, rôles et libellés ARIA corrects, ordre de focus logique, annonce des changements d'état, textes alternatifs. Aucun bouton sans nom accessible.
- Poids : page de connexion et accueil producteur sous 250 ko transférés, aucune image décorative lourde.
- Parcours producteur pensé pour une faible alphabétisation : peu de texte, icône et mot ensemble, bouton d'écoute de chaque écran en français, gros boutons.

## 13. Conformité au Code du numérique (loi n° 2017-20), à implémenter

Si le skill `droit-numerique-benin` est disponible, vérifie les articles dans le texte avant de les citer. Sinon, ne cite que ceux-ci, déjà vérifiés :

- Art. 389 et 390 : consentement démontrable, présenté séparément des autres clauses, en termes clairs, retirable à tout moment. Table `consent` avec version du texte, horodatage, canal. Écran de retrait en un clic.
- Art. 391 : aucun transfert de données personnelles vers un État tiers sans équivalence reconnue par l'APDP. Aucune donnée personnelle ne part vers un service externe. L'hébergement final sera décidé avec le CoPil.
- Art. 394 : pas de traitement de données biométriques d'identification. Ne stocke ni empreinte ni photo de visage. L'identité passe par le NPI. Évite aussi de collecter origine ethnique, religion, opinions politiques, santé.
- Art. 401 : aucune décision qui affecte significativement une personne ne repose sur le seul traitement automatisé. Le score de crédit et la sélection de bénéficiaires produisent des propositions. Un agent valide, motive et le producteur peut contester.
- Art. 405 : déclaration préalable à l'APDP (action humaine).
- Art. 424 : protection dès la conception et par défaut (minimisation, pseudonymisation des jeux d'analyse, champs facultatifs vides).
- Art. 427 : notification sans délai à l'APDP et aux personnes en cas de rupture de sécurité. Fournis un modèle de message et un registre d'incidents (`docs/INCIDENTS.md`).
- Art. 428 : analyse d'impact avant les traitements à risque élevé. Rédige un brouillon pour le scoring et l'assistant (`docs/AIPD_brouillon.md`).
- Art. 430 : un délégué à la protection des données est obligatoire pour un organisme public (action humaine du MAEP).
- Art. 433 : conservation limitée à la finalité. Table `retention_policy` et tâche de purge.
- Art. 435 : registre des activités de traitement, généré depuis la configuration (`docs/REGISTRE_TRAITEMENTS.md`).
- Art. 446 : consentement du titulaire de l'autorité parentale sous 16 ans.
- Art. 328 : page de mentions légales accessible en permanence avec l'identité de l'exploitant.
- Art. 495 : conservation des données d'identification de quiconque contribue au contenu. Journal d'audit non modifiable.

Génère aussi `docs/CONFORMITE.md` avec, pour chaque article ci-dessus, le verdict (respecté, partiel, administratif), le fichier concerné et l'action restante. Distingue clairement ce qui se corrige par le code de ce qui exige une démarche humaine.

## 14. Qualité

- Sécurité : requêtes paramétrées, validation de toutes les entrées par les sérialiseurs DRF, limitation de débit sur la connexion et les codes à usage unique, en-têtes de sécurité, CORS restreint, aucun secret dans le dépôt, cookies `HttpOnly` et `SameSite` si des cookies sont utilisés, fichiers téléversés limités en taille et en type, journalisation sans donnée personnelle. Exécute `bandit` et `pip-audit` côté backend, `npm audit` côté frontend, et corrige ce qui est grave. Si le script du skill lucio-dev `run_security_scan.sh` est disponible, lance-le.
- Tests : pytest avec au moins un test par endpoint P0 (succès, validation, droits). Tests des règles métier (unicité NPI et téléphone, expiration du code, clôture de programme, chevauchement de parcelles, interdiction de décision automatisée). Frontend : tests de composants sur les formulaires et Playwright sur le parcours de démonstration (section 15). Couverture visée de 70 % sur le backend P0.
- Performance : pas de requête N+1, index sur les clés de recherche et de périmètre, pagination partout, aucun chargement de jeu massif côté navigateur.
- Documentation : `README.md` (démarrage en 3 commandes), `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/uml/*.mmd`, `docs/DEMO.md` (script de démonstration avec comptes et codes), `PROJECT_MAP.md` tenu à jour.

## 15. Scénario de démonstration et critères d'acceptation

Comptes de démonstration (code à usage unique affiché dans la boîte d'envoi simulée) : un producteur, un agent ATDA de l'Alibori, un agronome INRAB, un responsable de programme, un administrateur MAEP, un auditeur CoPil, un agent financier.

Scénario à faire passer sans erreur, automatisé en test de bout en bout :
1. Un producteur s'inscrit avec un NPI valide, donne son consentement, son inscription passe en attente.
2. L'agent ATDA de son périmètre voit la fiche, la valide. Le producteur reçoit la notification.
3. Le producteur dessine sa parcelle, la surface est calculée. Il ouvre une campagne de maïs.
4. Il pose une question à l'assistant ("quand semer le maïs à Banikoara ?"). La réponse cite une fiche. Une question sur un dosage est renvoyée à un agent.
5. L'agent envoie une alerte ravageur à l'Alibori, la boîte SMS simulée affiche les messages, le statut passe à livré.
6. Le responsable de programme lance une sélection de 2 000 bénéficiaires sur la détection du maïs, un agent valide, un producteur exclu conteste.
7. Un producteur candidate à une subvention ouverte, puis échoue sur un programme clos avec un message clair.
8. (P1) Le producteur consent à partager son profil, l'agent financier consulte le score avec ses facteurs, une consultation apparaît dans le journal.
9. L'auditeur lit le journal d'audit. L'administrateur exporte un CSV et le motif est enregistré.
10. L'administrateur affiche le tableau de bord de l'Alibori avec source et date sur chaque chiffre.

Critères d'acceptation globaux : aucune donnée perdue au rechargement, aucune action qui annonce un succès sans écrire en base, aucun écran sans état de chargement ni d'erreur, aucune erreur dans la console navigateur, Lighthouse accessibilité d'au moins 90 sur les écrans principaux, installation PWA possible, parcours producteur utilisable hors ligne pour la saisie.

## 16. Livrables

1. Dépôt Git avec historique propre (messages de commit explicites, un commit par jalon).
2. Code backend et frontend, scripts `start.bat` et `start.sh`, `docker-compose.yml`.
3. Données de seed et script de chargement des données du POC.
4. Documentation listée en section 14, plus `docs/DECISIONS.md`, `docs/MOCKS.md`, `docs/CONFORMITE.md`, `docs/ACTIONS_HUMAINES.md`, `docs/LANGUES_A_VALIDER.md`.
5. Un fichier `RAPPORT_FINAL.md` à la racine : ce qui est réel, ce qui est simulé, ce qui reste (par priorité), comment lancer la démonstration, écarts par rapport au TDR.

## 17. Ce que seul un humain peut faire (consigne, ne bloque pas)

- Habilitation de l'ANIP et raccordement X-Road (conditions d'accès non publiques, demande à déposer auprès de l'ANIP).
- Pré-enregistrement ARCEP pour l'identifiant d'expéditeur SMS, puis choix d'un fournisseur SMS et vocal.
- Ouverture d'un compte marchand chez un agrégateur Mobile Money (documents d'entreprise, délais de plusieurs jours).
- Déclaration des traitements à l'APDP, désignation du délégué à la protection des données, analyse d'impact finale, mentions légales avec l'identité de l'exploitant.
- Relecture des fiches par l'INRAB et les ATDA, relecture du fon et du bariba par le MTDI, accord sur la licence des modèles vocaux Meta MMS.
- Confirmation de la liste officielle des filières prioritaires (le MAEP parle de 13 filières) et de la source des données du POC.
- Choix de l'hébergement final avec le CoPil et le CoTech.

## 18. Démarrage

Commence maintenant : exécute `date`, crée la structure, écris `docs/DECISIONS.md` avec la première entrée (lecture de ce prompt, heure de départ, temps restant, niveau de priorité retenu), puis suis la section 4. Ne demande rien. À la fin, affiche l'adresse de démonstration, les comptes de test et un résumé de cinq lignes de `RAPPORT_FINAL.md`.
