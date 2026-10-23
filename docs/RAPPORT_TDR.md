# Rapport de réalisation et de conformité au TDR

Prototype Agri-Digit Bénin : tout ce qui a été fait, confronté au TDR, avec ce qui n'a pas été demandé et ce qui n'a pas été fait.

Date du rapport : 22 octobre 2026. État du dépôt : branche `main`, dernier commit `9cbb2f6`.

Établi par lecture du code, des documents et de l'historique Git, puis par exécution des tests le jour même.

## Sommaire

1. Synthèse
2. Cadre, sources et méthode
3. Ce qui a été réalisé
4. Couverture du TDR
5. Demandé et non fait, ou fait seulement en apparence
6. Fait sans avoir été demandé
7. Écarts, revirements et documents périmés
8. Risques et points de vigilance
9. Démarches humaines et décisions attendues
10. Recommandations
11. Annexe A : matrice détaillée des 167 exigences
12. Annexe B : les 49 ajouts non demandés
13. Annexe C : décisions
14. Annexe D : inventaire détaillé du backend
15. Annexe E : sécurité, permissions et données de démonstration
16. Annexe F : documents et incidents
17. Annexe G : inventaire détaillé du frontend

## 1. Synthèse

En sept jours calendaires (du 16 au 22 octobre 2026, cinq jours de travail versionné), le projet a produit un prototype de démonstration de plateforme numérique agricole : un backend Django de 26 applications et 177 routes d'API, un frontend React installable (PWA), une base de connaissances de 86 fiches, une chaîne de traçabilité et de conformité, et une documentation de 40 fichiers environ. L'historique compte 122 commits.

Le TDR lui-même n'est pas dans le dépôt : il est dans `C:\Users\Chris Nahum\Downloads\TDR_Agri-Digit_Benin_Rev.docx`. Il a été lu en entier pour ce rapport, et ses exigences ont été confrontées au code une à une.

### 1.1 Chiffres clés

| Mesure | Valeur | Origine |
| --- | --- | --- |
| Commits | 122, du 16/10 13:29 au 22/10 09:43 | `git log` |
| Applications Django, modèles, routes d'API | 26, 64, 177 sous `/api/v1` | Inventaire du backend |
| Tests backend | 147 réussis sur 147 (exécutés le 22/10) | Exécution du 22/10 |
| Tests frontend | 162 réussis sur 162, 49 fichiers (exécutés le 22/10) | Exécution du 22/10 |
| Vérification de types et lint | tsc sans erreur ; contrastes 101 paires, 0 échec ; ruff : 5 erreurs de longueur de ligne | Exécution du 22/10 |
| Exigences confrontées au code | 167, dont 144 logicielles et 23 non logicielles | Matrice (annexe A) |
| Ajouts non demandés recensés | 49 | Annexe B |
| Revirements et contradictions de décision | 15 | Annexe C |
| Documents périmés ou partiellement à jour | 7 périmés, une dizaine partiels, sur une quarantaine | Section 7.2 et annexe F |

### 1.2 Verdict sur la couverture du TDR

Sur les **144 exigences logicielles** (TDR, cas d'usage du cahier des charges initial, Code du numérique, exigences transversales), vérifiées dans le code :

| État | Nombre | Part |
| --- | --- | --- |
| Fait (code présent et relié) | 79 | 55 % |
| Fait côté outil (l'outil est réel, le résultat dépend de chiffres ou de validations d'un tiers) | 10 | 7 % |
| Simulé | 8 | 6 % |
| Partiel | 33 | 23 % |
| Absent | 7 | 5 % |
| Non vérifiable | 7 | 5 % |

Les **23 exigences non logicielles** du TDR (rapports, formations, consultations, modèle économique, hébergement, garantie) ne sont pas faites : 13 absentes, 8 partielles, 2 non vérifiables. Aucune n'est « faite ».

### 1.3 Les six messages à retenir

1. **La couverture logicielle est large, mais elle repose en partie sur des données et des validations qui ne viennent pas du projet.** Dix lignes ne sont « faites » que côté outil : les prix, les statistiques nationales, les seuils des sols et du climat, les langues nationales et le réentraînement attendent des chiffres ou des validations du MAEP, de l'INRAB, du MTDI ou de l'APDP.
2. **Le document de conformité du 20 octobre surévalue d'environ huit lignes.** Il annonce 48 exigences faites sur 66 ; le décompte est exact, mais huit lignes ne tiennent pas à la vérification (paiement en un clic simulé, assistant localisé sans modèle, qualité validée par des locuteurs natifs sans aucune validation, sécurité sans durcissement, documentation incomplète). Après vérification : 40 faites, 9 côté outil, 5 simulées, 12 partielles. Quatre cas d'usage que le rapport final présentait comme « réels » sont aussi partiels.
3. **Ce que le TDR demandait et qui n'existe pas du tout** : détection précoce des ravageurs et des maladies, indicateur d'adoption des pratiques améliorées, standards de qualité chiffrés, module de voix en langues nationales, client TypeScript généré, tâches de fond planifiées, modèles d'IA appris (aucun n'est appris à ce jour).
4. **49 éléments ont été construits sans avoir été demandés.** Les plus lourds sont les refontes visuelles successives (cinq chartes en sept jours), la landing en 3D (désormais reléguée), les maquettes (78 Mo), la chaîne d'audit hachée, l'USSD, le mode agent terrain et la passerelle de modèle de langage du réseau local. La plupart sont utiles ; six demandent une décision (hôte de la passerelle, pages « Collecte » et « Offres » en données fictives, section « Partenaires », photo à filigrane, mentions de démonstration retirées, copies de travail résiduelles).
5. **Plusieurs risques de sécurité et de conformité doivent être levés avant toute mise en service.** Le plus grave : avec `DEMO_MODE=true`, valeur par défaut de la configuration fournie, n'importe qui peut lire les codes de connexion de n'importe quel numéro.
6. **La documentation a décroché du code.** `RAPPORT_FINAL.md`, `ARCHITECTURE.md`, `API.md`, `openapi.json` (82 chemins sur 177), l'analyse d'impact, le registre des traitements et les diagrammes sont périmés ; le registre des traitements affirme « aucun transfert hors du Bénin » alors que la météo réelle envoie les coordonnées de la parcelle à un service externe.

### 1.4 Décisions attendues du porteur du projet

| N° | Décision | Pourquoi | Recommandation |
| --- | --- | --- | --- |
| 1 | Passer `DEMO_MODE` à faux et poser une clé secrète, avant tout accès extérieur | Les codes de connexion de tous les comptes sont lisibles par n'importe qui | Faire ce réglage la première fois qu'une instance est exposée |
| 2 | Hôte par défaut de la passerelle du modèle de langage | Un nom de machine d'un réseau privé est codé en dur ; les questions et le contexte de parcelle y partent sans expurgation | Laisser l'hôte vide, consigner la décision, mettre à jour la conformité |
| 3 | Pages « Collecte » et « Offres » (données écrites en dur) | Elles sont routées et dans trois menus, alors que les fonctions réelles existent ailleurs | Les retirer des menus ou les brancher sur les lots et les stocks |
| 4 | Section « Partenaires » de l'accueil | Elle suggère un partenariat officiel non confirmé | La retirer ou la libeller « parties prenantes citées dans le TDR » |
| 5 | Photo de démonstration à filigrane iStock | Question de licence sur une plateforme ministérielle | La remplacer par une image libre et créditée |
| 6 | Sort de la landing 3D et de la dépendance `three` | Elle n'est plus servie que sur `/accueil-3d` mais reste maintenue | L'archiver ou la retirer du build |
| 7 | Maquettes et archives (78 Mo) | Elles alourdissent le dépôt de 76 Mio | Sortir `archives/` et `assets/` (archive ou stockage de gros fichiers) |
| 8 | 38 commits locaux non poussés vers le dépôt distant | Le travail des deux derniers jours n'est que sur ce poste | Pousser après relecture |

## 2. Cadre, sources et méthode

### 2.1 Le TDR et la façon dont il a été lu

Le TDR « Agri-Digit Bénin » (version révisée) comprend : contexte, objectifs (huit objectifs spécifiques), activités (§ 3.1), approche, équipe, exigences de performance (§ 3.4), tests et réception (§ 3.5), garantie et maintenance (§ 3.6), livrables (§ 4), calendrier de neuf mois, rapports et échéancier de paiement. Ce rapport reprend ses références de paragraphe.

Trois autres sources servent de référentiel de la demande :

- `docs/MASTER_PROMPT.md` : la consigne initiale du 16 octobre (25 cas d'usage UC-01 à UC-25, priorités P0, P1, P2, interdits visuels, règles de sécurité) ;
- `docs/CONFORMITE_TDR.md` : la relecture du TDR du 20 octobre (66 exigences logicielles, légende Fait, Fait côté outil, Simulé, Partiel, Absent) ;
- `docs/CONFORMITE.md` : les articles du Code du numérique (loi n° 2017-20).

Le périmètre « demandé » est donc : ce qui figure dans le TDR, dans le cahier des charges initial, ou ce que le dépôt consigne comme demande du porteur du projet. Les conversations ne sont pas visibles : quand le dépôt ne dit pas qui a demandé un élément, le rapport écrit « non consigné ».

### 2.2 Méthode

Quatre inventaires indépendants, en lecture seule, ont été menés en parallèle puis recoupés :

1. **Matrice du TDR** : 167 exigences, état déclaré et état vérifié dans le code, avec preuve (chemin, fonction, route) ; 55 déclarations « Fait » sondées dans le code.
2. **Backend** : les 26 applications, leurs modèles, routes, rôles, règles métier, tests, intégrations, sécurité, commandes et dettes.
3. **Frontend, design et expérience utilisateur** : routes, pages par rôle, fonctions transverses, refonte, audit UX, landing.
4. **Historique** : les 122 commits, le journal des décisions, les documents, les incidents, les actions humaines, et la liste de ce qui a été fait sans demande.

Les tests ont ensuite été exécutés le 22 octobre (section 3.9), ce que les inventaires n'avaient pas fait.

### 2.3 Légende

| État | Sens |
| --- | --- |
| Fait | Modèle, règle métier, route et (si l'exigence est visible) écran présents et reliés dans le code |
| Fait côté outil | L'outil est réel et testé, mais son résultat dépend de chiffres ou de validations d'un tiers |
| Simulé | L'écran existe, les données ou le fournisseur sont fictifs |
| Partiel | Une partie seulement de l'exigence est couverte |
| Absent | Rien dans le code ni dans les pièces |
| Non vérifiable | Acte administratif, contrat ou donnée hors dépôt, avec la raison |

Trois règles de classement ont été appliquées et peuvent être contestées ligne par ligne :

1. une exigence dont l'objet est le mouvement d'argent (« paiement en un clic ») est Simulée tant que le fournisseur est `FakePay` ; une exigence de suivi (échéancier, retard, taux) reste Fait ;
2. une ligne dont le constat dit « seuils à valider par l'INRAB » est Fait côté outil ;
3. une fonction qui n'opère qu'avec un service facultatif configuré (le modèle de langage) n'est pas Faite dans la configuration livrée.

### 2.4 Limites

- « Fait » veut dire : code présent et relié. Les tests sont comptés et exécutés (section 3.9), mais les écrans n'ont pas tous été parcourus à l'œil (voir 3.9).
- Aucun essai sur un vrai téléphone, aucun audit Lighthouse, ni `bandit`, ni `pip-audit`, ni `npm audit` : aucune trace d'exécution dans le dépôt.
- Les spécifications Playwright (trois fichiers) ont été écrites et n'ont jamais été exécutées.
- PostgreSQL et Docker n'ont jamais été utilisés : seul SQLite a tourné.
- La base de développement locale (`backend/db.sqlite3`) contient des données d'essai : ses chiffres servent d'indices, pas de preuve de ce que montre la démonstration vierge.

## 3. Ce qui a été réalisé

### 3.1 Vue d'ensemble

| Domaine | Ce qui existe |
| --- | --- |
| Identité et accès | Connexion par téléphone et code à usage unique, mot de passe en plus pour le personnel, blocage après cinq échecs, jetons courts, 11 rôles, périmètres par département, changement de numéro, fermeture de compte |
| Registre des producteurs | Inscription avec vérification d'identité simulée, consentements, parcours mineur, validation ou rejet motivé, historique des versions, carte vérifiable |
| Terrain | Parcelles tracées ou relevées au GPS, surface calculée par le serveur, chevauchement, campagnes par stade, récoltes, appuis, hors ligne avec résolution des conflits |
| Conseil | Base de 86 fiches (42 publiées), assistant avec citations et garde-fou de dosage, renvoi à un agent, diagnostic par photo simulé |
| Communication | Alertes avec seconde validation, messagerie producteur et agent, boîte d'envoi de SMS simulés, USSD et SMS entrants simulés |
| Marché | Offres, mise en relation, paiement simulé, lots et traçabilité, stocks et ruptures, prix, analyses, enquêtes publiques, formations, vitrine |
| Argent | Appuis remboursables, prêts, créances à échéances, recouvrement, revenu du producteur, score de crédit explicable avec consentement |
| Terres et exploitations | Aménagements et travaux, analyses de sol lues sans dose, risques climatiques, matériel, mécanisation, semences certifiées, annuaire des PMEA |
| Gouvernance | Coopératives, bureaux, organisations de filière, programmes, sélection de bénéficiaires, contestations |
| Pilotage | Tableau de bord, suivi-évaluation détaillé, couverture de la consommation nationale, carte des acteurs, qualité des modèles, exports, interopérabilité |
| Langues | Circuit de validation du fon et du bariba, corpus, dictionnaires par langue ; aucun texte national fourni |
| Conformité | Journal d'audit chaîné et vérifiable, rétention, minimisation, masquage des petits effectifs, documents de conformité |
| Interface | PWA responsive, coque mobile à onglets, modes clair et sombre, accessibilité, accueil public, pages d'information |

### 3.2 Chronologie

122 commits sur sept jours calendaires (aucun les 17 et 18 octobre : une phase de design a eu lieu hors Git et n'a été versionnée que le 19). Amplitude cumulée des cinq journées : environ 35 heures d'horloge.

| Jour | Commits | Premier | Dernier | Thème dominant |
| --- | --- | --- | --- | --- |
| Ven. 16/10 | 14 | 13:29 | 19:49 | Cadrage, premier jet, jalons 0 à 3, contrat v2, P1 et P2, landing 3D |
| Sam. 17 et dim. 18/10 | 0 | | | Phase de design hors Git |
| Lun. 19/10 | 68 | 09:39 | 19:12 | Maquettes, refonte de 57 pages, lots 1 à 6 (mobile, USSD, champ, échanges, agent terrain, serveur restant), parcours de démonstration |
| Mar. 20/10 | 14 | 10:46 | 19:37 | Passerelle de modèle de langage, mise en conformité au TDR, lots A à E |
| Mer. 21/10 | 18 | 09:06 | 18:37 | Refonte « Argile et verre », audit UX, palette « Sunny Farm », minimalisme, rapport de parcours |
| Jeu. 22/10 | 8 | 08:41 | 09:43 | Nouvelle page d'accueil, pages d'information, logo et favicon |

**Vendredi 16 octobre**

| Heure | n | Thème | Livré (commit) |
| --- | --- | --- | --- |
| 13:29 et 13:40 | 2 | Cadrage | Jalon 0 `a030597` (structure, DECISIONS, contrat d'API, copie du MASTER_PROMPT, 4 fichiers) ; Jalon 1 `1e94ffd` (documentation, conformité, base de connaissances, infra, scripts de démarrage, 34 fichiers) |
| 13:48 et 13:56 | 2 | Premier jet | `d999f00` : 171 fichiers, 16 691 lignes d'un coup (backend et frontend « en cours ») ; `7a6050d` : OpenAPI, README |
| 13:57 | 1 | Vérification | Jalon 2 `97685b8` : backend P0 validé, pytest 23/23, e2e 9/9 |
| 14:03 | 1 | Crédit | Jalon 3 `c157d3c` : module crédit P1 (consentement, score explicable, audit), e2e 10/10 |
| 14:24 à 14:35 | 4 | Intégration | `0e01b94` frontend branché sur l'API ; `62bc398` rapport final et carte du projet, import POC au premier lancement seulement ; `2bab551` chemin SQLite, Vite en faible mémoire ; `c3406fa` vérification à 14:35 (e2e 10/10) |
| 14:49 | 1 | Contrat | `99b8926` contrat d'API v2 (P1 et P2 restants). Dernier commit sous l'identité `topanoulucio@gmail.com` |
| 16:03 | 1 | P1 et P2 | `83a91d9` (139 fichiers, +9 407 −3 446) : coopératives, carte producteur, appuis, récoltes, contestation, diagnostic simulé, langues, offres et FakePay, SEA, satellite, interopérabilité, conflits hors ligne, filières de réserve. Pytest 38/38, e2e 17/17, tsc propre, Vitest 8/8. **Posé après l'échéance de 15:00** et après l'interruption des agents de 14:48 (DECISIONS l.22) |
| 18:17 | 1 | Landing 3D | `56afb40` (44 fichiers, +4 659) : relief des 200 873 fermes, champ de maïs three.js avec repli canvas 2D, mode sombre, tiroir mobile, nouveau logo |
| 19:49 | 1 | Interface | `64f4816` (11 fichiers) : dossier `inspiration/` (6 images), page légale, +202 lignes de `fr.json`. Sans corps de message |

**Lundi 19 octobre**

| Heure | n | Thème | Livré (commits) |
| --- | --- | --- | --- |
| 09:39 à 09:45 | 13 | Dépôt du travail du week-end | `a8ceb6f` PRODUCT.md, DESIGN.md, `.impeccable/` ; `2405e1d` maquettes (278 fichiers, +33 363 lignes : web 11 rôles, mobile, landing, hub) ; `4c07e22` archives v1 et v2 (52 fichiers) ; trois correctifs (`8ae7092` filtres du journal, `f6039e5` sens du paiement du marché, `11f6b72` IndexedDB absent) ; `6191392` kit « Bénin Vert » (jetons, polices, sprite d'icônes, composants, coque ; 22 fichiers +1 913) ; cinq commits de pages issues des maquettes, `c51e58b` agent, `023feac` accès, `4d3ae8f` producteur, `3ca1f98` pilotage, `500bd35` filière et marché (≈ 7 320 lignes ajoutées) ; `c0c6aef` maquette et tests de clés i18n |
| 11:29 à 12:04 | 13 | Lot 1 : coque mobile | `ed193e8` PLAN_MVP ; `a341977` Vite `API_URL` ; `d00d78a` barre d'onglets du bas ; `c63f974` premier lancement ; `7ac01d8` compte et inscription au téléphone ; `d4fb6df` accueil producteur sous 640 px ; `2983d02` Tailwind `list-item` ; `5ffc9f8` messages, profil, réglages ; `0469255` tests ; `cc06d80` décisions ; `8574372` notifications système ; `5f162f5` « une session à la fois » ; `ade240c` fusion |
| 12:08 à 12:52 | 9 | Lot 6 : serveur restant | `d9edc6f` changement de numéro ; `e57450f` fermeture du compte ; `2becf54` journal chaîné ; `d764efc` interopérabilité ; `76c9ae5` programmes ; `44d2655` crédit ; `fae35f1` fiches techniques ; `34f8e29` décisions ; `de9f438` lint |
| 12:53 et 12:58 | 2 | Lot 5 : téléphone simple | `a029b8d` USSD et SMS entrants (serveur, 11 fichiers) ; `09ad489` simulateur et documentation |
| 13:04 à 14:19 | 6 | Lot 2 : champ | `8c8d372` tracé GPS en marchant ; `651cdff` campagne (variété, semis, calendrier, tâches) ; `e4c17f3` assistant (dosage transmis, historique local) ; `eae2a5e` et `be0c1f1` « Pas sûr ? » ; `36240a6` « Écouter » météo/prix/satellite |
| 14:23 à 14:41 | 8 | Lot 3 : échanges | `2d8ce12` et `0d2b3c7` appui incomplet ; `4e1b145` et `544f039` contestation d'un refus ; `ff28f02` et `e0aa287` demande d'adhésion ; `cf76de8` partage du lien de la carte ; `065e60a` prix du jour et reçu |
| 14:45 à 15:00 | 5 | Lot 4 : agent terrain | `a2421dd` onglets et saisies hors ligne ; `c1fa502` et `0efab0b` récoltes signalées vérifiées ; `4fdff5c` test ; `719ebfa` en-têtes qui passent à la ligne |
| 15:08 à 15:23 | 4 | État et lancement | `0e0626b` DEMO pas 18 à 25 ; `25beda5` carte du projet ; `064565b` plan et rapport (chiffres du 19/10) ; `a6c5c0f` `start.bat`/`start.sh` (ports, attente de l'API, `reset`) |
| 15:53 et 15:58 | 2 | Bugs vus au navigateur | `9abe77b` mutations suspendues hors ligne ; `5093f07` « Voir le récapitulatif » envoyait la fiche |
| 17:07 à 17:31 | 5 | Corrections du déroulé de démo | `db43377`, `9043726` (relevés des parcours), `caec3d1` (le vendeur ne voit plus « Payer »), `3c0d19a` (démo sans Docker), `b9a7948` défauts mineurs |
| 19:12 | 1 | Assistant | `b030808` adresse du « serveur Claude » réglable (réseau local) |

**Mardi 20 octobre**

| Heure | n | Thème | Livré (commits) |
| --- | --- | --- | --- |
| 10:46 | 1 | Passerelle LLM | `a90d238` passerelle du réseau local au format OpenAI (4 fichiers +60) |
| 12:39 | 1 | Compléments du maître d'ouvrage | `b8cc0b4` (71 fichiers, +2 803) : rapport `CONFORMITE_TDR.md` (30 faites sur 66 contre 15 le matin), annonces suspendues/retirées, bureau de coopérative, organisations de filière, messagerie, niveau de risque du diagnostic, météo réelle Open-Meteo, traçabilité par lots, services et financements, corpus en langues nationales. Pytest 69/69, Vitest 119/119 |
| 14:33 à 14:59 | 3 | Lots A, B, C (en série sur `main`) | `6e813c7` recouvrement, prêts, revenu (27 fichiers +1 422) ; `35b844f` terres, sols, climat (29 fichiers +1 663) ; `7a40a07` matériel, mécanisation, semences, PMEA (23 fichiers +1 659) |
| 15:10 à 15:33 | 3 | Lot E (branche séparée) | `19320dc` serveur (26 fichiers +1 586) ; `fa41932` pages et `REENTRAINEMENT.md` (16 fichiers +1 273) ; `11be587` veille |
| 19:16 et 19:17 | 2 | Fusion de E | `8c5fe91` fusion (conflits « en gardant les deux côtés ») ; `9342606` lignes du lot E dans le rapport |
| 19:17 à 19:37 | 4 | Lot D (branche séparée) | `020ea4b` serveur (26 fichiers +2 182) ; `3440686` application (18 fichiers +1 685) ; `9b8ab3c` documentation ; `4b36a5f` `settings.py` retrouve ses fins de ligne CRLF |

**Mercredi 21 octobre**

| Heure | n | Thème | Livré (commits) |
| --- | --- | --- | --- |
| 09:06 | 1 | Fusion du lot D | `3a440d0` ; conformité recomptée : **48 faites, 6 côté outil, 4 simulées, 8 partielles, 0 absente** sur 66 ; pytest 146, tsc propre, vitest 149, ruff propre |
| 09:23 | 2 | Parcours navigateur des lots A à E | `52e9a2e` retouches d'intitulés ; `76eb91c` rapport (ce qui a été parcouru et ce qui ne l'a pas été) |
| 09:50 à 10:20 | 3 | Refonte « Argile et verre » | `5405c5f` phases 1 à 6 (16 fichiers) ; `e643de3` phases 7 et 8 ; `82792d2` phase 9 (cartes pastel) |
| 13:14 | 1 | Audit UX | `c38e673` : `AUDIT_UX.md` (14/20), critique Impeccable (28/40), correctifs des trois P1 |
| 14:34 à 14:45 | 3 | UX niveaux 1 à 3 | `2c4089c`, `a975765`, `bf80fae` |
| 15:08 | 1 | Palette | `9755df1` « Sunny Farm » (18 fichiers +651 −642) ; tsc et 151 tests verts |
| 15:22 à 15:42 | 4 | Minimalisme niveaux 1 à 3 | `c55b45c`, `ec6583f`, `c117da3`, `671511b` |
| 16:32 à 18:37 | 3 | Parcours de DEMO.md | `6125c05` rapport de parcours ; `39da1e1` défauts 1 à 6 ; `3b69466` défauts 7 à 15 |

**Jeudi 22 octobre**

| Heure | n | Thème | Livré (commits) |
| --- | --- | --- | --- |
| 08:41 | 1 | Nouvelle page d'accueil | `d882bbe` (15 fichiers +820) : `features/home`, pied de page commun, pages accessibilité, contact, plan du site ; l'ancienne landing 3D passe sur `/accueil-3d` |
| 08:50 | 1 | Landing épurée | `563b118` (−356 +139) |
| 09:07 | 1 | Logo, favicon, rubriques | `1706422` (24 fichiers) : logo du MAEP, partenaires, questions, rubriques revenues |
| 09:19 et 09:23 | 2 | Scène d'accueil | `451d438` champ en perspective, arbres, case, paysan ; `9b4cf1f` ciel bleu clair, téléphone plus étroit |
| 09:27 à 09:43 | 3 | Logo et favicon | `bdde14c` PNG sans fond ; `fde2a10` variante texte blanc sans pastille ; `9cbb2f6` régénérés depuis le PNG fourni |

La phase de design du 17 et 18 octobre (non versionnée) a exploré trois directions de maquettes, abandonnées avant le kit « Bénin Vert » : le dépôt n'en garde que les traces datées (`maquettes/archives/v1` et `v2`, `PRODUCT.md`). Les maquettes et le travail du week-end entrent dans Git le 19 octobre entre 09:39 et 09:45 (13 commits en six minutes).

### 3.3 Le backend

Django 5.2 et Django REST Framework, API sous `/api/v1`, 26 applications locales, chacune découpée en modèles, règles métier, lectures, vues et tests.

| Mesure | Valeur | Preuve |
| --- | --- | --- |
| Applications Django locales | **26** (`apps.core` … `apps.markets`) + 10 applications tierces/Django | `config/settings.py:22-59` ; 26 dossiers dans `apps/` |
| Applications avec migrations | 20 (pas de migrations pour `core`, `credit`, `dashboard`, `exports`, `satellite`, `ussd`) | `apps/*/migrations` |
| Fichiers de migration | 42 (1 902 lignes) | `find apps -path '*/migrations/*.py'` |
| Modèles (`class X(models.Model)`) | **64** ; **65** avec `accounts.User` (`AbstractBaseUser, PermissionsMixin`) | `grep "^class \w+\(models\.Model\)" apps/*/models.py` |
| Routes `path(` dans `config/urls.py` | **181** occurrences = **177** dans la liste `v1` (toutes sous `/api/v1/`) + 4 hors liste | `config/urls.py:37-221` |
| Routes hors `/api/v1` | 3 vraies routes : `admin/`, `api/schema/`, `api/docs/` (Swagger) ; la 4e occurrence est la compréhension qui préfixe les 177 par `api/v1/` | `config/urls.py:217-221` |
| Vues DRF | 175 `@api_view` + 1 `ListAPIView` (`AuditLogList`) | `grep "^@api_view" apps` |
| Fonctions `def test_` | **147** dans **33** fichiers | `grep -c "def test_"` (détail ci-dessous) |
| Tests collectés | **147 tests collected in 1.70s** (= le nombre de `def test_`) | `pytest --collect-only -q` |
| Commandes de gestion | **8** : `seed_demo`, `import_poc_farms`, `export_relief`, `purge_retention`, `verify_audit_chain`, `check_stock_alerts`, `remind_claims`, `export_training_set` | `apps/*/management/commands/` |
| Python hors tests et migrations | **11 572 lignes** (apps 10 721 + config 392 + integrations 459), lignes vides et commentaires compris | `wc -l` |
| Python de tests | 3 086 lignes (`tests.py`, `test_*.py`) + `observatory/testkit.py` 43 + `conftest.py` 73 + `tests/e2e_backend.py` 293 | `wc -l` |

Routes par application (177 au total sous `/api/v1`) : accounts 10, audit 2, referentiel 2, producers 10, parcels 4, assistant 1, knowledge 8, alerts 9, ussd 2, programs 14, cooperatives 13, production 20, lands 9, farmservices 12, translations 9, markets 15, diagnosis 4, market 9, satellite 2, interop 5, dashboard 5, observatory 5, farms 2, exports 1, credit 4.

Le détail de chaque application (rôle, modèles, routes, règles, tests) est en annexe D.

### 3.4 Le frontend et l'expérience utilisateur

Frontend React 18, TypeScript, Tailwind, installable (PWA), organisé en 42 dossiers de fonctionnalités. Même code pour le web et le mobile : sous 640 px, la coque devient une application à onglets.

| Mesure | Valeur |
| --- | --- |
| Fichiers `.ts` et `.tsx` | 170, dont 49 fichiers de test ; 18 231 lignes hors tests |
| Pages routées | 72 (59 derrière un contrôle de rôle, 13 publiques) ; 61 chargées à la demande |
| Rôles | 11, chacun avec son menu ; onglets du bas pour le producteur et l'agent seulement |
| Tests Vitest | 162 réussis sur 162 (exécutés le 22/10) |
| Spécifications Playwright | 3 fichiers, 17 exécutions prévues, jamais exécutées (`@playwright/test` n'est pas installé) |
| Textes de l'interface | 3 863 clés françaises (1 155 dans `fr.json`, 2 715 dans 20 fichiers) ; 0 clé manquante |
| Langues | 5 déclarées ; seul le français est rempli ; fon et bariba contiennent un marqueur « non validé », yoruba et dendi sont vides |
| Contrastes | 101 paires vérifiées, 0 échec |
| Endpoints du serveur | 175 sur 175 ont au moins un appel dans le frontend |

**Fonctions transverses réellement implémentées**

- **Hors ligne** : file d'envoi locale (IndexedDB) pour six écritures seulement (parcelle, campagne, stade, inscription, fiche producteur, remise d'appui), rejeu au retour du réseau, panneau de conflits qui oppose « ma saisie » et « version du serveur ». Aucune lecture hors ligne.
- **PWA** : manifeste et service worker en production ; le manifeste pointe vers une icône supprimée et aux couleurs d'une ancienne charte, donc l'installation n'est pas vérifiée.
- **Mode agent terrain** : pas une bascule, mais le rôle agent sous 640 px (onglets Accueil, Producteurs, Inscrire, Remises, Alertes), avec inscription et remise d'appui gardées sur le téléphone.
- **Accessibilité** : lien d'évitement, titre de page et focus à chaque changement de route, cibles de 44 px au téléphone, `lang` suivant la langue, lecture vocale et dictée (français seulement), mouvement réduit, 101 paires de contrastes. La déclaration d'accessibilité reconnaît l'absence d'audit externe et d'essai au lecteur d'écran.
- **Thèmes** : clair par défaut, sombre sur choix explicite, jetons uniques dans `tokens.ts`.
- **Honnêteté des données** : bandeau « Prototype » partout, pastilles « Simulation » et « Démonstration », « non disponible » plutôt que 0, cellules de moins de 5 masquées.

**Design et expérience utilisateur**

Quatre palettes se sont succédé dans l'application en six jours ; est en vigueur la charte « Argile et verre » avec la palette « Sunny Farm » (vert profond `#016648`, vert vif `#00A563`, orange `#F6732F`). La refonte du 21 octobre a suivi neuf phases (jetons, peau, coque, accueils, pages, contrastes, tableaux de bord). L'audit UX du même jour a donné 14/20 (1 défaut P1, 8 P2, 7 P3) : presque tous corrigés ; restent la photo à filigrane et la voix figée en français. Le déroulé de la démonstration par profil a relevé 15 défauts, 14 corrigés.

**La page d'accueil**

Il existe deux pages publiques : `/` sert la page actuelle (illustrations vectorielles, quatre chiffres, trois étapes, saison du maïs, rôles, confiance, galerie de trois photos libres créditées, partenaires, questions, pied de page) ; l'ancienne landing en 3D (relief du Bénin, champ de maïs WebGL avec `three`) reste maintenue sur `/accueil-3d`, sans aucun lien depuis l'interface, avec une icône supprimée (image cassée). Elle représente 2 862 lignes de code, 31 tests et deux dépendances.

**Écrans de données écrites en dur**

Collecte et Offres (`/collecte`, `/offres`), Prévisions (`/previsions`, générateur pseudo-aléatoire), repli de météo et de prix, récoltes attendues du marché, calendrier cultural, trois chiffres de l'accueil, pathologies du diagnostic. Détail en annexe G.

Le détail des pages par rôle, des fonctions transverses, des écarts entre documents et code, et de la dette est en annexe G.

### 3.5 Sécurité et conformité réellement implémentées

| Mécanisme | Ce que fait le code |
| --- | --- |
| Connexion | Code à 6 chiffres, valable 10 minutes, stocké haché (HMAC-SHA256), blocage de 15 minutes après 5 échecs, 30 demandes par minute et par adresse |
| Sessions | Jeton d'accès de 15 minutes, jeton de rafraîchissement de 7 jours en cookie `HttpOnly` ; ni rotation ni révocation |
| Périmètres | Un agent ne voit que son département ; une donnée hors périmètre répond 404, un rôle non autorisé 403 ; chaque module a ses tests de contrôle d'accès |
| Journal d'audit | Ajout seul côté application, chaîné par empreintes SHA-256, vérifiable (`GET /audit-logs/verify`, commande dédiée) ; pas d'ancrage externe de la dernière empreinte |
| Consentements | Données personnelles, parental, crédit ; retrait en un appel ; le retrait des données personnelles ferme le compte et déclenche l'effacement différé |
| Minimisation | Carte vérifiable : statut et nom seulement ; carte des acteurs : ni nom ni téléphone ; téléphone de l'interlocuteur masqué avant acceptation ; question de l'assistant expurgée des suites de huit chiffres dans le journal |
| Petits effectifs | Toute cellule de moins de 5 est masquée dans le suivi-évaluation détaillé, les enquêtes, l'interopérabilité, les analyses de marché et la qualité des modèles (sauf pour l'administration, selon les cas) |
| Décision humaine | Sélection : proposition, validation motivée par une autre personne, contestation ; score de crédit : mention « aide à la décision » ; alertes urgentes à double validation ; fiches relues par un tiers |
| Photos | JPEG ou PNG de 5 Mo au plus, réencodées (EXIF et GPS supprimés), nom aléatoire, servies au propriétaire et à l'agronome seulement, purge à 90 jours |
| Chiffrement | Aucun chiffrement de champ ; hachage des codes, des clés de partenaires et des mots de passe |

Les limites de cette sécurité (jeton non révoqué, `DEMO_MODE`, absence de HSTS et de CSP côté Django, compteurs de limitation en mémoire locale, commandes de purge non planifiées) sont en section 8.

### 3.6 Intégrations : ce qui est réel et ce qui est simulé

| Intégration | État | Fichier qui le prouve | Variable qui bascule |
| --- | --- | --- | --- |
| Météo Open-Meteo (prévisions 7 jours, pluie et ET0) | **Réel** (HTTP `httpx`, cache 1 h/3 h) ; repli étiqueté `simulated: true` si le service ne répond pas | `integrations/market_data.py:36-66` (météo), `:69-100` (climat) | `WEATHER_BACKEND` (`open-meteo` par défaut ; toute autre valeur force la démonstration), `WEATHER_URL` (`settings.py:130-131`) |
| LLM de l'assistant | **Réel si un service répond** : passerelle OpenAI-compatible (si `OPENAI_API_KEY`), sinon Ollama (sonde 1 s), sinon Anthropic (si clé), sinon mode extractif (sans modèle) ; l'appel réel n'a pas été exécuté ici (non vérifié) | `integrations/llm.py:87-95` | `LLM_BACKEND` (`auto|openai|ollama|anthropic`), `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, `OLLAMA_URL`, `OLLAMA_MODEL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL` (`settings.py:127-139`) |
| Notification in-app | **Réel** (table `Notification`) | `integrations/notifications.py:27-35` | aucune |
| Relevés de prix | **Réels** (saisis par les acteurs), démonstration étiquetée sinon | `apps/markets/prices.py:129-139`, `integrations/market_data.py:102-122` | aucune (basculement automatique) |
| Identité ANIP | **Simulé** : 4 fiches fixes + 41 fiches générées (NPI `1000000001`–`1000000045`), `9999999999` = indisponible ; version réelle = `NotImplementedError` | `integrations/anip.py:35-62` | `ANIP_BACKEND` (`mock` ; `real` → `RealAnipClient`, qui lève `NotImplementedError`) |
| SMS | **Simulé** : écrit dans `Outbox`, statut toujours `livre` | `integrations/notifications.py:38-48` | aucune (le dictionnaire `CHANNELS` est fixe, `:57`) |
| Vocal | **Simulé** : sous-classe du SMS ; la synthèse vocale est côté navigateur | `integrations/notifications.py:51-54` | aucune |
| USSD et SMS entrants | **Simulés** : aucune connexion à un opérateur ; menus réels | `apps/ussd/api.py:1-2`, `:29-32` | `DEMO_MODE`, `USSD_GATEWAY_KEY` |
| Mobile Money (FakePay) | **Simulé** : succès après `FAKEPAY_DELAY_S` (3 s), échec si le numéro finit par 0 ; état codé dans l'identifiant | `integrations/payment.py:19-35` | `PAYMENT_BACKEND` (`fakepay` par défaut ; `fedapay`, `kkiapay`, `cinetpay` → classes vides sans `initiate`, donc `NotImplementedError`), `FAKEPAY_DELAY_S`, `PAYMENT_MAX_XOF` |
| Diagnostic par photo | **Simulé** : pathologie tirée du hachage SHA-256 de l'image (10 pathologies de démonstration), confiance entre 0,40 et 0,90 | `integrations/diagnosis.py:1-2`, `:41-52` | aucune pour le backend (`get_backend()` renvoie toujours `SimulatedDiagnosis`) ; seuil `DIAGNOSIS_THRESHOLD` |
| Données satellite | **Simulées** : NDVI et humidité déterministes, jamais d'image | `apps/satellite/api.py:1-39` | aucune |
| X-Road | **Vide et non utilisé** : `XRoadClient.call` lève `NotImplementedError` ; la classe n'est importée nulle part ; seule l'API d'agrégats `/interop/{partner}/aggregates` existe | `integrations/xroad.py:5-7` | `INTEROP_KEY_XROAD|SONAMA|FNDA` pour les clés d'API entrantes (`settings.py:145`) |
| Fermes du POC | **Réelles mais non officielles** (200 873 exploitations téléchargées du POC) ou synthétiques | `farms/management/commands/import_poc_farms.py`, `docs/DONNEES.md` | argument `path` et `--synthetic` de la commande |

Écarts relevés avec `docs/MOCKS.md` : la confiance du diagnostic y est dite « fixe » alors que le code la déduit du hachage de l'image ; X-Road est un client vide qu'aucun code n'importe ; le canal vocal est une classe que rien n'appelle.

### 3.7 Données de démonstration

La commande `seed_demo` charge, de façon répétable : 13 filières, 12 départements, 77 communes ; 11 comptes du personnel et des acteurs de démonstration ; 42 producteurs fictifs (36 validés, 6 en attente) avec une parcelle et une campagne chacun ; 3 programmes ; 86 fiches ; une coopérative de 4 membres, une union, 4 publications, un site de stockage ; 8 statistiques nationales fictives et 8 rendements de référence de démonstration ; une entrée de traduction par clé pour le fon et le bariba ; 6 offres et 3 demandes de marché.

Les 200 873 fermes du POC sont importées à part (`import_poc_farms`, environ 40 secondes) ; elles sont réelles mais non officielles, leur localisation est approximative (département du centre départemental le plus proche, commune vide). Le fichier source de 77 Mo n'est pas dans Git.

Limites déjà consignées par le dépôt : la parcelle de démonstration fait environ 100 hectares, ce qui fausse l'estimation des récoltes ; la sélection de bénéficiaires s'appuie sur des fermes réparties à égalité entre départements, donc ses chiffres ne se recoupent pas avec le tableau de bord (10 053 contre 16 667 en Alibori).

### 3.8 Design : cinq chartes en sept jours

| Date | Charte | Source de la demande |
| --- | --- | --- |
| 16/10 | MASTER_PROMPT § 12 : fond crème, vert unique, une police, rayon de 6 px, aucun dégradé ni flou ni verre | Cahier des charges initial |
| 16/10 | Landing sombre forêt et citron vert, jetons clair et sombre | Choix de conception |
| 18 et 19/10 | « Bénin Vert » : canopée, feuille, maïs, soleil, latérite ; kit de composants et reprise de 57 pages d'après les maquettes | Consigne consignée dans `PRODUCT.md` (thème « le vert, la nature, les champs ») |
| 21/10 | « Argile et verre » : verre dépoli, ombres doubles, dégradés, pastels, barre latérale flottante | Demande consignée (deux images de référence) |
| 21/10 15:08 | « Sunny Farm » : `#016648`, `#00A563`, `#F6732F`, blanc | Planche fournie par le porteur du projet |
| 22/10 | Ciel bleu clair pour la scène d'accueil, logo du MAEP | Demandes successives consignées |

Les trois dernières chartes lèvent les interdits visuels du MASTER_PROMPT § 12 (verre, dégradés, flou, maquette de téléphone, animation) ; le dépôt consigne que le porteur du projet l'a demandé, mais pas que le MASTER_PROMPT a été formellement amendé. Autour de cette refonte : un audit UX du 21 octobre (santé UX 14/20, critique de design 28/40), puis trois niveaux de correctifs et trois niveaux de « minimalisme ».

### 3.9 Vérifications : ce qui est consigné et ce qui a été mesuré aujourd'hui

**Mesures du 22 octobre 2026**

| Vérification | Résultat | Remarque |
| --- | --- | --- |
| Tests backend (`pytest`) | 147 réussis sur 147, en 14 min 11 s | Aucun échec. Les tests ne couvrent pas le scénario de bout en bout par l'API (17 étapes), qui exige un serveur lancé |
| Tests frontend (`vitest`) | 162 réussis sur 162, 49 fichiers | Aucun échec |
| Vérification de types (`tsc --noEmit`) | Aucune erreur | |
| Contrastes (`scripts/contrast.mjs`) | 101 paires, 0 échec | Le script n'est pas branché sur l'intégration continue |
| Lint backend (`ruff`) | 5 erreurs de longueur de ligne (E501) | Dans `apps/knowledge/services.py` (2) et `apps/knowledge/tests.py` (3) ; aucune erreur de logique |
| Build de production, Playwright, Lighthouse, `bandit`, `pip-audit`, `npm audit` | Non exécutés | Voir plus bas |

**Chiffres consignés par le dépôt au fil des jours**

| Date et heure | Source | Ce qui est consigné |
| --- | --- | --- |
| 16/10 13:57 | `97685b8` | pytest 23/23, e2e 9/9 |
| 16/10 14:03 | `c157d3c` | e2e 10/10 |
| 16/10 14:35 | `c3406fa`, `RAPPORT_FINAL.md` | e2e 10/10 ; `vite build` échoué faute de mémoire à 14:05 |
| 16/10 16:00-16:03 | `83a91d9`, `RAPPORT_FINAL.md` | pytest 38/38 ; e2e 17/17 ; `tsc --noEmit` sans erreur sur 53 fichiers ; Vitest 8/8 ; `vite build` réussi (10 s, 33 fichiers précachés) ; parcours navigateur joués pour 9 rôles (erreurs console = erreurs provoquées). **Non joué** : remboursement par l'admin à l'écran, conflit de version sur la fiche producteur. Playwright : écrit, jamais exécuté |
| 19/10 15:00 | `719ebfa` | Lot 4 : « vérifié à 375 px sur neuf pages de l'agent, sans débordement » |
| 19/10 15:08 | `064565b` | pytest 57 ; Vitest 112 sur 33 fichiers ; `tsc` et `ruff` propres ; Playwright toujours non exécuté |
| 19/10 15:53 et 15:58 | `9abe77b`, `5093f07` | Deux défauts constatés dans le navigateur (mutation suspendue hors ligne ; « Continuer » qui envoyait la fiche « deux fois sur trois ») |
| 19/10 17:07 | `9043726`, `docs/demo/RELEVES_PARCOURS.md` | Relevés des parcours de démo sur clone neuf (`start.bat reset`) |
| 20/10 12:39 | `b8cc0b4` | pytest 69/69 ; Vitest 119/119 ; conformité 30/66 |
| 20/10 19:16 | `8c5fe91` | Test de rendu 3D de l'accueil : 56 rendus, plus de 5 s sur le poste de 3,5 Go, délai porté à 30 s |
| 21/10 09:06 | `3a440d0` | pytest 146 verts ; tsc sans erreur ; vitest 149 verts ; ruff propre ; conformité 48 faites + 6 côté outil + 4 simulées + 8 partielles = 66 |
| 21/10 09:23 | `52e9a2e`, `76eb91c`, `CONFORMITE_TDR.md` § 7 | Parcours navigateur des écrans des lots A à E (producteur, agent, agent financier, admin). **Non parcourus** : écrans transformateur/distributeur/gestionnaire (stocks avec lots, vitrine, formations), formulaire d'aménagement/travaux, saisie d'une analyse de sol, saisie des statistiques nationales, résultats d'enquête, équipement du plateau |
| 21/10 09:57 à 10:20 | `REFONTE_FRONTEND.md` P8 et P9 | `contrast.mjs` 0 échec ; types ; 150 tests d'application ; parcours à 375 et 1360 px ; pages des autres rôles parcourues (mode sombre inclus) |
| 21/10 13:14 | `AUDIT_UX.md`, `c38e673` | Santé UX 14/20 (1 P1, 8 P2, 7 P3) ; critique Impeccable 28/40 ; détecteur : 0 résultat sur le code |
| 21/10 15:08 | `9755df1` | tsc et 151 tests verts ; `contrast.mjs` 0 échec |
| 21/10 16:32 à 18:37 | `RAPPORT_PARCOURS.md`, `6125c05`, `39da1e1`, `3b69466` | 38 étapes de DEMO.md rejouées par profil ; 15 défauts, 14 corrigés + 1 « pas un défaut » ; journal d'audit « chaîne intègre, 185 entrées » ; **non exécutés** : tracé sur carte, saisie fon/bariba, hors ligne, conflits de rejeu, matériel entre deux producteurs, NPI mineur, demande d'adhésion ; aucun test sur téléphone réel |
| 22/10 | `d882bbe` ajoute `HomePage.test.tsx` | **Aucun chiffre de test consigné** après le 21/10 15:08 |

Courbe consignée : tests backend 23 (16/10), 38, 57, 69, 146 (21/10) ; tests frontend 8, 112, 119, 149, 151 ; scénario de bout en bout par l'API 9, puis 10, puis 17 étapes.

**Jamais exécuté, ou sans trace d'exécution** : spécifications Playwright (trois fichiers), PostgreSQL et Docker, l'intégration continue (un workflow GitHub Actions pour un dépôt qui vit sur un GitLab), Lighthouse (critère d'au moins 90 du cahier des charges), `bandit`, `pip-audit`, `npm audit`, `axe-core`, essai sur téléphone réel. Les parcours dans le navigateur ont été joués les 16, 19, 21 octobre (rapport de parcours : 38 étapes de la démonstration rejouées par profil, 15 défauts dont 14 corrigés). Non parcourus d'après ces rapports : tracé sur carte, saisie en fon et en bariba, mode hors ligne, conflits de rejeu, demande d'adhésion, écrans des transformateurs, distributeurs et gestionnaires.

### 3.10 Documentation et outillage

Une quarantaine de documents (annexe F) : contrats d'API v1 et v2, journal des décisions (79 lignes), conformité au TDR, conformité au Code du numérique, registre des traitements, analyse d'impact (brouillon), fiche des modèles, cadre de réentraînement, script de démonstration (38 étapes, 12 comptes), rapports de parcours et d'audit UX, journal de la refonte, plan du produit, système de design, carte du projet. Outillage : `start.bat` et `start.sh` (contrôle des outils et des ports, attente de l'API, remise à zéro de la démonstration), configuration d'aperçu, intégration continue, `infra/` (conteneurs, jamais exécuté).

## 4. Couverture du TDR

### 4.1 Synthèse par bloc d'exigences

États vérifiés par bloc (vérification par lecture du code, aucun test exécuté).

| Bloc | Lignes | Fait | Fait côté outil | Simulé | Partiel | Absent | Non vérifiable |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T : 66 lignes de `CONFORMITE_TDR.md` | 66 | 40 | 9 | 5 | 12 | 0 | 0 |
| U : cas d'usage UC-01 à UC-25 | 25 | 18 | 1 | 2 | 4 | 0 | 0 |
| R : exigences logicielles du TDR hors des 66 lignes | 16 | 4 | 0 | 1 | 8 | 3 | 0 |
| L : Code du numérique | 15 | 6 | 0 | 0 | 7 | 0 | 2 |
| M : exigences transversales du `MASTER_PROMPT` | 22 | 11 | 0 | 0 | 2 | 4 | 5 |
| N : exigences non logicielles du TDR | 23 | 0 | 0 | 0 | 8 | 13 | 2 |
| **Total** | **167** | **79** | **10** | **8** | **41** | **20** | **9** |

**Écart avec `docs/CONFORMITE_TDR.md` (sur les 66 lignes)**

| État | Déclaré | Vérifié | Écart | Lignes concernées |
| --- | --- | --- | --- | --- |
| Fait | 48 (73 %) | 40 (61 %) | −8 | T-05, T-10, T-11, T-50, T-51, T-61, T-64, T-65 |
| Fait côté outil | 6 (9 %) | 9 (14 %) | +3 | T-10, T-11, T-61 |
| Simulé | 4 (6 %) | 5 (8 %) | +1 | T-50 |
| Partiel | 8 (12 %) | 12 (18 %) | +4 | T-05, T-51, T-64, T-65 |
| Absent | 0 | 0 | 0 | — |

Lecture : le décompte du document (48/6/4/8/0) est arithmétiquement exact pour les 66 lignes qu'il contient. Les huit déclassements viennent de huit lignes précises (liste ci-dessus) et reposent sur les trois règles de la section 1 ; chacune peut être contestée ligne par ligne. Le document ne couvre pas les indicateurs du § 3.1 SEA (adoption des pratiques, crédit, estimation de rendement), la détection précoce des ravageurs, les standards de qualité ni la source de données géospatiales (CHIRPS, Copernicus, AGRHYMET) : ils produisent 3 « Absent » et 8 « Partiel » dans le bloc R, qui ne figuraient pas dans ses 66 lignes. Les 25 cas d'usage donnent 4 « Partiel » (U-12, U-19, U-22, U-24) que le `RAPPORT_FINAL` présente comme « réel ».

### 4.2 Les 66 exigences du document de conformité, par domaine

Le tableau compare l'état déclaré le 20 octobre et l'état vérifié dans le code.

| Domaine | Lignes | Fait déclaré | Fait vérifié | Fait côté outil | Simulé | Partiel | Absent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Objectifs du TDR (§ 2) | 14 | 8 | 5 | 2 | 3 | 4 | 0 |
| Maillons de la chaîne de valeur (§ 3.1) | 24 | 21 | 21 | 3 | 0 | 0 | 0 |
| Services aux acteurs (§ 3.1) | 18 | 15 | 13 | 2 | 1 | 2 | 0 |
| Langues, canaux, qualité (§ 1, 3.1, 3.4) | 10 | 4 | 1 | 2 | 1 | 6 | 0 |
| **Total** | **66** | **48** | **40** | **9** | **5** | **12** | **0** |

### 4.3 Les huit exigences déclassées

Sur les 66 lignes, huit tenaient « Fait » dans le document de conformité et ne tiennent pas à la vérification. Chacune repose sur une des trois règles de la section 2.3.

| Ligne | Exigence | Déclaré | Vérifié | Raison |
| --- | --- | --- | --- | --- |
| T-05 | Assistant alimenté par les données de la parcelle et la météo | Fait | Partiel | Le contexte (type de terrain, surface, culture, stade, météo à 3 jours) n'atteint que les modèles de langage ; en mode extractif, le seul actif, la réponse est un extrait de fiche non localisé |
| T-10 | Analyses des sols et de l'utilisation des terres | Fait | Fait côté outil | Seuils à valider par l'INRAB ; lecture descriptive sans dose |
| T-11 | Risques climatiques | Fait | Fait côté outil | Modèle à règles, seuils à valider par l'INRAB, aucune confrontation à des sinistres |
| T-50 | Paiement en un clic des appuis reçus | Fait | Simulé | L'écran et l'imputation sont réels ; aucun argent ne circule (`FakePay`, les trois agrégateurs réels sont des classes vides) |
| T-51 | Mise en relation et paiement en un clic | Fait | Partiel | Mise en relation réelle, paiement simulé |
| T-61 | Qualité validée par des locuteurs natifs, justesse | Fait | Fait côté outil | L'outil existe ; aucune entrée n'est validée ; la « justesse » mesure la cohérence de l'appariement, pas la justesse linguistique |
| T-64 | Sécurité, confidentialité, protection des données | Fait | Partiel | Mécanismes réels, mais ni HSTS, ni CSP, ni redirection HTTPS ; clé secrète par défaut ; `bandit` et `pip-audit` jamais exécutés ; AIPD, déclaration APDP et DPO non faits |
| T-65 | Code source, documentation, scripts d'installation | Fait | Partiel | `openapi.json` couvre 82 chemins sur 177 ; l'architecture décrit 13 modules sur 27 ; ni licence ni manuel ; 38 commits non poussés |

### 4.4 Les 25 cas d'usage du cahier des charges initial

Quatre cas d'usage que le rapport final présentait comme « réels » sont partiels : U-12, U-19, U-22 et U-24.

| Cas | Intitulé | Priorité | État vérifié | Remarque |
| --- | --- | --- | --- | --- |
| UC-01 | Connexion par téléphone et code, blocage après 5 échecs | P0 | Fait | Mot de passe « fort » = 10 caractères au moins |
| UC-02 | Comptes du personnel, périmètres, journal | P0 | Fait | |
| UC-03 | Journal d'audit non modifiable, conservation paramétrable | P0 | Fait | Non modifiable côté application seulement ; la purge n'est pas planifiée |
| UC-04 | Inscription, vérification d'identité, doublons, mineurs | P0 | Fait | Identité simulée, comme demandé |
| UC-05 | Validation, rejet motivé, historique | P0 | Fait | |
| UC-06 | Coopératives et adhésions | P2 | Fait | |
| UC-07 | Carte producteur avec code de vérification | P1 | Fait | Pas de QR code |
| UC-08 | Parcelles, surface, chevauchement | P0 | Fait | Comparaison faite en Python sur toutes les parcelles du département |
| UC-09 | Campagnes et stades | P0 | Fait | |
| UC-10 | Appuis : remise et confirmation | P1 | Fait | Pas de preuve de remise (photo, signature) |
| UC-11 | Récoltes, stockage, vente, écart signalé | P1 | Fait | |
| UC-12 | Assistant : fiches publiées, citation, renvoi | P0 | Partiel | Français seulement ; modèle de langage inactif dans la configuration livrée ; question non expurgée avant envoi au modèle |
| UC-13 | Diagnostic par photo | P1 | Simulé | Aucune détection de visage : seulement une consigne affichée |
| UC-14 | Fiches : brouillon, relecture, publication | P0 | Fait | |
| UC-15 | Validation du fon et du bariba | P2 | Fait côté outil | 0 texte validé sur 2 310 entrées |
| UC-16 | Alertes et double validation | P0 | Fait | Le statut « échoué » n'est jamais produit ; le canal vocal n'est pas utilisé |
| UC-17 | Sélection de bénéficiaires | P0 | Fait | Calcul sur les fermes du POC |
| UC-18 | Candidatures et clôture | P0 | Fait | |
| UC-19 | Score de crédit avec consentement | P1 | Partiel | Le producteur ne voit pas son score et ne peut contester aucune donnée, contrairement à la fiche des modèles |
| UC-20 | Consultation du score par l'agent financier | P1 | Fait | |
| UC-21 | Offres, mise en relation, paiement simulé | P1 | Fait | Simulé au regard du TDR (T-50, T-51) |
| UC-22 | Tableau de bord, source et date de chaque chiffre | P0 | Partiel | La date manque pour 9 des 11 indicateurs du tableau principal |
| UC-23 | Suivi satellite | P1 | Simulé | Valeurs déterministes, aucune image lue |
| UC-24 | Exports et interopérabilité | P1 | Partiel | Seul le motif est contrôlé (pas d'autorisation distincte) ; un agrégat unique pour trois partenaires |
| UC-25 | Hors ligne et conflits | P1 | Fait | Les récoltes ne passent pas par la file hors ligne |

### 4.5 Les exigences non logicielles du TDR

Le prototype ne livre aucune des exigences contractuelles qui ne sont pas du logiciel. Le détail des 23 lignes est en annexe A.

- **Rapports** : rapport de démarrage, rapport de diagnostic et d'état des lieux, rapports de mission : absents. Rapports techniques et rapport final : partiels (la fiche des modèles, le cadre de réentraînement et le rapport final du 16 octobre en sont la matière première, mais ce ne sont pas des livrables présentables au comité technique).
- **Formations** : au moins 4 sessions pour les développeurs et administrateurs, au moins 5 sessions pour 50 agents dont 40 % de femmes et de jeunes, 50 agents formés au scoring, supports en fon et en bariba : absents.
- **Gouvernance** : consultations multi-acteurs, validation de chaque livrable par le CoPil et le CoTech, validation du corpus par le MTDI : absentes.
- **Pérennité** : modèle économique sur trois ans : absent ; garantie et support de six mois : postérieurs à une réception qui n'a pas eu lieu.
- **Déploiement** : plateforme déployée et accessible aux ATDA, coopératives et ministères : non (exécution locale sur SQLite) ; hébergement à arrêter avec le CoPil : non décidé ; données réelles d'identification des acteurs : non collectées.
- **IA** : au moins deux cas d'usage conçus, testés et validés : aucun modèle appris.
- **Transfert** : code source (dépôt Git, remote GitLab) et documentation : partiels ; pas de licence, pas de manuel d'utilisation, d'administration ni de sauvegarde.

## 5. Demandé et non fait, ou fait seulement en apparence

Cette section répond à la question « qu'est-ce que le TDR demandait et que le projet n'a pas fait ? ». Elle distingue cinq cas : absent, simulé, partiel, dépendant d'un tiers, et ce qui a été **déclaré fait** sans que le code le confirme entièrement.

### 5.1 Absent du code ou de toute pièce

| Réf. | Ce qui manque | Raison | Démarche humaine |
| --- | --- | --- | --- |
| R-04 | Détection précoce des ravageurs et maladies | Aucun modèle, aucune donnée étiquetée | INRAB/ATDA : fournir un jeu d'images et de relevés étiquetés (voir `REENTRAINEMENT.md`) |
| R-12 | Indicateur « adoption des pratiques améliorées » | Il faut une enquête de terrain ATDA | MAEP/ATDA : définir et réaliser l'enquête ; le code n'a pas de formulaire de collecte |
| R-07 | Standards de qualité (temps de réponse, disponibilité, précision) | Pas de cibles ni d'instrumentation | CoPil/CoTech : fixer les cibles au démarrage |
| N-18 | Deux cas d'usage IA validés | Pas de modèle appris, `scikit-learn` non installé, pas d'issues de crédit | MAEP, FNDA, INRAB : données ; AIPD (`ACTIONS_HUMAINES` n° 4) |
| M-16 | Module MMS (voix en fon/bariba) | N'existe pas ; licence CC-BY-NC | `ACTIONS_HUMAINES` n° 7 (MAEP et MTDI) |
| M-13, M-14 | Client TypeScript généré, tâches de fond planifiées | Écarts de délai du 16/10 | Équipe de développement |
| N-01 à N-03, N-06 à N-12, N-14, N-21 | Rapports, formations, consultations, validations, modèle économique, hébergement | Hors logiciel | MAEP, CoPil, CoTech, prestataire |
| — | Fichier `LICENSE`, manuels (utilisateur, administration, sauvegarde) | Non rédigés | Prestataire, après décision de licence avec le MAEP |
| — | Vue du producteur sur son propre score et contestation d'une donnée (U-19) | Non développé | Équipe de développement ; avis de l'APDP (art. 401) |

### 5.2 Simulé

| Réf. | Ce qui est simulé | Raison | Démarche humaine |
| --- | --- | --- | --- |
| T-07, T-08 | Diagnostic et niveau de risque | Aucun modèle d'image validé | INRAB : modèle et seuils ; `ACTIONS_HUMAINES` n° 5 |
| T-09 | Prévision des rendements (page `/previsions`) | Générateur à graine dans le navigateur | INRAB/MAEP : séries de rendement et modèle |
| T-50, T-51 | Paiement Mobile Money | `FakePay` | `ACTIONS_HUMAINES` n° 3 (compte marchand, agrégateur) |
| T-62 | SMS, USSD, vocal | Aucun opérateur | `ACTIONS_HUMAINES` n° 2 (ARCEP, fournisseur SMS) et n° 11 (code court USSD MTN/Moov) |
| R-02, U-23 | Satellite (NDVI, humidité) | Valeurs par hachage | MAEP : accès Sentinel/Copernicus |
| U-04 | Identité ANIP | Fiches fictives | `ACTIONS_HUMAINES` n° 1 |
| T-14 | X-Road | Interface vide | `ACTIONS_HUMAINES` n° 1 |

### 5.3 Partiel

| Réf. | Ce qui est partiel | Raison | Démarche humaine |
| --- | --- | --- | --- |
| T-05 | Assistant localisé | Contexte transmis seulement aux LLM | Choix d'un LLM hébergé au Bénin (CoPil) |
| T-06, T-57 à T-60, U-12 | Langues nationales | Aucun texte, aucune voix | MTDI (`ACTIONS_HUMAINES` n° 6 et 7) |
| T-12, U-19 | Scoring | Grille ; producteur sans accès à son score | FNDA/institutions financières : données ; développement |
| T-52 | Prévision des récoltes | Rendements de démonstration | INRAB : rendements de référence |
| T-64, T-65, M-21 | Sécurité et documentation | Durcissement et manuels à faire | Prestataire, CoPil |
| R-01, R-03, R-05, R-06, R-09, R-11, R-14, R-16 | Données, fiches, modèles, SEA, interopérabilité | Voir lignes | MAEP, INRAB, MTDI |
| U-22, U-24 | Dates des indicateurs, autorisation d'export | Non développé | Équipe de développement |
| L-391, L-424, L-427, L-428, L-433, L-435, L-328 | Conformité au Code du numérique | Documents périmés et traitements non déclarés | MAEP (responsable du traitement), DPO |

### 5.4 Qui dépend d'un tiers

| Réf. | Dépendance | Tiers | Démarche humaine (`ACTIONS_HUMAINES.md`) |
| --- | --- | --- | --- |
| T-10, T-11 | Seuils des sols et du climat | INRAB | Relecture de `MODEL_CARD.md` § 5 (n° 5) |
| T-27, T-31, T-40 | Relevés de prix | Agents, SIM | n° 12 (SIM, Météo-Bénin) |
| T-37 | Chiffres nationaux de consommation, importations | MAEP | Saisie par le MAEP ; seuils de veille à arrêter |
| T-45, T-52 | Rendements de référence | INRAB | n° 5 |
| T-61, T-66, U-15 | Textes en langues nationales et validations ; consentement d'amélioration des modèles | MTDI, APDP | n° 6, n° 4 |
| T-14, U-04 | Habilitation ANIP, X-Road | ANIP, MAEP, MTDI | n° 1 |
| T-62 | Identifiant d'expéditeur SMS, code USSD | ARCEP, MTN, Moov | n° 2 et n° 11 |
| T-50, T-51 | Compte marchand Mobile Money | Agrégateur | n° 3 |
| L-405, L-430, L-428, L-435, L-328, L-427 | Déclaration, DPO, AIPD finale, registre, mentions légales, procédure d'incident | MAEP, APDP | n° 4 et n° 10 (contrat de sous-traitance) |
| N-14 | Hébergement | CoPil, CoTech | n° 9 |
| R-03, M-04 | Validation des fiches ; source des données du POC | INRAB, ATDA, MAEP | n° 5 et n° 8 |

### 5.5 Déclaré fait, mais non confirmé ou seulement partiellement confirmé par le code

Vingt points relevés pendant la vérification. Certains sont des surévaluations de statut, d'autres des affirmations de documents que le code contredit.

1. **T-04 « LLM du réseau local branché »** : la classe `OpenAICompatibleBackend` existe, mais `backend/.env` a `OPENAI_API_KEY` vide, `ANTHROPIC_API_KEY` vide, Ollama ne répond pas sur `localhost:11434`, et le journal de la base ne contient que des réponses `extractive` (4 `answered`, 2 `escalated`). Le « branchement » n'existe qu'avec une clé.
2. **T-05 assistant et données de parcelle/météo (Fait)** : le contexte n'atteint que les backends LLM ; en mode extractif il est ignoré. Le contexte se limite à type de terrain, surface, culture, stade, météo des 3 jours, et seulement pour le rôle producteur.
3. **T-10 et T-11 (Fait)** : le constat lui-même écrit « seuils à valider par l'INRAB » ; le même cas est classé « Fait côté outil » ailleurs (T-45). Modèles à règles, non prédictifs.
4. **T-50 (Fait) et T-51 (Fait)** : le paiement passe par `FakePay` ; les trois adaptateurs d'agrégateurs sont des classes vides.
5. **T-61 « Qualité validée par des locuteurs natifs » (Fait)** : l'outil de validation par un second locuteur existe ; aucune entrée n'est validée (`translations_corpusentry` : 1 ligne `a_traduire`) ; « justesse » (`corpus.py::accuracy`) mesure si une reformulation retrouve sa propre entrée.
6. **T-57** (constat « circuit prêt ») : la file d'entrées du MTDI est alimentée depuis `i18n/fr.json` (1155 clés) seulement ; les 2715 clés de `i18n/fr/*.json`, qui portent l'interface actuelle, n'y sont pas ; yoruba et dendi ne sont pas semés.
7. **T-62 « Canaux SMS, USSD, vocal (Simulé) »** : exact pour SMS et USSD ; le canal vocal est une classe que rien n'appelle.
8. **T-64 (Fait)** : mécanismes cités vérifiés ; durcissement de production absent (HSTS, CSP, clé par défaut), outils de sécurité jamais lancés.
9. **T-65 (Fait)** : `docs/openapi.json` couvre 82 chemins sur 177 routes ; `ARCHITECTURE.md` liste 13 modules sur 27 ; pas de `LICENSE` ; aucun manuel ; 38 commits locaux non poussés (référence `origin/main` locale).
10. **U-12** : langue unique (français) ; question non expurgée avant le LLM.
11. **U-19 / `MODEL_CARD.md` § 3** : « le producteur voit ses facteurs et peut signaler une donnée inexacte » n'est pas dans le code (`/credit/scores/<id>` réservé au rôle `agent_financier`).
12. **U-22** : « chaque chiffre porte sa source et la date de mise à jour » : la date manque pour 9 des 11 indicateurs de `/dashboard/sea`.
13. **U-16** : le statut « échoué » n'est jamais produit ; le vocal n'est pas utilisé ; `docs/MOCKS.md` annonce « livre, echoue, lu ».
14. **U-13 / `CONFORMITE.md` art. 394 / `MOCKS.md`** : « aucun visage conservé » : aucune détection de visage, seulement une consigne affichée.
15. **U-24** : « autorisation » exigée pour un export de données personnelles : seul le motif (≥ 10 caractères) est contrôlé.
16. **`docs/MOCKS.md` « Aucune clé réelle, aucun appel à un service externe »** et **`REGISTRE_TRAITEMENTS.md` « aucun transfert hors du Bénin »** : faux depuis la météo Open-Meteo (appel sortant) et le LLM facultatif.
17. **`docs/ACTIONS_HUMAINES.md` n° 7 « module désactivé »** : aucun module MMS n'existe.
18. **Chiffres périmés** de `RAPPORT_FINAL.md` : « 21 modules » (27 applications Django), « pytest 38 » et « 57 tests » (147 fonctions `test_` comptées), « Vitest 8 » et « 112 » (49 fichiers, ≈ 151 cas), « environ 915 clés » (1155 + 2715), « 45 producteurs » (43 en base), bundle « 579 ko » (build du 19/10 : 834 ko, 263 ko gzip). Les nombres d'exécutions réussies ne sont pas vérifiables par moi.
19. **`docs/LANGUES_A_VALIDER.md`** décrit `fr.json` comme limité à « navigation, accueil producteur, statuts, stades » (état du 16/10).
20. **`docs/CONFORMITE_TDR.md` § 7** : « Les écrans de D et de E partent vides dans la démonstration » ; la base locale contient 24 relevés de prix, 2 enquêtes, 8 statistiques nationales : à reprendre dans le rapport selon la base utilisée.

## 6. Fait sans avoir été demandé

49 éléments ont été construits sans correspondre à une exigence du cahier des charges initial ni du TDR, ou ont dépassé leur périmètre, ou n'ont aucune demande consignée. La liste complète (date, commit, raison, coût, recommandation) est en annexe B.

### 6.1 Répartition

| Catégorie | Nombre | Les plus marquants | Coût ou risque principal | Recommandation d'ensemble |
| --- | --- | --- | --- | --- |
| A. Identité visuelle et vitrine publique | 16 | Landing 3D (+4 659 lignes), maquettes « Bénin Vert » (78 Mo) et refonte de 57 pages, « Argile et verre », « Sunny Farm », minimalisme, audit UX, nouvelle page d'accueil, logo | Cinq chartes en sept jours : seul le découpage en pages et en composants est durable ; dépendance `three` ; engagements publics (déclaration d'accessibilité, section « Partenaires ») | Figer la dernière charte, archiver le reste, retirer ce qui suggère un partenariat non confirmé |
| B. Fonctions ajoutées ou étendues | 19 | Chaîne d'audit hachée, changement de numéro, fermeture de compte, écran d'interopérabilité, programmes en brouillon, contestation d'un refus, demande d'adhésion, USSD et SMS entrants, mode agent terrain, coque mobile | Surface à maintenir ; authentification et données personnelles touchées ; USSD ouvert sans clé en démonstration | Garder ; fixer les durées avec le délégué à la protection des données ; planifier les commandes |
| C. Intégrations ajoutées | 3 | Adresse du « serveur Claude » réglable, passerelle de modèle de langage du réseau local, météo réelle Open-Meteo | Hôte privé codé en dur ; questions et contexte envoyés sans expurgation ; coordonnées de parcelle envoyées à un service externe | Retirer l'hôte par défaut, consigner, mettre à jour conformité et registre |
| D. Données écrites en dur ou fictives | 8 | Pages « Collecte » et « Offres », page « Prévisions » calculée dans le navigateur, parcelle de 97,75 ha, photo à filigrane iStock, tâches de la semaine | Chiffres fictifs dans des pages qui ressemblent à du réel ; question de licence | Retirer des menus ou brancher sur le serveur ; corriger le seed ; remplacer la photo |
| E. Outillage, documents, dépôt | 3 | Huit documents de pilotage, `start.bat reset`, deux copies de travail résiduelles | Documents qui vieillissent ; copies complètes du dépôt dans le dossier de travail | Figer les journaux ; supprimer les copies |

### 6.2 Ajouts à traiter en priorité

| N° | Ajout | Pourquoi | Action |
| --- | --- | --- | --- |
| C2 | Hôte par défaut de la passerelle de modèle de langage (nom de machine d'un réseau privé) | Raison non consignée ; essayé avant Ollama contrairement au cahier des charges ; contexte de parcelle et météo transmis | Retirer l'hôte par défaut, consigner la décision |
| C3 | Appels Open-Meteo avec la position de la première parcelle | Le registre des traitements et la fiche des simulations disent encore « aucun appel externe » | Mettre à jour la conformité ; envisager d'arrondir les coordonnées |
| D1 | Pages « Collecte » et « Offres » | Doublons de « Traçabilité » et « Stocks et ruptures », en données fictives, avec une valeur « infinie » contraire à la règle | Retirer des menus ou brancher |
| A16 | Section « Partenaires » (six sigles) | Suggère un partenariat officiel non confirmé | Retirer ou reformuler |
| D6 | Photo de démonstration à filigrane iStock | Licence inconnue | Remplacer |
| A10, D8 | Mentions de démonstration retirées des pages de pilotage par le minimalisme | Le cahier des charges exige que chaque chiffre fictif soit étiqueté | Vérifier que la source et la mention restent visibles |
| E3 | Deux copies de travail résiduelles dans `.claude/worktrees/` | Doublons dans les recherches | Supprimer les copies et les branches |

## 7. Écarts, revirements et documents périmés

### 7.1 Revirements et contradictions de décision

Quinze revirements ou contradictions ont été relevés entre les décisions, les documents et le code. Les plus importants : la charte visuelle a changé au moins cinq fois ; `DECISIONS.md` dit « sans three.js » alors que `three` a été ajouté le jour même ; seul SQLite a été exécuté alors que le cahier des charges demande que le code fonctionne sur les deux bases ; la règle « une session à la fois » a été contournée le 20 octobre avec deux branches parallèles ; les poids par défaut de la sélection diffèrent entre la fiche des modèles (0,4 / 0,3 / 0,3) et l'application (0,5 / 0,3 / 0,2).

**R1. Palette et charte visuelle : au moins cinq états en sept jours.**

| Date | État | Source |
| --- | --- | --- |
| 16/10 | MASTER_PROMPT § 12 : fond `#F7F5F0`, vert unique `#1F5B3A`, Source Sans 3, rayon 6 px, « aucun dégradé, aucun flou, aucun effet de verre, aucune ombre colorée », pas de grille de cartes de chiffres identiques | `docs/MASTER_PROMPT.md` |
| 16/10 | Bordure de champ `#4A5148` ; landing sombre forêt `#0A2417` + citron `#C6F432` + crème `#EFEBD8`, clair `#F2F5EE` + `#1F5B3A` | l.15, l.29 |
| 18-19/10 | « Bénin Vert » : canopée `#0E2F1C`, feuille `#1F5A32`, maïs `#6FA83A`, soleil `#F3C54A`, latérite `#B4532D` ; appliqué à l'app le 19/10 (`6191392`) | `DESIGN.md`, l.32 |
| 21/10 09:50 | « Argile et verre » : crème `#F6F3E8`, marque `#1E7A4C` puis `#1A6E43`, sarcelle `#0F7C82`, corail `#C84B24` | `REFONTE_FRONTEND.md` § 3 |
| 21/10 15:08 | « Sunny Farm » : `#016648`, `#00A563`, `#F6732F`, blanc | `9755df1` |
| 22/10 | Ciel bleu clair pour la scène d'accueil | `9b4cf1f` |

La phrase de l.29 (« ces jetons deviendront ceux du reste du site à l'étape suivante ») n'a pas été suivie : « Bénin Vert » est arrivé à la place. `DESIGN.md` garde un en-tête « Bénin Vert, un champ de maïs vivant » alors que l'application livre Sunny Farm.

**R2. Les interdits visuels du MASTER_PROMPT § 12 sont levés par la refonte du 21/10.** Dégradés (D12), flou et verre (D4), pastel de cartes de chiffres (D5, avec grille de quatre cartes en tête d'accueil, D10), ombres doubles, rayons 10 à 30 px, trois familles de polices (Bricolage, Atkinson, Young Serif). Le dépôt consigne que l'utilisateur l'a demandé (21/10) ; il ne consigne pas que le MASTER_PROMPT § 12 a été formellement amendé.

**R3. Mémoire du poste : règle puis dérogation.** 16/10 : `node --no-opt`, pas de `tsc` simultanés (l.13, l.22). 19/10 12:02 : « une session à la fois », car deux sessions en parallèle avaient saturé le poste (lot 5 arrêté, typecheck du lot 1 interrompu ; `PLAN_MVP.md`, `5f162f5`). 20/10 : les lots A, B, C sont en série sur `main`, mais les lots E (15:10-15:33) et D (19:17-19:37) ont été développés sur deux branches parallèles (`worktree-agent-aecefdbb3fb31dff9`, `worktree-agent-a5a3eea398688ec5f`, toujours présentes dans `.claude/worktrees/`) puis fusionnés (`8c5fe91`, `3a440d0`), avec des conflits sur les fichiers partagés (l.83). Aucun incident mémoire n'est consigné ce jour-là, hormis le délai du test 3D porté à 30 s. 21/10 : « une seule commande lourde à la fois », `NODE_OPTIONS=--max-old-space-size=1400` si `tsc` plante (`REFONTE_FRONTEND.md` § 5).

**R4. SQLite contre PostgreSQL.** MASTER_PROMPT § 3 : PostgreSQL si Docker, sinon SQLite, et « le code doit fonctionner dans les deux cas ». Réalité : SQLite seul exécuté (l.7 ; commit `3c0d19a` « la démo tourne sans Docker » ; README ; `infra/` « non utilisé ni testé »). Les règles dépendantes de la base ont été écrites pour SQLite : listes JSON filtrées en Python (l.62), agrégats SEA en Python (l.72), avec la mention « à passer en SQL avec PostgreSQL ». `ARCHITECTURE.md` dessine toujours PostgreSQL. La compatibilité PostgreSQL n'a jamais été vérifiée.

**R5. La 3D : abandonnée ou non ?**
- 16/10 16:42 et 17:25 : « sans three.js », canvas 2D écrit à la main (l.27, l.30).
- 16/10 18:17 : `56afb40` ajoute `field3d.ts` en **three.js** avec repli canvas 2D ; le titre du commit parle de « WebGL ». `package.json` contient `three 0.169.0`. `DECISIONS.md` n'a jamais été corrigé.
- 20/10 : un test de rendu 3D (56 rendus) dépasse 5 s ; délai porté à 30 s (`8c5fe91`).
- 21/10 : D16 conserve la scène 3D comme « héros » de la landing.
- 22/10 08:41 : la route `/` sert la nouvelle `HomePage` (illustrations SVG) ; la 3D n'est plus qu'à `/accueil-3d`. 08:50 et 09:07 : la page d'accueil est épurée puis ré-étoffée. La scène « réaliste » du 09:19 est en SVG, pas en 3D.
- Résultat : la 3D n'est pas supprimée mais n'est plus le parcours principal ; `three` (dépendance) et `features/landing/` (field3d, scene, relief.json) restent maintenus.

**R6. Profil.** l.34 (19/10) : changement de numéro et suppression de compte « non proposés ». l.41-l.42 (19/10 12:08 et 12:14, trois heures plus tard) : les deux sont construits.

**R7. Journal d'audit.** l.35 : « en ajout seul, pas la chaîne » ; l.43 : chaîne SHA-256. L'alerte de la page est remplacée par le bandeau « Chaîne intègre ».

**R8. Petits effectifs.** l.24 (16/10) : pas de seuil « car le POC ne compte que 45 producteurs, un seuil rendrait les agrégats vides » ; l.44 (19/10) : seuil de 5 ajouté ; l.72 : masquage complémentaire. Conséquence : les écrans SEA détaillés affichent « non disponible » avec les données de démonstration.

**R9. « Aucun appel externe » contre Open-Meteo et passerelle LLM.** `MOCKS.md` ligne 3 : « aucune clé réelle, aucun appel à un service externe ». Open-Meteo (l.60) reçoit le centroïde de la première parcelle du producteur, ou à défaut le centre de son département (`apps/satellite/api.py` `place_of`, appelé par l'assistant, l'USSD et l'écran météo ; `integrations/market_data.py` envoie latitude et longitude telles que reçues, l'arrondi à 2 décimales ne sert qu'à la clé de cache). `CONFORMITE.md` (art. 391) n'a pas été mise à jour depuis le 19/10 12:14. `ACTIONS_HUMAINES.md` n° 12 demande encore de raccorder Météo-Bénin « pour remplacer les valeurs de démonstration ». La passerelle LLM passe en premier dans `llm.py` (avant Ollama), contrairement à l'ordre Ollama, Anthropic, extractif du MASTER_PROMPT § 9.

**R10. Pondérations de la sélection.** `MODEL_CARD.md` et l.20 : 0,4 / 0,3 / 0,3. Formulaire de l'application (`frontend/src/features/selection/SelectionPage.tsx`, valeurs initiales) et `DEMO.md` étape 6 : 0,5 / 0,3 / 0,2 (modifié le 19/10 par `9043726`). Le « poids par défaut » dépend donc de l'endroit où on le lit.

**R11. Score de crédit.** l.46 (19/10) : la grille ne change pas ; l.65 (20/10) : le facteur « Appuis remboursés » devient réel « sans toucher aux poids ». `RAPPORT_FINAL.md` dit encore « analyses prédictives : non faites ».

**R12. Verdict de conformité au TDR.** `RAPPORT_FINAL.md` (16/10) : analyses prédictives non faites ; `b8cc0b4` (20/10 midi) : 30 faites sur 66 contre 15 le matin ; `3a440d0` (21/10) : 48 faites (73 %), 6 faites côté outil, 4 simulées, 8 partielles, 0 absente. Le décompte du matin de 20/10 est donné sur 64 exigences, celui du soir sur 66.

**R13. « Rien n'est poussé » (`RAPPORT_FINAL.md`, 19/10) contre `origin/main`.** Une référence `origin/main` existe, à `b8cc0b4` (20/10 12:39) : un push a donc eu lieu après la rédaction du rapport. 38 commits locaux ne sont pas poussés.

**R14. Même journée, ajout puis retrait.** 21/10 : `5405c5f` (09:50) pose carte de bienvenue, quatre chiffres pastel, six tuiles d'accès rapide ; `82792d2` (10:20) ajoute des icônes aux chiffres ; `ec6583f` (15:33) retire tuiles d'accès et carte météo, `c55b45c` (15:22) retire les icônes décoratives. 22/10 : `d882bbe` (08:41) crée la page d'accueil, `563b118` (08:50) en retire six rubriques, `1706422` (09:07) les remet « réduites ». Logo : quatre états entre 09:07 et 09:43.

**R15. Vente du marché : sens du paiement.** `f6039e5` (19/10 09:40) corrige un défaut du 16/10 (le vendeur qui demandait le paiement était enregistré payeur) ; `caec3d1` (17:14) et `b9a7948` (17:31) corrigent encore deux défauts de rôle vendeur/acheteur. Ce circuit monétaire (simulé) a été corrigé trois fois en une journée.

### 7.2 Documents périmés ou partiellement périmés

| Document | État | Pourquoi |
| --- | --- | --- |
| `RAPPORT_FINAL.md` | Périmé | Dit « analyses prédictives non faites » et « rien n'est poussé » ; chiffres de test du 19 octobre ; ignore les lots A à E, la refonte et l'accueil |
| `docs/ARCHITECTURE.md` | Périmé | Décrit 13 modules sur 27 ; aucun des modules ajoutés depuis le 19 octobre |
| `docs/API.md`, `docs/openapi.json` | Périmés | Le schéma couvre 82 chemins sur 177 ; fichier en YAML nommé `.json` |
| `docs/AIPD_brouillon.md` | Périmé | Ne couvre ni créances et prêts, ni jeu d'entraînement, ni enquêtes, ni météo, ni localisation des parcelles |
| `docs/REGISTRE_TRAITEMENTS.md` | Périmé | 11 traitements au 16 octobre ; « aucun transfert hors du Bénin » est inexact depuis la météo réelle |
| `docs/uml/` | Périmés | Jamais modifiés depuis le 16 octobre |
| `docs/CONFORMITE.md` | Partiel | L'article 391 ignore Open-Meteo et la passerelle de modèle de langage |
| `docs/MOCKS.md` | Partiel | Dit « aucun appel à un service externe » ; décrit la confiance du diagnostic comme « fixe » |
| `docs/DECISIONS.md` | Partiel | S'arrête au 20 octobre ; n'a jamais consigné `three.js` ni la passerelle de modèle de langage |
| `PROJECT_MAP.md`, `PRODUCT.md`, `DESIGN.md`, `README.md` | Partiel | Décrivent des états antérieurs du style ou de la landing |
| `docs/LANGUES_A_VALIDER.md` | Partiel | Décrit un `fr.json` unique alors que l'interface est répartie en 20 fichiers |
| `docs/PLAN_MVP.md` | Historique | État du 19 octobre |

À jour : `docs/API_CONTRACT_V2.md`, `docs/DEMO.md` (rejoué le 21 octobre, pas depuis la nouvelle page d'accueil), `docs/MODEL_CARD.md` (sauf les poids de sélection), `docs/REENTRAINEMENT.md`, `docs/REFONTE_FRONTEND.md`, `docs/RAPPORT_PARCOURS.md`, `start.bat`, `start.sh`.

## 8. Risques et points de vigilance

Ces risques sont tirés du code et des documents. Aucun n'a été exploité ou testé en conditions réelles. Niveau : Élevé = à lever avant toute exposition hors du poste de développement ; Moyen = à traiter avant la mise en service ; Faible = à surveiller.

### 8.1 Sécurité

| Niveau | Risque | Où | Action |
| --- | --- | --- | --- |
| Élevé | Avec `DEMO_MODE=true` (valeur par défaut de `.env.example` et de `docker-compose.yml`), `GET /demo/otp-inbox` rend à n'importe qui les derniers codes de connexion de n'importe quel numéro : prise de contrôle de tout compte producteur | `apps/accounts/api.py`, `backend/.env.example` | Défaut à faux ; refuser le démarrage en production avec ce mode |
| Élevé | Avec `DEMO_MODE=true`, la passerelle USSD et SMS est ouverte sans clé et identifie l'appelant par son seul numéro (confirmation d'appuis possible pour n'importe quel numéro) | `apps/ussd/api.py` | Exiger la clé de passerelle en toute circonstance hors démonstration |
| Élevé | La clé secrète a une valeur de repli de développement ; elle signe les jetons, hache les codes et pseudonymise les jeux d'entraînement | `config/settings.py` | Refuser le démarrage sans clé hors développement |
| Élevé | La question de l'utilisateur part telle quelle vers le modèle de langage (seul le journal est expurgé) ; l'hôte par défaut est un nom de machine privé codé en dur | `apps/assistant/services.py`, `config/settings.py` | Expurger avant l'envoi ; hôte vide par défaut |
| Élevé | Aucune rotation ni révocation du jeton de rafraîchissement : la déconnexion ne supprime que le cookie | `apps/accounts/api.py` | Activer la liste noire et la rotation |
| Moyen | L'export CSV n'écarte pas les préfixes de formule (`=`, `+`, `-`, `@`) et le jeu « producteurs » contient NPI, téléphone et date de naissance | `apps/exports/api.py` | Neutraliser les formules ; réduire les colonnes ; exiger une autorisation distincte |
| Moyen | Ni HSTS, ni CSP, ni redirection HTTPS côté Django ; `nginx` n'écoute qu'en HTTP et laisse HSTS en commentaire | `config/settings.py`, `infra/nginx.conf` | Durcir avant tout déploiement |
| Moyen | Les compteurs de limitation de débit vivent en mémoire de chaque processus ; l'inscription publique n'a aucune limite | `config/settings.py`, `apps/producers/api.py` | Cache partagé ; limiter l'inscription |
| Moyen | Le schéma d'API et la documentation interactive sont publics | `config/urls.py` | Les réserver à l'administration |
| Moyen | Le journal d'audit garde `actor_phone` après l'effacement d'un compte ; des numéros figurent aussi dans des détails | `apps/audit/models.py`, `apps/production/lots.py` | Pseudonymiser à l'effacement |
| Faible | `requires_password` distingue les comptes du personnel des autres numéros ; le NPI du tuteur d'un mineur n'est pas vérifié ; `ALLOWED_HOSTS` contient `testserver` par défaut | `apps/accounts/services.py`, `apps/producers/services.py` | Corriger à l'occasion |

### 8.2 Données personnelles et conformité

| Niveau | Risque | Action |
| --- | --- | --- |
| Élevé | Le registre des traitements et la fiche des simulations affirment « aucun transfert hors du Bénin » alors que les coordonnées de la première parcelle du producteur partent vers `api.open-meteo.com` et, si une clé est renseignée, la question et le contexte vers le modèle de langage | Mettre à jour le registre, la conformité et l'analyse d'impact ; décider d'arrondir les coordonnées |
| Moyen | L'analyse d'impact, le registre et la conformité ne couvrent pas les traitements ajoutés les 19 et 20 octobre (créances, prêts, revenus, enquêtes, formations, vitrine, messagerie, diagnostics, matériel, relevés de prix) | Les mettre à jour avant la déclaration à l'APDP |
| Moyen | Durées de conservation non arrêtées avec le délégué à la protection des données (365 jours après fermeture de compte, 90 jours pour les photos) et commandes de purge non planifiées | Décider et planifier |
| Moyen | Mode agent terrain : les inscriptions complètes sont gardées sur le téléphone jusqu'au rejeu, sans chiffrement de l'appareil décidé | Instruire avec l'APDP avant d'élargir |
| Moyen | Consentement « amélioration des modèles » inexistant dans le code, alors que le cadre de réentraînement le suppose | Le créer avant tout export réel |
| Faible | Mentions légales, contact et déclaration d'accessibilité contiennent des champs à renseigner par le MAEP | Compléter avant mise en service |

### 8.3 Qualité et exploitation

| Niveau | Risque | Action |
| --- | --- | --- |
| Moyen | Aucun planificateur : `purge_retention`, `verify_audit_chain`, `check_stock_alerts` et `remind_claims` ne tournent jamais d'eux-mêmes (django-q2 prévu, jamais installé) | Planifier (cron ou django-q2) |
| Moyen | PostgreSQL jamais exécuté ; plusieurs règles (listes JSON filtrées, agrégats du suivi-évaluation, qualité des modèles) sont écrites en Python pour SQLite | Tester sur PostgreSQL et passer ces agrégats en SQL |
| Moyen | Spécifications Playwright, Lighthouse, `bandit`, `pip-audit`, `npm audit`, essai sur téléphone réel : jamais exécutés | Les exécuter sur un poste doté de mémoire |
| Moyen | Aucun déploiement : `infra/` (conteneurs, nginx) n'a jamais été exécuté ; l'intégration continue vise GitHub alors que le dépôt distant est un GitLab | Choisir la plateforme d'hébergement et d'intégration, puis les exécuter |
| Moyen | Budget de la page de connexion (250 ko transférés) : le dernier build connu pèse 263 ko compressés, au-dessus du budget | Remesurer sur un build récent |
| Faible | Deux identités d'auteur dans Git ; commit de 171 fichiers et 16 691 lignes ; un commit sans message de corps | Observation |

## 9. Démarches humaines et décisions attendues

Le prototype remplace par des simulations tout ce qui exige une démarche administrative ou un tiers. Les douze actions de `docs/ACTIONS_HUMAINES.md`, puis treize autres actions consignées ailleurs :

### `docs/ACTIONS_HUMAINES.md` (liste complète, 12 actions)

| # | Action | Responsable proposé | Ce que le prototype fait à la place |
| --- | --- | --- | --- |
| 1 | Habilitation ANIP et raccordement X-Road (conditions d'accès non publiques) ; confirmer le format exact du NPI | MAEP, MTDI | `AnipClient` simulé, `XRoadAdapter` vide, NPI à 10 chiffres configurable |
| 2 | Pré-enregistrement ARCEP de l'identifiant d'expéditeur SMS ; choix d'un fournisseur SMS et vocal | MAEP | `SmsChannel` et `VoiceChannel` écrivent dans `outbox` |
| 3 | Compte marchand chez un agrégateur Mobile Money (documents d'entreprise, plusieurs jours) | MAEP ou opérateur désigné | `FakePay` |
| 4 | Déclaration des traitements à l'APDP (art. 405), délégué à la protection des données (art. 430), analyse d'impact finale (art. 428), mentions légales avec l'identité de l'exploitant (art. 328) | MAEP | Brouillons : `AIPD_brouillon.md`, `REGISTRE_TRAITEMENTS.md`, `INCIDENTS.md`, page de mentions légales à compléter |
| 5 | Relecture des fiches par l'INRAB (fond) et les ATDA (adaptation locale) ; sourcer ou retirer les passages `a_sourcer` | INRAB, ATDA | Passages `brouillon_non_valide` ; sourcés = `publie` pour la démonstration seulement |
| 6 | Relecture du fon et du bariba | MTDI | Textes `non_valide`, repli sur le français |
| 7 | Accord sur la licence des modèles vocaux Meta MMS (CC-BY-NC 4.0, usage commercial interdit) | MAEP, MTDI | Module désactivé |
| 8 | Confirmer la liste officielle des filières prioritaires (le MAEP parle de 13) et la source des données du POC | MAEP | 10 filières ; données POC marquées non officielles |
| 9 | Choix de l'hébergement final avec le CoPil et le CoTech (art. 391, transferts hors du Bénin) | CoPil, CoTech | Exécution locale ; `docker-compose.yml` fourni, non testé |
| 10 | Contrat de sous-traitance entre le MAEP et le prestataire | MAEP, prestataire | Non couvert par le code |
| 11 | Code court USSD et passerelle USSD/SMS entrants chez un opérateur (MTN, Moov), avec `USSD_GATEWAY_KEY` | MAEP, opérateur | Passerelles simulées ouvertes en `DEMO_MODE`, `*000#` d'exemple |
| 12 | Raccorder une source de météo (Météo-Bénin) et de prix de marché (SIM) | MAEP | `integrations/market_data.py` et `features/weather/demo.ts` (la météo est réelle via Open-Meteo depuis le 20/10) |

Avertissement MMS (même fichier) : `facebook/mms-tts-fon` et `facebook/mms-1b-all` sont sous CC-BY-NC 4.0 ; module serveur prévu mais désactivé ; ne pas l'activer sans accord écrit du MAEP et du MTDI après analyse juridique.

Autres points du même fichier : Windows « Dossiers contrôlés » (autoriser `python.exe` serait une décision humaine, non recommandée) ; prototype sans Docker, `infra/` non testé ; fichier POC de 77,5 Mo ; passage « quand semer le maïs à Banikoara » à confirmer par l'ATDA Alibori (fiche WOCAT non ouverte directement) ; photo de démonstration `docs/demo/photo-feuille-douteuse.jpg` (et copie dans `backend/media/diagnoses/`) avec filigrane iStock à remplacer ; pages d'accessibilité et de contact du 22/10 à renseigner (point de contact technique, DPO, délai de réponse, autorité de recours, décision d'un audit externe WCAG 2.2 AA, mentions surlignées tant qu'ouvertes) ; logo (474 × 152 px, fichier vectoriel à fournir, icônes du navigateur à refaire) et partenaires (confirmer la liste, fournir les logos officiels).

### Actions consignées ailleurs mais absentes de ACTIONS_HUMAINES.md

| Action | Source |
| --- | --- |
| Fixer avec le DPO la durée de conservation après fermeture de compte (365 jours par défaut) et planifier `purge_retention` | l.42 |
| Planifier `verify_audit_chain` la nuit et publier régulièrement l'empreinte de tête hors de la base (rapport au CoPil) | l.43 |
| Planifier `remind_claims` (rappels d'échéance) et `check_stock_alerts` (alertes de rupture) ; django-q2 absent | l.63, l.79 |
| Valider les seuils : climat (INRAB), stocks 7 et 15 jours (MAEP), veille 80 % / +20 % / −15 % (MAEP), fenêtre de 12 mois et seuil de 5 de l'impact des appuis (MAEP), rendements de référence (INRAB) | l.68, l.72, l.73, l.79, l.80 |
| Saisir les statistiques nationales (MAEP, INSAE, douanes) et les relevés de prix réels (agents, SIM) | l.73, l.77 |
| Réentraînement : consentement distinct « amélioration des modèles », AIPD, avis de l'APDP avant tout export réel ; valider les seuils proposés | l.76 ; `REENTRAINEMENT.md` |
| Instruire avec l'APDP le chiffrement de l'appareil et la durée avant de mettre un secteur entier hors ligne | l.57 |
| Confirmer avec l'APDP la visibilité des sites des acteurs sur la carte | l.74 |
| Décider avec le comité de la grille du score de crédit (rendement relatif, coopérative) et de la case « priorité aux femmes et aux moins de 35 ans » | l.45, l.46 |
| Anonymisation des petits effectifs avant tout raccordement réel d'un partenaire ; métriques X-Road pour remplacer le journal | l.24, l.44 |
| Ajuster le débit limité de l'enquête publique (30 réponses par heure et par adresse) | l.81 |
| Exécuter les spécifications Playwright, un parcours sur téléphone réel, Lighthouse, `bandit`, `pip-audit`, `npm audit` | `RAPPORT_FINAL.md`, `RAPPORT_PARCOURS.md`, `AUDIT_UX.md` |
| Décider du sort de la passerelle LLM (hôte par défaut), des pages « Collecte » et « Offres » et de la landing 3D | sections 2.3 et 3 de ce rapport |
| Relire et valider le fond des fiches publiées pour la démonstration, dont la fenêtre de semis à Banikoara | `RAPPORT_FINAL.md` ; `ACTIONS_HUMAINES.md` n° 5 |

## 10. Recommandations

### 10.1 Avant toute démonstration extérieure

1. Mettre `DEMO_MODE` à faux hors du poste de démonstration et poser une clé secrète propre.
2. Remplacer la photo à filigrane, retirer la section « Partenaires » ou la reformuler, vérifier que chaque chiffre fictif reste étiqueté après le minimalisme.
3. Retirer les pages « Collecte » et « Offres » des menus, ou les brancher sur les lots et les stocks réels.
4. Vider l'hôte par défaut de la passerelle de modèle de langage et consigner la décision.
5. Pousser les 38 commits locaux après relecture.

### 10.2 Avant la mise en service

1. Durcissement : rotation des jetons, HSTS, CSP, redirection HTTPS, cache partagé pour les limites de débit, garde contre les formules dans l'export, expurgation avant l'envoi au modèle de langage, schéma d'API réservé à l'administration.
2. Planifier les quatre commandes de maintenance ; tester sur PostgreSQL ; exécuter Playwright, Lighthouse, `bandit`, `pip-audit`, `npm audit` et un essai sur téléphone réel.
3. Mettre à jour la documentation : rapport final, architecture, contrat et schéma d'API (régénérer le schéma), analyse d'impact, registre des traitements, conformité, diagrammes ; ajouter licence, manuel d'utilisation, manuel d'administration, procédure de sauvegarde.
4. Combler les écarts fonctionnels du TDR qui ne dépendent d'aucun tiers : vue du producteur sur son score et contestation (UC-19), dates de mise à jour des indicateurs (UC-22), autorisation distincte de l'export (UC-24), statut « échoué » et canal vocal des alertes, détection de visage ou refus de photo, client TypeScript généré.
5. Alimenter la file de traduction du MTDI avec les clés de l'interface actuelle (2 715 clés ne sont pas semées).

### 10.3 Ce qui dépend de tiers

Voir les sections 5.4 et 9 : habilitation ANIP et raccordement X-Road, identifiant d'expéditeur SMS et code court USSD, compte marchand Mobile Money, déclaration à l'APDP et désignation du délégué, relecture des fiches par l'INRAB, validation des seuils (climat, stocks, veille, rendements de référence), saisie des statistiques nationales et des relevés de prix, textes en fon, bariba, yoruba et dendi, licence des modèles vocaux, hébergement.

### 10.4 Pour le suivi du projet

Les livrables non logiciels du TDR (rapports, formations, consultations, modèle économique) ne sont pas dans le périmètre du dépôt ; ils doivent être planifiés par ailleurs. Une revue de ce rapport avec le comité de pilotage permettrait de trancher les huit décisions de la section 1.4.

## Annexe A : matrice détaillée des 167 exigences

<!--landscape-->

La matrice confronte chaque exigence à l'état déclaré et à l'état vérifié dans le code. Références : T (66 lignes du document de conformité), U (cas d'usage), R (exigences du TDR hors des 66 lignes), L (Code du numérique), M (exigences transversales du cahier des charges), N (non logicielles).

### Les 66 lignes de `docs/CONFORMITE_TDR.md`

| Réf. TDR (section) | Exigence (courte) | Priorité | État déclaré | État vérifié dans le code | Preuve (chemin, fonction, endpoint) | Écart |
| --- | --- | --- | --- | --- | --- | --- |
| T-01 · §2 obj.1 ; §3.1 Collecte | Base d'identification de tous les acteurs et de leurs actifs par filière | n.c. | Fait | Fait | `apps/producers/models.py::Producer` ; `apps/cooperatives/models.py::Cooperative, Organisation` ; `apps/production/models.py::Site` ; `apps/farmservices/models.py::Equipment, Pmea` ; `/producers`, `/sites`, `/equipment`, `/pmea` | Institutions financières, transformateurs et distributeurs = comptes utilisateurs (pas de fiche « institution »). Données de démonstration seulement : 43 producteurs fictifs dans `db.sqlite3`. |
| T-02 · §2 obj.1 ; §1 enjeux internes | Gestion des interrelations entre acteurs | n.c. | Fait | Fait | `cooperatives/models.py::Membership, Organisation.cooperatives` ; `market/models.py::Match` ; `production/models.py::Lot.parents` ; `alerts/models.py::ChatMessage` ; `/memberships/mine`, `/matches/mine`, `/chat` | Aucun. |
| T-03 · §2 obj.1 | Suivi des efforts de l'État envers les acteurs | n.c. | Fait | Fait | `production/models.py::Support` ; `programs/models.py::Program, Application, SelectionRun` ; `/supports`, `/programs`, `/dashboard/financing` (`knowledge/publications.py::financing_by_chain`) | Aucun. |
| T-04 · §2 obj.2 ; §3.1 IA | Assistant alimenté par les fiches INRAB/ATDA | P0 (UC-12, UC-14) | Fait | Fait | `assistant/services.py::ask` ; `knowledge/services.py::search` (BM25 sur `status="publie"`) ; `/assistant/ask` ; page `/assistant` ; `backend/data/knowledge/*.json` = 86 fiches dont 42 publiées | Le constat « LLM du réseau local branché » n'est pas confirmé : `OPENAI_API_KEY` vide dans `backend/.env`, Ollama ne répond pas sur le poste, et les 6 réponses du journal de la base sont toutes `extractive`. 44 fiches sur 86 sont `a_sourcer` (brouillons, non utilisées). Fiches publiées = « technologies » du recueil INRAB, non relues par l'INRAB (`ACTIONS_HUMAINES` n° 5). |
| T-05 · §2 obj.2 ; §3.1 IA (données géospatiales et météo) | Assistant alimenté par les données de la parcelle et la météo | n.c. | Fait | **Partiel** | `assistant/services.py::_field_context` (type, surface, culture, stade, météo 3 jours, rôle producteur seulement) ; `integrations/llm.py::ExtractiveBackend.answer` **n'utilise pas** `context` ; test `assistant/tests.py::test_assistant_context_carries_the_parcel_and_real_weather` | Le contexte n'atteint que les backends LLM (`OllamaBackend`, `OpenAICompatibleBackend`, `AnthropicBackend`). En mode extractif (le seul actif ici) la réponse est un extrait de fiche non localisé. Pas de sol, d'historique de parcelle ni de NDVI dans le contexte. |
| T-06 · §2 obj.2 ; §1 (langues) | Assistant en fon et bariba | P2 (UC-15) | Partiel | Partiel | `translations/corpus.py::match` (recoupement de mots ≥ 0,5 avec une réponse validée) ; `assistant/services.py::ask` (branche `native`) ; base : `translations_corpusentry` = 1 ligne `a_traduire`, 0 validée | Appariement de questions-réponses écrites par des humains, pas de compréhension ni de génération de texte (TDR §3.1 « compréhension et génération »). Aucun contenu. |
| T-07 · §2 obj.3 | Diagnostic photo : état, maladie probable, recommandations | P1 (UC-13) | Simulé | Simulé | `integrations/diagnosis.py::SimulatedDiagnosis` (hachage SHA-256 de l'image, 10 pathologies de démonstration) ; `diagnosis/services.py::create` ; `/diagnoses` | Conforme à la déclaration. Aucun modèle d'image. |
| T-08 · §2 obj.3 | Diagnostic : niveau de risque | P1 (UC-13) | Simulé | Simulé | `integrations/diagnosis.py::RISK` (valeurs « de DÉMONSTRATION ») | Conforme. |
| T-09 · §2 obj.4 ; §3.1 IA | Prévision des rendements | n.c. | Simulé | Simulé | `frontend/src/features/forecasts/simulate.ts` (générateur pseudo-aléatoire à graine, aucun appel API dans `ForecastsPage.tsx`) ; côté serveur seulement `Harvest.estimated_kg` (rendement de référence × surface) et `markets/analysis.py::expected_supply` | Aucun modèle (scikit-learn absent de `requirements.txt`/`requirements.lock`). |
| T-10 · §2 obj.4 | Analyses des sols et de l'utilisation des terres | n.c. | Fait | **Fait côté outil** | `lands/services.py::interpret, land_use` ; `lands/models.py::SoilAnalysis` ; `/soil-analyses`, `/land-use` ; page `/sols` ; test `lands/tests.py::test_soil_analysis_is_interpreted_without_any_dose` | Seuils « non validés » (`MODEL_CARD.md` § 5), lecture descriptive et non prédictive ; la base contient 2 analyses de test. Le document classe pourtant la ligne « Fait » alors qu'il écrit « seuils à valider par l'INRAB » (règle 2). |
| T-11 · §2 obj.4 ; §3.1 IA | Risques climatiques (sécheresse, inondation, stress hydrique) | n.c. | Fait | **Fait côté outil** | `lands/climate.py::assess` (`KC`, `FLOOD_MM`) ; `integrations/market_data.py::climate_series` (Open-Meteo, repli simulé signalé) ; `/climate-risks`, `/climate-risks/departments` ; page `/risques-climatiques` ; test `lands/tests.py::test_risk_model_flags_drought_water_stress_and_floods` | Modèle à règles, seuils à valider par l'INRAB, aucune confrontation à des sinistres (`MODEL_CARD.md` § 5). Même remarque de classement que T-10. |
| T-12 · §2 obj.4 ; §3.1 IA | Scoring crédit | P1 (UC-19, UC-20) | Partiel | Partiel | `credit/services.py::compute` (5 facteurs pondérés 0,2/0,2/0,25/0,25/0,1) ; `/credit/scores/<id>` ; page `/credit` | Grille fixe, pas de modèle statistique, pas de données Mobile Money (TDR §3.3 « données alternatives »). Le producteur ne voit pas son propre score (voir U-19). |
| T-13 · §2 obj.4 | Accès des analyses à MAEP central, ATDA/INRAB, institutions financières | n.c. | Fait | Fait | `core/permissions.py::roles` ; `lands/api.py::STAFF`, `credit/api.py` (rôle `agent_financier`), `observatory/api.py::READERS, QUALITY_READERS` (agronome INRAB) | L'agronome INRAB n'accède pas aux sols, au climat ni aux prévisions (`App.tsx::LAND` ne l'inclut pas) ; l'institution financière n'a que score et recouvrement. L'auditeur du CoPil lit davantage que « le journal » (voir M-09). |
| T-14 · §2 obj.8 ; §3.4 | Synergie avec les SI du MAEP et X-Road | P1 (UC-24) | Partiel | Partiel | `integrations/xroad.py::XRoadClient.call` lève `NotImplementedError` ; `interop/api.py::aggregates` (`/interop/<partner>/aggregates`, clé API par partenaire) | Un seul agrégat (département × filière, cellules < 5 masquées) servi à l'identique aux trois « partenaires » `xroad`, `sonama`, `fnda`. FOPAPS jamais cité dans le code ni les docs. |
| T-15 · §3.1 Aménagements | Parcelles par GPS | P0 (UC-08) | Fait | Fait | `parcels/services.py::create_parcel, to_utm` (shapely + pyproj) ; `/parcels` ; `frontend/src/features/parcels/GpsTrace.tsx` (`watchPosition`) ; page `/parcelles` | Aucun. |
| T-16 · §3.1 Aménagements | Superficies disponibles / exploitables / exploitées ; types de terrain | P0 (UC-08) | Fait | Fait | `lands/services.py::land_use, _check_areas` ; `Parcel.land_type, arable_ha` ; `/land-use` ; page `/amenagements` | « Exploitable » est déclaré, non contrôlé sur le terrain. |
| T-17 · §3.1 Aménagements | Réhabilitation, nouveaux aménagements, entretien des périmètres | n.c. | Fait | Fait | `lands/models.py::Works.TYPES` ; `lands/services.py::create_works, update_works, WORKS_MOVES` ; `/schemes/<id>/works` ; test `test_rehabilitation_works_drive_the_scheme_status` | Pas de carte des aménagements (coordonnées stockées, couche `schemes` de `/map/actors` seulement). |
| T-18 · §3.1 Production | Producteurs et parcelles | P0 (UC-04, UC-08, UC-09) | Fait | Fait | `producers/services.py::register` ; `parcels/services.py` ; `/producers/register`, `/parcels`, `/campaigns` | Aucun. |
| T-19 · §3.1 Production | Activités semencières du centre aux bénéficiaires | n.c. | Fait | Fait | `farmservices/models.py::SeedLot, SeedDistribution` ; `farmservices/services.py::create_seed_lot, distribute_seeds` ; `/seed-lots/<id>/distribute` ; test `test_seed_lot_is_distributed_as_a_support_with_its_code` | Certificat saisi, non vérifié contre un registre. |
| T-20 · §3.1 Production | Appuis en intrants | P1 (UC-10) | Fait | Fait | `production/services.py` (remise, confirmation, signalement) ; `/supports`, `/supports/<id>/confirm`, `/report` ; page `/appuis` | Aucun. |
| T-21 · §3.1 Production | Prestations de mécanisation | n.c. | Fait | Fait | `farmservices/services.py::create_request, decide_request, complete_request` ; `/mechanization/requests*` ; test `test_mechanization_request_from_acceptance_to_expense` | Le paiement de la prestation est hors plateforme (`DECISIONS` 2026-10-20 « Lot C »). |
| T-22 · §3.1 Production | Suivi de la production (campagnes, stades, récoltes) | P0/P1 (UC-09, UC-11) | Fait | Fait | `parcels/services.py::create_campaign, set_stage` ; `production/services.py` (récolte, `DEVIATION_FLAG_PCT`) ; `/campaigns`, `/harvests` | Aucun. |
| T-23 · §3.1 Production | Suivi du recouvrement des appuis | n.c. | Fait | Fait | `production/recovery.py::open_claim, pay, remind, repayment_rate` ; `/claims`, `/claims/portfolio`, `/claims/<id>/pay` ; pages `/remboursements`, `/recouvrement` ; tests `test_recovery.py` (8 fonctions) | Règlement par `FakePay` (règle 1) ; rappels via la commande `remind_claims`, non planifiée. |
| T-24 · §3.1 Production | Suivi des magasins de stockage | n.c. | Fait | Fait | `production/models.py::Site.KINDS` (`magasin`) ; `Lot.site` ; `/sites`, `/stocks/outlook` | Aucun. |
| T-25 · §3.1 Transformation | Transformateurs, unités et sites par GPS ; plateau technique | n.c. | Fait | Fait | `Site.KINDS` (`unite_transformation`), `Site.equipment`, `capacity_t` ; `lots.py::create_site` (contrôle de coordonnées au Bénin) | Plateau technique = champ texte libre. |
| T-26 · §3.1 Transformation | Flux matières | n.c. | Fait | Fait | `production/lots.py::collect, transfer, transform, trace` ; `/lots`, `/lots/collect`, `/lots/transform`, `/lots/<ref>/trace` ; page `/tracabilite` ; test `test_lots.py::test_lot_traced_from_harvest_to_transformed_product` | Aucun. |
| T-27 · §3.1 Transformation | Prix brut et transformé | n.c. | Fait côté outil | Fait côté outil | `markets/prices.py` ; `/prices`, `/prices/margins` ; page `/prix` ; `integrations/market_data.py::prices` (repli `simulated: true`) | Conforme : 24 relevés dans `db.sqlite3` (saisis par l'API, 24 entrées `price.record` au journal) ; sans relevé récent, valeurs de démonstration. |
| T-28 · §3.1 Transformation | Renforcement du plateau technique, recouvrement | n.c. | Fait | Fait | `production/recovery.py::open_claim` (type équipement) ; test `test_plateau_equipment_is_opened_by_the_agent_of_the_zone` ; `markets/trainings.py` | Règlement par `FakePay`. |
| T-29 · §3.1 Distribution | Distributeurs, magasins, points de vente par GPS | n.c. | Fait | Fait | `Site.KINDS` (`point_vente`) | Aucun. |
| T-30 · §3.1 Distribution | Suivi des stocks et anticipation des ruptures | n.c. | Fait | Fait | `production/stocks.py` ; `/stocks/outlook` ; `management/commands/check_stock_alerts.py` ; page `/stocks` ; `test_stocks.py` (6 fonctions) | Alertes par commande non planifiée ; ventes du marché hors lot non vues (reconnu dans `MODEL_CARD.md` § 7). |
| T-31 · §3.1 Distribution | Suivi des prix | n.c. | Fait côté outil | Fait côté outil | idem T-27 | Idem. |
| T-32 · §3.1 Distribution | Enquêtes de satisfaction des consommateurs | n.c. | Fait | Fait | `markets/surveys.py` (`MIN_CELL = 5`) ; `surveys_api.py::public_respond` (limitation de débit, champ piège) ; `/public/surveys/<code>/respond` ; page `/enquete/:code` ; `test_surveys.py` (6 fonctions) | Le recueil dépend des répondants ; 2 enquêtes dans la base. |
| T-33 · §3.1 Gouvernance | Interprofessions, OIA, fédérations | n.c. | Fait | Fait | `cooperatives/models.py::Organisation.KINDS` ; `organisations.py` ; `/organisations` ; page `/organisations` | Aucun. |
| T-34 · §3.1 Gouvernance | Coopératives et effectifs | P2 (UC-06) | Fait | Fait | `Cooperative`, `Membership` ; `dashboard/sea_detail.py::workforce` | Aucun. |
| T-35 · §3.1 Gouvernance | Fonctionnement des interprofessions, prix, renforcement de capacités | n.c. | Fait | Fait | `cooperatives/models.py::OrgEvent` (assemblée, réunion, prix, formation, femmes, jeunes) ; `markets/trainings.py` | Aucun. |
| T-36 · §3.1 Suivi-évaluation | Production par filière, effectifs, impact des appuis | n.c. | Fait | Fait | `dashboard/sea_detail.py::production, workforce, impact` ; `/dashboard/sea/*` ; page `/suivi-evaluation` ; `test_sea_detail.py` (5 fonctions) | Avec 43 producteurs, l'impact affiche « non disponible » (groupes < 5, reconnu dans `DECISIONS` 2026-10-20). Voir R-09 à R-15 pour les indicateurs du § 3.1 non couverts. |
| T-37 · §3.1 Suivi-évaluation | Couverture de la consommation nationale, importations, tendances, veille | n.c. | Fait côté outil | Fait côté outil | `observatory/models.py::NationalStat` ; `/national-coverage`, `/national-coverage/import` ; page `/couverture` | Conforme : 8 lignes de démonstration seulement ; chiffres officiels à saisir par le MAEP. |
| T-38 · §3.1 Suivi-évaluation | Cartographie des acteurs | n.c. | Fait | Fait | `observatory/actors_map.py::register` (couches sites, aménagements, organisations, coopératives, parcelles) + `farmservices/map_layers.py` (PMEA, matériel) ; `/map/actors` ; page `/carte-acteurs` | Organisations et coopératives placées au centre du département (jamais une position réelle). Pas de couche « producteurs » individuels. |
| T-39 · §3.1 Services transversaux | Météo | n.c. | Fait | Fait | `integrations/market_data.py::weather` (Open-Meteo, cache 1 h, repli simulé) ; `/weather` ; page `/meteo-prix` | Météo-Bénin et AGRHYMET non raccordés. Appel sortant vers `api.open-meteo.com` avec la position non arrondie de la première parcelle du producteur (voir L-391). |
| T-40 · §3.1 Services transversaux | Prix | n.c. | Fait côté outil | Fait côté outil | idem T-27 ; SMS `PRIX` et USSD (`ussd/services.py::prices_text`) | Idem. |
| T-41 · §3.1 Services transversaux | Conseil par l'assistant | P0 (UC-12) | Fait | Fait | `assistant/services.py::ask` | Français seulement (voir T-06). |
| T-42 · §3.1 Services transversaux | Disponibilités en produits | P1 (UC-21) | Fait | Fait | `market/models.py::Offer` ; `/offers` ; page `/marche` | Les pages `/collecte` et `/offres` restent en données codées en dur (`features/supply/demo.ts`). |
| T-43 · §3.1 Services transversaux | Services de partenaires (e-banking, assurance, publicité) | n.c. | Fait | Fait | `knowledge/models.py::Publication` (`service`, `innovation`, `financement`) ; `/publications` ; page `/services` | Annonces saisies à la main par le personnel, aucune intégration avec un service d'e-banking ou d'assurance. |
| T-44 · §3.1 Services transversaux ; §1 enjeux externes | Promotion des innovations ; financements mobilisés | n.c. | Fait | Fait | `Publication.amount_xof` ; `/dashboard/financing` | Aucun. |
| T-45 · §3.1 Services transversaux | Analyses prospectives des marchés | n.c. | Fait côté outil | Fait côté outil | `markets/analysis.py` ; `/market-analysis` ; page `/analyses-marches` ; `MODEL_CARD.md` § 7 | Conforme : heuristique sans apprentissage. |
| T-46 · §3.1 Services producteurs | Mise en relation avec un transformateur, appui à la vente | P1 (UC-21) | Fait | Fait | `market/services.py::create_offer, contact, decide, set_offer_status` ; `/offers/<id>/contact`, `/matches/<id>/accept` ; test `market/tests.py::test_owner_suspends_reopens_and_withdraws_an_offer` | Photo d'annonce et négociation par propositions non faites (`DECISIONS` « Lot 3 »). |
| T-47 · §3.1 Services producteurs | Échange avec son agent | n.c. | Fait | Fait | `alerts/services.py::post_chat` (notification de l'agent ; SMS simulé vers le producteur) ; `/chat`, `/chat/threads` | Aucun. |
| T-48 · §3.1 Services producteurs | Accès aux PMEA de la zone | n.c. | Fait | Fait | `farmservices/models.py::Pmea` ; `services.py::verify_pmea, pmea_visible` ; `/pmea` ; page `/pmea` | Vérification déclarative par l'agent. |
| T-49 · §3.1 Services producteurs | Suivi du revenu | n.c. | Fait | Fait | `production/revenue.py::revenue, create_expense` ; `/revenue`, `/expenses` ; page `/revenu` ; test `test_revenue_is_sales_minus_expenses_minus_repayments` | Dépenses déclaratives. |
| T-50 · §3.1 Services producteurs | Paiement en un clic des appuis reçus | P1 (UC-21) | Fait | **Simulé** | `production/recovery.py::pay` appelle `integrations/payment.py::get_provider()` = `FakePay` ; `FedaPayProvider`, `KKiaPayProvider`, `CinetPayProvider` = `pass` | L'écran et l'imputation sur échéance sont réels ; aucun argent ne circule (règle 1). Dépend de `ACTIONS_HUMAINES` n° 3. |
| T-51 · §3.1 Services transformateurs/distributeurs | Mise en relation et paiement en un clic | P1 (UC-21) | Fait | **Partiel** | `market/services.py::create_payment` (plafond `PAYMENT_MAX_XOF`), `refund` ; `/payments*` | Mise en relation réelle ; paiement par `FakePay`. |
| T-52 · §3.1 Services transformateurs/distributeurs | Prévision des récoltes | n.c. | Partiel | Partiel | `markets/analysis.py::expected_supply` (rendements de référence de démonstration) ; page `/analyses-marches` ; la page `/previsions` reste simulée (voir T-09) | Conforme à la déclaration. |
| T-53 · §3.1 Services transformateurs/distributeurs | Circuit de collecte | n.c. | Fait | Fait | `production/lots.py::collect` ; `/lots/collect` ; page `/tracabilite` | Le menu de ces rôles propose aussi `/collecte` et `/offres`, pages en données codées en dur (`supply/CollectionPage.tsx`, `OffersPage.tsx`), à retirer ou brancher (`CONFORMITE_TDR` § 8). |
| T-54 · §3.1 Services transformateurs/distributeurs | Renforcement de capacités, promotion des produits | n.c. | Fait | Fait | `markets/trainings.py`, `showcase.py` ; `/trainings*`, `/showcase` ; pages `/formations`, `/vitrine` ; `test_trainings.py` (5 fonctions) | Pas de rappel de séance ni de certificat (reconnu). |
| T-55 · §3.1 Services institutions financières | Enregistrement, accès au scoring | P1 (UC-20) | Fait | Fait | `credit/api.py::consented_producers, score` (rôle `agent_financier`, consentement actif, consultation journalisée) | Pas d'entité « institution » : un compte utilisateur. |
| T-56 · §3.1 Services institutions financières | Fourniture de services, recouvrement | n.c. | Fait | Fait | `Publication` (rôle `agent_financier` autorisé) ; prêts : `production/recovery.py::open_claim` (type `pret`) ; test `test_loan_needs_the_credit_consent_and_stays_between_the_bank_and_the_borrower` | Règlement par `FakePay`. |
| T-57 · §1 ; §3.1 IA ; §3.4 | Comprendre et répondre nativement en fon et bariba (écrit) | P2 (UC-15) | Partiel | Partiel | idem T-06 ; `frontend/src/i18n/fon.json` et `bba.json` = 180 octets (`_meta` seulement) ; `translations_translationentry` : 1155 `a_traduire` par langue, 0 validée | La file de traduction du MTDI n'est alimentée que par `frontend/src/i18n/fr.json` (1155 clés) via `translations/services.py::seed_entries` ; les 2715 clés de `frontend/src/i18n/fr/*.json`, qui portent l'interface actuelle, n'y figurent pas. |
| T-58 · §1 ; §3.5 | Yoruba et dendi | P2 | Partiel | Partiel | `translations/models.py::LANGUAGES` ; `corpus.py` ; `yo.json` et `dnd.json` = `{}` ; `SEED_LANGUAGES = ["fon", "bba"]` | Aucun texte ; le seed ne crée même pas d'entrées yoruba ou dendi pour l'interface. |
| T-59 · §1 ; §3.1 IA | Oral : synthèse et reconnaissance vocales | n.c. | Partiel | Partiel | `frontend/src/features/assistant/AssistantPage.tsx` (`r.lang = 'fr-FR'`, Web Speech API) | Français seulement ; aucun module MMS dans `backend` (voir M-16). |
| T-60 · §1 ; §3.1 IA | Corpus linguistique développé et intégré | P2 | Partiel | Partiel | `translations/models.py::CorpusEntry` ; `/corpus`, `/corpus/stats` ; `test_corpus.py` | Outil sans contenu (1 entrée `a_traduire`). |
| T-61 · §3.4 ; §3.5 | Qualité validée par des locuteurs natifs, justesse | P2 | Fait | **Fait côté outil** | `corpus.py::corpus_validate` (second représentant obligatoire, `same_author`) ; `corpus.py::accuracy` = part des reformulations qui retrouvent leur propre entrée | Aucune validation n'a eu lieu (0 entrée validée). La « justesse » mesure la cohérence de l'appariement, pas la justesse linguistique ni celle des réponses. |
| T-62 · §3.1 IA (canaux) | Canaux SMS, USSD, vocal | P0 (UC-16, SMS simulés) | Simulé | Simulé | `integrations/notifications.py::SmsChannel` (écrit dans `Outbox`, statut `livre`) ; `ussd/api.py` (passerelle ouverte en `DEMO_MODE`) ; **`VoiceChannel` n'est appelé nulle part** (`get_channel("voice")` absent de `backend/apps`) | Conforme pour SMS et USSD. Le canal vocal n'est exercé par aucune fonction (seule la lecture à voix haute du navigateur existe). |
| T-63 · §3.4 | Formats ouverts, pas de système propriétaire | n.c. | Fait | Fait | REST JSON, GeoJSON, CSV (`exports/api.py`), OpenAPI ; Django, React, Leaflet, SQLite/PostgreSQL | Les LLM facultatifs (Anthropic, passerelle OpenAI) sont des services externes, désactivés sans clé. |
| T-64 · §2 obj.5 ; §3.5 | Sécurité, confidentialité, protection des données | n.c. | Fait | **Partiel** | Fait vérifié : `audit/models.py` (journal chaîné SHA-256, `verify_chain`), `producers/models.py::Consent`, périmètres (`core/permissions.py::in_scope`), cookie de rafraîchissement `httponly=True, samesite="Lax"` (`accounts/api.py:81`), CORS restreint, limitation de débit (`config/settings.py` `OTP_THROTTLE_RATE`) | Non fait : pas de `SECURE_HSTS_*`, ni CSP, ni `SECURE_SSL_REDIRECT` ; `SECRET_KEY` a une valeur par défaut `dev-insecure-key-change-me` ; `bandit`/`pip-audit` seulement dans `.github/workflows/ci.yml`, jamais exécutés ; AIPD, déclaration APDP, DPO non faits (`ACTIONS_HUMAINES` n° 4). |
| T-65 · §3.6 ; §4 Code source, Documentation | Code source, documentation, scripts d'installation | n.c. | Fait | **Partiel** | Dépôt Git (122 commits), `start.bat`, `start.sh`, `.github/workflows/ci.yml`, `README.md`, `docs/*` | `docs/openapi.json` (en fait du YAML, 82 chemins, daté 16/10) contre 177 routes dans `config/urls.py` ; `docs/ARCHITECTURE.md` décrit 13 modules sur 27 ; pas de fichier `LICENSE` ; aucun manuel utilisateur, d'administration, de sauvegarde ni de maintenance ; `infra/` jamais exécuté ; le dépôt local a 38 commits d'avance sur `origin/main`. |
| T-66 · §3.6 ; §6 Rapport final | Cadre de réentraînement | n.c. | Fait côté outil | Fait côté outil | `docs/REENTRAINEMENT.md` ; `observatory/quality.py` (`GET /models/quality`) ; `observatory/management/commands/export_training_set.py` | Conforme : aucun modèle appris ; consentement « amélioration des modèles » et AIPD absents. |

### Les 25 cas d'usage du `MASTER_PROMPT` § 6

| Réf. TDR (section) | Exigence (courte) | Priorité | État déclaré | État vérifié dans le code | Preuve (chemin, fonction, endpoint) | Écart |
| --- | --- | --- | --- | --- | --- | --- |
| U-01 · §3.5 (sécurité) | Connexion téléphone + code 6 chiffres 10 min, blocage 15 min après 5 échecs ; mot de passe pour le personnel | P0 | Fait (RAPPORT_FINAL) | Fait | `accounts/services.py::request_otp, verify_otp, _fail` (`OTP_TTL` 10 min, `LOCK_TTL` 15 min) ; `/auth/otp/request`, `/auth/otp/verify` ; `accounts/tests.py::test_otp_lock_after_5_failures` | « Mot de passe fort » = 10 caractères minimum (`min_length=10` dans `accounts/api.py:166`) ; `validate_password` de Django non appelé. |
| U-02 · §3.5 | Création, suspension, réaffectation de comptes ; périmètre ; journalisé | P0 | Fait | Fait | `accounts/services.py::create_user, update_user` (`record`) ; `/admin/users` ; page `/comptes` | Aucun. |
| U-03 · §3.5 ; §2 obj.5 | Journal d'audit non modifiable, consultable par l'auditeur, conservation paramétrable (5 ans) | P0 | Fait | Fait | `audit/models.py::AuditLog` (`save` et `delete` refusés, chaîne `prev_hash`/`hash`) ; `audit/services.py::record, verify_chain` ; `RetentionPolicy` ; `settings.AUDIT_RETENTION_DAYS = 1825` ; `/audit-logs`, `/audit-logs/verify` ; `purge_retention.py` | Non modifiable au niveau applicatif seulement (pas de déclencheur en base) ; la purge n'est pas planifiée. |
| U-04 · §2 obj.1 | Inscription : NPI vérifié ANIP, doublon proposant la fiche, consentement, mineurs | P0 | Fait | Fait | `producers/services.py::register, check_duplicates, verify_identity` ; `integrations/anip.py::MockAnipClient` ; `/producers/register` ; `producers/tests.py` (8 fonctions) | ANIP simulé (conforme à la consigne). |
| U-05 · §2 obj.1 | Validation, rejet motivé, correction, historique des versions | P0 | Fait | Fait | `producers/services.py::validate, reject, update` ; `ProducerVersion` ; `/producers/<id>/validate`, `/reject`, `/versions` | Aucun. |
| U-06 · §3.1 Gouvernance | Coopératives, plusieurs adhésions, historique | P2 | Fait | Fait | `cooperatives/models.py::Membership` (`left_at`, contrainte `one_active_membership`) ; `/cooperatives*`, `/memberships/*` | Aucun. |
| U-07 · §3.1 | Carte producteur avec code de vérification | P1 | Fait | Fait | `producers/services.py::issue_card` (code aléatoire 8 car.) ; `/producers/<id>/card`, `/verify/<code>` ; `test_card.py` | Pas de QR code (décision). |
| U-08 · §3.1 Aménagements | Parcelle dessinée ou relevée, surface calculée, type, statut foncier, chevauchement > 20 % | P0 | Fait | Fait | `parcels/services.py::create_parcel, overlaps` (`OVERLAP_RATIO = 0.20`, comparaison au département) ; `parcels/tests.py::test_parcel_area_overlap_and_campaign` | Comparaison faite en Python sur toutes les parcelles du département (coût croissant). |
| U-09 · §3.1 Production | Campagne : une culture principale par parcelle et saison, stades | P0 | Fait | Fait | `parcels/services.py::create_campaign` (`campaign_exists`), `set_stage` ; `/campaigns` | Aucun. |
| U-10 · §3.1 Production | Appuis : remise, confirmation | P1 | Fait | Fait | `production/services.py` ; `/supports*` | Pas de preuve de remise (photo, signature). |
| U-11 · §3.1 Production | Récolte, stockage, vente ; écart signalé | P1 | Fait | Fait | `production/services.py` (stock + vente ≤ récolte, `DEVIATION_FLAG_PCT`), `check` ; `/harvests*` | Aucun. |
| U-12 · §2 obj.2 | Assistant : question orale ou écrite dans la langue du producteur, fiches publiées, citation, « je ne sais pas », renvoi pour sujets à risque | P0 | Fait (RAPPORT_FINAL) | **Partiel** | `assistant/services.py::ask` (statuts `answered`, `unknown`, `escalated`) ; `is_dosage_question` ; `escalate` (notification aux agents du département) | Langue : français seulement (oral compris) ; la question n'est pas expurgée avant l'envoi au LLM (seul le journal passe par `_redact`). |
| U-13 · §2 obj.3 | Diagnostic photo simulé, seuil 0,6, transmission à l'agronome, aucune photo de visage | P1 | Simulé | Simulé | `diagnosis/services.py::create, clean_image` (réencodage sans EXIF), `DIAGNOSIS_THRESHOLD = 0.6` ; `ask_agronome`, `purge` | Aucune détection de visage : seule consigne affichée (`HELP`). |
| U-14 · §3.1 IA | Fiches : brouillon, relecture, publication, versions | P0 | Fait | Fait | `knowledge/services.py` (statuts, `rebuild_index`) ; `/knowledge*` ; page `/fiches` ; `KnowledgeDocVersion` ; relecture par une autre personne (`same_author`) | Index BM25 en mémoire par processus. |
| U-15 · §3.4 | Notation du fon et du bariba par le MTDI, ouverture au-dessus d'un seuil | P2 | Fait côté outil (RAPPORT_FINAL : aucune traduction fournie) | Fait côté outil | `translations/services.py` (seuil `LANGUAGE_OPEN_THRESHOLD = 0.8`) ; `/translations*`, `/i18n/<langue>.json` ; page `/langues` | 0 texte validé sur 2310 entrées. |
| U-16 · §3.1 Services | Alertes : gravités, seconde validation de l'urgent, zone et cultures, SMS/vocal simulés, in-app, statuts | P0 | Fait | Fait | `alerts/services.py::create, approve, send` ; `/alerts*` ; `alerts/tests.py::test_urgent_alert_second_validation` | Statuts : seul `livre` est produit par la simulation (82 lignes `livre` dans `alerts_outbox`) ; `echoue` n'arrive jamais ; le canal vocal n'est pas utilisé (voir T-62). |
| U-17 · §2 obj.1 | Sélection de bénéficiaires : pondérations fixées, proposition, validation par un autre agent, contestation | P0 | Fait | Fait | `programs/services.py::run_selection, validate_run, contest` ; `/selection-runs*` ; page `/selection` ; `programs/tests.py::test_selection_proposal_validation_contest` | Calcul sur les fermes du POC, pas sur les fiches producteurs. |
| U-18 · §2 obj.1 | Candidature : conditions, clôture réelle, statuts, motif de refus, notifications | P0 | Fait | Fait | `programs/services.py::apply, decide, contest_application` ; `/programs/<id>/apply`, `/applications*` ; `test_programs_apply_closed` | Aucun. |
| U-19 · §2 obj.4 | Score de crédit avec consentement révocable, facteurs affichés en clair, contestation d'une donnée | P1 | Fait (RAPPORT_FINAL) | **Partiel** | `credit/services.py::give_consent, withdraw_consent, compute` ; `credit/api.py` : `/credit/scores/<id>` réservé au rôle `agent_financier` | Aucun endpoint ni écran ne montre au producteur son propre score ni ne permet de contester une donnée du score ; `MODEL_CARD.md` § 3 écrit pourtant « le producteur voit ses facteurs, peut signaler une donnée inexacte ». |
| U-20 · §3.1 Services IF | L'agent financier voit score et facteurs d'un producteur consentant ; consultation journalisée | P1 | Fait | Fait | `credit/services.py::consult` (`record "credit.score_view"`) | Aucun. |
| U-21 · §3.1 Services | Offres et demandes, mise en relation, paiement Mobile Money simulé | P1 | Fait | Fait (périmètre MASTER : paiement simulé) | `market/services.py` ; `/offers`, `/payments` ; `market/tests.py` (4 fonctions) | Voir T-50 et T-51 : simulé au regard du TDR. |
| U-22 · §3.1 SEA | Tableau de bord par rôle et périmètre ; chaque chiffre porte sa source **et la date de mise à jour** ; « non disponible » si absent | P0 | Fait | **Partiel** | `dashboard/api.py::dashboard, sea` ; `_ind` / `_sea` ; `frontend/src/features/dashboard/viz.tsx::Src` | Dans `sea`, `women_share`, `under_35_share`, `area_by_chain`, `application_acceptance`, `alert_delivery`, `supports_value`, `harvests_flagged`, `assistant_questions`, `assistant_escalation` n'ont pas de date (`updated_at` nul) ; l'écran affiche « source seule » (`pilotage.srcOnly`). « Non disponible » est bien géré. |
| U-23 · §3.1 Collecte | Suivi satellite par zone, date d'acquisition, valeurs de démonstration | P1 | Simulé | Simulé | `satellite/api.py::satellite` (valeurs déterministes par hachage, source « Données de démonstration (POC), non officielles ») ; `/satellite` | Conforme. |
| U-24 · §2 obj.8 | Exports CSV et API pour X-Road, SONAMA, FNDA ; export de données personnelles : motif et autorisation | P1 | Fait (RAPPORT_FINAL) | **Partiel** | `exports/api.py::export` (admin seul, motif ≥ 10 caractères, `record "export.csv"`) ; `interop/api.py::aggregates` | Pas d'étape d'« autorisation » distincte du motif ; le jeu `producers` exporte NPI, nom, naissance, téléphone ; l'API est un agrégat unique identique pour les trois partenaires. |
| U-25 · §3.1 Services | Hors ligne : saisie locale, synchronisation, conflit résolu par l'agent | P1 | Fait | Fait | `frontend/src/features/outbox/offlineQueue.ts` (Dexie) ; `ConflictsPanel.tsx` ; `parcels/services.py::set_stage` (409 `conflict`) ; `parcels/test_conflict.py` | La file ne couvre que parcelles, campagnes, stades, inscription, fiche producteur et appuis (pas les récoltes). |

### Exigences logicielles du TDR absentes des 66 lignes

| Réf. TDR (section) | Exigence (courte) | Priorité | État déclaré | État vérifié dans le code | Preuve (chemin, fonction, endpoint) | Écart |
| --- | --- | --- | --- | --- | --- | --- |
| R-01 · §3.1 Collecte | Données géospatiales, télédétection, rendements historiques, couches pédologiques et d'occupation des sols, climat (Météo-Bénin, AGRHYMET, CHIRPS, Copernicus) | n.c. | non listé | Partiel | GPS : `parcels` ; fermes POC : `farms/models.py::FarmPOC` (200 873 lignes dans `db.sqlite3`) ; climat : Open-Meteo seul | Aucun raccordement Météo-Bénin, AGRHYMET, CHIRPS ni Copernicus ; aucune couche pédologique ; rendements historiques = `ReferenceYield` de démonstration. |
| R-02 · §3.1 Collecte | Sources ouvertes alternatives (Sentinel, Landsat) | P1 (UC-23) | non listé | Simulé | `satellite/api.py` (hachage, aucune image lue) | Aucune image réelle. |
| R-03 · §3.1 Collecte | Numériser, structurer, harmoniser les fiches d'itinéraires techniques du SNRA | P0 (UC-14) | non listé | Partiel | `backend/data/knowledge/*.json` (86 fiches, 10 filières ≥ 8 passages) ; `seed_demo.py::_knowledge` | Seul le recueil public INRAB est numérisé (technologies promues) ; 44 fiches `a_sourcer` ; aucune fiche d'itinéraire technique fournie par l'INRAB/les ATDA ; relecture INRAB non faite. |
| R-04 · §3.1 IA | Détection précoce des ravageurs et maladies | n.c. | non listé | Absent | aucune fonction : les alertes `ravageur` sont saisies à la main (`alerts/api.py`, catégories `meteo/ravageur/programme/marche`) ; diagnostic simulé | Aucun modèle ni donnée. |
| R-05 · §3.1 IA | Intégrer l'ensemble des modèles prédictifs dans la plateforme | n.c. | non listé | Partiel | grilles et règles intégrées (`credit`, `lands/climate.py`, `markets/analysis.py`) ; aucun modèle appris | `scikit-learn` absent de `requirements.txt`. |
| R-06 · §3.1 IA | Valider les modèles finaux : seuils de précision, données historiques, robustesse par zone agro-écologique, hypothèses documentées | n.c. | non listé | Partiel | hypothèses et limites : `docs/MODEL_CARD.md` ; mesure : `observatory/quality.py` | Pas de validation sur données historiques, aucune notion de zone agro-écologique, seuils = propositions. |
| R-07 · §3.1 Conception | Standards minimaux de qualité (temps de réponse, seuils de précision, disponibilité) | n.c. | non listé | Absent | aucun objectif chiffré ni mesure de disponibilité ou de temps de réponse dans le code ou les docs | À fixer avec le CoPil/CoTech au démarrage. |
| R-08 · §3.1 IA (canaux) | Application mobile | n.c. | Fait (PLAN_MVP lots 1 à 4) | Fait | `frontend/vite.config.ts` (`VitePWA`), `frontend/dist/manifest.webmanifest`, `sw.js` ; `app/Layout.tsx` (barre d'onglets sous 640 px) | PWA et non application native ; le `dist` date du 19/10. |
| R-09 · §3.1 SEA ; §4 | Dispositif SEA : tableaux de bord interactifs et reporting automatisé | n.c. | Fait (T-36) | Partiel | `dashboard/api.py::sea` ; `/dashboard/sea/*` ; export CSV manuel | Aucun rapport automatisé ni planifié ; pas de tableau trimestriel. |
| R-10 · §3.1 SEA | Indicateur : nombre de producteurs et d'hectares suivis | n.c. | non listé | Fait | `sea` : `producers_by_chain`, `area_by_chain` | Aucun. |
| R-11 · §3.1 SEA | Indicateur : estimations de rendement | n.c. | non listé | Partiel | `dashboard/sea_detail.py::production` (rendement déclaré) ; `sea` : `maize_yield` = `None` | Le rendement moyen du maïs est « non disponible » sur le tableau de bord ; aucune estimation de rendement fiable. |
| R-12 · §3.1 SEA | Indicateur : adoption des pratiques améliorées | n.c. | non listé | Absent | `frontend/src/features/dashboard/SeaPage.tsx` : `na:adoption` ; `i18n/fr/pilotage.json` (« exige une enquête terrain ATDA, pas encore saisie ») | Aucune collecte dans le code. |
| R-13 · §3.1 SEA | Indicateur : accès aux intrants | n.c. | non listé | Fait | `sea` : `supports_value` | Aucun. |
| R-14 · §3.1 SEA | Indicateur : accès au crédit | n.c. | non listé | Partiel | `SeaPage.tsx` : `na:credits_granted` ; les prêts ouverts par une institution existent (`production/recovery.py`, type `pret`) mais ne sont pas comptés dans `sea` | « Crédits accordés » affiché « non disponible ». |
| R-15 · §3.1 SEA | Indicateur : participation des femmes et des jeunes | n.c. | non listé | Fait | `sea` : `women_share`, `under_35_share` ; `sea_detail.workforce` | Sans date de mise à jour (U-22). |
| R-16 · §3.4 | Interopérabilité avec MAEP, SONAMA, FNDA/FOPAPS par formats ouverts | P1 (UC-24) | Partiel (T-14) | Partiel | `interop/api.py` | FOPAPS jamais mentionné ; aucun connecteur. |

### Code du numérique (loi n° 2017-20), `MASTER_PROMPT` § 13 et `docs/CONFORMITE.md`

| Réf. TDR (section) | Exigence (courte) | Priorité | État déclaré | État vérifié dans le code | Preuve (chemin, fonction, endpoint) | Écart |
| --- | --- | --- | --- | --- | --- | --- |
| L-389 · §2 obj.5 | Consentement légitime | n.c. | respecté | Fait | `producers/services.py::register` (`consent_required`) ; `Consent` | Texte juridique à faire valider par le DPO. |
| L-390 · §2 obj.5 | Consentement démontrable, distinct, retirable | n.c. | respecté | Fait | `Consent` (`type`, `text_version`, `channel`, `created_at`, `withdrawn_at`) ; `/consents/<id>/withdraw` | Aucun. |
| L-391 · §3.5 | Pas de transfert hors du Bénin sans équivalence | n.c. | partiel | Partiel | `integrations/market_data.py::weather` (latitude et longitude du centre de la première parcelle du producteur, non arrondies, envoyées à `api.open-meteo.com` ; l'arrondi à 0,01° ne sert qu'à la clé de cache) ; `integrations/llm.py::_prompt` (question brute + commune + parcelle + météo) ; `settings.OPENAI_BASE_URL` par défaut = hôte `glm-gateway.tail577250.ts.net` ; `ANTHROPIC_BASE_URL` = `api.anthropic.com` | `docs/REGISTRE_TRAITEMENTS.md` écrit « Transferts hors du Bénin : aucun dans la configuration par défaut » : inexact depuis la météo réelle (20/10). `docs/MOCKS.md` écrit « aucun appel à un service externe ». |
| L-394 · §2 obj.5 | Pas de données sensibles ni biométriques | n.c. | respecté | Fait | `Producer` sans champ sensible ; pas de photo d'identité ; images réencodées sans EXIF | Pas de détection de visage dans les photos de diagnostic. |
| L-401 · §2 obj.5 | Pas de décision par le seul traitement automatisé | n.c. | respecté | Fait | `programs/services.py::validate_run` (autre utilisateur, motif), `contest` ; `credit/services.py::DISCLAIMER` | Aucun. |
| L-405 · §3.5 | Déclaration préalable à l'APDP | n.c. | administratif | Non vérifiable (acte administratif, aucune pièce dans le dépôt) | `ACTIONS_HUMAINES.md` n° 4 | À déposer par le MAEP. |
| L-424 · §2 obj.5 | Protection dès la conception et par défaut | n.c. | partiel | Partiel | agrégats masqués sous 5 (`interop/services.py::mask_small`, `surveys.py::MIN_CELL`) ; `export_training_set` pseudonymisé | `CONFORMITE.md` est périmé sur la pseudonymisation (faite pour les jeux d'entraînement le 20/10) ; l'export CSV `producers` reste nominatif. |
| L-427 · §3.5 | Notification des ruptures de sécurité | n.c. | partiel | Partiel | `docs/INCIDENTS.md` | Procédure jamais testée. |
| L-428 · §3.5 | Analyse d'impact | n.c. | partiel | Partiel | `docs/AIPD_brouillon.md` (sections A scoring/sélection et B assistant) | Rien sur recouvrement, prêts, diagnostic, enquêtes publiques, météo, formations. |
| L-430 · §3.5 | Délégué à la protection des données | n.c. | administratif | Non vérifiable (acte administratif) | `ACTIONS_HUMAINES.md` n° 4 | À désigner par le MAEP. |
| L-433 · §3.5 | Conservation limitée | n.c. | partiel | Partiel | `audit/models.py::RetentionPolicy` ; `purge_retention.py` (audit 1825 j, photos 90 j, comptes fermés 365 j) | Commande jamais planifiée (aucun django-q2 ni cron dans le dépôt) ; durées non arrêtées avec le DPO ; pas de purge des autres données (messages, relevés). |
| L-435 · §3.5 | Registre des traitements | n.c. | partiel | Partiel | `docs/REGISTRE_TRAITEMENTS.md` | 11 traitements (état du 16/10) ; manquent recouvrement/prêts, revenus, enquêtes, formations, vitrine, messagerie, diagnostics, matériel, relevés de prix, appels Open-Meteo. |
| L-446 · §2 obj.5 | Mineur de moins de 16 ans | n.c. | respecté | Fait | `producers/services.py::register` (`guardian_required`) ; `test_minor_requires_guardian` | Vérification de l'identité du tuteur non faite (NPI saisi seulement). |
| L-328 · §3.5 | Mentions légales | n.c. | partiel | Partiel | `frontend/src/features/legal/LegalPage.tsx` (routes `/mentions-legales`, `/confidentialite`, `/conditions-utilisation`, `/accessibilite`, `/contact`) | Identité de l'exploitant à renseigner (`ACTIONS_HUMAINES` n° 4 et dernière rubrique). |
| L-495 · §2 obj.5 | Conservation des données d'identification des contributeurs | n.c. | respecté | Fait | `audit/services.py::record` (acteur, rôle, action, objet, date) | Aucun. |

### Exigences transversales du `MASTER_PROMPT`

| Réf. TDR (section) | Exigence (courte) | Priorité | État déclaré | État vérifié dans le code | Preuve (chemin, fonction, endpoint) | Écart |
| --- | --- | --- | --- | --- | --- | --- |
| M-01 · §1 filières | 10 filières présentes (listes et base de connaissances, ≥ 8 passages chacune) | P0 | Fait | Fait | `referentiel/data.py::VALUE_CHAINS` ; `data/knowledge/*.json` (8 à 11 fiches par filière) | Voir R-03 sur la valeur des fiches. |
| M-02 · §1 | Filières de réserve (igname, maraîchage, palmier) | P2 | Fait | Fait | `referentiel/data.py::RESERVE_VALUE_CHAINS, ALL_VALUE_CHAIN_CODES` | Aucune fiche de connaissances pour ces filières. |
| M-03 · §3.1 Collecte | Seed d'environ 40 producteurs fictifs dans les 12 départements, 10 filières | P0 | Fait | Fait | `db.sqlite3` : 43 producteurs, 12 départements, 44 campagnes dans les 10 filières | Un seul agent ATDA (Alibori) dans la base. |
| M-04 · §3.1 Collecte | Données du POC importées côté serveur, jamais dans le navigateur | P0 | Fait | Fait | `farms/management/commands/import_poc_farms.py` ; `FarmPOC` = 200 873 lignes ; `/farms`, `/farms/aggregates` | Source d'origine non documentée (`ACTIONS_HUMAINES` n° 8). |
| M-05 · §3.1 IA (canaux) | PWA installable, saisie hors ligne, synchronisation | P1 | Fait | Fait | `vite.config.ts` (`VitePWA`) ; `outbox/offlineQueue.ts` | Périmètre limité (voir U-25) ; spécifications Playwright jamais exécutées. |
| M-06 · §1 langues | Interface i18next : français complet, fon/bariba (40 textes si sûr), yo, dnd vides, repli | P0/P2 | Fait | Fait | `frontend/src/i18n/fr.json` (1155 clés) + `i18n/fr/*.json` (20 fichiers, 2715 clés) ; `fon.json`, `bba.json`, `yo.json`, `dnd.json` vides | Conforme à la consigne « sinon laisse vide ». `RAPPORT_FINAL` (« environ 915 clés ») et `LANGUES_A_VALIDER.md` sont périmés. |
| M-07 · §3.4 | Interfaces d'intégration avec version simulée et version réelle vide | P0 | Fait | Fait | `integrations/anip.py, payment.py, notifications.py, llm.py, diagnosis.py, xroad.py` | `RealAnipClient` et `XRoadClient` lèvent `NotImplementedError`. |
| M-08 · §3.5 | Chaque action sensible journalisée dans la même transaction | P0 | Fait | Fait | `audit/services.py::record` (`transaction.atomic`), appelé dans les services décorés `@transaction.atomic` | Aucun. |
| M-09 · §3.5 | Matrice de permissions côté serveur, tests 403 et IDOR | P0 | Fait | Fait | `core/permissions.py::roles, in_scope` ; tests dans chaque module (147 fonctions `test_` comptées statiquement dans `backend/apps/**/test*.py`) | L'auditeur du CoPil lit aussi aménagements, sols, climat, matériel, semences, recouvrement (`lands/api.py::STAFF`, `production/recovery_api.py::READERS`) alors que `MASTER_PROMPT` § 8 dit « l'auditeur ne voit que le journal ». Tests non exécutés par moi. |
| M-10 · §3.5 | Tests pytest, Vitest, Playwright ; intégration continue | P0 | Fait (chiffres de RAPPORT_FINAL) | Non vérifiable (exécution interdite) | `.github/workflows/ci.yml` ; 49 fichiers de test frontend (≈ 151 `it`/`test`) ; `frontend/e2e/*.spec.ts` ; `@playwright/test` absent de `frontend/package.json` | Les chiffres de `RAPPORT_FINAL.md` (38, 57, 8, 112) sont périmés par rapport au code (147 tests backend, ≈ 151 frontend en comptage statique). |
| M-11 · §3.4 | Budget : page de connexion et accueil producteur sous 250 ko transférés | P0 | Fait (début) puis non repris | Non vérifiable (dernier build du 19/10 : `index-*.js` 834 510 octets, 263 121 octets gzip, au-dessus du budget) | `frontend/dist/assets/` | Le build actuel n'a pas été reconstruit ; `RAPPORT_FINAL` mentionne déjà 183 ko gzip pour le bundle principal et le risque de dépassement. |
| M-12 · §4 Documentation | OpenAPI figé et à jour | P0 | Fait | Partiel | `docs/openapi.json` | 82 chemins sur 177 routes de `config/urls.py` ; fichier YAML nommé `.json`, daté du 16/10. |
| M-13 · §4 | Client TypeScript généré depuis l'OpenAPI | P0 | Écart reconnu | Absent | `frontend/src/shared/api/types.ts` écrits à la main (`DECISIONS` 2026-10-16) | Pas de `openapi-typescript` dans `package.json`. |
| M-14 · §3.1 | Tâches de fond django-q2 | P0 | Écart reconnu | Absent | `DECISIONS` 2026-10-16 ; `requirements.txt` | Commandes de gestion (`purge_retention`, `check_stock_alerts`, `remind_claims`) à planifier à la main. |
| M-15 · §3.1 IA | scikit-learn pour scoring et prévisions | P1 | Écart reconnu | Absent | absent de `requirements.txt` et `requirements.lock` | Voir R-05. |
| M-16 · §3.1 IA | Module serveur MMS optionnel, désactivé par défaut | P2 | « module désactivé » (`ACTIONS_HUMAINES` n° 7) | Absent | aucune occurrence de `mms` dans `backend/apps` ni `backend/integrations` | Il n'existe aucun module : seul l'avertissement de licence est écrit. |
| M-17 · §3.6 | `start.bat` et `start.sh` | P0 | Fait | Fait (présence) | `start.bat`, `start.sh` | Non exécutés par moi. |
| M-18 · §3.5 | `docker-compose.yml`, Dockerfiles, nginx | P0 | « non testés » (`ACTIONS_HUMAINES`) | Non vérifiable (fichiers présents, jamais exécutés) | `infra/*` | Hébergement non décidé (N-14). |
| M-19 · §4 | Documentation listée (README, ARCHITECTURE, API, UML, DEMO, PROJECT_MAP, DECISIONS, MOCKS, CONFORMITE, ACTIONS_HUMAINES, LANGUES_A_VALIDER) | P0 | Fait | Fait (présence) | `docs/*`, `PROJECT_MAP.md`, `docs/uml/*.mmd` | Plusieurs sont périmés (voir section 3.2). |
| M-20 · §3.5 | Critères d'acceptation : Lighthouse accessibilité ≥ 90, console sans erreur, installation PWA | P0 | « parcours joués » (`RAPPORT_PARCOURS.md`) | Non vérifiable (aucun outil exécuté) | `docs/RAPPORT_PARCOURS.md`, `docs/AUDIT_UX.md` | Mesures Lighthouse non retrouvées dans le dépôt. |
| M-21 · §3.5 | Sécurité § 14 : en-têtes, CORS, débit, cookies, fichiers téléversés | P0 | Fait | Partiel | CORS restreint, débit OTP, cookie `httponly`/`samesite`, images ≤ 5 Mo réencodées (`diagnosis/services.py`) | Voir T-64 (HSTS, CSP, clé par défaut). |
| M-22 · §3.4 | Design system et interdits visuels (`MASTER_PROMPT` § 12) | P0 | Remplacé le 19/10 (`DECISIONS`, refonte « Bénin Vert ») | Non vérifiable (hors TDR ; vérification visuelle non faite) | `docs/AUDIT_UX.md`, `frontend/scripts/contrast.mjs` | Les jetons du MASTER ont été remplacés par décision. |

### Exigences non logicielles du TDR

| Réf. TDR (section) | Exigence (courte) | Priorité | État déclaré | État vérifié | Preuve | Écart |
| --- | --- | --- | --- | --- | --- | --- |
| N-01 · §6 ; §7 | Rapport de démarrage (2 semaines) | n.c. | hors décompte | Absent | aucun fichier dans le dépôt | À produire (word et PDF) |
| N-02 · §3.1 Diagnostic ; §4 ; §6 | Rapport de diagnostic et d'état des lieux (2 mois), évaluation des systèmes existants, cartographie des parties prenantes, recensement des fiches du SNRA | n.c. | hors décompte | Absent | `docs/RAPPORT_PARCOURS.md` et `docs/AUDIT_UX.md` sont des revues d'écrans, pas ce rapport | Voir R-03 pour le recensement des fiches |
| N-03 · §6 | Rapports de mission | n.c. | hors décompte | Absent | aucun | Aucune mission de terrain documentée |
| N-04 · §6 | Rapports techniques : diagnostic, conception des modèles d'IA, module linguistique | n.c. | hors décompte | Partiel | matières premières : `docs/MODEL_CARD.md`, `REENTRAINEMENT.md`, `LANGUES_A_VALIDER.md` | Ce ne sont pas des rapports livrables à CoTech |
| N-05 · §6 ; §3.6 | Rapport final provisoire et final (recommandations de maintenance et de pérennité, cadre de réentraînement, leçons apprises) | n.c. | hors décompte | Partiel | `RAPPORT_FINAL.md` (16/10, mis à jour le 19/10), `docs/REENTRAINEMENT.md` | Pas de recommandations de maintenance ni de leçons apprises |
| N-06 · §6 ; §3.1 Renforcement | Supports de formation (modules, présentations, exercices ; version fon/bariba pour le terrain) | n.c. | hors décompte | Absent | `docs/DEMO.md` est un script de démonstration | À produire |
| N-07 · §3.1 Engagement | Consultations multi-acteurs, retours documentés | n.c. | hors décompte | Absent | aucun compte rendu | Dépend du MAEP |
| N-08 · §3.1 Collecte | Données réelles d'identification des acteurs et de leurs actifs | n.c. | non listé | Absent | `db.sqlite3` : 43 producteurs fictifs ; `docs/DONNEES.md` | À collecter avec les ATDA |
| N-09 · §4 ; §6 | Formation des développeurs et administrateurs : ≥ 4 sessions, ≥ 10 + 10 formés, manuel | n.c. | hors décompte | Absent | aucun | À organiser |
| N-10 · §4 | Formation des agents : ≥ 5 sessions, ≥ 50 participants dont 40 % de femmes et de jeunes, manuel, évaluation des acquis ; ≥ 50 agents formés au scoring | n.c. | hors décompte | Absent | aucun | À organiser |
| N-11 · §2 obj.5 ; §3.5 | Validation par CoPil/CoTech (réception de chaque livrable), par l'équipe restreinte MAEP/MTDI/ATDA/INRAB, et validation du corpus par le MTDI | n.c. | hors décompte | Absent | aucune pièce | À provoquer |
| N-12 · §4 | Modèle économique de pérennisation sur au moins 3 ans | n.c. | hors décompte | Absent | seule mention : `docs/CONFORMITE_TDR.md` § 5 | À rédiger |
| N-13 · §3.6 | Garantie, support technique 6 mois après réception finale, renouvelable | n.c. | hors décompte | Non vérifiable (postérieur à la réception finale, qui n'a pas eu lieu) | — | Engagement contractuel |
| N-14 · §3.5 | Architecture d'hébergement et localisation arrêtées avec CoPil et CoTech | n.c. | `ACTIONS_HUMAINES` n° 9 | Absent | `infra/*` jamais exécuté ; exécution locale SQLite | Décision humaine |
| N-15 · §3.6 ; §4 Code source | Transfert au MAEP du code source complet, de la documentation et des bases de données ; droits d'utilisation et de modification | n.c. | « le dépôt existe » (`RAPPORT_FINAL`) | Partiel | dépôt Git (122 commits) ; remote `gitlab.pprod.sige.local/mtdi/agri-digit-benin` ; local en avance de 38 commits sur `origin/main` | Pas de `LICENSE` ; `db.sqlite3` contient des données de test ; transfert contractuel à définir |
| N-16 · §4 Documentation technique | Schémas, manuels d'utilisation, architecture, bases de données, API, procédures d'installation, d'administration, de sauvegarde, de maintenance | n.c. | Fait (T-65) | Partiel | `README.md`, `docs/ARCHITECTURE.md`, `docs/API*.md`, `docs/uml/*.mmd`, scripts de démarrage | Aucune procédure d'administration, de sauvegarde ni de maintenance ; aucun manuel d'utilisation |
| N-17 · §4 Plateforme | Plateforme déployée en 9 mois, accessible aux ATDA, coopératives et ministères ; intégration des données nationales, informations producteur, indicateurs climatiques | n.c. | non listé | Partiel | prototype local (SQLite, `127.0.0.1`) ; `NationalStat`, `climate.py` | Non déployé ; données nationales à saisir par le MAEP |
| N-18 · §4 Scoring et analyses | Au moins 2 cas d'usage IA conçus, testés et validés dans les 6 mois | n.c. | « non faites » (`RAPPORT_FINAL`) | Absent | aucun modèle appris (voir R-05) | Dépend de données d'issues de crédit et de rendements |
| N-19 · §4 Scoring et analyses | Performances des modèles évaluées et documentées | n.c. | Fait côté outil (T-66) | Partiel | `observatory/quality.py` ; `docs/MODEL_CARD.md` | Mesures impossibles sans issues de crédit |
| N-20 · §4 Cadre SEA | Dispositif SEA opérationnel en 4 mois ; tableaux de bord trimestriels ; rapport de la phase pilote ; indicateurs et mécanisme de collecte définis | n.c. | non listé | Partiel | `/dashboard/sea*` | Pas de tableau trimestriel ni de rapport pilote ; voir R-09 à R-15 |
| N-21 · §3.1 SEA | Leçons apprises, success stories, supports de communication et de visibilité | n.c. | non listé | Absent | aucun | À produire |
| N-22 · §3.1 Conception | Plan de conception et de déploiement détaillé, modules | n.c. | non listé | Partiel | `docs/ARCHITECTURE.md`, `docs/PLAN_MVP.md`, `docs/REFONTE_FRONTEND.md` | Pas de plan de déploiement ni de montée en charge |
| N-23 · §3.2 ; §3.3 ; §5 ; §7 | Approche, équipe, calendrier de 9 mois, échéancier de paiement | n.c. | hors sujet | Non vérifiable (contenu d'offre et de contrat, pas du dépôt) | — | Le dépôt montre 122 commits du 16 au 22/10/2026 |

### Sondage de 55 déclarations « Fait » dans le code

Résultat : C = confirmé, CP = confirmé en partie, NC = non confirmé tel qu'écrit.

| # | Ligne | Domaine à risque | Vérification faite | Résultat |
| --- | --- | --- | --- | --- |
| 1 | T-04 assistant et fiches | assistant | UR `assistant/ask` ; SV `assistant/services.py::ask`, `knowledge/services.py::search` ; PG `/assistant` ; TS `knowledge/tests.py`. Base : 86 fiches, 42 publiées | C (mode extractif ; LLM non actif) |
| 2 | T-05 contexte parcelle et météo | assistant, météo | SV `_field_context` ; `ExtractiveBackend.answer` ignore `context` | CP |
| 3 | T-07/T-08 diagnostic | diagnostic | SV `integrations/diagnosis.py` | C (Simulé, comme déclaré) |
| 4 | T-10 sols | risques | SV `lands/services.py::interpret` | CP (classement Fait côté outil) |
| 5 | T-11 risques climatiques | risques climatiques | SV `lands/climate.py` ; UR `climate-risks` ; PG `/risques-climatiques` | CP (classement Fait côté outil) |
| 6 | T-12 scoring | scoring | SV `credit/services.py::compute` ; UR `credit/scores/<id>` ; PG `/credit` | C (Partiel, comme déclaré) |
| 7 | T-14 X-Road | X-Road | SV `integrations/xroad.py` ; UR `interop/<partner>/aggregates` | C (Partiel) |
| 8 | T-13 accès aux analyses | permissions | SV `core/permissions.py`, `observatory/api.py::READERS` | C |
| 9 | T-15 parcelles GPS | terrain | SV `parcels/services.py` ; UR `parcels` ; `GpsTrace.tsx` ; TS `parcels/tests.py` | C |
| 10 | T-16 superficies | terrain | SV `lands/services.py::land_use` ; UR `land-use` ; PG `/amenagements` | C |
| 11 | T-17 travaux d'aménagement | terrain | SV `lands/services.py::create_works` ; UR `schemes/<id>/works` ; TS `lands/tests.py` | C |
| 12 | T-19 semences | intrants | SV `farmservices/services.py::distribute_seeds` ; UR `seed-lots/<id>/distribute` ; PG `/semences` ; TS `test_seed_lot_is_distributed_as_a_support_with_its_code` | C |
| 13 | T-21 mécanisation | intrants | SV `create_request`, `complete_request` ; UR `mechanization/requests*` ; PG `/mecanisation` | C |
| 14 | T-23 recouvrement | recouvrement, paiements | SV `production/recovery.py` ; UR `claims*` ; PG `/remboursements`, `/recouvrement` ; TS `test_recovery.py` | C (règlement `FakePay`) |
| 15 | T-24/T-25/T-29 sites | traçabilité | SV `production/models.py::Site` ; UR `sites` | C |
| 16 | T-26 flux matières | traçabilité | SV `production/lots.py::trace` ; UR `lots/<ref>/trace` ; PG `/tracabilite` ; TS `test_lots.py` | C |
| 17 | T-27/T-31/T-40 prix (Fait côté outil) | prix | SV `markets/prices.py` ; UR `prices` ; PG `/prix` ; base : 24 relevés | C |
| 18 | T-30 stocks | traçabilité | SV `production/stocks.py` ; UR `stocks/outlook` ; PG `/stocks` ; TS `test_stocks.py` | C |
| 19 | T-32 enquêtes | enquêtes | SV `markets/surveys.py` ; UR `public/surveys/<code>/respond` ; PG `/enquete/:code` ; TS `test_surveys.py` | C |
| 20 | T-33/T-35 organisations | gouvernance | SV `cooperatives/organisations.py` ; UR `organisations*` ; PG `/organisations` | C |
| 21 | T-34 coopératives | gouvernance | SV `cooperatives/models.py::Membership` ; UR `cooperatives*` | C |
| 22 | T-36 suivi-évaluation | suivi-évaluation | SV `dashboard/sea_detail.py` ; UR `dashboard/sea/*` ; PG `/suivi-evaluation` ; TS `test_sea_detail.py` | C (voir R-09 à R-15) |
| 23 | T-37 couverture nationale | suivi-évaluation | SV `observatory/models.py::NationalStat` ; UR `national-coverage*` ; PG `/couverture` | C |
| 24 | T-38 carte des acteurs | suivi-évaluation | SV `observatory/actors_map.py` ; UR `map/actors` ; PG `/carte-acteurs` | C |
| 25 | T-39 météo réelle | météo réelle | SV `integrations/market_data.py::weather` ; UR `weather` ; PG `/meteo-prix` | C (Open-Meteo, repli simulé signalé) |
| 26 | T-43 services de partenaires | services | SV `knowledge/models.py::Publication` ; UR `publications` ; PG `/services` | C (annonces manuelles) |
| 27 | T-44 financements | services | SV `knowledge/publications.py::financing_by_chain` ; UR `dashboard/financing` | C |
| 28 | T-45 analyses prospectives | prévisions | SV `markets/analysis.py` ; UR `market-analysis` | C |
| 29 | T-46 mise en relation | marché | SV `market/services.py` ; UR `offers*`, `matches*` ; PG `/marche` | C |
| 30 | T-47 messagerie | services | SV `alerts/services.py::post_chat` ; UR `chat*` | C |
| 31 | T-48 PMEA | services | SV `farmservices/services.py::verify_pmea` ; UR `pmea*` ; PG `/pmea` | C |
| 32 | T-49 revenu | services | SV `production/revenue.py` ; UR `revenue`, `expenses` ; PG `/revenu` | C |
| 33 | T-50 paiement en un clic | paiements | SV `integrations/payment.py` | **NC** (Simulé) |
| 34 | T-51 mise en relation et paiement | paiements | idem | CP |
| 35 | T-53 circuit de collecte | traçabilité | SV `lots.py::collect` ; mais menu `/collecte` = données codées en dur | CP (fonction réelle sous `/tracabilite`) |
| 36 | T-54 formations et vitrine | services | SV `markets/trainings.py`, `showcase.py` ; UR `trainings*`, `showcase` ; PG `/formations`, `/vitrine` | C |
| 37 | T-55/T-56 institutions financières | scoring, recouvrement | SV `credit/api.py`, `recovery.py` ; TS `test_loan_needs_the_credit_consent…` | C |
| 38 | T-61 qualité validée par des locuteurs | langues nationales | SV `corpus.py::corpus_validate, accuracy` ; base : 0 entrée validée | **NC** (outil prêt, aucune validation, « justesse » = cohérence d'appariement) |
| 39 | T-63 formats ouverts | interopérabilité | exports CSV, REST, GeoJSON | C |
| 40 | T-64 sécurité | sécurité | `config/settings.py` (pas de HSTS ni CSP ; clé par défaut) | CP |
| 41 | T-65 code, documentation, scripts | transfert | `docs/openapi.json` 82 chemins ; `ARCHITECTURE.md` 13 modules ; pas de LICENSE | CP |
| 42 | U-01 connexion | sécurité | SV `accounts/services.py` ; UR `auth/otp/*` ; TS `test_otp_lock_after_5_failures` | C |
| 43 | U-03 audit chaîné | traçabilité | SV `audit/models.py`, `services.py::verify_chain` ; UR `audit-logs`, `audit-logs/verify` ; PG `/journal` | C |
| 44 | U-04 inscription et ANIP | identité | SV `producers/services.py::register` ; UR `producers/register` ; PG `/inscription` | C (ANIP simulé) |
| 45 | U-08 chevauchement de parcelles | terrain | SV `parcels/services.py::overlaps` (0,20) | C |
| 46 | U-12 assistant | assistant | SV `assistant/services.py` | CP (langue, expurgation) |
| 47 | U-16 alertes | canaux | SV `alerts/services.py::send` ; UR `alerts*` ; PG `/alertes` | C (statut `echoue` jamais produit) |
| 48 | U-17 sélection | scoring | SV `programs/services.py::run_selection` ; UR `selection-runs*` ; PG `/selection` | C |
| 49 | U-18 candidatures | programmes | SV `programs/services.py::apply` ; UR `programs/<id>/apply` | C |
| 50 | U-19 score de crédit | scoring | SV `credit/api.py` (rôle financier seul) | CP |
| 51 | U-22 tableau de bord | suivi-évaluation | SV `dashboard/api.py` | CP (dates absentes) |
| 52 | U-24 exports et interopérabilité | X-Road | SV `exports/api.py`, `interop/api.py` | CP |
| 53 | U-25 hors ligne | PWA | SV `outbox/offlineQueue.ts` ; TS `test_conflict.py` | C |
| 54 | U-07 carte producteur | identité | SV `producers/services.py::issue_card` ; UR `verify/<code>` ; PG `/ma-carte`, `/verification` | C |
| 55 | U-21 marché et paiement | paiements | SV `market/services.py::create_payment` | C (simulé comme demandé) |

## Annexe B : les 49 ajouts non demandés

Règle de classement : une entrée figure ici si elle n'est ni dans le MASTER_PROMPT ni (d'après `CONFORMITE_TDR.md`) dans le TDR, **ou** si elle est dans l'un des deux mais que son périmètre a dépassé la demande, **ou** si le dépôt ne consigne aucune demande. Les entrées qui sont des demandes consignées de l'utilisateur ([U]) sont listées parce qu'elles contredisent le MASTER_PROMPT ou ajoutent une surface à maintenir. **49 entrées** (A1 à A16, B1 à B19, C1 à C3, D1 à D8, E1 à E3). La section 3.6 liste ce qui a été demandé mais n'a jamais été vérifié.

### Identité visuelle et vitrine publique

| N° | Date · commit | Ce que c'est | Origine et raison consignée | Coût ou risque | Recommandation |
| --- | --- | --- | --- | --- | --- |
| A1 | 16/10 `56afb40` (+4 659 lignes) ; 22/10 `d882bbe` | Landing 3D : relief des 200 873 fermes, champ de maïs en three.js avec repli canvas 2D, ouverture en iris, canvas fixe. Depuis le 22/10 servie sur `/accueil-3d` | [U] `PRODUCT.md` (thème vert imposé le 18/10, landing = simulation du téléphone du producteur). Raison technique du canvas : poids et petits téléphones (l.27). Le MASTER_PROMPT § 12 interdit animation décorative et maquette de téléphone | Dépendance `three` 0.169 ; `field.ts`, `field3d.ts`, `scene.ts`, `relief.json` et leurs tests à maintenir ; test de rendu lent (56 rendus > 5 s) ; relief tiré de données non officielles ; coût de rendu sur téléphone d'entrée de gamme non mesuré (AUDIT_UX « non vérifié ») | Archiver sur une branche ou retirer du build ; supprimer `three` si la page n'est plus servie |
| A2 | 16/10 `56afb40` ; 22/10 `563b118`, `1706422` | Galerie de 3 photos Wikimedia (CC BY-SA, crédits dans `gallery.ts`), « Comment ça marche », « Nos garanties », FAQ, carrousel | [∅] textes « réécrits », aucune raison | Crédits et licences à tenir ; rubriques retirées puis rétablies le 22/10 | Garder les photos créditées si la page les utilise, sinon retirer |
| A3 | 16/10 `56afb40` ; REFONTE D1 | Mode sombre complet, bouton de thème, bouton « mouvement réduit » | l.28 (accessibilité, petits appareils) ; le MASTER_PROMPT ne définit que les jetons clairs | Chaque couleur doit tenir dans deux thèmes (`contrast.mjs`) ; défauts relevés en sombre (initiales d'avatar à 1,14:1, AUDIT_UX) | Garder « mouvement réduit » ; mode sombre : garder si `contrast.mjs` reste à 0 échec |
| A4 | 16/10 `56afb40` ; supprimé 22/10 `1706422` | Logo « grain de maïs dont le germe pousse » (`public/icon.svg`) | [∅] | Déjà retiré ; `PRODUCT.md` le cite encore | Corriger `PRODUCT.md` |
| A5 | 16/10 `64f4816` | Dossier `inspiration/` : 6 images de référence (496 Ko) | [∅] | Poids négligeable ; sans lien avec le produit | Sortir du dépôt ou garder hors build |
| A6 | 19/10 `a8ceb6f`, `2405e1d`, `4c07e22`, `c0c6aef` | Maquettes « Bénin Vert » (`web/` 56 fichiers HTML, soit 57 pages selon `PLAN_MVP.md` ; `mobile/` 82 fichiers HTML, soit 85 écrans selon `PLAN_MVP.md` ; `landing/`, hub `index.html`, `presentation.html`, `demo.cmd`), archives v1/v2 (directions abandonnées), photos libres, `PRODUCT.md`, `DESIGN.md`, `.impeccable/`, entrée `maquettes` dans `.claude/launch.json` | [U] `PRODUCT.md` (18/10) ; l.36 : « les maquettes sont la référence des pages ». `2405e1d` + `4c07e22` : 330 fichiers, +37 090 lignes | 78 Mo sur disque, pack Git 76 MiB ; archives v1/v2 (≈ 22 Mo) sans usage ; deux fiches `.impeccable/surfaces/` pointent vers des fichiers disparus | Sortir `archives/` et `assets/` (LFS ou archive), comme prévu en l.36 ; garder `web/` et `mobile/` comme référence |
| A7 | 19/10 `6191392`, `c51e58b`, `023feac`, `4d3ae8f`, `3ca1f98`, `500bd35` | Refonte « Bénin Vert » : kit de composants et reprise de 57 pages d'après les maquettes (≈ 9 200 lignes) | [∅] l.32-33 ne disent pas qui la demande ; contredit le MASTER_PROMPT § 12 (jetons, police) | Le style a été remplacé deux jours plus tard (A8) puis re-teinté (A9) : seul le découpage en pages et composants est durable | Garder la structure ; considérer le style comme jetable |
| A8 | 21/10 `5405c5f`, `e643de3`, `82792d2` | Refonte « Argile et verre » : verre dépoli, ombres doubles, dégradés, pastels, barre latérale flottante, accueils en tableau de bord | [U] `REFONTE_FRONTEND.md` (deux images de référence + skill `ui-ux-pro-max`). Contredit § 12 (R2) | `skin.css` chargé après `kit.css` : écrase des règles (`.split`, `.btn-icon`, `.btn-listen`), 10 pages débordaient à 375 px (AUDIT_UX P1-1) ; `backdrop-filter` sur toutes les cartes non mesuré sur appareil modeste ; 30 ombres, 13 fonds, 8 tailles de police relevés (critique Impeccable) | Simplifier : fusionner `skin.css` dans `kit.css`, retirer le flou si la cible est l'entrée de gamme |
| A9 | 21/10 `9755df1` (18 fichiers, +651 −642) | Palette « Sunny Farm » (`#016648`, `#00A563`, `#F6732F`) | [U] planche fournie | Deuxième re-teinte en 5 h ; `contrast.mjs` et `DESIGN.md` à tenir synchronisés | Garder et figer la charte |
| A10 | 21/10 `c55b45c`, `ec6583f`, `c117da3`, `671511b` | Minimalisme niveaux 1 à 3 : barre latérale et barre du haut réduites, fil d'Ariane et descriptions lus seulement par les lecteurs d'écran, source des chiffres derrière une icône, accueils allégés, connexion sans indicateur d'étapes | [U] « le moins d'informations possible, y compris en mode sombre » | Les mentions de démonstration sont retirées des pages de pilotage (« le bandeau du haut le dit ») ; découvrabilité pour un public peu lettré non testée ; la source de chaque chiffre (UC-22) n'est plus qu'à un clic | Garder ; vérifier que la source et la mention « Simulation » restent visibles là où le MASTER_PROMPT les exige |
| A11 | 21/10 `c38e673`, `2c4089c`, `a975765`, `bf80fae` | Audit UX (`AUDIT_UX.md`, 14/20), critique Impeccable (28/40, `.impeccable/critique/`), correctifs « niveaux 1 à 3 » | [∅] la demande n'est pas consignée ; le vocabulaire « niveau 1 à 3 » n'apparaît que dans les messages de commit | Corrige de vrais défauts (changement de page non annoncé, cibles de 44 px, `<html lang>`), dont plusieurs nés de A8 ; rapports qui vieillissent | Garder les correctifs ; archiver les rapports |
| A12 | 21/10 `6125c05`, `39da1e1`, `3b69466` | Déroulé complet de `DEMO.md` par profil, 15 défauts, 14 corrigés | [∅] | Aucun ; a trouvé des bugs réels (assistant qui cite la fiche Striga pour une question sur la chenille, journal illisible) | Garder |
| A13 | 22/10 `d882bbe` (15 fichiers, +820) | Page d'accueil `HomePage` à `/`, pied de page commun `SiteFooter`, pages **accessibilité**, **contact et assistance**, **plan du site**, `LangButton` extrait | [U] pour l'accueil et le pied de page (« style du tableau de bord, illustrations, pied de page exemplaire »). Les trois pages d'information ne sont pas citées comme demande | Engagements publics : la déclaration d'accessibilité dit « aucun audit externe » ; le contact a des champs à renseigner par le MAEP (surlignés) ; plan du site à tenir à jour | Garder ; compléter les mentions (ACTIONS_HUMAINES) avant mise en service |
| A14 | 22/10 `563b118`, `1706422`, `451d438`, `9b4cf1f` | Itérations de la page d'accueil : épurée, rubriques rétablies, scène réaliste (champ en perspective, acacias, case, paysan), ciel bleu clair, téléphone plus étroit | [U] demandes successives | Trois versions en 26 minutes ; illustrations SVG à maintenir | Garder la dernière version et la figer |
| A15 | 22/10 `1706422`, `bdde14c`, `fde2a10`, `9cbb2f6` | Logo du MAEP, armoiries, favicons, icônes Apple/192/512, composants `Logo` et `Emblem`, variante texte blanc | [U] image fournie | Source de 474 × 152 px, trop petite pour l'impression ; quatre états en 36 minutes ; usage des armoiries à valider par le MAEP | Garder ; remplacer par un fichier vectoriel (ACTIONS_HUMAINES) |
| A16 | 22/10 `1706422` | Section « Partenaires » (six pastilles : MAEP, MTDI, ATDA, INRAB, SONAMA, FNDA) et « Questions » | [U] « partenaires et questions ajoutés » ; sigles tirés du cadre de `PRODUCT.md` | Suggère un partenariat officiel non confirmé ; ACTIONS_HUMAINES demande de confirmer la liste et d'obtenir les logos | Retirer tant que la liste n'est pas confirmée, ou la libeller « parties prenantes citées dans les TDR » |

### Fonctions ajoutées ou étendues au-delà de la demande

| N° | Date · commit | Ce que c'est | Origine et raison consignée | Coût ou risque | Recommandation |
| --- | --- | --- | --- | --- | --- |
| B1 | 19/10 `2becf54` (14 fichiers, +266) | **Chaîne d'audit hachée** : rang, empreinte précédente, SHA-256, verrou `AuditChainHead`, `GET /audit-logs/verify`, commande `verify_audit_chain`, migration `audit.0002_chain`, bandeau « Chaîne intègre » | UC-03 et art. 495 demandaient un journal non modifiable [MP], pas la chaîne. Ajoutée parce que la maquette `pilotage/journal` l'annonçait [MQ] (l.35, l.43) | Verrou qui sérialise toute écriture du journal ; vérification sur tout le journal à chaque appel ; une réécriture de toute la suite n'est pas détectée (l.43) | Garder ; planifier la vérification nocturne et publier l'empreinte de tête hors base |
| B2 | 19/10 `d9edc6f` (13 fichiers) ; `4d3ae8f` | **Changement de numéro** par code SMS au nouveau numéro ; page « Mon profil » | [MQ] ; raison l.41 (producteur sans agent proche, SIM perdue). Absent du MASTER_PROMPT | Nouveau flux d'authentification (code haché avec le nouveau numéro, SMS d'alerte à l'ancien, 5 échecs) | Garder |
| B3 | 19/10 `e57450f` (15 fichiers, +406 −269) | **Fermeture du compte** au retrait du consentement « Données personnelles », effacement d'identité après `PRODUCER_RETENTION_DAYS` | Raison l.42 : la page promettait la fermeture sans que le serveur la fasse ; art. 433. UC-04 prévoyait un consentement retirable, pas ses effets | Action destructrice (offres retirées, session coupée, nom/NPI/téléphone effacés) ; 365 jours non validés par le DPO ; `purge_retention` non planifiée (pas de django-q2) | Garder ; fixer la durée avec le DPO ; planifier |
| B4 | 19/10 `d764efc` (12 fichiers, +510) | Page **Interopérabilité** : connecteurs avec état sur 24 h, test, journal des échanges, clés d'API par partenaire (hachées, affichées une fois, renouvelées, révoquées), masquage < 5 | UC-24 demandait agrégats et clés [MP] ; l'écran d'administration vient de la maquette [MQ] ; l.44 | « Appels sur 24 h » = lignes du journal d'audit, pas des métriques X-Road : l'écran ressemble à une supervision réelle alors qu'aucun appel sortant n'existe | Garder ; l'étiqueter « simulé » |
| B5 | 19/10 `76c9ae5` (12 fichiers) | **Programmes** : brouillon puis publication, critères d'éligibilité vérifiés, calendrier (clôture ≥ 14 jours), estimation des éligibles | UC-18 demandait candidatures et clôture [MP] ; le reste vient de la maquette [MQ] ; l.45 | La case « priorité femmes et moins de 35 ans » n'est pas reprise (la sélection n'a ni sexe ni âge) | Garder |
| B6 | 19/10 `fae35f1` | **Fiches techniques** : relecture refusée à l'auteur, relecteur et date enregistrés | UC-14 demandait brouillon, relecture, publication [MP] ; la règle « autre personne » vient de la maquette [MQ] ; l.47 | La démo n'a qu'un agronome : l'administrateur relit | Garder |
| B7 | 19/10 `4e1b145`, `544f039` | **Contestation d'un refus de candidature** (une fois, 15 jours) | [MQ], `PLAN_MVP.md` « ajouts hors liste » ; l.53 | Second circuit de contestation, distinct de UC-17 : suivi dans « Programmes », pas dans « Mes contestations » | Garder ; unifier les deux circuits |
| B8 | 19/10 `ff28f02`, `e0aa287` | **Demande d'adhésion** du producteur à une coopérative (nouveau modèle `MembershipRequest`) | [MQ] ; UC-06 ne prévoyait que l'ajout par le gestionnaire ; l.54 | La coopérative voit nom, code et commune du producteur ; part de chaque membre dans une offre groupée non faite | Garder |
| B9 | 19/10 `2d8ce12`, `0d2b3c7` | **Signalement d'un appui incomplet ou non reçu** | [MQ] ; UC-10 ne prévoyait que la confirmation ; l.52 | Pas de suivi du signalement (journal et notification seulement) | Garder |
| B10 | 19/10 `eae2a5e`, `be0c1f1` | « **Pas sûr ? Demander un agronome** » et conseils de cadrage | [MQ] ; UC-13 prévoyait l'envoi automatique sous 0,6 ; l.51 | Photos multiples, viseur plein écran, photo hors ligne non faits | Garder |
| B11 | 19/10 `c1fa502`, `0efab0b` | **Récoltes signalées vérifiées** par l'agent (confirmée, corrigée, visite) | [MQ] ; UC-11 prévoyait le signalement, pas sa clôture ; l.58 | Aucun | Garder |
| B12 | 19/10 `a029b8d` (11 fichiers, +389), `09ad489` | **USSD et SMS entrants** (menus sans état, commandes `METEO` et `PRIX`) et simulateur dans la boîte d'envoi | [TDR] canaux SMS/USSD/vocal (`CONFORMITE_TDR.md` § 4, « Simulé ») ; absent du MASTER_PROMPT ; lot 5 [MQ] ; l.49 | Passerelles ouvertes sans clé en `DEMO_MODE` (sinon `USSD_GATEWAY_KEY`) ; `*000#` fictif ; aucun opérateur | Garder ; brancher sur du réel après obtention du code court (ACTIONS_HUMAINES n° 11) ; vérifier `DEMO_MODE=false` en production |
| B13 | 19/10 `a2421dd`, `4fdff5c`, `719ebfa`, `9abe77b` | **Mode agent terrain** mobile : onglets du bas, inscription et remise d'appui gardées hors ligne et rejouées | UC-25 (hors ligne pour l'agent) [MP] ; barre d'onglets et écrans [MQ] ; l.57 | Inscriptions complètes (NPI, téléphone, naissance) gardées sur le téléphone jusqu'au rejeu ; chiffrement de l'appareil et durée de conservation non décidés (l.57) | Garder ; instruire avec l'APDP avant d'élargir |
| B14 | 19/10 `d00d78a`, `c63f974`, `7ac01d8`, `d4fb6df`, `5ffc9f8`, `0469255`, `8574372` (+ `ed193e8`, `ade240c`) | **Coque mobile** : onglets du bas, premier lancement avec vraies demandes d'autorisation (position, appareil photo, micro, notifications), notifications système par interrogation toutes les 5 min, compte et profil au téléphone | PWA responsive demandée [MP] ; les écrans (85 écrans de `maquettes/mobile`) sont [MQ] ; l.37, l.38, l.39 | Autorisations demandées au premier lancement ; interrogation toutes les 5 min (batterie, réseau) ; pas de Web Push | Garder ; mesurer |
| B15 | 19/10 `e4c17f3` | Assistant : question de dosage **réellement transmise** à l'agent, historique « Mes questions » **local** et effaçable, dictée en français | Renvoi à un agent demandé [MP] (UC-12) ; historique local [MQ] ; l.50 | La notification à l'agent contient code, numéro et la question (300 caractères) ; réponse de l'agent dans l'app non faite | Garder |
| B16 | 19/10 `cf76de8`, `065e60a` | « **Partager le lien** » de la carte ; prix du jour dans l'annonce ; reçu à écouter et à partager | [MQ] ; l.55, l.56 | QR code et enregistrement en image non faits | Garder |
| B17 | 19/10 `8ae7092` | Filtres du journal d'audit par objet et par date | [∅] | Mineur | Garder |
| B18 | 16/10 `83a91d9` ; 19/10 `cf76de8` | **Carte du producteur avec code de vérification** (8 caractères) et page publique `/verification/<code>` | UC-07 (P1) [MP]. `CONFORMITE_TDR.md` § 8 : « absent du TDR, sans incohérence » | La page publique montre statut et nom (limite de débit) ; code de 8 caractères tient lieu de QR (l.55) | Garder (demandée) ; documenter l'exposition du nom |
| B19 | 16/10 `83a91d9` | **Module de validation linguistique** (UC-15) : table de traductions fon/bariba, notes par un second représentant, ouverture à 80 % ; chargement des dictionnaires | UC-15 (P2) [MP]. `CONFORMITE_TDR.md` § 8 : « distinct de l'exigence du TDR » | Aucune traduction saisie ; la liste MTDI comptait 1 155 boutons « Proposer un texte » identiques (défaut 11, corrigé) | Garder ; le brancher sur le corpus de l'assistant (déjà fait pour les réponses) |

### Intégrations ajoutées

| N° | Date · commit | Ce que c'est | Origine et raison consignée | Coût ou risque | Recommandation |
| --- | --- | --- | --- | --- | --- |
| C1 | 19/10 19:12 `b030808` | `ANTHROPIC_BASE_URL` : adresse du « serveur Claude » du réseau local | [∅] message seul : « adresse du serveur Claude réglable (réseau local) » | Permet d'envoyer les questions à n'importe quelle adresse ; non consigné dans DECISIONS ni CONFORMITE | Garder ; consigner |
| C2 | 20/10 10:46 `a90d238` | **Passerelle LLM du réseau local au format OpenAI** (`OpenAICompatibleBackend`) : activée dès que `OPENAI_API_KEY` est renseignée, modèle pris dans `/v1/models` | [∅] raison non consignée (aucune ligne de DECISIONS) ; `CONFORMITE_TDR.md` : « LLM du réseau local branché » | `OPENAI_BASE_URL` par défaut en dur : `http://glm-gateway.tail577250.ts.net:4000/v1` (nom de machine d'un réseau privé) dans `backend/config/settings.py` l.134 et `backend/.env.example` l.17 ; essayée **avant** Ollama (`llm.py`), contrairement à l'ordre du MASTER_PROMPT § 9 ; reçoit question, fiches, filière, commune, stade, saison, parcelle et météo ; art. 391 si la passerelle relaie hors du Bénin ; `CONFORMITE.md` et `REGISTRE_TRAITEMENTS.md` non mis à jour | Retirer l'hôte par défaut (laisser vide), consigner la décision, mettre à jour CONFORMITE et REGISTRE ; ou revenir à Ollama local |
| C3 | 20/10 `b8cc0b4`, `35b844f` | **Open-Meteo réel** (écrans, USSD, SMS, assistant, risques climatiques) | [U] point du 20/10 « météo fiable » (`CONFORMITE_TDR.md` § 6) et [TDR] ; l.60. Listé comme point de vigilance (R9) | Latitude et longitude du centroïde de la première parcelle envoyées à un service externe ; jusqu'à 12 appels par consultation de risque climatique ; Internet requis | Garder ; consigner dans CONFORMITE (art. 391) et REGISTRE ; envisager d'arrondir les coordonnées envoyées |

### Données écrites en dur ou fictives

| N° | Date · commit | Ce que c'est | Origine et raison consignée | Coût ou risque | Recommandation |
| --- | --- | --- | --- | --- | --- |
| D1 | 19/10 `500bd35` (9 fichiers, +1 011) | Pages **« Collecte » et « Offres »** (transformateur, distributeur, gestionnaire) remplies par `frontend/src/features/supply/demo.ts` ; rien n'est envoyé au serveur | Raison au message : « il n'existe pas d'API de collecte, de stocks ni de prévision de récolte » ; `CONFORMITE_TDR.md` § 8 : « à retirer ou à brancher » | Toujours routées (`App.tsx` l.164-165) et dans trois menus (`Layout.tsx` l.51-53) ; `coverDays` renvoie `Infinity` sans sortie, contraire à la règle « jamais infini » (l.79) ; doublon de « Traçabilité » et « Stocks et ruptures » | Retirer des menus, ou brancher sur les lots et les stocks réels |
| D2 | 19/10 `3ca1f98` | Page **« Prévisions »** (rendement, risques) calculée dans le navigateur (`simulate.ts`) | [TDR] « prévision des rendements », classée **Simulé** ; étiquetée comme telle | Écart avec « offre attendue » calculée par le serveur (l.80) : deux méthodes pour la même question | Brancher sur le serveur ou retirer |
| D3 | 19/10 `500bd35` | Encart des **récoltes attendues** de la page Marché (`features/market/demo.ts`) | `CONFORMITE_TDR.md` § 8 | Chiffres fictifs dans une page réelle | Brancher sur les analyses prospectives |
| D4 | 16/10 `d999f00`, `83a91d9` | **Sélection de bénéficiaires sur les 200 873 fermes du POC** | UC-17 et § 10 [MP]. `CONFORMITE_TDR.md` § 8 : fermes « synthétiques » réparties à égalité entre départements, 10 053 contre 16 667 en Alibori au tableau de bord ; `DONNEES.md` : département imputé au centre le plus proche, ni date ni méthode | Tout résultat est une démonstration ; fichier de 77 Mo à fournir hors Git (import ≈ 40 s) ; poids par défaut incohérents (R10) | Garder, étiquetée ; harmoniser les poids ; remplacer par des données officielles |
| D5 | date non consignée (données de seed ; la surface est calculée par le serveur à partir du tracé, aucune valeur littérale dans le code) | **Parcelle de démonstration de 97,75 ha** pour un petit producteur, d'où une récolte estimée à 146 t | `CONFORMITE_TDR.md` § 8 ; raison de la valeur : non consignée | Fausse l'estimation de récolte et la SEA | Corriger le seed |
| D6 | 19/10 `9043726` (photo versionnée ; copie `backend/media` ignorée par Git) | **Photo de démonstration avec filigrane « iStock »** : `docs/demo/photo-feuille-douteuse.jpg` et copie dans `backend/media/diagnoses/` | `ACTIONS_HUMAINES.md`, `AUDIT_UX.md` P2-8, `2c4089c` ; source non retrouvée | Question de licence sur une plateforme ministérielle | Remplacer par une image libre et créditée avant toute présentation |
| D7 | 19/10 `651cdff` | **Tâches de la semaine** et calendrier des stades fondés sur des « cycles de démonstration » ; les cases ne sauvegardaient rien | AUDIT_UX P2-5 ; `2c4089c` les remplace par des liens vers la campagne | Cycles toujours codés en dur | Brancher sur la campagne ou retirer |
| D8 | 16-20/10 | **Valeurs de repli étiquetées** : prix de démonstration, rendements de référence, satellite déterministe, huit statistiques nationales rondes, entités « [démo] » | l.25, l.73, l.77, l.80 ; MASTER_PROMPT § 0 (tout mock visible) | Les commits `c55b45c` et `c117da3` retirent des mentions de démonstration des pages de pilotage : seul le bandeau « Prototype » du haut subsiste | Vérifier que chaque chiffre fictif reste étiqueté après le minimalisme |

### Outillage, documents et dépôt

| N° | Date · commit | Ce que c'est | Origine et raison consignée | Coût ou risque | Recommandation |
| --- | --- | --- | --- | --- | --- |
| E1 | 19-21/10 | Huit documents de pilotage : `PLAN_MVP.md`, `REFONTE_FRONTEND.md`, `AUDIT_UX.md`, `RAPPORT_PARCOURS.md`, `docs/demo/RELEVES_PARCOURS.md`, `REENTRAINEMENT.md` (lié au TDR), `PRODUCT.md`, `DESIGN.md` | [∅] sauf `REENTRAINEMENT.md` [TDR] | Vieillissent vite (section 4) | Figer les journaux ; garder les documents de référence |
| E2 | 19/10 `a6c5c0f`, `a341977` | `start.bat reset` et copie vierge `backend/db.demo-vierge.sqlite3`, contrôle des ports 8000 et 5173, attente de l'API, `API_URL` de Vite | Scripts de démarrage demandés [MP] ; ces ajouts [∅] | Faible | Garder |
| E3 | 20/10 | Deux **worktrees** et branches résiduels : `.claude/worktrees/agent-a5a3eea398688ec5f` (lot D, `4b36a5f`) et `agent-aecefdbb3fb31dff9` (lot E, `11be587`) | [∅] | Copies complètes du dépôt sous le dossier de travail (recherches qui remontent des doublons) ; lots déjà fusionnés par `3a440d0` et `8c5fe91` | `git worktree remove` puis supprimer les branches |

### Demandés mais jamais vérifiés (non comptés ci-dessus)

| Élément | Demandé par | Constat |
| --- | --- | --- |
| Spécifications Playwright `frontend/e2e/demo.spec.ts`, `p2.spec.ts`, `landing-overlap.spec.ts` | MASTER_PROMPT § 5, § 14 | Écrites, jamais exécutées d'après `RAPPORT_FINAL.md` et `PLAN_MVP.md` ; aucune exécution consignée ensuite |
| `.github/workflows/ci.yml` | MASTER_PROMPT § 5 | Workflow GitHub Actions ; `origin` est un GitLab (`gitlab.pprod.sige.local`) : il ne s'exécutera pas tel quel |
| `infra/` (Docker, nginx) et PostgreSQL | MASTER_PROMPT § 3, § 5 | « Non utilisés ni testés » (README) |
| Lighthouse ≥ 90, `bandit`, `pip-audit`, `npm audit`, `axe-core` | MASTER_PROMPT § 14, § 15 | Aucune trace d'exécution dans les documents ; `axe-core` absent de `package.json` |
| Client TypeScript généré depuis `openapi.json` | MASTER_PROMPT § 5 | Non fait (types écrits à la main, l.11) ; `openapi.json` gelé le 16/10 |

### Lots A à E du 20/10 : rattachés au TDR, donc non listés comme ajouts

Treize commits, ≈ 14 300 lignes ajoutées en une journée (recouvrement et revenu, terres et climat, matériel, mécanisation, semences, PMEA, prix, stocks, analyses, enquêtes, formations, vitrine, SEA détaillé, couverture nationale, carte des acteurs, qualité des modèles, jeu d'entraînement). `CONFORMITE_TDR.md` les rattache chacun à une ligne du TDR (que je n'ai pas pu relire). Points à ne pas perdre de vue : six lignes sont « faites côté outil » seulement (dépendent de données ou de seuils d'un tiers) ; `/prices/margins` n'est pas une marge (l.78) ; `export_training_set` n'a aucun modèle appris à nourrir ; les écrans des transformateurs, distributeurs et gestionnaires, les formulaires d'aménagement et de sol, la saisie des statistiques nationales et les résultats d'enquête n'ont été vérifiés que par des tests (`CONFORMITE_TDR.md` § 7).

## Annexe C : décisions

`docs/DECISIONS.md` compte 79 lignes de décisions, de l.5 (16/10 13:26) à l.83 (20/10), dernière modification `3a440d0` (21/10 09:06). **Les décisions du 21 et du 22/10 (refonte, palette, minimalisme, accueil, logo) ne sont pas dans ce fichier** : elles sont dans `docs/REFONTE_FRONTEND.md` (section 2.2 ci-dessous). Certaines lignes sont regroupées pour tenir en trente entrées ; la colonne Source donne les lignes de `DECISIONS.md`.

### Les 30 décisions les plus importantes de DECISIONS.md, par thème

**Cadrage, poste, infrastructure**

| N° | Date | Décision | Raison | Impact | Source |
| --- | --- | --- | --- | --- | --- |
| 1 | 16/10 13:26 | Lecture du MASTER_PROMPT ; échéance 15:00 (≈ 94 min) ; P0 complet, P1 si le temps le permet | Plus de 60 min restantes | Périmètre P0 prioritaire. En fait le travail a continué après 15:00 (`83a91d9` à 16:03, landing à 18:17) | l.5 |
| 2 | 16/10 13:30 | Projet placé dans `Projets\agri-digit-benin` et non `Documents\MTDI\Agri-Digit` | La protection Windows « Dossiers contrôlés » empêche Python d'écrire dans Documents | Aucun réglage de sécurité modifié ; chemin différent du MASTER_PROMPT | l.6 |
| 3 | 16/10 13:28 | SQLite par défaut ; `docker-compose.yml` PostgreSQL 16 fourni | Docker installé mais démon arrêté | PostgreSQL jamais exécuté (README et ACTIONS_HUMAINES : infra « non testée ») | l.7 |
| 4 | 16/10 13:45 | `tsc`, `vite build`, `vitest` avec `node --no-opt` ; Vitest en un seul processus | PC de 3,5 Go, V8 « Zone Allocation failed » | Contrainte durable de tout le projet (voir 2.3, R3) | l.13 |
| 5 | 16/10 13:45 | Import du POC en flux, centroïde seul, département = centre départemental le plus proche, commune vide | `json.load` de 77 Mo lève `MemoryError` ; pas de limites administratives | Localisation approximative ; chiffres par département non recoupables avec une source officielle | l.19 |
| 6 | 16/10 15:26 | Reprise en série après l'interruption des agents de 14:48 ; aucun agent frontend n'exécute de commande node | Code backend écrit sans migrations ni routes, `interop` et `satellite` vides, ≈ 400 Mo libres | Vérification de types faite une seule fois, à la fin | l.22 |

**Architecture, contrat, dépôt**

| N° | Date | Décision | Raison | Impact | Source |
| --- | --- | --- | --- | --- | --- |
| 7 | 16/10 13:28-13:45 | Contrat d'API écrit à la main avant le code ; OpenAPI généré ensuite ; types TypeScript et client `fetch` écrits à la main | Backend et frontend en parallèle ; délai | `openapi.json` gelé le 16/10 16:03 (`83a91d9`), jamais régénéré ; `API_CONTRACT_V2.md` (19 commits) fait foi | l.9, l.11 |
| 8 | 16/10 13:28-13:45 | Pas de django-q2, pas de MSW, Playwright non installé (spécification écrite) | Délai ; mémoire insuffisante pour Chromium | Purges et envois en commande de gestion à planifier ; e2e navigateur jamais exécutés | l.10, l.12, l.18 |
| 9 | 19/10 | Textes français répartis en `i18n/fr/<groupe>.json` ; test `i18n/keys.test.ts` qui échoue si une clé du code manque | Trois groupes avaient écrit des pages sans leurs textes (session interrompue) : clés brutes affichées | Les clés construites à la volée ne sont pas contrôlées | l.33 |
| 10 | 19/10 | Maquettes, `PRODUCT.md`, `DESIGN.md`, `.impeccable/` versionnés ; captures de revue (≈ 100 Mo) exclues | Les maquettes sont la référence des pages | `maquettes/assets` et `archives` ≈ 70 Mo « à sortir du dépôt (LFS ou archive) si la taille gêne » ; non fait (pack Git 76 MiB) | l.36 |

**Design et interface**

| N° | Date | Décision | Raison | Impact | Source |
| --- | --- | --- | --- | --- | --- |
| 11 | 16/10 13:45 | Bordure des champs en `#4A5148` au lieu de `#D9D6CC` | `#D9D6CC` sur blanc = 1,45:1, sous les 3:1 de WCAG 1.4.11 | `frontend/scripts/contrast.mjs` vérifie tous les couples | l.15 |
| 12 | 16/10 16:42-17:25 | Landing animée : relief 3D des 200 873 fermes et champ de maïs en canvas 2D, perspective écrite à la main, **sans three.js** ; mouvement réduit automatique (système, économie de données, < 2 Go, bouton) ; jetons sombre/clair | Poids (58 ko, 21 ko gzip) et téléphones d'entrée de gamme ; accessibilité | Contredit par `56afb40` (three.js 0.169 ajouté, repli canvas 2D) : voir R5 | l.27 à l.30 |
| 13 | 19/10 | Refonte phase 0 : kit « Bénin Vert » porté dans l'application (jetons canopée/maïs/soleil/latérite, Atkinson Hyperlegible Next et Bricolage Grotesque, sprite d'icônes, coque par rôle). Source Sans retirée | Une seule grammaire visuelle avant de refaire chaque page | Remplace les jetons du MASTER_PROMPT § 12 ; remplacé lui-même le 21/10 (R1) | l.32 |
| 14 | 19/10 | Lot 1 : l'application mobile **est** la PWA sous 640 px (une seule application, mêmes routes) ; premier lancement `/bienvenue` avec vraies demandes d'autorisation ; notifications du système par interrogation toutes les 5 min | Éviter une deuxième base de code ; « pas d'autorisation sans usage » | Push serveur (Web Push) à ajouter si les alertes doivent arriver application fermée | l.37, l.38 |

**Données personnelles, sécurité, audit**

| N° | Date | Décision | Raison | Impact | Source |
| --- | --- | --- | --- | --- | --- |
| 15 | 16/10 13:50 et 19/10 | Agent limité à son département ; l'Outbox n'affiche jamais à l'agent les codes de connexion ; code SMS pour tous, mot de passe en plus pour le personnel (confirmé par l'utilisateur) | Minimalisation ; comptes du personnel ouvrant des données de tout un secteur | L'admin voit toute l'Outbox (mode démo) | l.21, l.31 |
| 16 | 16/10 15:26 puis 19/10 12:25 | Interopérabilité : clé de partenaire vide = désactivé, comparaison à temps constant, 60 requêtes/min ; **puis** clés hachées, renouvelables, révocables, cellules de moins de 5 masquées | « Une clé vide ne doit jamais ouvrir l'accès » ; le seuil était noté « à faire avant d'ouvrir à un partenaire » | Les « appels sur 24 h » comptent le journal d'audit, pas des métriques X-Road | l.24 puis l.44 |
| 17 | 19/10 12:08-12:14 | Changement de numéro par le producteur avec code SMS au nouveau numéro ; retrait du consentement « Données personnelles » = fermeture du compte, effacement de l'identité après 365 jours | Producteur sans agent proche bloqué ; la page promettait la fermeture sans que le serveur la fasse ; art. 433 | Durée à fixer avec le DPO ; `purge_retention` à planifier ; remplace l.34 | l.41, l.42 |
| 18 | 19/10 12:20 | Journal d'audit chaîné (rang, empreinte précédente, SHA-256), verrou d'écriture, vérification `GET /audit-logs/verify` ; la purge journalise le dernier maillon | La maquette annonçait la chaîne ; remplace « en ajout seul » | Vérification en parcours complet à chaque appel ; une réécriture de toute la suite reste possible : publier l'empreinte de tête hors base | l.35 puis l.43 |
| 19 | 19/10 14:45 | Agent terrain : inscription et remise d'appui gardées hors ligne ; **pas de secteur entier** en cache hors ligne, ni photo, ni position du domicile, ni preuve de remise | Chiffrement de l'appareil et durée de conservation à décider avec l'APDP ; le serveur ne stocke ni photo d'identité ni preuve | À instruire avec l'APDP avant tout cache de données personnelles | l.57 |
| 20 | 20/10 | SEA : toute cellule de moins de 5 personnes masquée sauf pour l'administration, avec masquage complémentaire ; impact des appuis comparé par cellule (département, filière, saison), « non causal » dit à l'écran ; fenêtre de 12 mois | Protéger les personnes ; limiter l'effet du lieu, de la culture, de la saison | Avec les 45 producteurs de démo, chaque groupe a moins de 5 : l'écran affiche « non disponible » ; seuils à valider par le MAEP | l.72 |
| 21 | 20/10 | `manage.py export_training_set` : CSV pseudonymisé (identifiant = empreinte salée, dates au mois, surfaces à 0,1 ha), seulement avec consentement actif, export journalisé | Le TDR demande un cadre de réentraînement | Il faut un consentement distinct, l'AIPD et l'avis de l'APDP avant le premier export réel | l.76 |

**Assistant, langues, météo**

| N° | Date | Décision | Raison | Impact | Source |
| --- | --- | --- | --- | --- | --- |
| 22 | 16/10 13:45 et 20/10 | Aucune traduction fon/bariba inventée (`fon.json`, `bba.json` sans texte, repli français) ; l'assistant ne répond en langue nationale qu'avec une réponse écrite par un locuteur et validée par un second, sinon réponse française signalée et question transmise au MTDI | Qualité validée par des locuteurs natifs (TDR § 3.4) ; un modèle ne produit pas de fon fiable | La couverture dépend du travail du MTDI : aucun texte saisi | l.14, l.61 |
| 23 | 19/10 | Une question de dosage est réellement transmise (notification) aux agents du département ; historique « Mes questions » gardé sur le téléphone ; « Pas sûr ? » renvoie un diagnostic à l'agronome (une fois, mot de 500 caractères) ; pas de photos multiples ni de photo hors ligne | Avant, l'assistant annonçait un renvoi sans rien envoyer ; un bouton qui n'envoie pas ce qu'il annonce tromperait | Réponse de l'agent dans l'application et photos multiples non faites | l.50, l.51 |
| 24 | 20/10 | Météo réelle par Open-Meteo plutôt que Météo-Bénin | Aucune API Météo-Bénin connue ; Open-Meteo ouvert, sans clé | Internet requis côté serveur, repli « Prévision simulée » ; latitude et longitude partent vers un service externe (R9) | l.60 |

**Honnêteté des données (simulé, absent, non disponible)**

| N° | Date | Décision | Raison | Impact | Source |
| --- | --- | --- | --- | --- | --- |
| 25 | 16/10 puis 20/10 | Une valeur sans source vaut `null` et s'affiche « non disponible », jamais 0 ; satellite déterministe étiqueté « Données de démonstration » ; statistiques nationales avec **source obligatoire** et aucun chiffre national dans le code (huit lignes de démo étiquetées) ; prix : relevés saisis, sinon démonstration étiquetée `simulated: true`, sinon liste vide | Ne pas présenter comme un chiffre ce qui n'a pas de source | Les écrans des lots D et E « partent vides » en démo ; les pas 34 à 38 de DEMO.md les remplissent à la main | l.25, l.26, l.73, l.77 |
| 26 | 20/10 | Analyses prospectives : aucune projection sous 6 relevés répartis sur 14 jours ; au-delà, droite des moindres carrés à 4 semaines avec fourchette de 2 écarts-types | Pas de série assez longue pour apprendre un modèle ; heuristique lisible | Rendements de référence de démonstration (INRAB à valider) ; transformateurs et distributeurs ne voient pas les cellules de moins de 5 | l.80 |

**Métier ajouté pour le TDR (lots A à E)**

| N° | Date | Décision | Raison | Impact | Source |
| --- | --- | --- | --- | --- | --- |
| 27 | 20/10 | Recouvrement : un seul modèle de créance (`Claim`, `Installment`, `ClaimPayment`) pour l'appui remboursable, le prêt d'une institution financière et l'équipement du plateau ; la dette naît à la confirmation de réception ; revenu net = ventes déclarées − dépenses déclarées − remboursements ; le facteur « Appuis remboursés » du score de crédit devient réel, poids inchangés | Un seul besoin derrière quatre lignes du TDR ; ne pas faire payer ce qui a été signalé non reçu | Échéancier en parts égales tous les 30 jours, ni différé ni intérêts ; Mobile Money réel toujours à raccorder ; aucune calibration sur des issues réelles | l.63, l.64, l.65 |
| 28 | 20/10 | Terres : module `apps/lands`, trois superficies (disponible mesurée, exploitable déclarée, exploitée = parcelles avec campagne de la saison) ; analyses de sol lues **sans dose** ; risques climatiques par bilan hydrique à règles sur Open-Meteo | Réutiliser les données des parcelles ; même règle que l'assistant pour les doses ; pas de sinistres pour apprendre un modèle | Seuils à valider par l'INRAB ; jusqu'à 12 appels Open-Meteo par consultation (cache 3 h) | l.66, l.67, l.68 |
| 29 | 20/10 | Exploitations : mécanisation sans paiement porté par la plateforme (règlement direct), semences certifiées distribuées en `Support` (stock décrémenté), annuaire des PMEA visible seulement après vérification par l'agent de la zone | Pas de mécanisme sûr pour un litige sur la surface ; un seul circuit de confirmation/remboursement ; éviter les fausses entreprises | Certificat saisi, non vérifié ; vérification des PMEA déclarative | l.69, l.70, l.71 |
| 30 | 20/10 | Carte des acteurs : couches enregistrées dans un registre, entités sans position propre placées au **centre de leur département**, jamais de nom ni de téléphone ; qualité des modèles : chaque mesure porte son `n` (rien sous 5 cas, « indicative » sous 30), modèles sans comparaison listés « non mesurables » | Ne pas inventer une adresse ; une valeur sur 3 cas serait trompeuse | Visibilité des sites à confirmer avec l'APDP ; biais de sélection des relectures | l.74, l.75 |

Lignes de `DECISIONS.md` non reprises dans les 30 : l.8, l.16, l.17, l.20, l.23, l.34, l.39, l.40, l.45 à l.49, l.52 à l.56, l.58, l.59, l.62, l.78, l.79, l.81 à l.83 (détails dans le fichier).

### Décisions prises hors DECISIONS.md (REFONTE_FRONTEND.md, PRODUCT.md)

| Date | Décision | Raison consignée | Impact |
| --- | --- | --- | --- |
| 18/10 | Thème « le vert, la nature, les champs » ; landing = simulation du téléphone du producteur ; images IA autorisées si signalées | `PRODUCT.md` : « imposé par l'utilisateur », « confirmé le 2026-10-18 » | Contredit le MASTER_PROMPT § 12 (« pas de maquette de téléphone dans une page web », pas d'animation décorative) |
| 21/10 | Refonte « Argile et verre » (D1 à D18) : clair par défaut, verre dépoli (blanc 66 %, flou 18 px), argile (ombres doubles), pastels menthe/pêche/beurre/ciel, boutons en dégradé vert-sarcelle, rayons 10 à 30 px, barre latérale flottante sauge, accueils en tableau de bord | Demande de l'utilisateur d'après deux images de référence (DentaCare, tableau de bord musique) et le skill `ui-ux-pro-max` | Contredit le MASTER_PROMPT § 12 (aucun dégradé, flou, effet de verre ; rayon 6 px ; une seule police) |
| 21/10 | D16 : la landing garde sa scène 3D sombre | « Refaire la scène en clair coûte un rendu entier » | Annulé le 22/10 (R5) |
| 21/10 | Vert de marque `#1E7A4C` puis `#1A6E43` | Contraste sur les pastels | Remplacé le jour même |
| 21/10 | Pastel porteur de sens (pêche = échec/retard, beurre = attente, ciel = info) ; menu en rubriques repliables ; ombres retirées | Critique Impeccable, niveau 3 | Défait la règle « teinte par rang » de D5 |
| 21/10 15:08 | Palette « Sunny Farm » : marque `#016648`, vert vif `#00A563` réservé aux graphiques et fonds à texte sombre, orange `#F6732F` en accent (texte brun dessus), barre latérale vert profond ; sarcelle et crème supprimés | Planche fournie par l'utilisateur | Contrastes recalculés, `contrast.mjs` 0 échec |
| 21/10 15:22-15:42 | Minimalisme : barre latérale sans bloc profil, barre du haut réduite, fil d'Ariane et descriptions lus seulement par les lecteurs d'écran, chiffres sans icône, tableaux avec export en icône, accueils allégés (plus de tuiles ni de carte météo) | « Le moins d'informations possible, y compris en mode sombre » (utilisateur) | Défait en partie D10/D17 posés 5 h plus tôt |
| 22/10 08:41 | Nouvelle page d'accueil `HomePage` à `/` ; l'ancienne landing 3D reste sur `/accueil-3d` ; pied de page commun ; pages accessibilité, contact, plan du site ; la déclaration d'accessibilité dit qu'aucun audit externe n'a eu lieu | Demande de l'utilisateur (style du tableau de bord, illustrations, pied de page exemplaire) | `e2e/landing-overlap` repointé sur `/accueil-3d` |
| 22/10 08:50 et 09:07 | Landing épurée (rubriques retirées) puis rubriques revenues réduites ; Partenaires (6 sigles) et Questions ajoutés ; titre « Votre champ dans votre téléphone. » | Demandes successives de l'utilisateur | Trois versions de la page en 26 minutes |
| 22/10 09:19-09:23 | Scène d'accueil redessinée (champ en perspective, acacias, case, paysan), ciel bleu clair, téléphone plus étroit | « Plus proche du réel » (utilisateur) | Jetons locaux `--hm-sky-a/b` |
| 22/10 09:07-09:43 | Logo du MAEP, emblème, favicon : pastille blanche, puis PNG sans fond, puis variante texte blanc, puis PNG sans fond fourni par l'utilisateur | Demandes de l'utilisateur | Image source 474 × 152 px, trop petite pour l'impression (ACTIONS_HUMAINES) |

### Revirements et contradictions

<!--portrait-->

## Annexe D : inventaire détaillé du backend

Abréviations des rôles : PRO producteur, AGT agent_atda, GES gestionnaire_cooperative, TRA transformateur, DIS distributeur, FIN agent_financier, AGR agronome_inrab, MTD repr_mtdi, RES responsable_programme, ADM admin_maep, AUD auditeur_copil. Toute vue sans `permission_classes` explicite exige un utilisateur authentifié (`config/settings.py:113`). Le « 404 hors périmètre » signifie que la donnée d'un autre périmètre est invisible (le sélecteur filtre) ; un rôle non autorisé reçoit 403 (`apps/core/errors.py:30-31`).

### `core` (aucun modèle, aucune route)
- Rôle : fondations communes. `errors.py` (`ApiError`, format `{detail, code, fields?}`), `permissions.py` (7 constantes de rôle sur 11, fabrique `roles(*rôles)`, `in_scope`), `pagination.py` (curseur, 20 par page, 100 max, tri `-created_at`), `versioning.py` (verrou optimiste `base_version`/`force`, 409 `conflict`).
- UC : UC-25 (hors ligne, conflits) pour `versioning.py` ; le reste est transversal (« non rattaché » à un UC).
- Règle : `in_scope(user, dep, commune)` ne restreint que l'AGT (`core/permissions.py:24-28`).
- Tests : 0 propre ; `versioning` est testé par `parcels/test_conflict.py::test_offline_conflict_and_forced_choice`.

### `accounts` (UC-01, UC-02)
- Modèle : `User` (UUID, téléphone unique 10 car., rôle parmi 11, département, commune, langue, `otp_hash`, `otp_expires_at`, `otp_failures`, `locked_until`, `pending_phone`) (`accounts/models.py:27-55`).
- Endpoints (`config/urls.py:38-47`) : `POST /auth/otp/request` et `/auth/otp/verify` (public, limités), `POST /auth/refresh` (cookie), `POST /auth/logout` (public), `GET /auth/me` (authentifié), `POST /auth/phone-change/request` et `/confirm` (PRO, limités), `GET /demo/otp-inbox` (public, 404 hors `DEMO_MODE`), `GET/POST /admin/users`, `PATCH /admin/users/{id}` (ADM).
- Règles : code à 6 chiffres (`secrets.randbelow`), valable 10 min, haché HMAC-SHA256 avec `SECRET_KEY` (`accounts/services.py:16-22`) ; 5 échecs = blocage 15 min (`:43-55`) ; mot de passe exigé pour tout rôle autre que PRO (`models.py:51-52`, `services.py:68`) ; changement de numéro par code SMS envoyé au nouveau numéro, alerte SMS à l'ancien, version « changement de numéro » sur la fiche (`services.py:104-143`) ; création/modification de comptes journalisées (`user.create`, `user.update`).
- Tests (6) : connexion PRO et personnel avec mot de passe, expiration du code, blocage après 5 échecs (réponses 400,400,400,400,429), droits de l'administration des comptes (201, 409, 403, désactivation), 401 sans jeton, changement de numéro complet.
- Commande : `seed_demo` (section 5).
- `accounts/admin.py` : `UserAdmin` avec `otp_hash` et `password` exclus.

### `audit` (UC-03)
- Modèles : `AuditLog`, `AuditChainHead`, `RetentionPolicy` (`audit/models.py`).
- Endpoints : `GET /audit-logs` (AUD, ADM ; filtres `action`, `actor`, `object_type`, `from`, `to`), `GET /audit-logs/verify` (AUD, ADM) (`audit/api.py`).
- Règles : journal append-only, chaîné par empreintes SHA-256, vérifiable (voir section 4.5). `RetentionPolicy` n'est consultée que pour `audit_log` (`purge_retention.py:17-19`).
- Commandes : `purge_retention`, `verify_audit_chain`.
- Tests (6) : immutabilité (save/delete/update/delete de queryset → `PermissionError`), lecture réservée AUD/ADM (403 pour AGT et PRO), filtres, chaîne (détection d'une retouche SQL, reprise après purge), plus 2 tests d'autres modules logés ici (export CSV avec motif et tableau de bord ; référentiels publics).

### `referentiel` (support de UC-04, UC-08 ; exigence MASTER « 10 filières »)
- Modèles : `ValueChain` (13 : 10 principales + 3 réserve `igname`, `maraichage`, `palmier_huile`), `Department` (12), `Commune` (77) (`referentiel/data.py:5-44`, `assert` ligne 44).
- Endpoints : `GET /ref/value-chains`, `GET /ref/departments` (publics, `AllowAny`).
- Tests : 0 propre (voir 1.2).

### `producers` (UC-04, UC-05, UC-07)
- Modèles : `Counter` (séquence), `Producer`, `ProducerVersion`, `Consent` (`producers/models.py`).
- Endpoints : `POST /producers/register` (public ; un AGT ne peut inscrire que dans son département), `GET /producers` (PRO soi, AGT son département/commune, ADM tous, FIN seulement les consentants crédit, autres rôles 403 : `producers/selectors.py:10-22`), `GET/PATCH /producers/{id}` (PATCH : AGT, ADM, avec `base_version`), `POST .../validate` et `.../reject` (AGT, ADM ; motif obligatoire au rejet), `GET .../versions`, `GET .../card` (PRO, AGT, ADM), `GET /verify/{code}` (public, 30/min par IP), `GET /consents/mine`, `POST /consents/{id}/withdraw` (PRO).
- Règles : NPI vérifié par `AnipClient` (nom et date de naissance doivent correspondre : `producers/services.py:64-75`) ; doublon NPI ou téléphone → 409 avec la fiche existante ; code `BJ-AGR-2026-NNNNNN` par séquence verrouillée (`next_code`, `:21-26`) ; moins de 16 ans → tuteur, NPI du tuteur et consentement parental (`:89-92`, le NPI du tuteur n'est pas vérifié auprès de l'ANIP) ; chaque modification crée une `ProducerVersion` ; carte : code de vérification de 8 caractères sans 0/O/1/I, créé une fois (`:199-213`), le tiers qui scanne ne voit que statut et nom (`api.py:123-128`) ; retrait du consentement `donnees_personnelles` ferme le compte, désactive l'utilisateur et retire les offres ouvertes (`:153-174`) ; effacement de l'identité après `PRODUCER_RETENTION_DAYS` (365 j) (`:177-196`).
- Tests (9) : séquence de codes et statut `en_attente`, doublons 409, erreurs ANIP, mineur, périmètre/IDOR/rôles, validation-rejet-correction-versions, consentements, fermeture puis effacement (cookie de session refusé, versions supprimées), carte et vérification publique.

### `parcels` (UC-08, UC-09)
- Modèles : `Parcel` (GeoJSON Polygon, `area_ha`, `arable_ha`, `overlap_warning`, `overlap_with`), `Campaign` (une culture par parcelle et par saison : contrainte `one_crop_per_parcel_season`).
- Endpoints : `GET/POST /parcels`, `PATCH /parcels/{id}` (superficie exploitable), `GET/POST /campaigns`, `PATCH /campaigns/{id}` (stade, avec `base_version`). Rôles PRO (siennes), AGT (périmètre), ADM ; autres rôles 403 (`parcels/api.py:57-59`).
- Règles : surface calculée côté serveur (shapely + pyproj, projection UTM 31N `EPSG:32631`) et jamais saisie (`parcels/services.py:11-30`) ; chevauchement > 20 % de la plus petite des deux parcelles du même département → alerte, pas de blocage (`:12`, `:33-43`) ; polygone invalide → 400.
- Tests (2) : surface, chevauchement et campagne (1) ; conflit hors ligne et choix forcé (1).

### `knowledge` (UC-14 ; `publications` : TDR § 1 et 3.1)
- Modèles : `KnowledgeDoc`, `KnowledgeDocVersion`, `Publication`.
- Endpoints fiches : `GET/POST /knowledge` (lecture PRO, AGT, AGR, RES, ADM ; écriture AGR, ADM), `GET/PATCH /knowledge/{id}`, `POST .../review`, `POST .../publish` (AGR, ADM), `GET .../versions`. Un non-éditeur ne voit que le statut `publie` (404 sinon).
- Endpoints publications : `GET/POST /publications` (lecture tout connecté, filtrée par département ; écriture ADM, AGT, RES, FIN, AGR), `POST /publications/{id}/archive`, `GET /dashboard/financing` (ADM, RES, AUD, FIN).
- Règles : cycle brouillon → relu → publié ; la relecture doit venir d'une autre personne que l'auteur de la version (`knowledge/services.py:88-97`, code `same_author`) ; toute édition remet la fiche en brouillon et crée une version ; index BM25 (rank-bm25 + racinisation française) reconstruit à la publication (`:14-50`, `:100-108`) ; un financement exige un montant (`publications.py:28-31`).
- Tests (4) : workflow complet et assistant, garde-fou de dosage (variantes), mots génériques qui ne doivent pas remonter une fiche, publications et financements par département.
- Admin Django : `KnowledgeDocAdmin` (`knowledge/admin.py`).

### `assistant` (UC-12)
- Modèle : `AssistantLog` (question expurgée des suites de 8 chiffres ou plus, filière, rôle, statut, fiches citées, backend, score).
- Endpoint : `POST /assistant/ask` (PRO, AGT, AGR, RES, ADM).
- Règles : une question de dosage (regex `DOSAGE`/`RISK`/`STRONG`) n'a pas de réponse automatique ; notification aux AGT du département du producteur (`assistant/services.py:14-48`) ; recherche BM25 sur les seules fiches publiées avec seuil `ASSISTANT_MIN_SCORE` (1,0) ; sans fiche : « Je ne sais pas » ; citations (titre, source, version) ; contexte transmis au modèle : filière, commune, parcelle (type, surface, stade) et météo à 3 jours réelle (jamais simulée) (`:51-69`) ; en langue nationale, réponse du corpus validé sinon français + file du MTDI (`:77-111`).
- Tests (3) : backend Anthropic sur serveur local, passerelle OpenAI-compatible (la clé suffit), contexte parcelle et météo réelle ; + 3 tests dans `knowledge/tests.py` qui exercent l'assistant.

### `alerts` (UC-16 ; messagerie : TDR § 3.1 « échange avec son agent »)
- Modèles : `Alert`, `Notification`, `Outbox`, `ChatMessage`.
- Endpoints : `GET/POST /alerts`, `POST /alerts/{id}/approve`, `.../send` (AGT son département, ADM) ; `GET /notifications`, `POST /notifications/{id}/read` (tout connecté, les siennes) ; `GET /outbox` (AGT son département, ADM, destinataire masqué `01****0099`) ; `GET/POST /chat` (PRO validé), `GET /chat/threads` et `GET/POST /chat/{producer_id}` (AGT du secteur).
- Règles : gravités info, avertissement, urgent ; une alerte urgente est `en_attente_validation` et ne part qu'après approbation par un autre utilisateur que le créateur (`alerts/services.py:13-33`, `:46-48`) ; envoi à tous les producteurs validés du département (filtrés par communes et filières), in-app + SMS simulé, statistiques `sent/delivered/failed` (`:45-63`) ; le contenu des messages de la messagerie n'est pas journalisé (`:84`).
- Tests (3) : double validation et périmètre (403/404), segmentation SMS GSM-7/UCS-2, messagerie producteur ↔ agent.

### `programs` (UC-17, UC-18)
- Modèles : `Program`, `Application`, `SelectionRun`, `SelectionCandidate`, `Contest`.
- Endpoints (14) : `GET/POST /programs` (PRO, AGT, RES, ADM ; création RES, ADM), `PATCH /programs/{id}` (brouillon seulement), `POST /programs/estimate` (RES, ADM), `POST /programs/{id}/apply` (PRO), `GET /applications`, `POST /applications/{id}/decide` (AGT son département, RES, ADM), `POST /applications/{id}/contest` (PRO), `GET/POST /selection-runs` (lancer : RES, ADM ; un PRO ne voit que les sélections validées), `GET /selection-runs/{id}/candidates`, `POST .../validate` (AGT, ADM), `GET/POST .../contest|contests`, `GET /contests/mine` (PRO), `POST /contests/{id}/decide` (AGT de la ferme, ADM).
- Règles : publication exige une filière et une clôture à 14 jours au moins (`programs/services.py:19-33`) ; un programme publié ne se modifie plus (`:64-67`) ; candidature refusée si clos, pas ouvert, non publié, fiche non validée ou critères non remplis (`:77-99`) ; sélection : score min-max pondéré (confiance 0,4, distance à la route 0,3 inversée, surface 0,3 plafonnée au 99e centile) sur les fermes POC à maïs détecté, 2 000 non retenus conservés (`:16`, `:121-158`, `programs/api.py:69-72`) ; résultat = proposition, validation par un autre utilisateur que le lanceur avec motif (`:161-172`) ; contestation d'un refus : une fois, sous 15 jours (`:176-201`) ; décision de contestation motivée et notifiée (`:204-237`).
- Tests (5) : candidature et programme clos, contestation unique sous 15 jours, fenêtre close après 15 jours, proposition-validation-contestation, brouillon-publication-critères-estimation.

### `credit` (UC-19, UC-20 ; aucun modèle propre, utilise `producers.Consent`)
- Endpoints : `POST /credit/consent`, `POST /credit/consent/withdraw` (PRO), `GET /credit/consented-producers` et `GET /credit/scores/{producer_id}` (FIN ; 404 sans consentement actif, indiscernable d'un producteur inexistant : `credit/api.py:59-60`).
- Règles : grille explicable à 5 facteurs (ancienneté 0,2, superficie plafonnée 10 ha 0,2, campagnes menées à la récolte 0,25, appuis remboursés 0,25 neutre à 0,5 sans échéance échue, diversification 0,1), score sur 100, mention « aide à la décision » (art. 401), chaque consultation journalisée `credit.score_view` (`credit/services.py:13-68`).
- Tests (1) : consentement, score et audit ; + `production/test_recovery.py::test_credit_score_follows_the_repayment_of_the_producer` et `test_loan_needs_the_credit_consent...`.

### `farms` (données POC ; base de UC-22, UC-23, UC-17)
- Modèle : `FarmPOC` (200 873 fermes réelles du POC ou 200 000 synthétiques).
- Endpoints : `GET /farms/aggregates`, `GET /farms` (bbox, curseur) pour AGT (son département), ADM, RES.
- Commandes : `import_poc_farms`, `export_relief`.
- Tests : 0 propre (couverts par `audit/tests.py` : 40 fermes synthétiques, agrégats, bbox).

### `dashboard` (UC-22)
- Aucun modèle. Endpoints : `GET /dashboard` (AGT son département, ADM, RES), `GET /dashboard/sea` (AGT, ADM, RES, MTD), `GET /dashboard/sea/production`, `/workforce`, `/impact` (mêmes rôles).
- Règles : chaque indicateur porte `source` et `updated_at` ; sans donnée : `null` (jamais 0), ex. `maize_yield` toujours `null` (« non disponible », `dashboard/api.py:53-54`). Le SEA détaillé masque toute cellule de moins de 5 personnes pour tout rôle sauf ADM, avec suppression complémentaire sur la ligne (`sea_detail.py:23`, `:80-89`) ; l'impact des appuis compare à un groupe témoin du même département, filière et saison, avertissement « comparaison non causale » (`:25-27`, `:129-198`). `GET /dashboard` et `GET /dashboard/sea` ne masquent pas les petits effectifs.
- Tests (5, `test_sea_detail.py`) : production par filière/saison avec masquage, effectifs par sexe et âge avec suppression complémentaire, ligne entière masquée sous 5, impact intra-cellule non causal, fenêtre de 12 mois ; + `interop/tests.py::test_sea_indicators_scope_and_roles`.

### `exports` (UC-24)
- Aucun modèle. `POST /exports` (ADM) : 6 jeux (`producers`, `parcels`, `farms_aggregates`, `cooperatives`, `harvests`, `supports`), motif de 10 caractères au moins, CSV `;` avec BOM, journalisé `export.csv` avec motif et nombre de lignes (`exports/api.py:20-72`). Le jeu `producers` contient NPI, téléphone et date de naissance.
- Tests : dans `audit/tests.py::test_export_with_reason_and_dashboard` (motif court → 400, CSV, 403 pour AGT, ligne d'audit).

### `diagnosis` (UC-13, simulé)
- Modèle : `Diagnosis` (image = chemin relatif sous `MEDIA_ROOT`, `predicted_pathology` conservée après relecture).
- Endpoints : `GET/POST /diagnoses` (création PRO ; liste PRO les siens, AGR les transmis), `POST .../review` (AGR), `POST .../ask-agronome` (PRO propriétaire), `GET .../image` (PRO propriétaire, AGR ; `Cache-Control: private, no-store`).
- Règles : voir 4.10 (téléversement d'image). Confiance ≥ `DIAGNOSIS_THRESHOLD` (0,6) → `auto`, sinon `transmis_agronome` ; niveau de risque par pathologie (valeurs de démonstration) ; purge à 90 jours (`diagnosis/services.py:96-104`).
- Tests (5) : confiance basse → agronome + EXIF supprimé + image réservée au propriétaire et à l'agronome, confiance haute + fichiers refusés, « Pas sûr ? » avec note, refus du diagnostic d'autrui (404), purge de conservation.

### `translations` (UC-15 ; corpus : TDR § 1, 3.1, 3.4)
- Modèles : `TranslationEntry` (clés de l'interface, fon/bba/yo/dnd), `TranslationReview`, `CorpusEntry` (questions-réponses en langue nationale).
- Endpoints : `GET /translations`, `/translations/summary` (MTD, ADM), `GET/PATCH /translations/{id}` (PATCH MTD), `POST .../review` (MTD, pas l'auteur du texte), `GET /i18n/{lang}.json` (public) ; `GET/POST /corpus` (MTD, ADM ; POST MTD), `GET /corpus/stats`, `POST /corpus/{id}/answer`, `POST /corpus/{id}/validate` (MTD).
- Règles : note ≥ 4 → `valide`, ≤ 2 → `rejete` (`translations/services.py:57-60`) ; langue ouverte aux producteurs à 80 % de clés validées (`LANGUAGE_OPEN_THRESHOLD`) ; `/i18n` renvoie `{}` tant que la langue est fermée ; corpus : validation par un autre représentant que l'auteur (`corpus.py:125-126`), justesse mesurée sur les reformulations (`accuracy`, `:60-67`) ; aucun texte en langue nationale n'est fourni par le code.
- Tests (2) : relecture et ouverture à 80 % ; réponse native seulement après validation par un second locuteur.

### `market` (UC-21)
- Modèles : `Offer`, `Match`, `Payment`.
- Endpoints : `GET/POST /offers` (PRO, GES, TRA, DIS ; lecture ADM aussi), `POST /offers/{id}/contact`, `POST /offers/{id}/status` (auteur), `GET /matches/mine`, `POST /matches/{id}/accept|refuse` (auteur de l'offre), `POST /payments`, `GET /payments/{id}` (les deux parties, ADM), `POST /payments/{id}/refund` (ADM).
- Règles : numéro de l'autre partie masqué jusqu'à acceptation (`market/api.py:76-79`) ; suspension, reprise, retrait, clôture d'une annonce (`services.py:35-57`) ; plafond de paiement `PAYMENT_MAX_XOF` (500 000) ; numéro Mobile Money `^01\d{8}$` ; le vendeur est le bénéficiaire quel que soit le payeur (`:96-98`) ; paiement réussi ferme l'offre (`:137-139`) ; reçu avec numéros masqués ; `simulation: true` dans toute réponse de paiement (`api.py:96`).
- Tests (4) : contact-acceptation-paiement, échec pour un numéro finissant par 0, paiement demandé par le vendeur, suspension/reprise/retrait.

### `satellite` (UC-23, simulé ; météo : TDR)
- Aucun modèle. `GET /satellite` (tout connecté ; AGT et PRO restreints à leur département) : NDVI et humidité du sol dérivés d'un hachage SHA-256 du département et de la date de passage, un passage tous les 5 jours, source « Données de démonstration (POC), non officielles » (`satellite/api.py:11-39`). `GET /weather` : météo 7 jours via `integrations/market_data.weather`.
- Tests (2) : météo ouverte avec son étiquette, repli sur la démonstration étiquetée si le service est injoignable.

### `cooperatives` (UC-06 ; organisations : TDR § 3.1 gouvernance)
- Modèles : `Cooperative`, `MembershipRequest`, `Membership`, `Organisation`, `OrgEvent`.
- Endpoints coopératives : `GET/POST /cooperatives` (lecture AGT, ADM, GES les siennes, PRO membre du bureau ; création AGT, ADM), `GET /cooperatives/{id}`, `GET/POST /cooperatives/{id}/members`, `POST /memberships/{id}/end`, `GET /cooperatives/nearby`, `POST /cooperatives/{id}/join-request`, `GET /memberships/mine` (PRO), `GET /join-requests`, `POST /join-requests/{id}/decide`.
- Endpoints organisations : `GET/POST /organisations` (lecture AGT, ADM, RES, AUD, GES ; écriture AGT, ADM), `GET /organisations/{id}`, `POST .../cooperatives`, `POST .../events`.
- Règles : une adhésion active par coopérative et par producteur (contrainte `one_active_membership`), historique conservé (`left_at`, motif) ; un membre du bureau (président, secrétaire, trésorier) a les droits du gestionnaire sans pouvoir décider de sa propre demande (`cooperatives/api.py:185-190`) ; seul un producteur validé est ajouté ; effectifs (dont femmes) et prix convenus par organisation.
- Tests (4) : membres/périmètre/historique, demande d'adhésion décidée par le gestionnaire, bureau, union avec effectifs et événements.

### `production` (UC-10, UC-11 ; recouvrement, lots, stocks, revenu : TDR § 3.1)
- Modèles (10) : `ReferenceYield`, `Support`, `Harvest`, `Site`, `Lot`, `Claim`, `Installment`, `ClaimPayment`, `Expense`, `StockAlertSent`.
- Endpoints (20) : `GET/POST /supports` (écriture AGT, ADM), `POST /supports/{id}/confirm` et `/report` (PRO) ; `GET/POST /harvests`, `POST /harvests/{id}/check` (AGT, ADM) ; `GET/POST /claims`, `/claims/portfolio`, `/claims/{id}`, `POST /claims/{id}/pay` (débiteur), `GET /claim-payments/{id}` ; `GET/POST /expenses`, `DELETE /expenses/{id}`, `GET /revenue` ; `GET/POST /sites`, `GET /lots`, `POST /lots/collect|transform`, `POST /lots/{id}/transfer`, `GET /lots/{ref}/trace` ; `GET /stocks/outlook`.
- Règles : rendement de référence par filière (valeurs de démonstration `DEMO_YIELDS`, `production/services.py:17-18`) ; écart > 50 % → récolte signalée et AGT prévenus (`:14`, `:117-134`) ; l'agent confirme, corrige (original gardé dans `declared_kg`) ou programme une visite, motif obligatoire (`:85-114`) ; stock + vente ≤ récolte ; créance ouverte à la confirmation de réception d'un appui remboursable (`:60-74`), échéances égales tous les 30 jours (1 à 12), paiement en un clic via FakePay imputé sur les plus anciennes échéances (`recovery.py:125-209`) ; visibilité des créances : débiteur les siennes, FIN ses prêts, AGT les appuis/équipements de son département, ADM/RES/AUD jamais les prêts (`recovery.py:34-44`) ; traçabilité lot → récolte → producteur → intrants reçus avant la récolte (`lots.py:148-163`) ; stocks : jours de couverture = stock ÷ sortie moyenne sur 30 jours, niveaux rupture/critique < 7 j/bas < 15 j (`stocks.py:18-32`) ; revenu = ventes − dépenses − remboursements (`revenue.py:34-69`).
- Commandes : `check_stock_alerts`, `remind_claims`.
- Tests (19) : récolte (estimation, signalement, bornes), appui (signalement, remise-confirmation), vérification agent ; lots (1) ; recouvrement (8 : créance à la réception seulement, paiement et nouvelle tentative, visibilité, prêt avec consentement crédit, équipement du plateau, score, rappels hebdomadaires, revenu) ; stocks (6 : niveaux, seuils, transformation consommatrice, site, agrégat sans identité, alertes hebdomadaires).

### `ussd` (canaux SMS/USSD : TDR § 3.4 ; aucun UC)
- Aucun modèle. `POST /ussd/gateway` (menus : 1 Météo, 2 Prix, 3 Conseil, 4 Mes appuis, 5 Langue ; sans état serveur, chemin `4*1*1`, écrans de 182 caractères au plus, sans accents) et `POST /sms/inbound` (commandes `METEO`, `PRIX <FILIÈRE>`, aide sinon) ; ouvertes si `DEMO_MODE`, sinon clé `X-Gateway-Key` = `USSD_GATEWAY_KEY`, sinon 404 ; 120 appels/min par adresse (`ussd/api.py:19-32`).
- Tests (5) : passerelle fermée sans clé ni démo, menus/prix/météo/numéro inconnu, confirmation d'appui par USSD, langue et conseil, commandes SMS.

### `interop` (UC-24)
- Modèle : `PartnerKey` (empreinte SHA-256 de la clé, préfixe, 4 derniers caractères).
- Endpoints : `GET /interop/{xroad|sonama|fnda}/aggregates` (en-tête `X-Api-Key` ou ADM connecté ; 60/min par IP), `GET /interop/connectors`, `GET /interop/exchanges`, `POST /interop/keys/{partner}/renew|revoke` (ADM).
- Règles : agrégats par département et filière, cellules de moins de 5 producteurs masquées (`interop/services.py:13`, `:51-55`) ; une clé active par partenaire, les précédentes révoquées au renouvellement, la clé en clair n'est montrée qu'une fois (`:33-41`) ; clé de configuration `INTEROP_KEY_<PARTENAIRE>` acceptée en repli (`:28-29`) ; accès et refus journalisés avec adresse IP tronquée (`interop/api.py:46-69`).
- Tests (4) : clé requise et aucune donnée personnelle, SEA, satellite déterministe, clés/échanges/connecteurs.

### `lands` (TDR § 1 et 3.1 : aménagements, sols, climat ; aucun UC)
- Modèles : `Scheme`, `Works`, `SoilAnalysis`.
- Endpoints (9) : `GET/POST /schemes`, `PATCH /schemes/{id}`, `POST /schemes/{id}/works`, `PATCH /works/{id}` (écriture AGT dans son secteur, ADM), `GET/POST /soil-analyses` (saisie AGT, ADM), `GET /soil-analyses/summary`, `GET /land-use`, `GET /climate-risks`, `GET /climate-risks/departments`.
- Règles : exploitée ≤ exploitable ≤ disponible ; état de l'aménagement dérivé de l'état des travaux (`lands/services.py:67-96`) ; lecture des sols par seuils (pH, matière organique, phosphore, texture), jamais de dose (`:99-141`) ; risques climatiques par bilan hydrique (stress hydrique, sécheresse, inondation) sur Open-Meteo, coefficients culturaux `KC` et seuils d'inondation `FLOOD_MM` « à valider par l'INRAB » (`climate.py:14-18`, `MODEL_CARD.md` § 5).
- Tests (6) : superficies et périmètre, travaux et statut, utilisation des terres, lecture sans dose, modèle de risque, endpoints climat hors ligne.

### `farmservices` (TDR § 1 et 3.1 : matériel, mécanisation, semences, PMEA ; aucun UC)
- Modèles : `Equipment`, `MechRequest`, `SeedLot`, `SeedDistribution`, `Pmea`.
- Endpoints (12) : `GET/POST /equipment`, `PATCH|DELETE /equipment/{id}`, `GET /equipment/summary`, `GET /mechanization/providers`, `GET/POST /mechanization/requests`, `POST .../{id}/decide|complete|cancel` (propriétaires : PRO, GES), `GET/POST /seed-lots`, `POST /seed-lots/{id}/distribute` (AGT, ADM), `GET/POST /pmea`, `POST /pmea/{id}/verify` (AGT, ADM).
- Règles : tarif obligatoire pour proposer du matériel à la location ; une demande en cours par matériel ; coût réel (surface travaillée × tarif) versé en dépense du producteur ; numéro du prestataire visible après acceptation (`farmservices/api.py:97`) ; une distribution de semences crée un appui à confirmer et décrémente le lot (`services.py:168-184`) ; un PMEA non vérifié n'est vu que de son auteur et du personnel (`:217-227`).
- Tests (6) : matériel et tarif, mécanisation jusqu'à la dépense, demandes refusées/annulées, semences distribuées en appui, annuaire vérifié avant publication, carte par département seulement.

### `observatory` (TDR § 3.1 suivi-évaluation et § 3.4 réentraînement ; aucun UC)
- Modèle : `NationalStat` (source obligatoire, valeurs `None` = non disponible).
- Endpoints : `GET/POST /national-coverage` (lecture ADM, RES, AUD, AGT ; écriture ADM, RES), `POST /national-coverage/import` (lot tout ou rien, 500 lignes max), `DELETE /national-coverage/{id}` (ADM, RES), `GET /map/actors` (tout connecté), `GET /models/quality` (ADM, RES, AGR, AUD).
- Règles : taux de couverture, dépendance aux importations, variations, alertes de veille avec seuils 80 %, +20 %, −15 % (`observatory/services.py:17`, à faire valider par le MAEP) ; carte à registre de couches (`actors_map.py`) : jamais de nom ni de téléphone, entités sans position placées au centre du département, parcelles réservées à AGT/ADM, tronquées à 2 000 ; qualité des modèles mesurée sur la plateforme (diagnostic, rendement, crédit), « non disponible » sous 5 cas, indicatif sous 30 (`quality.py:20-22`), crédit mesuré seulement à partir de 30 échéances échues, trois modèles déclarés « non mesurables » (`NOT_MEASURED`).
- Commande : `export_training_set` (jeu pseudonymisé, producteurs consentants seulement, identifiant = empreinte salée avec `SECRET_KEY`, `training.py:53-54`).
- Tests (26) : couverture et veille (`tests.py`, 14), qualité/export d'entraînement (`test_quality.py`, 12).

### `markets` (TDR § 3.1 : prix, analyses, enquêtes, formations, vitrine ; aucun UC)
- Modèles (6) : `PriceObservation`, `Survey`, `SurveyResponse`, `Training`, `TrainingRegistration`, `Showcase`.
- Endpoints (15) : `GET/POST /prices` (lecture tout connecté ; saisie AGT, ADM, GES, TRA, DIS dans leur département), `GET /prices/margins` (TRA, RES, ADM), `GET /market-analysis` (AGT, RES, ADM, TRA, DIS), `GET/POST /surveys`, `POST /surveys/{id}/close`, `GET /surveys/{id}/results` (AGT, RES, ADM), `GET /public/surveys/{code}` et `POST /public/surveys/{code}/respond` (publics, sans authentification), `GET/POST /trainings`, `GET /trainings/report`, `POST|DELETE /trainings/{id}/register`, `GET /trainings/{id}/registrations`, `POST /trainings/{id}/attendance`, `GET/POST /showcase`, `POST /showcase/{id}/withdraw`.
- Règles : prix entre 1 et 20 000 FCFA/kg, pas de date future, un relevé par marché/filière/forme/produit/jour/auteur (`prices.py:18`, `:33-57`) ; sans relevé de moins de 30 jours, démonstration étiquetée `simulated` (`prices.py:129-139`) ; tendance : variation 28 j contre 28 j précédents, ±5 %, aucune projection sous 6 relevés répartis sur 14 jours, fourchette ±2 écarts-types (`analysis.py:16-21`, `:24-48`) ; offre attendue masquée sous 5 producteurs hors personnel (`:94-146`) ; enquête publique anonyme (voir 4.8) ; formation : inscription volontaire selon le public visé, places limitées, présence enregistrée à partir du jour J (`trainings.py:61-96`).
- Tests (20) : prix (9), enquêtes (6), formations/vitrine (5).

## Annexe E : sécurité, permissions et données de démonstration

### Sécurité et conformité implémentées, en détail

### Authentification : OTP, verrouillage, JWT, cookies
- OTP : 6 chiffres tirés par `secrets.randbelow(10**6)`, durée 10 min (`OTP_TTL`), seul le haché `HMAC-SHA256(SECRET_KEY, "téléphone:code")` est stocké, comparaison en temps constant (`accounts/services.py:16-22`, `:35-38`, `:66`). Un code de changement de numéro est haché avec le nouveau numéro : il ne sert pas à se connecter (`:111-113`).
- Verrouillage : `MAX_FAILURES = 5`, `LOCK_TTL = 15 min`, la demande de code est aussi refusée pendant le blocage (`:17-18`, `:25-27`, `:43-55`) ; action `auth.locked` journalisée. Compteur par compte, pas par adresse.
- Limitation de débit : `OtpThrottle` 30/min par IP (réglable `OTP_THROTTLE_RATE`) sur la demande et la vérification de code et le changement de numéro (`accounts/api.py:52-59`, `settings.py:117`).
- Non-révélation de l'existence d'un compte : `request_otp` renvoie la même réponse pour un numéro inconnu ; en revanche `requires_password` vaut `true` seulement pour un compte du personnel existant (`accounts/services.py:30-40`).
- JWT : jeton d'accès 15 min, de rafraîchissement 7 jours (`settings.py:119-123`) ; l'accès est renvoyé dans le corps, le rafraîchissement en cookie `refresh` `HttpOnly`, `SameSite=Lax`, chemin `/api/v1/auth/`, `Secure` si la requête est en HTTPS, 7 jours (`accounts/api.py:20`, `:81-82`). `POST /auth/refresh` refuse un compte désactivé ou fermé (`:93-95`, testé par `producers/tests.py::test_withdraw_personal_data_closes_then_erases`).
- Aucune rotation ni liste noire du jeton de rafraîchissement (`rest_framework_simplejwt.token_blacklist` absent de `INSTALLED_APPS`) : `logout` supprime seulement le cookie (`accounts/api.py:99-104`).
- Mots de passe du personnel : 10 caractères au moins à la création par l'administrateur (`AdminUserSerializer`, `:166`) ; les validateurs Django (`settings.py:94-97`) ne sont pas appelés par ce chemin.
- Comptes : l'administrateur crée, suspend (`is_active`), réaffecte (rôle, département, commune), chaque action journalisée (`accounts/services.py:79-95`).

### En-têtes, CORS, transport
- Django : `SECURE_CONTENT_TYPE_NOSNIFF`, `X_FRAME_OPTIONS = "DENY"`, `SESSION_COOKIE_HTTPONLY`, CORS limité à `CORS_ALLOWED_ORIGINS` avec credentials (`settings.py:105-109`). Aucun `SECURE_SSL_REDIRECT`, HSTS, `CSRF_COOKIE_SECURE` ni `SESSION_COOKIE_SECURE` dans `config/settings.py` ; `infra/nginx.conf` pose CSP, `nosniff`, `X-Frame-Options`, `Referrer-Policy` mais écoute en HTTP (port 80) et laisse HSTS en commentaire (`infra/nginx.conf:2-15`) ; `infra/` n'est pas utilisé par la démonstration (`docs/ARCHITECTURE.md`).
- CI : `ruff`, `pytest`, `bandit -ll`, `pip-audit` (`.github/workflows/ci.yml`) ; résultats non exécutés ici (non vérifié).

### Périmètres par rôle et 404 hors périmètre
- Sélecteurs de portée : `producers_for` (`producers/selectors.py:10-22`), `parcels_for`, `cooperatives_for` (`cooperatives/selectors.py:13-27`), `claims_for` (`production/recovery.py:34-44`), `schemes_for` (`lands/services.py:18-21`), `lots_for` et `lots.visible` (`production/stocks.py:35-43`, `lots.py:118-126`), `alerts_for` (`alerts/api.py:58-60`), `applications_for` (`programs/api.py:148-156`), `visible` des diagnostics (`diagnosis/selectors.py`).
- Une donnée d'un autre périmètre répond 404 (`Http404` dans `get_producer`, `_get`, etc.) ; un rôle non autorisé répond 403 ; une création hors périmètre répond 403 `out_of_scope` (`producers/services.py:85-86`, `alerts/services.py:15-16`).
- `credit/scores/{id}` répond 404 sans consentement actif (`credit/api.py:59-60`).
- Tests : `producers/tests.py::test_scope_idor_and_roles` (AGT d'un autre département → 404, AUD et AGR → 403, FIN sans consentement → liste vide, PRO sur la fiche d'autrui → 404), `alerts/tests.py` (404/403 inter-départements), `diagnosis/tests.py` (404 sur le diagnostic d'autrui), `observatory/tests.py` (périmètre de la carte), `production/test_recovery.py` (visibilité des créances).

### Consentements
- Modèle `Consent` : `type` (`donnees_personnelles`, `parental`, `credit`), `text_version`, `channel`, `created_at`, `withdrawn_at` (`producers/models.py:52-59`). Seule la version du texte est enregistrée ; le texte lui-même n'est pas stocké côté serveur.
- Inscription refusée sans `consent_accepted` (`producers/services.py:80-81`, code `consent_required`) ; consentement parental sous 16 ans ; consentement crédit créé/retiré par le producteur (`credit/services.py:21-38`).
- Retrait en un appel : `POST /consents/{id}/withdraw` ; pour `donnees_personnelles` il ferme le compte (`close_account`) ; les retraits des autres types ne déclenchent rien de plus (`producers/services.py:153-161`).
- Un jeu d'entraînement ne reprend que les producteurs au consentement `donnees_personnelles` actif (`observatory/training.py:25`). Le consentement « amélioration des modèles » évoqué dans `docs/CONFORMITE_TDR.md` n'existe pas dans le code (aucun type `Consent` correspondant).

### Journal d'audit : immuabilité, chaîne de hachage
- Immuabilité applicative : `AuditLog.save()` refuse toute mise à jour, `delete()` et les `update()`/`delete()` du QuerySet lèvent `PermissionError` (`audit/models.py:11-45`) ; `AuditLog` n'est pas enregistré dans l'admin Django (`audit/admin.py` n'enregistre que `RetentionPolicy`). Rien n'empêche une modification SQL directe : elle est détectée, pas empêchée (`audit/tests.py::test_audit_chain_detects_tampering_and_survives_purge`).
- Chaîne : chaque entrée porte `seq` (unique), `prev_hash` et `hash = SHA-256` du JSON canonique de `[prev_hash, seq, date UTC, id acteur, téléphone, rôle, action, type, id objet, détails]` (`audit/models.py:47-57`) ; `AuditChainHead` est verrouillé (`select_for_update`) à chaque écriture pour que deux entrées n'aient pas le même rang (`audit/services.py:10-31`). Pas d'ancrage externe de la dernière empreinte.
- Vérification : `verify_chain()` recalcule toute la chaîne et renvoie `{ok, count, broken_seq, checked_at}` (`:34-54`), exposée par `GET /audit-logs/verify` (AUD, ADM) et par `manage.py verify_audit_chain` (code de sortie en erreur si rupture).
- Contenu : environ 110 motifs d'action différents relevés par `grep` sur `record(` (certains construits dynamiquement) ; l'entrée garde `actor_phone` et `actor_role` ; les journaux techniques `structlog` ne gardent que action, type et id (`audit/services.py:29-30`) ; le contenu des messages de messagerie n'est pas journalisé (`alerts/services.py:84`).
- Écart connu : `actor_phone` reste dans les entrées du journal après l'effacement d'un compte (`erase_closed` ne touche pas `AuditLog`, `producers/services.py:177-196`) ; des `details` contiennent aussi des numéros (par exemple `to=to.phone` dans `lot.transfer`, `production/lots.py:97`).

### Rétention et effacement
- `purge_retention` (`audit/management/commands/purge_retention.py`) : (1) supprime les entrées d'audit plus vieilles que la politique `audit_log` (`AUDIT_RETENTION_DAYS` = 1 825 j par défaut) par `_raw_delete`, seule voie de suppression, et inscrit une entrée `audit.purge` avec le dernier `hash` purgé pour que la vérification reparte du bon maillon (`:20-27`) ; (2) purge les diagnostics (photos et lignes) de plus de `DIAGNOSIS_RETENTION_DAYS` = 90 j (`diagnosis/services.py:96-104`) ; (3) efface l'identité des comptes fermés depuis plus de `PRODUCER_RETENTION_DAYS` = 365 j (NPI, téléphone, nom remplacés, versions supprimées, parcelles conservées anonymes) (`producers/services.py:177-196`).
- Seule la ligne `audit_log` passe par `RetentionPolicy` ; les deux autres durées viennent de `settings.py:143` et `:154`.
- Aucun planificateur n'est livré : aucune mention de cron, `schedule` ou django-q2 dans `infra/`, `start.bat`, `start.sh`, `README.md` ni `.github/` ; les commandes « à planifier » (`docs/API_CONTRACT_V2.md:133`) ne le sont pas. Le `MASTER_PROMPT.md` (§ 5) prévoyait django-q2, absent de `requirements.txt` ; `ARCHITECTURE.md` consigne le choix « commandes de gestion ».
- Journal des accès : `credit.score_view` à chaque consultation de score (`credit/services.py:62-68`).

### Limitation de débit (toutes les limites du code)
| Cible | Limite | Clé | Fichier |
| --- | --- | --- | --- |
| Demande/vérification d'OTP, changement de numéro | 30/min (`OTP_THROTTLE_RATE`) | IP | `accounts/api.py:52-59` |
| Vérification d'une carte (`/verify/{code}`) | 30/min (`VERIFY_THROTTLE_RATE`) | IP | `producers/api.py:108-117` |
| Réponse à une enquête publique | 30/heure (`SURVEY_THROTTLE_RATE`) | IP | `markets/surveys_api.py:25-29` |
| Lecture d'une enquête publique | 120/heure (`SURVEY_READ_THROTTLE_RATE`) | IP | `markets/surveys_api.py:32-36` |
| USSD et SMS entrants | 120/min (codé en dur) | IP | `ussd/api.py:19-26` |
| Interopérabilité | 60/min (codé en dur) | IP | `interop/api.py:24-33` |
Aucun `CACHES` n'est configuré (`config/settings.py`) : les compteurs vivent dans le cache mémoire local de chaque processus (non vérifié en déploiement multi-processus). `POST /producers/register` (public) n'a aucune limite.

### Minimisation, pseudonymisation, masquage des petits effectifs
- Vérification d'une carte : statut et nom seulement (`producers/api.py:123-128`). Carte des acteurs : jamais de téléphone ni de nom, regroupement par département (`observatory/actors_map.py:1-9`, test `test_producers_are_never_exposed_by_a_cluster`). Boîte d'envoi : destinataire masqué (`alerts/api.py:48-49`). Marché : numéro de l'interlocuteur masqué avant acceptation, reçu avec numéros masqués (`market/api.py:76-79`, `services.py:153-157`). Journal de l'assistant sans utilisateur, téléphone ni position, question expurgée des suites de 8 chiffres ou plus (`assistant/models.py:7`, `services.py:31-33`, `:112`).
- Enquête publique anonyme : la réponse n'a ni IP, ni téléphone, ni compte ; l'appareil n'est gardé que comme SHA-256 de `code enquête + jeton aléatoire` pour refuser une seconde réponse (limite documentée dans le code) ; champ-piège `website` (`markets/surveys.py:68-91`, `surveys_api.py:55`, `:118-120`) ; test `markets/test_surveys.py` vérifie la liste exacte des champs du modèle.
- Seuil de 5 : SEA détaillé (`dashboard/sea_detail.py:23`, `:80-89`, l'ADM voit les valeurs brutes), enquêtes (`markets/surveys.py:24`, ventilation par département), interopérabilité (`interop/services.py:13`, `:51-55`, y compris pour l'ADM), offre attendue hors personnel (`markets/analysis.py:21`), qualité des modèles (`observatory/quality.py:20`, `value: None` sous 5 cas). `GET /dashboard`, `GET /dashboard/sea` et `GET /stocks/outlook` (agrégat) n'appliquent pas ce masquage.
- Pseudonymisation du jeu d'entraînement : `record_id` = SHA-256 de `SECRET_KEY:type:id` tronqué à 16 caractères, surfaces arrondies à 0,1 ha, mois au lieu de dates, image référencée par son empreinte (`observatory/training.py:1-5`, `:53-54`, `:99-104`) ; tests `test_diagnostic_training_set_is_pseudonymised`, `..._copies_no_image_by_default`, `test_yield_training_set_has_no_identity_or_exact_position`.
- Appel LLM : la question de l'utilisateur est transmise telle quelle au modèle (l'expurgation `_redact` ne s'applique qu'à la ligne de journal : `assistant/services.py:100-102` contre `:112`), avec le contexte filière, commune, parcelle et météo (`llm.py:3`). Si `OPENAI_API_KEY` ou `ANTHROPIC_API_KEY` est renseignée, ces éléments partent vers `OPENAI_BASE_URL` (par défaut un hôte privé `glm-gateway.tail577250.ts.net`, `settings.py:134`) ou `ANTHROPIC_BASE_URL` (par défaut `https://api.anthropic.com`, `:138`).

### Chiffrement
Aucun chiffrement applicatif de champ (aucune occurrence de `encrypt`, `Fernet` ou `cryptography` dans `backend/` hors `.venv`). Ce qui est protégé par hachage : codes OTP (HMAC-SHA256), clés d'API des partenaires (SHA-256 sans sel, `interop/services.py:16-17`), mots de passe (hachage Django par défaut), jeton d'appareil d'enquête (SHA-256). Les jetons JWT sont signés (algorithme par défaut de SimpleJWT, clé `SECRET_KEY`). Chiffrement au repos et en transit : dépend de l'hébergement (non vérifié).

### Téléversement d'image (diagnostic)
- `diagnosis/services.py:23-39` : lecture par Pillow, uniquement JPEG ou PNG, `img.load()` pour détecter une image corrompue, `Image.DecompressionBombError` → 400, rotation EXIF appliquée puis **réencodage** (JPEG qualité 85 en RGB, PNG) qui ne conserve que les pixels : EXIF et GPS disparaissent. Taille limitée à `DIAGNOSIS_MAX_BYTES` (5 Mo, contrôlée sur `upload.size`, `:47`). Nom de fichier tiré au hasard (`uuid4`), jamais le nom d'origine (`:53`). Stockage sous `MEDIA_ROOT/diagnoses/` ; service par `GET /diagnoses/{id}/image` réservé au propriétaire et à l'agronome, `Cache-Control: private, no-store` (`api.py:100-109`) ; `MEDIA_ROOT` n'est pas exposé par `urls.py`. Aucune détection de visage : le texte d'aide demande de ne photographier que la plante (`services.py:20`).
- Test : `diagnosis/tests.py::test_low_confidence_goes_to_agronomist_and_exif_is_stripped` (bloc GPS injecté, `getexif()` vide en sortie) et `test_high_confidence_is_auto_and_bad_files_refused`.

### Règles « décision humaine » (art. 401)
Sélection de bénéficiaires : résultat = `proposition`, validation motivée par un autre utilisateur que le lanceur (`programs/services.py:161-172`) ; contestation et décision motivée (`:204-237`) ; refus de candidature contestable (`:176-201`) ; score de crédit : mention « aide à la décision » dans chaque réponse (`credit/services.py:12`) ; alertes urgentes à double validation ; fiches de connaissance à relecture par un tiers ; traductions et corpus validés par un second représentant du MTDI.

### Documents de conformité
`docs/CONFORMITE.md`, `docs/REGISTRE_TRAITEMENTS.md`, `docs/AIPD_brouillon.md`, `docs/INCIDENTS.md`, `docs/ACTIONS_HUMAINES.md`, `docs/REENTRAINEMENT.md` existent (présence constatée, non relus pour cet inventaire).

### Commandes de gestion

| Commande | Fichier | Rôle | Planification |
| --- | --- | --- | --- |
| `seed_demo` | `accounts/management/commands/seed_demo.py` | Charge les données de démonstration, idempotent, transaction unique (section 7) | lancée par `start.bat` à chaque démarrage |
| `import_poc_farms [path] [--synthetic N]` | `farms/management/commands/import_poc_farms.py` | **Supprime toutes les `FarmPOC`** (`:56`) puis importe `data/poc/farms_analyzed.json` en flux (jamais chargé en entier), département = centre départemental le plus proche, commune vide ; à défaut de fichier, 200 000 fermes synthétiques (graine 42) | une fois (`start.bat`, première installation) |
| `export_relief` | `farms/management/commands/export_relief.py` | Agrège les fermes en colonnes de 0,05° et écrit `frontend/src/features/landing/relief.json` pour l'accueil en 3D | manuelle |
| `purge_retention` | `audit/management/commands/purge_retention.py` | Journal d'audit, photos de diagnostic, identités de comptes fermés (4.6) | à planifier : rien ne la planifie |
| `verify_audit_chain` | `audit/management/commands/verify_audit_chain.py` | Vérifie la chaîne d'empreintes, sort en erreur si rupture | à planifier (« chaque nuit » dans l'aide) : rien ne la planifie |
| `check_stock_alerts` | `production/management/commands/check_stock_alerts.py` | Prévient les détenteurs en rupture ou en stock critique, une alerte par produit et par semaine | à planifier : rien ne la planifie |
| `remind_claims` | `production/management/commands/remind_claims.py` | Rappelle les échéances à 7 jours ou en retard, une fois par semaine au plus | « chaque jour » dans l'aide : rien ne la planifie |
| `export_training_set <diagnostic|rendement> --output DIR [--with-images]` | `observatory/management/commands/export_training_set.py` | Jeu d'entraînement pseudonymisé + fichier de description, journalisé `training_set.export` | manuelle |

<!--landscape-->

### Matrice des rôles

Onze rôles (`accounts/models.py:6-9`). `core/permissions.py:3-9` ne nomme que 7 constantes ; les rôles `gestionnaire_cooperative`, `transformateur`, `distributeur` et `repr_mtdi` sont écrits en chaîne dans les modules. Légende : E = écrire/agir, L = lire, (p) = dans son périmètre ou ses propres données, — = refusé (403/404).

| Fonctionnalité | PRO | AGT | GES | TRA | DIS | FIN | AGR | MTD | RES | ADM | AUD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Connexion OTP (mot de passe en plus hors PRO) | E | E | E | E | E | E | E | E | E | E | E |
| Inscription d'un producteur (public) | E | E(p) | E | E | E | E | E | E | E | E | E |
| Fiches producteurs : lecture | L(p) | L(p) | — | — | — | L (consentants) | — | — | — | L | — |
| Valider, rejeter, corriger une fiche | — | E(p) | — | — | — | — | — | — | — | E | — |
| Parcelles et campagnes | E(p) | E(p) | — | — | — | — | — | — | — | E | — |
| Assistant | E | E | — | — | — | — | E | — | E | E | — |
| Fiches de connaissance : lecture (publiées) | L | L | — | — | — | — | L (toutes) | — | L | L (toutes) | — |
| Fiches : créer, relire, publier | — | — | — | — | — | — | E | — | — | E | — |
| Alertes et boîte d'envoi | — | E(p) | — | — | — | — | — | — | — | E | — |
| Messagerie producteur/agent | E | E(p) | — | — | — | — | — | — | — | — | — |
| Programmes : lecture / création | L / — | L / — | — | — | — | — | — | — | E | E | — |
| Candidater, contester un refus | E | — | — | — | — | — | — | — | — | — | — |
| Décider une candidature | — | E(p) | — | — | — | — | — | — | E | E | — |
| Sélection : lancer | — | — | — | — | — | — | — | — | E | E | — |
| Sélection : valider (≠ lanceur) / décider une contestation | — | E / E(p) | — | — | — | — | — | — | — | E | — |
| Sélection : lire / contester | L (validées) / E | L / E | — | — | — | — | — | — | L / E | L / E | — |
| Consentement crédit | E | — | — | — | — | — | — | — | — | — | — |
| Score de crédit, liste des consentants | — | — | — | — | — | E | — | — | — | — | — |
| Appuis : remettre / confirmer | confirmer | remettre (p) | — | — | — | — | — | — | — | remettre | — |
| Récoltes : déclarer / vérifier | E(p) / — | E(p) / E(p) | — | — | — | — | — | — | — | E / E | — |
| Coopératives (gestion) | E (bureau) | E(p) | E (les siennes) | — | — | — | — | — | — | E | — |
| Organisations de filière | — | E(p) | L | — | — | — | — | — | L | E | L |
| Diagnostic photo | E (crée) | — | — | — | — | — | E (relit) | — | — | — | — |
| Marché : offres, mise en relation, paiement | E | — | E | E | E | — | — | — | — | L, rembourser | — |
| Lots, sites, stocks (détenteur) | E | L (trace, stocks agrégés) | E | E | E | — | — | — | L (stocks agrégés) | L | — |
| Créances : payer / ouvrir / lire | payer, lire (siennes) | ouvrir plateau, lire (p) | — | payer, lire | — | ouvrir prêt, lire ses prêts | — | — | lire (hors prêts) | ouvrir plateau, lire (hors prêts) | lire (hors prêts) |
| Dépenses et revenu | E | L (p) | — | — | — | — | — | — | — | L | — |
| Aménagements : lecture / écriture | L(p) / — | L(p) / E(p) | L | L | L | L | L | L | L | L / E | L |
| Sols : saisie / lecture ; terres ; climat | lecture, climat (siennes) | E(p) | — | — | — | — | — | — | L | E | L |
| Matériel, mécanisation | E | L (p) | E | — | — | — | — | — | L | L | L |
| Semences certifiées | — | E(p) | — | — | — | — | — | — | L | E | L |
| Annuaire PMEA : lire / inscrire / vérifier | L / — / — | L / E / E | L / E / — | L / E / — | L / E / — | L | L | L | L | L / E / E | L |
| Prix : lire / saisir | L / — | L / E(p) | L / E | L / E | L / E | L | L | L | L | L / E | L |
| Écart brut/transformé | — | — | — | L | — | — | — | — | L | L | — |
| Analyses de marché | — | L(p) | — | L | L | — | — | — | L | L | — |
| Enquêtes : créer et lire les résultats | — | E(p) | — | — | — | — | — | — | E | E | — |
| Formations : s'inscrire / créer, présence | E / — | — / E(p) | E / — | E / — | E / — | — | — | — | — / rapport | — / E | — |
| Vitrine : lire / publier | L / — | L / — | L / E | L / E | L / E | L | L | L | L | L (retire) | L |
| Services, innovations, financements | L | L, E | L | L | L | L, E | L, E | L | L, E | L, E | L |
| Financements mobilisés (`/dashboard/financing`) | — | — | — | — | — | L | — | — | L | L | L |
| Tableau de bord, fermes POC | — | L(p) | — | — | — | — | — | — | L | L | — |
| SEA (global et détaillé) | — | L(p) | — | — | — | — | — | L | L | L | — |
| Couverture nationale | — | L | — | — | — | — | — | — | E | E | L |
| Carte des acteurs | L | L (+ parcelles) | L | L | L | L | L | L | L | L (+ parcelles) | L |
| Qualité des modèles | — | — | — | — | — | — | L | — | L | L | L |
| Traductions et corpus | — | — | — | — | — | — | — | E | — | L | — |
| Exports CSV | — | — | — | — | — | — | — | — | — | E | — |
| Journal d'audit | — | — | — | — | — | — | — | — | — | L | L |
| Administration des comptes | — | — | — | — | — | — | — | — | — | E | — |
| Clés et échanges d'interopérabilité | — | — | — | — | — | — | — | — | — | E | — |
| Météo et satellite | L | L(p) | L | L | L | L | L | L | L | L | L |

Lecture à nuancer : la matrice résume les `roles(...)` et contrôles des vues relus ; les conditions fines (propriétaire d'une annonce, bureau d'une coopérative, détenteur d'un lot, département de la donnée) sont dans le code des sélecteurs cités en 4.3. Les partenaires externes (X-Road, SONAMA, FNDA) accèdent à `/interop/{partner}/aggregates` par clé d'API, sans compte.

<!--portrait-->

### Données de démonstration, en détail

`seed_demo` (`accounts/management/commands/seed_demo.py`, 221 lignes) est idempotent (`get_or_create` partout) et s'exécute dans une transaction (`:77-78`). Il charge :
- Référentiels : 13 filières, 12 départements, 77 communes ; politique de rétention `audit_log` (`:79-81`).
- Comptes du personnel (`STAFF`, `:29-39`) : AGT Alibori `0197000002`, AGR `0197000003`, RES `0197000004`, ADM `0197000005`, AUD `0197000006`, FIN `0197000007`, GES `0197000008` (Alibori), MTD `0197000011` et `0197000012` (un second représentant est nécessaire pour valider). `seed_market` ajoute TRA `0197000009` et DIS `0197000010` (`market/services.py:171-172`). Mot de passe commun codé en dur (`seed_demo.py:28`) ; `is_staff` pour AGR et ADM ; l'AGR reçoit les permissions Django de l'app `knowledge` (`:87-93`).
- Producteurs : 42 (producteur de démonstration `0197000001`, NPI `1000000001`, plus 41 fiches NPI `1000000005`–`1000000045`, téléphones `01960000NN`), dont 6 `en_attente` (indices i % 7 == 3) et 36 `valide` ; chacun avec compte (code OTP seul), consentement `donnees_personnelles` v1 canal `seed`, version 1, une parcelle carrée de 0,009° de côté (environ 100 ha, ce que `docs/CONFORMITE_TDR.md` § 8 relève comme irréaliste pour un petit producteur) et une campagne `2026-pluie-1` au stade croissance. Le producteur de démonstration a aussi un consentement crédit actif (`:98-100`).
- Programmes : « Subvention intrants maïs 2026 » (clôture 2026-12-31), « Appui coton 2025 » (clos depuis 2025-12-31), « Appui soja 2026 » (2027-03-31) (`:185-194`).
- Connaissances : 86 fiches lues dans `data/knowledge/*.json` dont 42 `publie` et 44 `brouillon_non_valide` (importées en `brouillon`) ; si aucune fiche de semis du maïs publiée n'existe, des fiches de secours sans dosage marquées « a_sourcer » complètent (`:42-66`, `:196-221`).
- Gouvernance et services : la coopérative « Coopérative des producteurs de maïs de Banikoara » (gestionnaire `0197000008`, 4 membres validés d'Alibori), une union « [démo] » avec 2 événements (un prix convenu à 190 FCFA/kg, une formation), 4 publications (2 services, 1 innovation, 1 financement fictif de 250 000 000 FCFA), le site « Magasin de Kandi [démo] » (`:134-170`).
- Statistiques nationales : 8 lignes fictives « Données de démonstration (non officielles) » (riz 2023-2025, maïs 2023-2025, soja 2024-2025), jamais écrasées par le seed (`:172-183`).
- Rendements de référence : 8 filières, valeurs « demonstration » (`production/services.py:17-23`).
- Traductions : une entrée `a_traduire` au texte vide par clé de `frontend/src/i18n/fr.json` pour fon et bba (`translations/services.py:25-34`) ; nombre de clés non compté.
- Marché : 6 offres et 3 demandes « [démo] » (`market/services.py:160-195`).

Synthétique ou fictif : tous les noms et NPI (fiches ANIP générées, `integrations/anip.py:27-46`), téléphones, programmes, coopérative, organisation, publications, financement, site, statistiques nationales, offres, rendements de référence. Données non fictives mais non officielles : les 200 873 fermes du POC (`docs/DONNEES.md`, hors dépôt : `backend/data/poc/*.json` est ignoré par git) ; fiches de connaissance issues du recueil INRAB (sources citées, à relire par l'INRAB).

Non chargé par le seed (écrans vides au départ) : relevés de prix, analyses de sol, aménagements, matériel, lots de semences, PMEA, enquêtes, formations, vitrine, appuis, récoltes, créances, alertes, diagnostics, lots et dépenses (confirmé par `docs/CONFORMITE_TDR.md` § 7 pour les écrans D et E).

Fichiers locaux : `db.sqlite3` (56 Mo) et `db.demo-vierge.sqlite3` (53 Mo) existent dans `backend/` mais sont ignorés par git (`.gitignore`) ; `backend/media/diagnoses/` contient 13 images de test, aussi ignorées.

<!--landscape-->

### Dettes et limites visibles dans le code

Aucun `TODO`, `FIXME` ni `HACK` dans `backend/**/*.py`. Marqueurs `shortcut:` : 3 (ci-dessous). `NotImplementedError` : 8 occurrences, toutes dans `integrations/` (méthodes abstraites des interfaces et connecteurs réels vides).

| Élément | Chemin et ligne |
| --- | --- |
| Marqueur `shortcut:` : météo et prix de démonstration à remplacer par un service réel | `integrations/market_data.py:3` |
| Marqueur `shortcut:` : département des fermes POC = centre départemental le plus proche, commune vide | `apps/farms/management/commands/import_poc_farms.py:76-78` |
| Marqueur `shortcut:` : filtre de liste JSON fait en Python (SQLite), à passer en SQL avec PostgreSQL | `apps/knowledge/publications.py:39-40` |
| Même limite SQLite pour les PMEA, les organisations et la qualité des modèles (agrégation en Python) | `apps/farmservices/models.py:90`, `apps/farmservices/services.py:226-227`, `apps/observatory/actors_map.py:81-82`, `apps/observatory/quality.py:5` |
| `RealAnipClient.lookup` : `NotImplementedError` | `integrations/anip.py:55-59` |
| `XRoadClient.call` : `NotImplementedError`, classe jamais utilisée | `integrations/xroad.py:5-7` |
| `FedaPayProvider`, `KKiaPayProvider`, `CinetPayProvider` : classes vides (`pass`) | `integrations/payment.py:38-47` |
| Canaux SMS et vocal simulés, sans variable de bascule | `integrations/notifications.py:38-57` |
| Diagnostic simulé, `get_backend()` renvoie toujours `SimulatedDiagnosis`, pathologies et niveaux de risque « à valider par l'INRAB » | `integrations/diagnosis.py:5-33`, `:51-52` |
| Satellite : NDVI et humidité tirés d'un hachage | `apps/satellite/api.py:15-22`, `:35-38` |
| Prix de démonstration codés en dur (6 marchés, 6 filières) | `integrations/market_data.py:102-107` |
| Rendements de référence de démonstration | `apps/production/services.py:16-23` |
| Seuils non validés par un tiers : coefficients culturaux et inondation | `apps/lands/climate.py:14-18` ; seuils pH, matière organique, phosphore : `apps/lands/services.py:99-141` ; stocks 7/15 jours : `apps/production/stocks.py:18-23` ; tendance de prix : `apps/markets/analysis.py:16-21` ; veille nationale : `apps/observatory/services.py:17` |
| Poids de la grille de sélection (0,4/0,3/0,3) et du score de crédit non calibrés sur des données réelles | `apps/programs/api.py:69-72`, `apps/credit/services.py:49-56`, `docs/MODEL_CARD.md` |
| Mode démonstration : avec `DEMO_MODE=true`, `GET /demo/otp-inbox` renvoie à n'importe qui les derniers codes OTP de n'importe quel numéro, ce qui permet de se connecter en tant que producteur ; `.env.example` et `infra/docker-compose.yml:25` mettent `DEMO_MODE` à vrai par défaut | `apps/accounts/api.py:113-124`, `backend/.env.example` |
| Avec `DEMO_MODE=true`, la passerelle USSD/SMS est ouverte sans clé et identifie l'appelant par son seul numéro (confirmation d'appuis possible pour n'importe quel numéro) | `apps/ussd/api.py:29-32` |
| `SECRET_KEY` a une valeur de repli de développement ; elle sert à signer les JWT, hacher les OTP et pseudonymiser les jeux d'entraînement | `config/settings.py:14`, `apps/observatory/training.py:53-54` |
| `ALLOWED_HOSTS` par défaut contient `testserver` | `config/settings.py:15` |
| Adresse par défaut de la passerelle LLM : hôte privé codé en dur | `config/settings.py:134` |
| Question transmise au LLM sans expurgation (seul le journal est expurgé) | `apps/assistant/services.py:100-102`, `:112` |
| Pas de rotation ni de révocation du jeton de rafraîchissement | `apps/accounts/api.py:99-104`, `config/settings.py:119-123` |
| `POST /producers/register` sans limite de débit ; NPI du tuteur non vérifié auprès de l'ANIP | `apps/producers/api.py:69-74`, `apps/producers/services.py:89-92` |
| `requires_password` distingue les comptes du personnel des numéros inconnus et des producteurs | `apps/accounts/services.py:30-40` |
| Aucun planificateur pour `purge_retention`, `verify_audit_chain`, `check_stock_alerts`, `remind_claims` | voir 4.6 |
| `AuditLog.actor_phone` et numéros dans `details` conservés après effacement du compte | `apps/audit/models.py:30`, `apps/producers/services.py:177-196`, `apps/production/lots.py:97` |
| Export CSV sans neutralisation des préfixes de formule (`=`, `+`, `-`, `@`) ; le jeu `producers` contient NPI, téléphone, naissance | `apps/exports/api.py:26-31`, `:62-70` |
| `GET /dashboard` et `GET /dashboard/sea` sans masquage des petits effectifs (le détaillé en a) | `apps/dashboard/api.py:25-56`, `:76-122` |
| `import_poc_farms` supprime d'abord toutes les fermes | `apps/farms/management/commands/import_poc_farms.py:56` |
| Compteurs de limitation de débit en mémoire locale (aucun `CACHES`) | `config/settings.py` (absence) |
| `numpy` importé directement mais non déclaré dans `requirements.txt` (présent seulement dans le verrou, transitif de shapely) | `apps/programs/services.py:4`, `requirements.txt` |
| Rôles : 7 constantes sur 11, les autres en chaîne | `apps/core/permissions.py:3-9` |
| `GET /api/schema/` et `/api/docs/` (Swagger) sont publics : drf-spectacular sert ses vues avec `SERVE_PERMISSIONS = [AllowAny]` par défaut et `SPECTACULAR_SETTINGS` ne le change pas | `config/urls.py:219-220`, `config/settings.py:124`, `.venv/Lib/site-packages/drf_spectacular/settings.py:59` |
| Routes absentes de `API_CONTRACT.md` et `API_CONTRACT_V2.md` (aucune occurrence) : `chat*`, `publications*`, `dashboard/financing`, `corpus*`, `weather` | `docs/API_CONTRACT*.md` (`grep`) |
| `API_CONTRACT.md` limite encore `POST /exports` à 3 jeux ; le code en accepte 6 | `docs/API_CONTRACT.md` contre `apps/exports/api.py:21-22` |
| `docs/openapi.json` : régénéré ou non depuis les dernières routes : non vérifié | `docs/openapi.json` |
| `tests/e2e_backend.py` n'est pas dans la collecte `pytest` | `backend/pytest.ini` |
| Aucune exécution de la suite dans cet inventaire : état vert/rouge des 147 tests non vérifié | n/a |

<!--portrait-->

### Éléments du backend sans rattachement au cahier des charges ni au TDR

Méthode : un élément est « rattaché » s'il figure dans `docs/MASTER_PROMPT.md` (UC, sections 5-14) ou dans `docs/CONFORMITE_TDR.md`. Le MASTER_PROMPT ne contient aucune occurrence de « USSD », « messagerie », « organisation », « enquête », « PMEA », « mécanisation », « semences », « stocks » ou « vitrine » ; ces fonctions sont rattachées au TDR par `CONFORMITE_TDR.md` (sections 1 à 4).

Rattachés au TDR (via `CONFORMITE_TDR.md`) mais absents du MASTER_PROMPT : `lands` (aménagements, sols, climat), `farmservices` (matériel, mécanisation, semences, PMEA), `observatory` (couverture nationale, carte, qualité des modèles, export d'entraînement), `markets` (prix, analyses, enquêtes, formations, vitrine), `ussd`, recouvrement/revenu/lots/stocks de `production`, organisations de `cooperatives`, `Publication` et `/dashboard/financing`, messagerie `ChatMessage`, corpus de langues nationales, météo réelle.

Ni dans le MASTER_PROMPT ni dans le TDR (ajouts de l'équipe, constatés dans le code) :
1. Changement de numéro du producteur par code SMS (`accounts/services.py:104-143`, `/auth/phone-change/*`) : `API_CONTRACT_V2.md` le rattache à « UC-01 », mais le texte d'UC-01 du MASTER_PROMPT ne le prévoit pas.
2. Passerelle LLM au format OpenAI en première position de la chaîne (`integrations/llm.py:68-85`, `:89-90`) : le MASTER_PROMPT § 5 ne cite qu'Ollama, Anthropic et l'extractif.
3. Contestation d'un refus de candidature, une fois sous 15 jours (`programs/services.py:176-201`, `/applications/{id}/contest`) : UC-18 ne prévoit pas ce circuit (il s'appuie sur l'art. 401).
4. Programmes en brouillon avec critères d'éligibilité, estimation de bénéficiaires et calendrier de comité (`programs/models.py:15-23`, `/programs/estimate`) : issus des maquettes selon le commentaire `programs/services.py:19`, au-delà d'UC-17/UC-18.
5. Gestion des clés partenaires en base, connecteurs et journal des échanges (`interop/*`, `/interop/keys/*`, `/interop/connectors`, `/interop/exchanges`) : UC-24 ne mentionne que « Exports CSV et API ».
6. Chaîne d'empreintes du journal et `GET /audit-logs/verify` : UC-03 demande un journal non modifiable ; la chaîne et sa vérification vont plus loin.
7. Fermeture de compte au retrait du consentement et effacement différé de l'identité (`producers/services.py:153-196`) : dérive des art. 389-390 et 433 du MASTER_PROMPT, mais le circuit n'est pas décrit.
8. Traductions de l'interface par clé (`TranslationEntry`, `/translations*`, `/i18n/{lang}.json`) : `CONFORMITE_TDR.md` § 8 les juge « distinctes de l'exigence du TDR » (assistant en langue nationale, servi par le corpus).
9. `export_relief` et `farms` pour le « relief » de la page d'accueil 3D : `CONFORMITE_TDR.md` § 8 classe la page d'accueil en 3D parmi les ajouts absents du TDR.

À ne pas compter comme ajouts : la carte producteur avec code de vérification (`/verify/{code}`, UC-07), `Counter` (séquence de la section 7 du MASTER), `AssistantLog` et `RetentionPolicy` (section 7 du MASTER) sont dans le MASTER_PROMPT. Pour la qualité mesurée des modèles (`observatory/quality.py`), le module se rattache au « cadre de réentraînement » du TDR § 3.4 selon `CONFORMITE_TDR.md`, mais les seuils chiffrés (5 cas, 30 cas, 30 échéances échues) sont des choix de l'équipe, présentés comme « propositions pour le comité » dans `docs/CONFORMITE_TDR.md`.

Écarts de pile avec le MASTER_PROMPT § 5 : tâches de fond par commandes de gestion au lieu de django-q2 (non installé) ; scikit-learn non installé (grille de score transparente) ; `numpy` utilisé sans être déclaré ; PostgreSQL prévu mais le défaut de `settings.py:87` est SQLite (psycopg est dans `requirements.txt`).

## Annexe F : documents, incidents et actions humaines

<!--landscape-->

### Inventaire des documents

État comparé au code et aux autres documents au 22/10/2026 09:43. « Création → dernière » donne la date du premier et du dernier commit qui touche le fichier. **À jour** : cohérent avec le code connu. **Partiel** : vrai pour une partie. **Périmé** : contredit par le code ou les documents plus récents.

### Racine

| Fichier | Objet | Création → dernière | État |
| --- | --- | --- | --- |
| `README.md` | Démarrage en 3 commandes, organisation, tests | 16/10 `7a6050d` → 19/10 `3c0d19a` | Partiel : le démarrage (`start.bat`, `reset`) est exact ; renvoie vers `RAPPORT_FINAL.md` (périmé) ; ne mentionne ni la refonte ni `/accueil-3d` |
| `RAPPORT_FINAL.md` | Bilan : réel, simulé, reste, écarts, vérification | 16/10 `62bc398` → 19/10 `064565b` (4 commits) | **Périmé** : « analyses prédictives non faites », « rien n'est poussé » (R13), chiffres de test 38/57/112 (le dernier consigné est 146/151), ignore les lots A à E, la refonte et l'accueil |
| `PROJECT_MAP.md` | Carte des modules backend et frontend | 16/10 `62bc398` → 21/10 `3a440d0` (12 commits) | Partiel : backend à jour jusqu'au lot D ; frontend décrit le kit « Bénin Vert » et ignore `skin.css`, `features/home`, `public/brand`, la landing déplacée |
| `PRODUCT.md` | Produit, utilisateurs, fonctions attendues du TDR, principes (format Impeccable) | 19/10 `a8ceb6f` (fichier daté 18/10 16:18), jamais modifié ensuite | Partiel : « Logo : `public/icon.svg` » (supprimé le 22/10) ; « la landing montre une simulation du téléphone » (n'est plus la page `/`) |
| `DESIGN.md` | Système visuel | 19/10 `a8ceb6f` → 21/10 `9755df1` (3 commits) | Partiel : l'en-tête YAML et la partie landing décrivent « Bénin Vert » ; la section « Argile et verre » et Sunny Farm sont à jour au 21/10 15:08 mais citent encore le dégradé vert-sarcelle supprimé ; ne couvre ni le minimalisme ni la `HomePage` |
| `start.bat`, `start.sh` | Lancement : outils, ports, attente de l'API, `reset` | 16/10 `1e94ffd` → 19/10 `a6c5c0f` | À jour |
| `.github/workflows/ci.yml` | CI GitHub Actions (ruff, pytest, etc.) | 16/10 `1e94ffd` | Jamais exécuté ; `origin` est un GitLab |
| `infra/` (Dockerfiles, `docker-compose.yml`, `nginx.conf`) | Déploiement conteneurisé | 16/10 | Non testé (README, ACTIONS_HUMAINES) |

### `docs/`

| Fichier | Objet | Création → dernière | État |
| --- | --- | --- | --- |
| `MASTER_PROMPT.md` | Demande initiale (38 ko) | 16/10 `a030597` | Référence figée |
| `DECISIONS.md` | Journal des décisions, 79 lignes | 16/10 `a030597` → 21/10 `3a440d0` (33 commits) | Partiel : à jour jusqu'au 20/10 (lot D) ; les décisions du 21 et 22/10 sont dans `REFONTE_FRONTEND.md` ; n'a jamais consigné three.js (R5) ni la passerelle LLM (C2) |
| `CONFORMITE_TDR.md` | Exigence par exigence : 66 lignes, 48 faites, § 8 « ajouts sans lien avec le TDR » | 20/10 `b8cc0b4` → 21/10 `76eb91c` (5 commits) | À jour pour le code des lots A à E ; le § 8 reste vrai (Collecte et Offres encore routées) ; ne voit pas le 21-22/10 |
| `CONFORMITE.md` | Loi 2017-20, article par article | 16/10 `1e94ffd` → 19/10 `e57450f` | Partiel : art. 391 ignore Open-Meteo et la passerelle LLM ; art. 433 à compléter pour les créances et enquêtes |
| `ACTIONS_HUMAINES.md` | 12 actions, avertissement MMS, notes | 16/10 `1e94ffd` → 22/10 `1706422` (6 commits) | À jour sauf n° 12 (la météo est réelle depuis le 20/10 mais l'action demande encore de la remplacer) |
| `INCIDENTS.md` | Registre d'incidents de sécurité (art. 427) et modèles de notification | 16/10 `1e94ffd` | À jour comme **modèle** : « aucun incident enregistré » ; ne contient aucun incident de développement (section 5) |
| `MOCKS.md` | Simulations et NPI de démonstration | 16/10 `1e94ffd` → 20/10 `9b8ab3c` | Partiel : la phrase d'ouverture (« aucun appel à un service externe ») est contredite par sa propre section météo |
| `DONNEES.md` | Provenance du POC et de la base de connaissances | 16/10 `1e94ffd` | À jour (provenance toujours « à documenter par l'équipe ») |
| `ARCHITECTURE.md` | Style, modules backend | 16/10 `1e94ffd` → 19/10 `3c0d19a` | **Périmé** : aucun des modules `cooperatives`, `lands`, `farmservices`, `observatory`, `markets`, `ussd` |
| `API.md` | Pointeur vers le contrat et `openapi.json` | 16/10 `1e94ffd` | **Périmé** : affirme que `openapi.json` « décrit le code livré » |
| `API_CONTRACT.md` | Contrat v1 | 16/10 `a030597` | Figé, supplanté par la v2 |
| `API_CONTRACT_V2.md` | Contrat v2 (36 ko) | 16/10 `99b8926` → 21/10 `3a440d0` (19 commits) | À jour pour tous les lots (dernier commit de la v2 le 21/10 09:06 ; les commits du 21 au 22/10 ne la touchent pas) |
| `openapi.json` | OpenAPI 3 généré | 16/10 `7a6050d` → `83a91d9` | **Périmé** : six jours d'API non reflétés |
| `DEMO.md` | Script de démonstration, 12 comptes, 38 étapes | 16/10 `1e94ffd` → 21/10 `3a440d0` (13 commits) | À jour : rejoué le 21/10 16:32 (`RAPPORT_PARCOURS.md`) après la refonte et le minimalisme ; non rejoué après la `HomePage` du 22/10 |
| `MODEL_CARD.md` | Grilles de score, règles, § 5 climat, § 6 qualité, § 7 analyses | 16/10 `1e94ffd` → 21/10 `3a440d0` (7 commits) | À jour, sauf les poids par défaut de la sélection (R10) |
| `REENTRAINEMENT.md` | Cadre de réentraînement des modèles | 20/10 `fa41932` | À jour ; seuils « proposés » |
| `AIPD_brouillon.md` | Analyse d'impact (crédit, sélection, assistant) | 16/10 `1e94ffd` | **Périmé** : ne couvre ni créances et prêts, ni export d'entraînement, ni enquêtes, ni météo, ni localisation des parcelles |
| `REGISTRE_TRAITEMENTS.md` | Registre des traitements (art. 435) | 16/10 `1e94ffd` | **Périmé** : aucun des traitements ajoutés les 19 et 20/10 |
| `LANGUES_A_VALIDER.md` | Statut des langues | 16/10 `7a6050d` → `83a91d9` | Partiel : décrit `fr.json` unique alors que `i18n/fr/*.json` existe ; l'état (aucune traduction) reste vrai |
| `PLAN_MVP.md` | Lots 1 à 7 et avancement | 19/10 `ed193e8` → `3c0d19a` | Historique : état au 19/10 (« fait ») ; ne couvre ni les lots A à E ni la refonte |
| `REFONTE_FRONTEND.md` | Journal de reprise de la refonte, D1 à D18 et journal jusqu'au 22/10 | 21/10 `5405c5f` → 22/10 `9cbb2f6` (15 commits) | À jour (fait foi pour les décisions de design) ; l'item « reste possible : landing en clair » est caduc |
| `AUDIT_UX.md` | Audit du 21/10 (14/20) et critique Impeccable (28/40) | 21/10 `c38e673` | Instantané : la plupart des constats sont corrigés ; P2-8 (photo) et la photo de démonstration restent ouverts |
| `RAPPORT_PARCOURS.md` | Déroulé de `DEMO.md`, 15 défauts | 21/10 `6125c05` → `3b69466` | À jour ; liste ce qui n'a pas été exécuté |
| `demo/RELEVES_PARCOURS.md` | Relevés des parcours du 19/10 | 19/10 `9043726` | Partiel : libellés d'avant la refonte |
| `demo/photo-feuille-*.jpg` | Photos de démonstration du diagnostic | 19/10 `9043726` | À corriger : filigrane iStock sur `photo-feuille-douteuse.jpg` |
| `uml/cas_utilisation.mmd`, `uml/classes.mmd` | Diagrammes Mermaid | 16/10 `1e94ffd` | **Périmés** (jamais modifiés, avant coopératives, terres, créances, etc.) |
| `scripts/inspect_poc.py` | Inspection en flux du fichier POC | 16/10 `1e94ffd` | À jour (outil) |

### Design et références

| Dossier | Objet | Date | État |
| --- | --- | --- | --- |
| `maquettes/` | Références de design : `web/` (11 rôles), `mobile/`, `landing/`, hub, `sources/`, `assets/` (photos libres), `archives/v1` et `v2` | Travail du 18-19/10, versionné le 19/10 | Référence ; `archives/` et `assets/` ≈ 70 Mo à sortir (l.36) |
| `inspiration/` | 6 images de référence | 16/10 `64f4816` | Informatif |
| `.impeccable/` | Configuration du skill de design, `critique/` (instantané du 21/10), `surfaces/` (2 fiches dont les cibles ont disparu), `review/` (ignoré par Git, ≈ 100 Mo) | 19/10, 21/10 | Partiel |

<!--portrait-->

### Incidents et problèmes rencontrés

Le registre `INCIDENTS.md` (sécurité, art. 427) est vide et ne contient que la procédure et les modèles. Les problèmes ci-dessous viennent de `DECISIONS.md`, des messages de commit, de `RAPPORT_FINAL.md`, `PLAN_MVP.md`, `REFONTE_FRONTEND.md` et `AUDIT_UX.md`.

| Date | Problème | Source | Réponse | Statut |
| --- | --- | --- | --- | --- |
| 16/10 13:30 | Protection Windows « Dossiers contrôlés » : Python ne peut pas écrire dans `Documents` (base, migrations) | l.6 ; `ACTIONS_HUMAINES.md` | Projet déplacé dans `Projets\agri-digit-benin` ; aucun réglage de sécurité touché | Contourné ; chemin différent du MASTER_PROMPT |
| 16/10 13:28 | Démon Docker arrêté ; Python 3.15 par défaut trop récent | l.7, l.8 | SQLite par défaut ; `py -3.11` | Contourné ; PostgreSQL jamais exécuté (R4) |
| 16/10 13:45 | Mémoire du poste (3,5 Go, mémoire virtuelle quasi saturée) : V8 « Zone Allocation failed » ; l'Explorateur Windows occupait plus de 3 Go ; `vite build` échoué à 14:05 faute de mémoire, réussi à 16:00 en 10 s | l.13 ; `RAPPORT_FINAL.md` | `node --no-opt`, Vitest en un processus, fermer l'Explorateur et les navigateurs | Contrainte permanente |
| 16/10 | `json.load` du fichier POC de 77 Mo : `MemoryError` ; fichier réel 77,5 Mo au lieu des 17,8 Mo annoncés | l.19 ; `DONNEES.md` | Import en flux | Résolu ; localisation approximative |
| 16/10 | Playwright et Chromium impossibles à installer (mémoire) | l.18 ; `RAPPORT_FINAL.md` | Spécifications écrites, jamais exécutées | **Non résolu** |
| 16/10 14:48 | Agents interrompus : code backend (coopératives, récoltes, appuis, diagnostic, marché, traductions) sans migrations ni routes ; `interop` et `satellite` vides ; ≈ 400 Mo libres | l.22 | Reprise en série puis trois agents frontend sans commande node | Résolu (`83a91d9`) |
| 16/10 | Vérification de types : une seule exécution possible à la fois | l.22 | `tsc` lancé par un seul acteur, à la fin | Contrainte |
| 19/10 (avant 11:29) | Deux sessions en parallèle ont saturé le poste : lot 5 arrêté, typecheck du lot 1 interrompu | `PLAN_MVP.md` | « Une session à la fois » (`5f162f5`) | Levé de fait le 20/10 (R3) |
| 19/10 | Trois groupes de pages écrits sans leurs textes (session interrompue) : clés brutes à l'écran, invisibles du typage | l.33 | Test `i18n/keys.test.ts` | Résolu, limite sur les clés dynamiques |
| 19/10 | Marché : le vendeur qui demandait le paiement était enregistré payeur (l'argent aurait suivi le mauvais sens) ; rôles vendeur/acheteur lus sur le compte et non sur l'annonce | `f6039e5`, `caec3d1`, `b9a7948` | Corrigés avec tests | Résolu |
| 19/10 | IndexedDB absent fait tomber la coque ; Chrome Android refuse `new Notification` (« Illegal constructor ») ; utilitaire Tailwind `list-item` écrase `.list-item` du kit ; mutations suspendues hors ligne (la saisie n'était jamais gardée) ; « Continuer » devenait « submit » et envoyait la fiche (vu 2 fois sur 3) | `11f6b72`, `8574372`, `2983d02` (l.40), `9abe77b`, `5093f07` | Corrigés (le dernier sans test : jsdom ne reproduit pas la course) | Résolu |
| 19/10 | La clé de date de la prévision prenait la veille au Bénin (fuseau) | l.49 | Date locale partout | Résolu ; les valeurs de démonstration changent d'un jour |
| 19/10 15:23 | Ports 8000 ou 5173 occupés ; base de démonstration polluée par les essais d'intégration (8 diagnostics, 3 récoltes, 4 appuis, 4 paiements, un « Programme test intégration ») | `a6c5c0f` ; `RAPPORT_FINAL.md` | Contrôle des ports, attente de l'API, `start.bat reset` | Résolu |
| 20/10 19:16 | Conflits de fusion des lots E et D sur les fichiers partagés (menus, routes, documents, `Layout.tsx`, `App.tsx`) ; test de rendu 3D > 5 s | `8c5fe91`, `3a440d0`, l.83 | Résolus « en gardant les deux côtés » ; délai du test 30 s | Résolu |
| 20/10 19:37 | `settings.py` : fins de ligne mixtes, le diff montrait 163 lignes ajoutées et 163 supprimées | `4b36a5f` | CRLF restauré (le diff ne montre plus que 4 lignes) | Résolu ; règle durable : fichiers existants en CRLF, modifier avec l'outil d'édition |
| 20/10 | La limite d'âge de 35 ans plantait le 29 février | l.72 | Corrigé au passage | Résolu |
| 21/10 | `skin.css` (chargé après) écrase `kit.css` et `mobile.css` : `.split` ne se replie plus (10 pages débordent à 375 px), `.btn-icon` et « Écouter » perdent leur `padding: 0` | `AUDIT_UX.md` P1-1 ; `c38e673` | Repli remis ; règle de cascade notée dans `REFONTE_FRONTEND.md` et `DESIGN.md` | Résolu |
| 21/10 | `tsc` qui plante (mémoire) ; scripts Python en heredoc déformés avec des accents ; fichiers en CRLF | `REFONTE_FRONTEND.md` § 5 | `NODE_OPTIONS=--max-old-space-size=1400` ; écrire les scripts dans un fichier ; ne pas réécrire un fichier entier par script | Contrainte |
| 21/10 | 15 défauts relevés en rejouant `DEMO.md` (bouton d'ajout de membre inutilisable, recherche de l'assistant qui cite la fiche Striga pour la chenille, codes bruts, journal illisible…) | `RAPPORT_PARCOURS.md` | 14 corrigés, 1 « pas un défaut » | Résolu |
| 22/10 | Logo reçu en 474 × 152 px ; fond blanc visible, puis pastille, puis variante sombre : quatre versions en 36 minutes | `REFONTE_FRONTEND.md` ; `ACTIONS_HUMAINES.md` | PNG sans fond fourni par l'utilisateur | **Ouvert** : fichier vectoriel à fournir |
| 16-22/10 | Photo de démonstration avec filigrane iStock ; Lighthouse, `bandit`, `pip-audit`, `npm audit` sans trace d'exécution ; essais sur téléphone réel jamais faits (`RAPPORT_PARCOURS.md`) | `ACTIONS_HUMAINES.md`, `AUDIT_UX.md` | Aucune | **Ouverts** |
| 16-22/10 | Traçabilité du dépôt : deux identités d'auteur (11 + 111 commits), trailers `Co-Authored-By` mêlant Opus 5.5 et Sonnet 5.5, commit `d999f00` de 171 fichiers et 16 691 lignes, commit `64f4816` sans corps de message, 38 commits non poussés | `git log` | Aucune | Observation |

## Annexe G : inventaire détaillé du frontend

### Arrivée, menu et onglets de chaque rôle

<!--landscape-->

La route `/` ne s'affiche que pour une personne connectée via `Home()` (`App.tsx:28-35`) : le producteur voit `ProducerHome` (`features/producers/ProducerHome.tsx`), l'agent ATDA `AgentHome` (`features/producers/AgentHome.tsx`) ; tout autre rôle est redirigé vers la première entrée de son menu.

| Rôle (libellé `roles.*`) | Page d'arrivée | Entrées de menu (`NAV`) | Rubriques | Onglets du bas < 640 px (`TABS`) |
| --- | --- | --- | --- | --- |
| `producteur` (Producteur) | `ProducerHome` | 27 | Mon exploitation, Conseil, Vendre et recevoir, Mes droits, Marchés et formation | Accueil, Conseil (`/assistant`), Photo (`/diagnostic`), Marché, Parcelles |
| `agent_atda` (Agent ATDA) | `AgentHome` | 32 | Terrain, Programmes, Filières, Suivi, Marchés et formation | Accueil, Producteurs, Inscrire (`/inscription`), Remises (`/appuis`), Alertes |
| `agronome_inrab` (Agronome INRAB) | `/fiches` | 4 | sans rubrique | aucun (tiroir) |
| `responsable_programme` | `/programmes` | 25 | sans titre, Suivi, Marchés et formation | aucun |
| `admin_maep` (Administrateur MAEP) | `/tableau-de-bord` | 37 | Pilotage, Registre et terrain, Communication, Gouvernance, Marchés et formation | aucun |
| `auditeur_copil` | `/journal` | 13 | sans rubrique | aucun |
| `agent_financier` | `/credit` | 3 | sans rubrique | aucun |
| `gestionnaire_cooperative` | `/cooperatives` | 13 | sans rubrique | aucun |
| `transformateur` | `/marche` | 12 | sans rubrique | aucun |
| `distributeur` | `/marche` | 11 | sans rubrique | aucun |
| `repr_mtdi` (MTDI, langues) | `/langues` | 3 | sans rubrique | aucun |

### Pages protégées par un contrôle de rôle

| Route | Composant | Dossier (`frontend/src/features/`) | Rôles autorisés (garde `Guard`) | Ce que la page permet |
| --- | --- | --- | --- | --- |
| `/parcelles` | ParcelsPage | `parcels/ParcelsPage` | Producteur | Liste des parcelles ; dessin du champ sur carte Leaflet (polygone) ou tracé GPS en marchant (`?tracer=`, précision exigée 20 m), détail (`?id=`) ; surface recalculée par le serveur, alerte de chevauchement ; création mise en file hors ligne. |
| `/campagnes` | CampaignsPage | `campaigns/CampaignsPage` | Producteur, Agent ATDA | Campagnes (culture × parcelle × saison) : créer, faire avancer le stade (semis, croissance, floraison, récolte), déclarer la récolte ; durées de cycle indicatives (`campaigns/cycle.ts`) ; création et changement de stade mis en file hors ligne. |
| `/assistant` | AssistantPage | `assistant/AssistantPage` | tous (11) | Poser une question (saisie, dictée `SpeechRecognition` en `fr-FR`), filière et langue au choix (fr, fon, bariba, yoruba, dendi), réponses citant les fiches INRAB/ATDA, renvoi à un agent, lecture à voix haute, historique gardé sur le téléphone (30 conversations). |
| `/messages` | NotificationsPage | `alerts/NotificationsPage` | tous (11) | Messages et alertes reçus (lecture à voix haute) ; producteur : onglet « Mon agent ATDA » (messagerie) ; agent : messages des producteurs. |
| `/consentements` | ConsentsPage | `consents/ConsentsPage` | Producteur | Consentements du producteur : retrait en un clic (loi 2017-20), consentement au partage du profil de crédit, demande de copie des données. |
| `/programmes` | ProgramsPage | `programs/ProgramsPages` | tous (11) | Producteur : consulter les programmes d'appui, candidater, contester un refus (une fois, 15 jours). Autres rôles : lecture ; seul le responsable de programme peut créer ou modifier un programme (brouillon, critères) et estimer le nombre de fermes éligibles. |
| `/producteurs` | ProducersListPage | `producers/ProducersPages` | Agent ATDA, Admin MAEP | Registre du périmètre : liste filtrée par statut, ouverture d'une fiche. |
| `/producteurs/:id` | ProducerDetailPage | `producers/ProducersPages` | Agent ATDA, Admin MAEP | Fiche producteur : valider, rejeter avec motif, corriger, historique des versions. |
| `/alertes` | AlertsPage | `alerts/AlertsPages` | Agent ATDA, Admin MAEP | Écrire une alerte (catégorie, gravité, département, communes, filières), aperçu SMS avec encodage et segments, seconde validation des alertes urgentes, envoi ; brouillon gardé sur l'appareil. |
| `/boite-envoi` | OutboxPage | `alerts/AlertsPages` | Agent ATDA, Admin MAEP | Boîte d'envoi simulée (SMS et vocal avec statut de livraison) et simulateur de « téléphone simple » (USSD `*000#`, SMS). |
| `/candidatures` | ApplicationsPage | `programs/ProgramsPages` | Agent ATDA, Admin MAEP, Resp. programme | Dossiers de candidature : vérifier les conditions du programme et décider avec un motif ; badge « Contestée ». |
| `/selection` | SelectionPage | `selection/SelectionPage` | Agent ATDA, Admin MAEP, Resp. programme | Sélection des bénéficiaires : lancer un calcul pondéré, valider (autre personne que le lanceur, motif, case d'échantillon), contestations (15 jours). |
| `/fiches` | KnowledgePage | `knowledge/KnowledgePage` | Agronome, Admin MAEP | Fiches techniques : brouillon, relecture par une autre personne, publication, versions ; seules les fiches publiées alimentent l'assistant. |
| `/comptes` | AccountsPage | `admin/AdminPages` | Admin MAEP | Comptes et rôles : créer, modifier, suspendre (jamais supprimer). |
| `/exports` | ExportsPage | `admin/AdminPages` | Admin MAEP | Exports CSV avec motif obligatoire (au moins 10 caractères), tracés au journal d'audit. |
| `/journal` | AuditPage | `audit/AuditPage` | Auditeur, Admin MAEP | Journal d'audit en lecture seule, vérification de la chaîne d'empreintes, actions écrites en français, export CSV du tableau. |
| `/tableau-de-bord` | DashboardPage | `dashboard/DashboardPage` | Agent ATDA, Resp. programme, Admin MAEP | Indicateurs nationaux du registre par département et filière ; chaque chiffre avec source et date, « non disponible » plutôt que 0 ; tableau des fermes par commune/département. |
| `/credit` | CreditPage | `credit/CreditPage` | Agent financier | Score de crédit indicatif et ses facteurs pour les producteurs qui ont consenti ; consultation journalisée. |
| `/profil/:section?` | ProfilePage | `producers/ProfilePage` | Producteur | Profil : informations, langue et lecture, changement de numéro (code SMS), données gardées sur le téléphone, file d'envoi, aide et agent (sections `numero`, `langue`, `donnees`, `envoi`, `aide` en présentation mobile). |
| `/ma-carte` | CardPage | `card/CardPages` | Producteur | Carte du producteur : code de vérification à 8 caractères, lien public de vérification, partage (Web Share ou copie du lien), impression (`window.print`). |
| `/producteurs/:id/carte` | CardPage | `card/CardPages` | Agent ATDA, Admin MAEP | Carte d'un producteur validé, vue par l'agent. |
| `/cooperatives` | CooperativesPage | `cooperatives/CooperativesPages` | Agent ATDA, Admin MAEP, Gestionnaire coop. | Coopératives : liste, effectifs, membres et historique des adhésions, ajout d'un producteur par son code, fin d'adhésion avec motif. |
| `/cooperatives/:id` | CooperativeDetailPage | `cooperatives/CooperativesPages` | Agent ATDA, Admin MAEP, Gestionnaire coop., Producteur | Détail d'une coopérative : membres, demandes d'adhésion (accepter/refuser) ; « Gérer la coopérative » pour un membre du bureau. |
| `/mes-cooperatives` | MyCooperativesPage | `cooperatives/CooperativesPages` | Producteur | Coopératives du producteur ; demande d'adhésion avec message. |
| `/appuis` | SupportsPage | `supports/SupportsPage` | Producteur, Agent ATDA, Admin MAEP | Producteur : confirmer la réception ou signaler « il en manque une partie » ; agent/admin : enregistrer une remise (mise en file hors ligne, option « à rembourser »). |
| `/recoltes-signalees` | FlaggedHarvestsPage | `harvests/HarvestPages` | Agent ATDA, Admin MAEP | Récoltes dont la quantité s'écarte de plus de 50 % de l'estimation : vérifier (confirmée, quantité corrigée avec motif, visite). |
| `/marche` | MarketPage | `market/MarketPage` | Producteur, Transformateur, Distributeur, Gestionnaire coop., Admin MAEP | Annonces d'offres et de demandes, mise en relation, suspendre/reprendre/marquer vendue/retirer, paiement FakePay en un clic, reçu (lecture, partage), prix du jour à la publication. |
| `/diagnostic` | DiagnosesPage | `diagnoses/DiagnosesPage` | Producteur, Agronome | Producteur : photo de plante (JPEG/PNG, 5 Mo), résultat simulé avec niveau de risque, « Pas sûr ? » vers l'agronome ; agronome : file « Diagnostics à revoir » et relecture. |
| `/satellite` | SatellitePage | `satellite/SatellitePage` | Producteur, Resp. programme, MTDI, Agent ATDA, Admin MAEP | Tableau NDVI et humidité (démonstration, daté) par commune ou département ; filtre de département pour les rôles nationaux. |
| `/langues` | TranslationsPage | `translations/TranslationsPage` | MTDI, Admin MAEP | Validation des langues par le MTDI : proposer un texte, noter par un second locuteur, seuil d'ouverture à 80 %, corpus de l'assistant (questions en attente, réponses). |
| `/suivi-evaluation` | SeaPage | `dashboard/SeaPage` | Resp. programme, MTDI, Agent ATDA, Admin MAEP | Indicateurs de suivi-évaluation par question de suivi ; production par filière et saison, effectifs par sexe et âge (cases < 5 masquées), impact des appuis. |
| `/contestations` | ContestsPage | `contests/ContestsPage` | Producteur, Agent ATDA, Admin MAEP | Producteur : contester sa non-sélection ; agent/admin : instruire les contestations (15 jours). |
| `/meteo-prix` | WeatherPricesPage | `weather/WeatherPricesPage` | Producteur, Agent ATDA | Prévision à 7 jours (Open-Meteo, repli simulé signalé) et prix par marché avec courbe (repli « démonstration » signalé). |
| `/previsions` | ForecastsPage | `forecasts/ForecastsPage` | Resp. programme, Admin MAEP | Prévisions de rendement et risques par commune calculées dans le navigateur (simulées, étiquetées). |
| `/interoperabilite` | InteropPage | `interop/InteropPage` | Admin MAEP | Connecteurs X-Road, SONAMA, FNDA : échanges, agrégats pseudonymisés, clés (créer, renouveler, révoquer). |
| `/collecte` | CollectionPage | `supply/CollectionPage` | Transformateur, Distributeur, Gestionnaire coop. | Circuit de collecte (points, engagements, tournée, pesées) : données de démonstration écrites dans `supply/demo.ts`, aucune API. |
| `/offres` | OffersPage | `supply/OffersPage` | Distributeur, Transformateur | Stocks, ruptures et prix des magasins de Bohicon et Abomey : données de démonstration écrites dans `supply/demo.ts`, aucune API. |
| `/tracabilite` | TracePage | `trace/TracePage` | Producteur, Gestionnaire coop., Transformateur, Distributeur, Agent ATDA, Admin MAEP | Lots : mise en lot d'une récolte, livraison, transformation, remontée par code de lot jusqu'au producteur, à la parcelle et aux intrants. |
| `/organisations` | OrganisationsPage | `governance/GovernancePages` | Agent ATDA, Admin MAEP, Resp. programme, Auditeur, Gestionnaire coop. | Organisations de filière (union, fédération, interprofession, OIA, OPA) : coopératives membres, réunions, prix convenus, formations. |
| `/remboursements` | RepaymentsPage | `recovery/RecoveryPages` | Producteur, Transformateur | Échéancier des appuis, prêts et équipements à rembourser ; « Payer » règle la prochaine échéance (FakePay). |
| `/recouvrement` | RecoveryPage | `recovery/RecoveryPages` | Agent financier, Agent ATDA, Admin MAEP, Resp. programme, Auditeur | Reste dû, retards, taux de recouvrement par département, équipement du plateau ; l'agent financier ouvre un prêt. |
| `/revenu` | RevenuePage | `revenue/RevenuePage` | Producteur | Ventes, dépenses saisies et remboursements : revenu net. |
| `/amenagements` | SchemesPage | `lands/SchemesPage` | Producteur, Agent ATDA, Admin MAEP, Resp. programme, Auditeur | Aménagements (bas-fonds, périmètres irrigués, plateaux) : superficies disponible/exploitable/exploitée, état, travaux. |
| `/sols` | LandsPage | `lands/LandsPage` | Producteur, Agent ATDA, Admin MAEP, Resp. programme, Auditeur | Utilisation des terres et analyses de sol (pH, matière organique, phosphore) lues sans dose. |
| `/risques-climatiques` | ClimatePage | `lands/ClimatePage` | Producteur, Agent ATDA, Admin MAEP, Resp. programme, Auditeur | Stress hydrique, sécheresse, inondation par parcelle (producteur) ou par département (personnel). |
| `/materiels` | EquipmentPage | `farmservices/EquipmentPage` | Producteur, Gestionnaire coop., Agent ATDA, Admin MAEP, Resp. programme, Auditeur | Matériel déclaré, proposé à la location (producteur, coopérative) ; inventaire pour le personnel. |
| `/mecanisation` | MechanizationPage | `farmservices/MechanizationPage` | Producteur, Gestionnaire coop. | Trouver un prestataire (labour, semis, récolte, transport), demander une prestation, accepter/refuser/terminer les demandes reçues. |
| `/semences` | SeedsPage | `farmservices/SeedsPage` | Agent ATDA, Admin MAEP, Resp. programme, Auditeur | Lots de semences certifiées (variété, certificat, stock) et remise aux producteurs sous forme d'appui. |
| `/pmea` | PmeaPage | `farmservices/PmeaPage` | tous (11) | Annuaire des petites et moyennes entreprises agricoles ; inscription et vérification par l'agent. |
| `/couverture` | CoveragePage | `observatory/CoveragePage` | Admin MAEP, Resp. programme, Auditeur, Agent ATDA | Couverture de la consommation nationale : production, consommation, importations saisies avec source obligatoire, import JSON, veille. |
| `/carte-acteurs` | ActorsMapPage | `observatory/ActorsMapPage` | tous (11) | Carte Leaflet à couches (sites, aménagements, organisations, coopératives, PMEA, matériel ; parcelles pour le personnel). |
| `/qualite-modeles` | ModelQualityPage | `observatory/ModelQualityPage` | Admin MAEP, Resp. programme, Agronome, Auditeur | Qualité mesurée des modèles (diagnostic, rendement, score de crédit) ; « non disponible » sous 5 cas. |
| `/prix` | PricesPage | `markets/PricesPage` | Agent ATDA, Resp. programme, Admin MAEP, Gestionnaire coop., Transformateur, Distributeur | Relevés de prix brut/transformé, écart, saisie d'un relevé (borne de 20 000 FCFA/kg côté formulaire). |
| `/analyses-marches` | AnalysisPage | `markets/AnalysisPage` | Agent ATDA, Resp. programme, Admin MAEP, Transformateur, Distributeur | Tendance des prix et offre attendue (aucune projection sous 6 relevés ; offre masquée sous 5 producteurs). |
| `/stocks` | StocksPage | `stocks/StocksPage` | Producteur, Gestionnaire coop., Transformateur, Distributeur, Agent ATDA, Resp. programme, Admin MAEP | Stocks de lots, sorties des 30 derniers jours, jours de couverture, ruptures. |
| `/enquetes` | SurveysPage | `markets/SurveysPage` | Agent ATDA, Resp. programme, Admin MAEP | Enquêtes de satisfaction : créer (10 questions au plus), copier le lien public, lire les résultats agrégés. |
| `/formations` | TrainingsPage | `markets/TrainingsPage` | Producteur, Gestionnaire coop., Transformateur, Distributeur, Agent ATDA, Resp. programme, Admin MAEP | Formations : programmer, s'inscrire, marquer la présence, rapport par département. |
| `/vitrine` | ShowcasePage | `markets/ShowcasePage` | Producteur, Gestionnaire coop., Transformateur, Distributeur, Agent ATDA, Resp. programme, Admin MAEP | Vitrine des produits : publier ou retirer un produit, lecture par tous les acteurs connectés. |
| `/services` | ServicesPage | `governance/GovernancePages` | tous (11) | Services des partenaires, innovations et financements mobilisés ; total publié. |

### Pages publiques

| Route | Composant (dossier) | Ce que la page permet |
| --- | --- | --- |
| `/` (visiteur) | `HomePage` (`features/home/`) | Page d'accueil publique (§ 5). Sous 640 px et au premier lancement, redirige vers `/bienvenue` (`App.tsx:116`). |
| `/` (connecté) | `Home()` : `ProducerHome`, `AgentHome` ou redirection | Voir § 2.1. |
| `/accueil-3d` (visiteur seulement) | `LandingPage` (`features/landing/`) | Ancienne landing en 3D, conservée telle quelle (§ 5). Connecté, le chemin tombe sur la page 404. Aucun lien dans l'interface ne mène à cette route (recherche sur `accueil-3d` : seul `App.tsx`, un commentaire de `HomePage.tsx` et `e2e/landing-overlap.spec.ts`). |
| `/bienvenue` | `FirstLaunchPage` (`features/onboarding/`) | Premier lancement : choix de la langue (haut-parleur par langue, pastille « à valider »), 3 écrans d'introduction, autorisations réelles demandées une par une (position, caméra, micro, notifications). Mémorisé dans `localStorage` (`adb-first-launch`). |
| `/connexion` | `LoginPage` (`features/auth/`) | Téléphone puis code à 6 chiffres (renvoi après 45 s, blocage annoncé après 5 essais) ; mot de passe en plus pour le personnel ; le SMS simulé s'affiche dans l'encadré « Simulation » via `GET /demo/otp-inbox` (`auth/api.ts`). Redirige si déjà connecté. |
| `/inscription` | `RegisterPage` (`features/producers/`) | Inscription en 5 étapes (NPI vérifié par l'ANIP simulée, identité, lieu, consentement présenté à part, récapitulatif) ; consentement parental pour un NPI de mineur ; mise en file hors ligne (`postOrQueue`). C'est aussi l'onglet « Inscrire » de l'agent. |
| `/verification/:code?` | `VerifyPage` (`features/card/CardPages.tsx`) | Vérification publique d'une carte producteur : statut et nom seulement ; code inconnu refusé. |
| `/enquete/:code` | `SurveyPublicPage` (`features/markets/`) | Réponse anonyme à une enquête de satisfaction ; « vous avez déjà répondu » au rechargement ; champ piège masqué. |
| `/plan-du-site` | `SiteMapPage` (`features/legal/`) | Liste les pages ouvertes à tous (9 liens) ; ne liste pas les pages des rôles. |
| `/mentions-legales`, `/confidentialite`, `/conditions-utilisation`, `/accessibilite`, `/contact` | `LegalPage` (`features/legal/LegalPage.tsx`, constante `LEGAL_DOCS`) | Textes juridiques et d'assistance en onglets, avec table des matières ; les mentions « à compléter par le MAEP », « à désigner », « à décider avec le CoPil » sont surlignées (`<mark class="todo">`). |
| `*` | `NotFoundPage` (`features/legal/StatusPages.tsx`) | Page 404 avec liens utiles. Le 403 des gardes et les plantages d'écran (`ErrorBoundary`, remis à zéro à chaque route) passent par `ErrorPage`. |

### Fonctions transverses

### Hors ligne : file d'envoi et conflits

Implémenté (`frontend/src/features/outbox/offlineQueue.ts`, `ConflictsPanel.tsx`, `frontend/src/app/Layout.tsx`) :

- Base **IndexedDB** `agri-digit-offline` par Dexie, table `pending` (`++id, created_at`). `sendOrQueue` / `postOrQueue` envoient la saisie ; sans réseau (ou erreur `status 0`), elle est gardée localement et la fonction renvoie `'queued'`.
- **Six écritures seulement** passent par cette file : création de parcelle (`parcels/api.ts:13`), création de campagne (`:24`), changement de stade d'une campagne en PATCH avec `base_version` (`:34`), inscription d'un producteur (`producers/api.ts:8`), modification d'une fiche producteur en PATCH avec `base_version` (`:35`), remise d'un appui (`supports/SupportsPage.tsx:23`). Les autres écritures ne sont pas mises en file (elles échouent avec l'erreur réseau ; non vérifié écriture par écriture).
- Rejeu au retour du réseau (`Layout.tsx:132`, événement `online`), dans l'ordre de création ; un refus métier ou un conflit **garde la saisie** avec son motif, jamais de perte silencieuse ; bouton « Envoyer maintenant » et « Abandonner » (`OfflineBar`, `Layout.tsx:128-154`).
- **Conflits de version (UC-25)** : un `409 conflict` du serveur renvoie l'objet courant et sa version ; `ConflictsPanel` affiche côte à côte « ma saisie » et « version du serveur » avec les champs qui diffèrent ; « Garder la version du serveur » demande une confirmation ; « Envoyer la mienne » renvoie `force: true` avec `base_version` (choix journalisé côté serveur, selon `docs/DEMO.md` étape 17). Visible dans les deux coques.
- Indicateurs : bandeau `OfflineBar` (hors ligne, N saisies en attente, rejetées), bouton `SyncButton` dans l'en-tête (caché quand tout est envoyé), sections « Données » et « File d'envoi » du profil mobile (`ProfilePage.tsx`, `MobileQueue`). TanStack Query est réglé `networkMode: 'always'` pour que la file reçoive les mutations (`shared/api/queryClient.ts`).
- Limites vérifiées : **aucune lecture hors ligne** (pas de cache de l'API ni de persistance des requêtes : recherche de `persist` sans résultat ; le service worker ne met en cache que les ressources statiques, `vite.config.ts:31-33`) ; les tuiles de carte viennent d'OpenStreetMap en ligne (`parcels/ParcelsPage.tsx:27`). Écrit dans `docs/PLAN_MVP.md` : « secteur entier disponible hors ligne », photo du producteur, position du domicile, preuve de remise (photo, signature) non faits. `docs/RAPPORT_PARCOURS.md` : le déroulé hors ligne et le rejeu de conflits n'ont pas été exécutés dans le navigateur. Tests : seuls `RegisterPage.test.tsx` et `SupportsPage.test.tsx` mentionnent la mise en attente hors ligne ; le dossier `features/outbox/` lui-même n'a aucun test.

### PWA

- `vite-plugin-pwa` (`frontend/vite.config.ts`) : `registerType: 'autoUpdate'`, `injectRegister: null`, manifeste `Agri-Digit Bénin` / `Agri-Digit`, `display: standalone`, `lang: fr`, `start_url: /`.
- L'enregistrement du service worker est manuel et **seulement en build de production** (`src/main.tsx:29-33`, `import.meta.env.PROD`). Workbox est en `mode: 'development'` (non minifié), noté `shortcut:` pour économiser la mémoire du poste (`vite.config.ts:15`). `navigateFallbackDenylist: [/^\/api/]`, limite de 4 Mo par fichier.
- **Écarts vus à la lecture** (pas de build lancé) : le manifeste ne déclare qu'`icon.svg` (`vite.config.ts:17` et `:28`), or `frontend/public/icon.svg` a été supprimé par le commit `1706422` (22 octobre) ; les icônes PNG 192 et 512 présentes dans `public/brand/` ne sont pas référencées par le manifeste ; ses couleurs (`theme_color #0E2F1C`, `background_color #F3F7EE`) sont celles du kit « Bénin Vert » du 19 octobre, alors que `index.html:10` dit `theme-color #014D38`. L'installabilité réelle n'est donc pas vérifiée.
- Notifications du système : `SystemNotifier` (`Layout.tsx:89-100`, producteur seulement) interroge `/notifications` toutes les 5 minutes, y compris en arrière-plan, et affiche une notification par le service worker (`showSystemNotification`, qui ne lève jamais : Chrome Android refuse `new Notification`) quand la permission est accordée et que l'onglet est masqué. Il n'y a **pas de Web Push** (aucun `pushManager`).

### Mode « terrain » de l'agent ATDA

Il n'existe pas de bascule « mode terrain » : c'est le rôle `agent_atda` sous 640 px (commit `a2421dd` « Mode agent terrain : onglets du bas, inscription et remise d'appui gardées hors ligne »).

- Onglets du bas : Accueil, Producteurs, Inscrire, Remises, Alertes (`Layout.tsx:63-66`).
- `AgentHome` (`features/producers/AgentHome.tsx`) : file de travail du jour en 5 files comptées (fiches en attente avec retard au-delà de 5 jours `LATE_DAYS`, alertes urgentes à valider par une autre personne, appuis remis à confirmer, récoltes signalées, contestations ouvertes) et action principale « Enregistrer une remise » ; compte des saisies en conflit.
- Inscription d'un producteur et remise d'appui **gardées sur le téléphone** hors ligne (`features/producers/RegisterPage.tsx`, `features/supports/SupportsPage.tsx`), message « Fiche gardée sur ce téléphone » (`i18n/fr/terrain.json`).
- Alertes : brouillon gardé dans `localStorage` (`agent-alert-draft`), aperçu SMS avec encodage GSM-7 ou UCS-2 et nombre de segments (`alerts/AlertsPages.tsx:14-28`).
- Simulateur de « téléphone simple » dans la boîte d'envoi (§ 3.8).

### Mobile (coque, onglets du bas)

- Seuil unique de 640 px : `useIsMobile()` (`shared/ui/kit.tsx:18-26`) et 24 règles `@media (max-width: 640px)` ; `shared/ui/mobile.css` (85 lignes) et le bloc mobile de `skin.css`. Mêmes routes que le web, pas une seconde application (`docs/PLAN_MVP.md`).
- Barre d'onglets du bas **flottante en verre**, 5 entrées au plus, pastille de l'onglet actif (`TabBar` dans `kit.tsx:30`, décision D9) ; seuls le producteur et l'agent en ont (§ 2.1) ; les autres rôles gardent le tiroir.
- Composants qui changent de forme sous 640 px : `Table` (chaque ligne devient une fiche), `Modal` (feuille du bas), `PageHeader` (bouton retour vers le dernier lien du fil d'Ariane), états vides/erreur/chargement, `ProducerHome` (`MobileHome`), `ParcelsPage` (`MobileParcels`), `ProfilePage` (`MobileProfile` : menu et 5 sections `numero`, `langue`, `donnees`, `envoi`, `aide`), `FirstLaunchPage`.
- Autres seuils : 1100 px (`.split` sur une colonne), 1024 px (tiroir de navigation), 900, 860, 760, 560 px selon les pages (`grep` des `@media`).
- Tests : `src/app/MobileShell.test.tsx` (7 tests : onglets du producteur et de l'agent, rôles sans onglets, retour, `SuccessState`, notification du système, seuil de 640 px).
- Non vérifié : rendu sur téléphone réel (le texte `legal.accessibility` le dit aussi).

### Accessibilité

| Point | État dans le code | Fichiers |
| --- | --- | --- |
| Lien d'évitement et repères | « Aller au contenu » dans les deux coques et dans la page d'accueil ; `<main id="main" tabIndex={-1}>` | `Layout.tsx:336-339`, `:333` ; `features/home/HomePage.tsx:53` |
| Changement de page | À chaque changement de route : retour en haut, `document.title` = titre du `h1` + « · Agri-Digit Bénin », focus sur `main` (anneau retiré : `main:focus { outline: none }`) | `Layout.tsx:316-334`, `skin.css:386` |
| Focus visible | Anneau 2 px + halo 6 px (orange) sur fond clair, 3 px sur fond sombre et barre latérale (blanc) ; 3 px sur la landing et le pied de page | `kit.css:129-130`, `skin.css:122`, `landing.css:28`, `site-footer.css:6` |
| Cibles de 44 px | `minHeight.touch = 44px` dans Tailwind (`min-h-touch`), 27 règles `min-height: 44px`, boutons icône 44 px ; **pastilles, petits boutons et onglets à 44 px seulement sous 640 px ou au pointeur tactile** (`@media (max-width: 640px), (pointer: coarse)`), 36 à 42 px au bureau (par choix noté dans `skin.css:388`) | `tailwind.config.ts`, `skin.css:161, 245, 250, 389-391` |
| `lang` | `<html lang="fr">` à l'origine ; `document.documentElement.lang` suit la langue choisie à chaque `languageChanged` (le P3-3 de l'audit est corrigé) ; `lang` posé sur un texte proposé en langue nationale | `index.html:2`, `src/i18n/index.ts:72-77`, `translations/TranslationsPage.tsx:152` |
| Lecteur d'écran | 35 `aria-live`, 30 `role="status"` ou `role="alert"`, texte `sr-only` (30 usages dans 20 fichiers), tiroir Radix (focus piégé, Échap, retour du focus) et `aria-hidden` posé sur `#root` pendant son ouverture, `aria-current="step"` dans les étapes, annonce « écran n sur 5 » au premier lancement, descriptions de page lues par les lecteurs d'écran seulement (`skin.css:412`) | `Layout.tsx:381-386`, `FirstLaunchPage.tsx:32`, `skin.css:412` |
| Formulaires | `Field` (libellé visible, aide, erreur liée par `aria-describedby`), `aria-invalid`, focus sur le premier champ en erreur (`trigger(..., { shouldFocus: true })`), focus sur le titre à chaque étape de l'inscription et du premier lancement, `OtpInput` avec `autoComplete="one-time-code"` sur la première case et collage du code entier ; React Hook Form + Zod | `shared/ui/index.tsx:64`, `RegisterPage.tsx:98-101`, `kit.tsx:85-109` |
| **Lecture vocale** | `speak()` (Web Speech `speechSynthesis`) ; `ListenButton` dans `PageHeader` (propriété `listen`, 12 pages) ; 15 fichiers utilisent `speak`, `ListenButton` ou `ListenGhost` ; bouton absent si le navigateur n'a pas de synthèse ; **voix figée à `fr-FR`** même pour un nom en fon (`u.lang = 'fr-FR'`) ; sous 640 px le libellé « Écouter » est masqué visuellement (disque à icône) | `shared/ui/index.tsx:200-214`, `mobile.css:53`, `producers/producerKit.tsx:23-28` |
| **Dictée** | Assistant seulement : `SpeechRecognition` / `webkitSpeechRecognition`, **`fr-FR` figé**, résultat unique (`interimResults = false`), bouton micro absent si l'API manque, message d'erreur | `assistant/AssistantPage.tsx:15-16, 83-92, 163` |
| Mouvement réduit | Règle globale qui coupe transitions et animations ; la page d'accueil ne déclenche ni l'apparition au défilement ni les animations ; la landing 3D a un bouton « calme » mémorisé (`agri-calm`) ; `prefers-reduced-transparency` retire le verre | `src/index.css:18-20`, `home/HomePage.tsx:25-37`, `landing/useCalm.ts`, `skin.css:52, 128` |
| Contraste | 101 paires, 0 échec (recalcul Python, § 1) ; pas de `prefers-contrast` ni `forced-colors` (0 occurrence) | `scripts/contrast.mjs` |
| Couleur seule | Règle posée : états et pastels portent toujours un libellé et une icône ; décision D5/D18 | `docs/REFONTE_FRONTEND.md` |
| Contrôle automatisé | `e2e/p2.spec.ts` vérifie rôles, libellés, `alt`, identifiants en double et absence de clé brute sur 3 jeux d'écrans (public, producteur, agent) ; **jamais exécuté** ; `@axe-core/playwright` absent | `e2e/p2.spec.ts:199-271` |
| Reconnu comme non fait | Pas d'audit externe, aucun test avec lecteur d'écran ni téléphone réel ; cartes interactives (tracé, carte des acteurs) non conçues pour le clavier | `legal.accessibility` dans `i18n/fr/vitrine.json:93-122`, affiché sur `/accessibilite` |

### Thèmes clair et sombre

- Source unique : `frontend/src/shared/ui/tokens.ts` (objets `light` et `dark`) → `frontend/tailwind.config.ts` (plugin `addBase` qui écrit les variables `--c-*` en canaux RGB pour `:root`, `[data-theme='light']`, `[data-theme='dark']` et `@media (prefers-color-scheme: dark)` sur `:root:not([data-theme='light'])`) → `kit.css` et `skin.css`. **Il n'existe pas de `theme.css`.**
- `shared/theme/useTheme.ts` : **clair par défaut** ; le mode système n'est plus suivi (décision D1) ; seul un choix explicite (`localStorage` `agri-theme`) passe en sombre ; `document.documentElement.dataset.theme` est posé au chargement du module, donc la règle `prefers-color-scheme` du Tailwind ne joue qu'avant le JavaScript. Tous les composants abonnés basculent ensemble (`useSyncExternalStore`).
- Bascules : case « Mode sombre » du menu du compte (`Layout.tsx:294`), `ThemeToggle` dans la coque publique, la page d'accueil et le pied de page (`shared/ui/index.tsx:51-59`). Test : `shared/theme/useTheme.test.ts` (2 tests).
- Le sombre est un « verre sombre » vert profond (`bg #071F18`, `surface #0F3A2C`, `brand #3DDC97`) ; `skin.css:34-45` redéfinit verre, ombres et halos. La landing 3D est **sombre seulement** (`landing.css:2`, `color-scheme: dark`).

### Langues

- 5 langues sélectionnables : `LangButton` (`app/LangButton.tsx`) est **un seul bouton** qui affiche le code de la langue (FR) et passe à la suivante à chaque clic (fr → fon → bba → yo → dnd) en affichant un toast « (à valider) » ; présent dans l'en-tête connecté, le tiroir, la coque publique, la page d'accueil et le pied de page. Le premier lancement et la section « langue » du profil mobile proposent un vrai choix (boutons radio) ; l’assistant a un `<select>` de langue de réponse (`assistant/AssistantPage.tsx:139`).
- État réel : seul le français contient des textes (§ 1). Le français sert de repli (`fallbackLng: 'fr'`). La langue d'un compte (`user.language`) est appliquée à la connexion (`auth/AuthContext.tsx`). Le choix est mémorisé (`adb-lang`).
- Dictionnaires validés : `loadRemoteDictionary` lit `/api/v1/i18n/<langue>.json` ; l'écran `/langues` (MTDI, administrateur) propose, note et valide les textes (seuil d'ouverture 80 % écrit en dur `OPEN_THRESHOLD_PCT`, `translations/TranslationsPage.tsx:14`), plus le « corpus de l'assistant » (`translations/Corpus.tsx`).
- Formats : dates, heures et nombres sont formatés en `fr-FR` quelle que soit la langue (`fmtDate`, `fmtDateTime`, `fmtNum` dans `shared/ui/index.tsx:236-240`).
- L'assistant envoie la langue choisie au serveur (`language`), qui répond en français avec la mention « pas encore validée » s'il n'a pas de réponse validée (`docs/DEMO.md` étape 32, `docs/CONFORMITE_TDR.md` § 4).

### Saisie USSD et SMS côté application

- Il n'existe **aucun écran de saisie USSD ou SMS pour les producteurs** : les canaux sont côté serveur (`ussd/gateway`, `sms/inbound`) et simulés.
- Côté application : `PhoneSimulator` (`features/ussd/PhoneSimulator.tsx`), intégré à la page `/boite-envoi` (agent, administrateur) : un téléphone à écran LCD pour composer `*000#` (code d'exemple, constante `CODE`) et un fil de SMS (`PRIX MAIS`, `METEO`) ; numéro de départ `0197000001` écrit en dur ; si la passerelle est fermée (hors mode démonstration), l'erreur 404 affiche « passerelle fermée » (`ussd.closed`). Étiqueté « Simulation ». Test : `ussd/PhoneSimulator.test.tsx` (2 tests).
- Le code de connexion arrive par un SMS simulé affiché dans l'encadré « Simulation » de `/connexion` (`useOtpInbox`, `GET /demo/otp-inbox`, rafraîchi toutes les 3 s).
- La boîte d'envoi (`alerts/AlertsPages.tsx`) liste les SMS et messages vocaux simulés avec leur statut de livraison.

### Autres mécanismes communs

- **Session** : jeton d'accès gardé en mémoire, rafraîchissement par cookie (`shared/api/client.ts`, `auth/AuthContext.tsx`), simple drapeau `agri-session` dans `localStorage` pour éviter un appel inutile ; garde de route `Guard` (403 avec message), `ErrorBoundary` par route.
- **Honnêteté des données** : bandeau « Prototype » sur toutes les pages (`ProtoBand`, `Layout.tsx:107-115`) ; pastilles « Simulation » ou « Démonstration » (`Badge tone="sim"|"demo"`, 48 usages) ; « non disponible » plutôt que 0 ; cases masquées sous 5.
- **Kit de composants** (`shared/ui/index.tsx` 417 lignes, `kit.tsx` 321) : `Button` (6 variantes), `Field`, `Input`, `Select`, `Textarea`, `Checkbox`, `Radio`, `Switch`, `PhoneInput`, `OtpInput`, `Steps`, `Tabs`, `Chips`, `Card`, `Stat`, `Hero`, `QuickTiles`, `Timeline`, `Badge`, `Alert`, `Notice`, `Skeleton`, `EmptyState`, `ErrorState`, `QueryState`, `SuccessState`, `Modal` / `Sheet` / `Dialog`, `Toaster`, `Avatar`, `Emblem`, `Logo`, `Icon`, `PageHeader`, `Table` (recherche, tri, sélection groupée, pagination de 10, export CSV, fiches sous 640 px). Tests : `shared/ui/kit.test.tsx` (7).
- **Recherche de page** dans l'en-tête : propose et ouvre les entrées du menu du rôle ; la touche « / » y place le curseur (`SearchBox`, `Layout.tsx:184-207`). Barre latérale repliable, état gardé (`adb-sidebar`).
- **Cartes** : Leaflet + leaflet-draw (tracé de parcelle), react-leaflet (détail de parcelle, carte des acteurs), tuiles `tile.openstreetmap.org` (requête externe), mesure de surface `@turf/area` côté navigateur (`parcels/shape.ts`) ; **tracé GPS** par `watchPosition`, points retenus si la précision est ≤ 20 m et le pas ≥ 3 m, fermeture à moins de 15 m du départ (`parcels/GpsTrace.tsx:11-13`).


### Palettes successives

| # | Date, commit | Palette (valeurs de `tokens.ts` à ce commit) | Sort |
| --- | --- | --- | --- |
| 1 | 16 oct., `56afb40` | Palette de la landing (MASTER_PROMPT § 12) : clair `bg #F2F5EE`, `brand #1F5B3A` ; sombre `bg #0A2417`, `brand #C6F432` (citron) | Remplacée |
| 2 | 19 oct., `6191392` | Kit « Bénin Vert » : `bg #F3F7EE`, `brand/leaf #1F5A32`, `canopy #0E2F1C`, `maize #6FA83A`, `sun #F3C54A`, `laterite #B4532D` | Remplacée dans l'application ; **reste dans la 1re partie de `DESIGN.md`** et dans le manifeste PWA (`theme_color #0E2F1C`, `background_color #F3F7EE`) |
| 3 | 21 oct., `5405c5f` | « Argile et verre » : crème `#F6F3E8`, `brand #1A6E43`, pastels menthe `#DDEFE3` / pêche `#FBDDCD` / beurre `#FBEBBF` / ciel `#D8E8F6`, corail `#C84B24`, sarcelle `#0F7C82` | Remplacée par la 4 (le crème, le corail et le sarcelle disparaissent) ; **la peau (verre, argile, rayons, halos) reste** |
| 4 | 21 oct., `9755df1` | **« Sunny Farm »** (planche de l'utilisateur) : blanc verdi, vert profond, vert vif, orange | **En vigueur** |

**En vigueur** (`frontend/src/shared/ui/tokens.ts`, lu aujourd'hui) :

- Clair : `bg #F3F9F5`, `surface #FFFFFF`, `text #08291D`, `muted #41665A`, `border #D5E8DC`, `brand #016648` (survol `#014E38`, encre `#FFFFFF`), `warn #8A4B12` sur `#FDF3E6`, `error #9A3A1C` sur `#FBE5DB`, `success #016648` sur `#E3F4EB`, `canopy #014D38`, `maize #00A563`, `sun #F6732F`, `laterite #B4532D`, `rain #E3F4EB`, `layer #EAF5EE`, `sage #CDE8D9`, pastels `mint #D9F2E5`, `peach #FDE3D3`, `butter #FDEBD0`, `sky #E3F1D4`, `coral #F6732F` (`coralInk #2B1206`), `teal #00835A`.
- Sombre : `bg #071F18`, `surface #0F3A2C`, `text #EAF6EF`, `brand #3DDC97`, mêmes pastels assombris.
- Rayons 10/14/22/30 px, ombres d'argile (`card`, `pop`, `btn`), une seule courbe de mouvement `cubic-bezier(.16, 1, .3, 1)`, cible tactile 44 px, polices Atkinson Hyperlegible Next et Bricolage Grotesque.
- Chaîne technique : `tokens.ts` → `tailwind.config.ts` (variables `--c-*`, classes `bg-brand`, `text-muted`…) → `kit.css` (composants du kit « Bénin Vert » porté depuis les maquettes, 62 832 octets, variables `--canopy`, `--leaf`, `--maize`, `--sun` rebranchées sur les valeurs Sunny Farm) → `skin.css` (peau verre-argile, 31 578 octets) → `mobile.css`. **Pas de `theme.css`.**
- **Restes d'anciennes palettes** relevés : manifeste PWA (`vite.config.ts:25-26`) ; première partie de `DESIGN.md` ; `skin.css:40` (halo `rgba(60,185,191,.5)` du bouton en mode sombre, reste du sarcelle de l'étape 3) ; jeton nommé `teal` (désormais vert `#00835A`) et `sky` (désormais vert tendre `#E3F1D4`) ; `scripts/contrast.mjs` vérifie encore des paires « landing clair » alors que la landing 3D est sombre seulement ; la landing 3D garde sa palette locale `--lp-*` (fond `#0a2417`, accent `#12be78`, ocre `#f8793a`) dans `features/landing/landing.css`.

### La page d'accueil et la landing 3D

Il existe **deux pages d'accueil publiques** dans le dépôt, choisies dans `frontend/src/app/App.tsx:113-117` :

| Route | Qui la voit | Composant | État |
| --- | --- | --- | --- |
| `/` | visiteur non connecté (sur téléphone, après la page `/bienvenue` au premier lancement) | `HomePage` (`features/home/HomePage.tsx`) | **Page d'accueil actuelle** |
| `/accueil-3d` | visiteur non connecté seulement (une personne connectée tombe sur la page 404) | `LandingPage` (`features/landing/LandingPage.tsx`) | Ancienne landing en 3D, « conservée telle quelle », sans lien dans l'interface |

### État actuel exact de `/` (`features/home/`)

Fichiers : `HomePage.tsx` (210 lignes), `illustrations.tsx` (233, SVG en ligne), `home.css` (177), `SiteFooter.tsx` (72) et `site-footer.css` (36) ; test `HomePage.test.tsx` (57 lignes, 3 tests : promesse, 3 étapes et liens d'inscription ; pied de page et ses adresses ; plan du site, accessibilité et contact). Textes : clés `landing.*` réutilisées et clés `vitrine.*` nouvelles (`i18n/fr/vitrine.json`, 58 feuilles). Réalisée le 22 octobre en trois passages (commits `d882bbe`, `563b118`, `1706422`) puis retouchée (`451d438`, `9b4cf1f`, logo `bdde14c`, `fde2a10`, `9cbb2f6`).

Contenu, dans l'ordre de la page :

1. **En-tête** collant : logo MAEP (composant `Logo`, deux fichiers PNG selon le thème ; sous 640 px, armoiries et nom), liens d'ancre « Comment ça marche », « Pour qui », « Confiance », « Questions » (affichés seulement au-dessus de 1 200 px), bouton de langue, bascule clair/sombre, « Se connecter » (masqué sous 640 px) et « S'inscrire ».
2. **Premier écran** : titre `h1` « Votre champ dans votre téléphone. », chapeau « Inscrivez-vous avec votre numéro. », deux boutons (créer mon compte producteur ; se connecter) et une illustration SVG `HeroScene` : ciel bleu clair, nuages, soleil, chaîne lointaine dans la brume, collines, acacias, palmier, case au toit de chaume, champ de maïs en perspective, paysan à la houe, oiseaux, téléphone légèrement penché montrant une parcelle tracée ; trois pastilles flottantes (surface, alerte, stade) dont le texte est fixe (`vitrine.hero.*`).
3. **Quatre chiffres** : 200 873 fermes (lu dans `landing/relief.json`, champ `total`), 12 départements, 77 communes, 13 filières : ces trois derniers sont **écrits en dur** (`HomePage.tsx:16`). Valeurs « de démonstration » (`PRODUCT.md`).
4. **Comment ça marche** : 3 étapes avec illustration (inscription par numéro, validation par l'agent ATDA, recevoir/suivre/vendre).
5. **La saison** (ancre `#saison`) : 4 stades du maïs (semis, croissance, floraison, récolte) en SVG.
6. **Pour qui** : 4 cartes (producteur, agent, coopérative, institution).
7. **Confiance** : 4 éléments (hors ligne, langues, consentement, journal d'audit).
8. **Galerie** : 3 photos Wikimedia CC BY-SA (`public/landing/*.jpg`, crédits et liens dans `landing/gallery.ts`), masquée si la liste est vide.
9. **Partenaires** : 6 pastilles à sigle (MAEP, MTDI, ATDA, INRAB, SONAMA, FNDA) tirées du cadre de `PRODUCT.md` ; ni logos ni témoignages inventés.
10. **Questions** : 3 questions repliées (`details`).
11. **Appel final** (inscription / se connecter) puis **pied de page** `SiteFooter` : marque, langue et thème, 4 rubriques (La plateforme, Mon espace, Aide, Informations légales), barre de bas de page (drapeau, mention de prototype, retour en haut). Le même pied de page sert aux autres pages publiques (`Layout.tsx:357`) ; dans l'application connectée, c'est une barre compacte de liens juridiques (`Layout.tsx:117-126`).

Technique : animations en CSS pur sous `prefers-reduced-motion: no-preference` (entrée en cascade, pastilles flottantes, maïs qui se balance, soleil qui bat, nuages qui dérivent) ; apparition au défilement par `IntersectionObserver` (classe `data-reveal`), désactivée en mouvement réduit ; illustrations colorées par les jetons du thème (valables en mode sombre) ; ciel par jetons locaux `--hm-sky-a`/`--hm-sky-b` avec version sombre ; lien d'évitement vers `#hm-main`.

### Ce qu'il reste de la version 3D : tout, utilisé, mais isolé

La landing 3D n'a pas été supprimée : le journal (`docs/REFONTE_FRONTEND.md`, entrée du 22 octobre) la dit « conservée telle quelle » sur `/accueil-3d`. Le graphe d'imports le confirme :

| Fichier (`features/landing/`) | Lignes | Utilisé par | État |
| --- | --- | --- | --- |
| `LandingPage.tsx` | 270 | `App.tsx:57` (route `/accueil-3d`) | **utilisé** (page ouverte seulement par son adresse) |
| `scene.ts` | 304 | `LandingPage.tsx`, `field.ts`, `field3d.ts`, `journey.ts` | **utilisé** : relief du Bénin dessiné en canvas 2D à partir de `relief.json`, caméra de vol vers Banikoara |
| `field.ts` | 610 | `LandingPage.tsx`, `field3d.ts` | **utilisé** : champ de maïs dessiné en canvas 2D (stades) |
| `field3d.ts` | 1 311 | `LandingPage.tsx` par `import('./field3d')` (chargement différé après test `webglAvailable`) | **utilisé** : champ de maïs WebGL avec `three` (seul importeur de `three`) |
| `journey.ts` | 40 | `LandingPage.tsx`, `scene.test.ts` | **utilisé** (fenêtres de défilement, iris) ; export `showsRelief` jamais référencé |
| `relief.json` | 38 257 octets, **une seule ligne** (`wc -l` = 0 : le fichier n'est pas vide) | `scene.ts`, `ui.tsx`, `LandingPage.tsx`, **`HomePage.tsx`**, `scene.test.ts` | **utilisé** : 11 190 cellules de densité de fermes, 12 départements, total 200 873 ; seul le total sert à la nouvelle page |
| `ui.tsx`, `LandingSections.tsx`, `MoreSections.tsx` | 131, 76, 76 | `LandingPage.tsx` | **utilisés** (en-tête, chiffres, galerie, portails, qui, pied de page, confiance, étapes, FAQ) |
| `gallery.ts` | 24 | `HomePage.tsx`, `ui.tsx`, `FirstLaunchPage.tsx` | **utilisé** ailleurs aussi |
| `useCalm.ts` | 20 | `LandingPage.tsx` | **utilisé** (mode « calme » mémorisé `agri-calm`) |
| `landing.css`, `landing-sections.css`, `ui.css` | 186, 278, 55 | `LandingPage.tsx` | **utilisés** ; palette sombre locale `--lp-*` |

- Poids : 2 862 lignes de TypeScript hors tests (15,7 % des 18 231) + 519 lignes de CSS + 359 lignes de tests (31 tests) ; dépendances `three` (+ `@types/three`) et `@fontsource/young-serif` qui ne servent qu'à cette page ; `e2e/landing-overlap.spec.ts` (8 tailles d'écran) vise `/accueil-3d` (`:10`).
- Restes de cette version **hors de la page** : les JPEG `features/auth/img/champ-1440.jpg` et `champ-390.jpg` (capture du rendu 3D) servent d'illustration à la page de connexion (`LoginPage.tsx:12-13`) et aux pages d'état (`StatusPages.tsx:7-8`), avec la légende « Image : capture du rendu 3D de la page d'accueil » (`access.artCredit`), devenue inexacte ; `relief.json` et `gallery.ts` servent la nouvelle page.
- **Défaut visible** : `LandingSections.tsx:36` et `ui.tsx:23` chargent `/icon.svg`, supprimé le 22 octobre (`1706422`) : l'image est cassée (`alt=""`, donc silencieuse) sur `/accueil-3d`.
- Origine : maquette `maquettes/landing/` (`field3d.js`, `page.js`, `phone.js`), décrite par la première partie de `DESIGN.md`. Parcours de la version React : une zone épinglée pilotée par le défilement (`journey.ts:1-4`) : relief du Bénin, vol vers Banikoara, parcelle, plongée, puis champ en 3D (semis, croissance, floraison, récolte), suivie des sections (chiffres, portails, galerie, qui, confiance, étapes, FAQ). **Elle ne contient pas le téléphone simulé** de `DESIGN.md` et de la maquette (aucun code de téléphone dans `features/landing/`), et ne montre pas de chapitre USSD/SMS (aucune occurrence de « USSD » dans les fichiers `.tsx` de `features/landing/`).


### Écrans de données écrites en dur

| Écran ou fonction | Fichiers | Nature de la donnée | Étiquetage visible |
| --- | --- | --- | --- |
| `/collecte` (Circuit de collecte) | `features/supply/CollectionPage.tsx`, `features/supply/demo.ts` (`POINTS` : 4 points Kandi, Sonsoro, Angaradébou, Donwari ; `MEMBERS` : 3 ; `PLAN` : tournée aux dates « Lun. 20/10 » etc.) ; libellés du dessin de tournée en dur (`CollectionPage.tsx:164-165`) | Écrite en dur ; pesées gardées dans l'état React, **rien n'est envoyé au serveur** | Alerte « Données de démonstration » (`supply.demoTitle`) |
| `/offres` (Stocks, ruptures et prix) | `features/supply/OffersPage.tsx`, `features/supply/demo.ts` (`STOCKS` : 5 produits dans deux magasins, Bohicon et Abomey ; fonctions `coverDays`, `ruptures`) ; texte « Vos magasins de Bohicon et Abomey » dans `i18n/fr/filiere.json` (`supply.offers.desc`) | Écrite en dur, aucun appel d'API | Alerte « Données de démonstration » |
| `/previsions` (Prévisions de rendement et risques) | `features/forecasts/ForecastsPage.tsx`, `features/forecasts/simulate.ts` | Générateur pseudo-aléatoire déterministe (FNV-1a + mulberry32) par filière et lieu : 5 campagnes passées + 2 prévues, niveaux de risque par commune ; aucun endpoint de prévision n'existe côté serveur | Alerte « simulé » (`pilotage.fc.simTitle`) ; marqué `shortcut:` dans le fichier |
| Météo (repli) | `features/weather/demo.ts` (`demoForecast`), `features/weather/api.ts` | Prévision simulée utilisée tant que `/weather` n'a pas répondu ; affichée sur l'accueil du producteur, `/meteo-prix` et l'accueil mobile | Drapeau `simulated` : note « Prévision simulée » (`weather.simNote`) |
| Prix (repli) | `features/weather/demo.ts` (`demoPrices`, `demoPriceHistory` : 6 marchés × 6 filières), `features/markets/api.ts` (`usePriceRows`, `priceCurve`) | Utilisé seulement si la requête `/prices` échoue (`q.isError`) | Badge « Démonstration » (`pr.demo`) et source « hors ligne » |
| Récoltes attendues du marché | `features/market/demo.ts` (`EXPECTED_HARVESTS`, 4 tranches de tonnage) ; `features/market/MarketPage.tsx:226-230` | Écrite en dur (« aucune API de prévision de récolte côté marché ») | « Prévision simulée » |
| Calendrier cultural | `features/campaigns/cycle.ts` (durées de cycle de 6 filières : levée, croissance, floraison, récolte ; tâches) ; `CampaignsPage.tsx:13` (`SEASONS = ['2026-pluie-1', '2026-pluie-2', '2027-pluie-1']`) | Repères généraux écrits en dur, sans dosage | Présentés comme estimations ; fichier marqué `shortcut:` |
| Chiffres de la page d'accueil | `features/home/HomePage.tsx:16` (12 départements, 77 communes, 13 filières) ; `features/landing/relief.json` (total 200 873, 11 190 cellules) ; `features/landing/gallery.ts` (3 photos) | Écrite en dur / fichier statique de démonstration (source : « POC Agri-Digit (données de démonstration, non officielles) ») | Aucune pastille sur la page d'accueil elle-même ; la mention figure dans `PRODUCT.md` |
| Simulateur de téléphone simple | `features/ussd/PhoneSimulator.tsx:8, 15` (code `*000#`, numéro `0197000001`) | Valeurs d'exemple | Étiqueté « Simulation » |
| Pathologies du diagnostic | `features/diagnoses/DiagnosesPage.tsx:14-16` (`PATHOLOGIES` : codes des maladies proposées à l'agronome) | Liste en dur « faute d'endpoint qui les expose » (`RAPPORT_FINAL.md:82`) | — |
| Seuils métier recopiés du serveur | `translations/TranslationsPage.tsx:14` (80 %), `programs/ProgramsPages.tsx:33` (15 jours), `producers/AgentHome.tsx:19` (retard de 5 jours), `interop/InteropPage.tsx:16` (clé ancienne à 180 jours), `markets/PricesPage.tsx:10` et `ShowcasePage.tsx:9` (20 000 FCFA/kg), `market/MarketPage.tsx:18` (10 000 000), `markets/SurveysPage.tsx:9` (10 questions), `diagnoses/DiagnosesPage.tsx:11` (5 Mo), `parcels/GpsTrace.tsx:11-13` (20 m, 3 m, 15 m) | Constantes dupliquées côté interface | — |

Constat : `docs/CONFORMITE_TDR.md` § 8 le dit déjà : « Pages « Collecte » et « Offres » : toujours remplies de données écrites dans le code … à retirer ou à brancher » ; or le serveur offre `lots/collect`, `sites`, `lots` et `stocks/outlook`, que `/tracabilite` (`features/trace/TracePage.tsx`) et `/stocks` (`features/stocks/StocksPage.tsx`) utilisent réellement. Le commentaire de `supply/demo.ts` (« aucune API de collecte ni de stocks n'existe encore ») est donc devenu inexact.

### Dette et limites visibles

| Rubrique | Constat (nombre approximatif) | Exemples et fichiers |
| --- | --- | --- |
| Marqueurs `TODO` / `FIXME` / `HACK` | **0** | — |
| Raccourcis assumés `shortcut:` | **4** dans le code | `features/campaigns/cycle.ts:1` (durées de cycle de démonstration), `features/forecasts/simulate.ts:3` (chiffres inventés étiquetés « Simulé »), `features/weather/demo.ts:3` (Météo-Bénin et SIM non raccordés), `vite.config.ts:15` (service worker non minifié) ; plus `// @ts-nocheck` dans `playwright.config.ts:2` |
| Désactivations de typage, `any`, `console.*`, `dangerouslySetInnerHTML` | 0, 0, 0, 0 (hors le `@ts-nocheck` ci-dessus) | — |
| Mentions à compléter dans les textes juridiques | **12** (« à compléter par le MAEP », « à désigner », « à décider avec le CoPil ») ; surlignées à l'écran (`<mark class="todo">`) | `i18n/fr.json:777-891` (6 : directeur de la publication, prestataire, hébergement, DPO), `i18n/fr/vitrine.json:93-149` (5 : audit d'accessibilité, délai de réponse, autorité compétente, point de contact, DPO), `i18n/fr/producteur.json:283` (DPO) ; `features/legal/LegalPage.tsx:21` |
| Données de démonstration codées en dur | **≈ 8 jeux** dans 7 fichiers | § 6.2 : `supply/demo.ts`, `weather/demo.ts`, `market/demo.ts`, `forecasts/simulate.ts`, `campaigns/cycle.ts` + `CampaignsPage.tsx:13`, `home/HomePage.tsx:16`, `landing/relief.json` |
| Textes français en dur hors `fr.json` | **≈ 19 littéraux** détectés par une heuristique (chaînes avec accents ou mots courants, hors commentaires, tests et `i18n/`), dans 8 fichiers ; aucun `aria-label`, `title`, `placeholder` ni `alt` littéral dans le JSX ; un seul texte JSX littéral (SVG de `CollectionPage.tsx:164-165`) | `features/supply/demo.ts` (6 : « Hangar de l'école », « Piste coupée après la pluie de jeudi », « Magasin de Kandi »…), `features/landing/gallery.ts` (3 `alt` de photos), `features/outbox/offlineQueue.ts:27, 68, 94` (message de `ConflictError`, « Refusée par le serveur » ×2), `app/Layout.tsx:97, 326` (« Agri-Digit Bénin » dans les notifications et le titre du document), `features/weather/demo.ts:34` (noms de marchés) |
| Autres textes ou formats non traduits | Noms des langues écrits en dur dans 3 fichiers ; dates, heures et nombres toujours en `fr-FR` ; voix de lecture et de dictée en `fr-FR` ; `ConflictsPanel` affiche les valeurs brutes (le stade `recolte` au lieu du libellé, signalé dans `RAPPORT_FINAL.md:81`) | `app/LangButton.tsx:4`, `assistant/AssistantPage.tsx:18`, `onboarding/FirstLaunchPage.tsx:14` ; `shared/ui/index.tsx:204, 236-238` ; `outbox/ConflictsPanel.tsx:27` |
| Clés de traduction orphelines | ≈ 154 sur 3 863 (4 %), surtout `pilotage.*` (25), `ag.*` (23), `home.*` (17) : reliquats du minimalisme | script `keys_check.py` (approximation) |
| Exports jamais référencés | 5 sur 531 : `CreditConsentBox` (`credit/CreditPage.tsx`), `showsRelief` (`landing/journey.ts`), `SimulationBanner` et `DataTable` (`shared/ui/index.tsx`), `VcOptions` (`shared/ui/VcOptions.tsx`) | script `unused_exports.py` |
| Listes tronquées à 20 lignes | **≈ 24 appels** `rows(await api(…))` sans `page_size` (le serveur pagine par 20, `backend/apps/core/pagination.py:5`) ; 7 appels demandent `page_size=100` ; 14 usages de `list<>` suivent les curseurs jusqu'à 1 000 lignes (`shared/api/client.ts:85-98`). Exemple vérifié : `/notifications` est paginé côté serveur (`backend/apps/alerts/api.py:96`) et lu sans `page_size` (`features/alerts/api.ts:19`) : le compteur de messages non lus de la cloche ne voit que les 20 premiers. Les autres endpoints concernés ne sont pas vérifiés un à un. Le tableau (`Table`) pagine et trie côté navigateur sur les lignes chargées | `features/alerts/api.ts:6, 19`, `programs/ProgramsPages.tsx:12`, `lands/SchemesPage.tsx:16`, `farmservices/EquipmentPage.tsx:32`, `revenue/RevenuePage.tsx:56`, `parcels/api.ts:8, 19` |
| Hors ligne | Seules 6 écritures sont mises en file ; aucune lecture hors ligne ; cartes dépendantes du réseau (§ 3.1) | `outbox/offlineQueue.ts` |
| PWA | Manifeste pointant vers un fichier supprimé et aux couleurs d'une ancienne palette ; icônes PNG non référencées ; Workbox non minifié ; `dist/` périmé (§ 3.2) | `vite.config.ts:15-31`, `dist/manifest.webmanifest` |
| Tests | Playwright non installé, 17 exécutions jamais lancées ; le test de langue `e2e/p2.spec.ts:264-271` choisit la langue par `getByLabel('Langue').selectOption('fon')`, or `LangButton` est devenu un bouton qui cycle : **probablement périmé** (non exécuté) ; 7 dossiers `features/` sans test (`admin`, `contests`, `outbox`, `satellite`, `selection`, `stocks`, `weather`) ; `contrast.mjs` exige Node ≥ 22.18 (commentaire de la ligne 2) alors que la CI tourne en Node 20 et ne l'appelle pas ; Vitest non relancé par moi | `playwright.config.ts`, `e2e/p2.spec.ts`, `.github/workflows/ci.yml:36-54` |
| Voix | Lecture et dictée figées en `fr-FR` ; « Écouter » réduit à une icône sous 640 px ; dictée seulement dans l'assistant, seulement où `SpeechRecognition` existe | `shared/ui/index.tsx:204`, `mobile.css:53`, `assistant/AssistantPage.tsx:15-16, 85` |
| Contenu masqué par le minimalisme | Les descriptions de page (`.page-desc`) sont **masquées visuellement sur tous les écrans** (lues seulement par les lecteurs d'écran), y compris des phrases d'aide (ex. « Vos données vous appartiennent… » sur `/consentements`) | `shared/ui/skin.css:412` ; `docs/REFONTE_FRONTEND.md` (journal « minimalisme ») |
| Accessibilité déclarée incomplète | Pas d'audit externe, pas d'essai au lecteur d'écran ni sur téléphone réel, cartes non conçues pour le clavier | `i18n/fr/vitrine.json:93-110` |
| Documents partiellement périmés | `DESIGN.md` (1re partie), `PRODUCT.md` (logo), `RAPPORT_FINAL.md` (chiffres du 19 octobre), `access.artCredit` (§ 9) | § 9 |
| Identifiants de démonstration en clair | Mot de passe du personnel de démonstration écrit dans `frontend/e2e/demo.spec.ts:23` et `p2.spec.ts:7`, `docs/DEMO.md`, `RAPPORT_FINAL.md` (valeurs de `seed_demo`, voulu) | à écarter avant toute mise en production |
| Image de démonstration | Photo `docs/demo/photo-feuille-douteuse.jpg` avec filigrane « iStock » (diagnostic) : à remplacer par une image libre et créditée | `docs/ACTIONS_HUMAINES.md:33`, audit P2-8 |
| Requêtes externes | Tuiles `tile.openstreetmap.org` sur 3 écrans de carte (la phrase « aucune requête vers un service externe » de `src/index.css:1` ne vise que les polices) ; photos de la galerie servies localement (crédits liés à Wikimedia) | `parcels/ParcelsPage.tsx:27`, `observatory/ActorsMapPage.tsx:21` |

### Écarts entre documents et code

| # | Document ou fichier | Dit | Le code montre |
| --- | --- | --- | --- |
| 1 | `DESIGN.md`, lignes 1-268 | Monde « Bénin Vert » : canopée `#0E2F1C`, soleil jaune `#F3C54A` « réservé aux données » | L'application est « Argile et verre » en palette Sunny Farm (`tokens.ts`, `kit.css` : `--sun: #F6732F`) ; la page d'accueil actuelle n'est pas ce monde non plus ; seule la dernière section de `DESIGN.md` (lignes 269-279) est exacte |
| 2 | `PRODUCT.md` (Brand Commitments) | Logo : `frontend/public/icon.svg` | Fichier supprimé le 22 octobre (`1706422`) ; logo actuel : `frontend/public/brand/logo.png` et `emblem.png` |
| 3 | `frontend/vite.config.ts:17, 25-28` | Manifeste : `icon.svg`, `theme_color #0E2F1C`, `background_color #F3F7EE` | `icon.svg` n'existe plus ; `index.html:10` dit `#014D38` ; les PNG 192/512 existent mais ne sont pas déclarés |
| 4 | `features/landing/LandingSections.tsx:36`, `ui.tsx:23` | `<img src="/icon.svg">` | Fichier absent : image cassée sur `/accueil-3d` |
| 5 | `i18n/fr/acces.json` (`access.artCredit`) | « Image : capture du rendu 3D de la page d'accueil » | La page d'accueil n'est plus en 3D ; l'image sert encore à la connexion et aux pages d'état |
| 6 | `features/supply/demo.ts:1` (commentaire) ; docstrings de `CollectionPage.tsx` et `OffersPage.tsx` | « aucune API de collecte ni de stocks n'existe encore » ; « Aucune API » | `lots/collect`, `sites`, `lots`, `stocks/outlook` existent et sont utilisés par `/tracabilite` et `/stocks` |
| 7 | `RAPPORT_FINAL.md:22, 34, 56, 59, 92` | 53 fichiers, 8 tests (puis 112 tests sur 33 fichiers au 19 octobre), 915 clés, bundle principal de 579 ko | État actuel : 170 fichiers `.ts/.tsx` (49 de tests), 156 tests, 3 863 clés ; le bundle n'a pas été remesuré (`dist/` du 19 octobre) |
| 8 | `PROJECT_MAP.md` (section Frontend) | « kit « Bénin Vert » : `kit.css`, `mobile.css`, jetons dans `tokens.ts` » | Il y a aussi `skin.css` (peau « Argile et verre », chargée après les deux autres, `main.tsx:7`) |
| 9 | `docs/PLAN_MVP.md` | 85 écrans mobiles en 16 parcours ; 57 pages web | `maquettes/mobile/ecrans/` : 81 fichiers HTML ; `maquettes/web/` : 56 fichiers HTML (53 pages + `index`, `composants`, `_modele`) |
| 10 | `e2e/p2.spec.ts:264-271` | Choix de langue par `getByLabel('Langue').selectOption('fon')` | `LangButton` est un bouton qui cycle (`app/LangButton.tsx`) : test probablement périmé |
| 11 | `docs/AUDIT_UX.md` | 1 P1, 8 P2, 7 P3 ouverts | Presque tous corrigés (§ 4.4) ; P2-8 (filigrane iStock) et la voix `fr-FR` restent |
| 12 | `docs/REFONTE_FRONTEND.md` § 3 (palette crème `#F6F3E8`, corail `#C84B24`, sarcelle `#0F7C82`) | Tableau de palette de la refonte du 21 octobre | Remplacée le même jour par Sunny Farm (journal, § 7 du même fichier) ; la section 3 n'a pas été mise à jour |
| 13 | `DESIGN.md` (téléphone simulé épinglé sur le champ 3D) | Landing = champ 3D + téléphone | `features/landing/` ne contient pas de téléphone ; la maquette `maquettes/landing/` oui |
| 14 | `scripts/contrast.mjs` | Paires « landing clair » | La landing 3D est sombre seulement (`landing.css:2`, `color-scheme: dark`) |
