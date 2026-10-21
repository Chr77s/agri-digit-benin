# Conformité du prototype au TDR (révision du TDR « Agri-Digit Bénin »)

Relecture du 20 octobre 2026 : TDR lu en entier, chaque exigence confrontée au code, puis compléments développés le même jour (section 7). Légende : **Fait** (réel et testé), **Fait côté outil** (l'outil est réel et testé, mais son résultat dépend de chiffres ou de validations que seul un tiers fournit : MAEP, INRAB, APDP), **Simulé** (l'écran existe, les données sont fictives), **Partiel** (une partie seulement), **Absent**.

## Verdict

Le prototype ne couvre pas 99 % du TDR, mais l'écart n'est plus dans le code qu'à la marge. Sur les **66 exigences logicielles** des tableaux ci-dessous : **48 faites (73 %)**, **6 faites côté outil (9 %)**, 4 simulées, 8 partielles, aucune absente. Le matin du 20 octobre, sur 64 : 15 faites (23 %), 8 simulées, 14 partielles, 27 absentes. Les lots A à E de la journée (recouvrement et revenu ; terres, aménagements, sols, climat ; matériel, mécanisation, semences, PMEA ; prix, stocks, analyses, enquêtes, formations ; suivi-évaluation, couverture nationale, carte, réentraînement) ont traité les 21 partielles et les 9 absentes qui relevaient du code.

Ce qui reste en dehors du code :

1. **Le contenu en langues nationales** (4 lignes partielles). Le circuit est prêt (corpus, validation par un second locuteur, mesure de la justesse, file des questions posées), mais aucun texte en fon, bariba, yoruba ou dendi n'existe tant que le MTDI ne l'a pas écrit. La machine n'en invente pas.
2. **Les données et validations d'un tiers** (les 6 lignes « côté outil »). Relevés de prix (agents, SIM), statistiques nationales de consommation et d'importation (MAEP), rendements de référence et seuils des sols, du climat, des stocks et de la veille (INRAB, MAEP), consentement d'amélioration des modèles, AIPD et avis de l'APDP pour le réentraînement.
3. **Ce qui reste simulé** (4 lignes) : le diagnostic par photo (aucun modèle appris : état, maladie, niveau de risque), la page « Prévisions », et les canaux SMS, USSD et vocal (aucun opérateur raccordé). Les paiements Mobile Money passent par FakePay.
4. **Deux lignes partielles de fond** : le scoring crédit (une grille, pas de modèle statistique faute d'issues de crédit observées) et la synergie avec X-Road (habilitation du MAEP).

Les livrables qui ne sont pas du logiciel (rapports, formations, consultations, modèle économique, validation par le CoPil) sont listés à la fin, hors du décompte.

## 1. Objectifs (§ 2)

| Exigence | État | Constat |
| --- | --- | --- |
| Base d'identification de **tous les acteurs** et de leurs **actifs** par filière | Fait | Producteurs, coopératives, organisations de filière, sites géolocalisés des acteurs (magasins, unités de transformation, points de vente) avec capacité et équipements, et matériel individuel des producteurs (type, nombre, état, location), vu du personnel par département avec le seul code producteur. |
| Gestion des interrelations entre acteurs | Fait | Adhésions, organisations de filière, mises en relation du marché, lots livrés d'un acteur à l'autre, messagerie producteur et agent. |
| Suivi des efforts de l'État envers les acteurs | Fait | Appuis, programmes, candidatures, sélection, financements mobilisés. |
| Assistant temps réel alimenté par les fiches INRAB/ATDA | Fait | 42 fiches publiées, sources citées, dosage renvoyé à un agent ; LLM du réseau local branché. |
| Assistant alimenté par les **données géospatiales et météo** de la parcelle | Fait | Type et surface de la parcelle, culture, stade et météo réelle des 3 prochains jours transmis au modèle (jamais une météo simulée). |
| Assistant en **fon et bariba** | Partiel | Voir § 4 : circuit prêt, contenu à écrire par le MTDI. |
| Diagnostic photo : état, maladie probable, recommandations | Simulé | Résultat tiré du hachage de l'image, aucun modèle. |
| Diagnostic photo : **niveau de risque** | Simulé | Affiché (élevé, moyen) ; valeurs par maladie à valider par l'INRAB. |
| Prévision des rendements | Simulé | Page « Prévisions » calculée dans le navigateur. |
| Analyses des sols et de l'utilisation des terres | Fait | Analyses de sol saisies par l'agent et lues sans aucune dose (seuils à valider par l'INRAB, `MODEL_CARD.md` § 5) ; utilisation des terres par département et type de terrain (disponible, exploitable, exploitée). Les analyses sont à saisir : le prototype n'en contient pas. |
| Risques climatiques (sécheresse, inondation, stress hydrique) | Fait | Modèle à règles (bilan hydrique sur la pluie des 14 derniers jours et la prévision Open-Meteo) : stress hydrique, sécheresse, inondation, par parcelle et par département, avec conseils sans dose. Seuils publiés et **à valider par l'INRAB** ; sans réseau, résultat signalé « données simulées ». |
| Scoring crédit | Partiel | Grille transparente avec consentement et journal ; le facteur « Appuis remboursés » suit désormais les échéances réellement payées (appuis et prêts). Pas de modèle statistique (aucune issue de crédit observée) ni de données Mobile Money. |
| Accès des analyses à MAEP central, ATDA/INRAB, institutions financières | Fait | Rôles et périmètres vérifiés par le serveur. |
| Synergie avec les SI du MAEP et X-Road | Partiel | API d'agrégats et formats ouverts ; aucun raccordement. |

## 2. Maillons de la chaîne de valeur (§ 3.1)

| Maillon | Exigence | État |
| --- | --- | --- |
| Aménagements | Parcelles par GPS | Fait (tracé, surface calculée par le serveur) |
| Aménagements | Superficies disponibles / exploitables / exploitées ; pluvial bas-fond, plateau, irrigué | Fait (disponible mesurée sur le tracé, exploitable déclarée, exploitée = parcelles portant une campagne de la saison ; aménagements avec les trois superficies) |
| Aménagements | Réhabilitation, nouveaux aménagements, entretien des périmètres | Fait (travaux suivis de la planification à la clôture, l'état de l'aménagement en découle) |
| Production | Producteurs et parcelles | Fait |
| Production | Activités semencières (centre → bénéficiaires) | Fait (lots certifiés avec certificat, stock, remise aux producteurs en appuis à confirmer, code du lot conservé) |
| Production | Appuis en intrants | Fait |
| Production | Prestations de mécanisation | Fait (demande, acceptation, réalisation ; le coût entre dans le revenu ; le paiement de la prestation se règle hors plateforme) |
| Production | Suivi de la production (campagnes, stades, récoltes) | Fait |
| Production | Recouvrement des appuis | Fait (échéancier, paiement en un clic par Mobile Money simulé, retards, rappels, taux de recouvrement) |
| Production | Magasins de stockage | Fait (sites géolocalisés, lots en stock par magasin) |
| Transformation | Transformateurs et sites par GPS, plateau technique | Fait (sites « unité de transformation » avec équipements) |
| Transformation | Flux matières | Fait (lots collectés, livrés, transformés, remontée jusqu'à la récolte) |
| Transformation | Prix brut et transformé | Fait côté outil (relevés saisis par les agents, les gestionnaires, transformateurs et distributeurs, avec forme brute ou transformée, écart et marge de transformation ; **aucun relevé n'est pré-chargé** : sans relevé récent la démonstration reste affichée, étiquetée « simulée ») |
| Transformation | Renforcement du plateau, recouvrement | Fait (équipement remis à un transformateur en créance remboursable ; formations enregistrées) |
| Distribution | Distributeurs, magasins, points de vente par GPS | Fait (sites « point de vente ») |
| Distribution | Stocks et anticipation des ruptures | Fait (stock, sortie moyenne par jour et jours de couverture par détenteur, produit et site ; niveaux rupture, critique sous 7 jours, bas sous 15 jours ; alertes `check_stock_alerts`). Seuils à valider avec le MAEP ; une vente du marché non rattachée à un lot n'est pas vue |
| Distribution | Prix | Fait côté outil (mêmes relevés que ci-dessus, lus par la page « Météo et prix », l'USSD, le SMS et le rappel du marché) |
| Distribution | Enquêtes de satisfaction des consommateurs | Fait (enquête créée par le personnel, réponse publique sans compte ni donnée personnelle, limitation de débit, résultats agrégés avec masquage sous 5 réponses). Le recueil dépend des répondants |
| Gouvernance | Interprofessions, OIA, fédérations | Fait (organisations de filière : union, fédération, interprofession, OIA, OPA) |
| Gouvernance | Coopératives et effectifs | Fait (membres, effectifs par organisation dont femmes) |
| Gouvernance | Fonctionnement des interprofessions, mécanismes de prix, renforcement des capacités | Fait (assemblées, réunions, prix convenus, formations avec femmes et jeunes) |
| Suivi-évaluation | Production par filière, effectifs, impact des appuis | Fait (production et rendement par filière et saison, effectifs par sexe et tranche d'âge, impact des appuis comparé à des producteurs du même département, de la même filière et de la même saison ; cellules de moins de 5 masquées, comparaison non causale dite telle) |
| Suivi-évaluation | Taux de couverture de la consommation nationale, importations, tendances, veille | Fait côté outil (saisie avec source obligatoire, import en lot, taux de couverture et de dépendance, variations annuelles, alertes de veille). **Les chiffres nationaux sont à saisir par le MAEP** : le prototype n'en contient que de démonstration, étiquetés ; les seuils de veille (80 %, +20 %, −15 %) sont à arrêter |
| Suivi-évaluation | Cartographie des acteurs | Fait (carte commune à couches : sites, aménagements, organisations, coopératives, entreprises agricoles vérifiées, matériel loué, et parcelles pour le personnel seulement ; une entité sans position propre est placée au centre de son département, jamais de nom de personne ni de téléphone) |

## 3. Services aux acteurs (§ 3.1)

| Acteur | Service | État |
| --- | --- | --- |
| Tous | Météo | Fait (Open-Meteo, données ouvertes, au point de la parcelle ; repli signalé si le service ne répond pas). Météo-Bénin non raccordé. |
| Tous | Prix | Fait côté outil (relevés réels dès qu'ils sont saisis, démonstration étiquetée sinon) |
| Tous | Conseil par l'assistant | Fait (français) |
| Tous | Disponibilités en produits | Fait (marché) |
| Tous | Services de partenaires : e-banking, assurance, publicité | Fait (« Services et innovations », par département et filière) |
| Tous | Promotion des innovations, financements mobilisés au bénéfice des filières | Fait (publications, total des financements et des appuis) |
| Tous | Analyses prospectives des marchés | Fait côté outil (moyenne mobile, variation et tendance par marché, fiabilité selon le nombre de relevés, **aucune projection sous 6 relevés** ; offre attendue par filière et département). Heuristique sans apprentissage (`MODEL_CARD.md` § 7) ; rendements de référence de démonstration à valider par l'INRAB |
| Producteur | Mise en relation avec un transformateur, appui à la vente | Fait (marché, suspension, retrait et fermeture d'une annonce) |
| Producteur | Échange avec son agent | Fait (messagerie, réponse aussi par SMS) |
| Producteur | Accès aux PMEA de la zone | Fait (annuaire par département et service, entreprises vérifiées par l'agent de la zone) |
| Producteur | Suivi du revenu | Fait (ventes déclarées − dépenses déclarées − remboursements payés, par campagne) |
| Producteur | Paiement en un clic des appuis reçus | Fait (prochaine échéance, FakePay simulé) |
| Transformateur, distributeur | Mise en relation, paiement en un clic | Fait |
| Transformateur, distributeur | Prévision des récoltes | Partiel (« offre attendue » par filière et département, calculée sur les campagnes déclarées et des rendements de référence de démonstration ; la page « Prévisions » reste calculée dans le navigateur) |
| Transformateur, distributeur | Circuit de collecte | Fait (mise en lot depuis la récolte, livraison) |
| Transformateur, distributeur | Renforcement des capacités, promotion des produits | Fait (formations avec inscription volontaire, présence et rapport par département ; vitrine des produits). Pas de rappel de séance par message ni de certificat |
| Institutions financières | Enregistrement, accès au scoring | Fait |
| Institutions financières | Fourniture de services aux acteurs, recouvrement | Fait (publication de leurs offres ; prêts aux producteurs consentants et recouvrement des échéances) |

## 4. Langues, canaux, qualité (§ 1, 3.1, 3.4)

| Exigence | État | Constat |
| --- | --- | --- |
| Comprendre et répondre nativement en fon et bariba (écrit) | Partiel | L'assistant répond dans la langue avec une réponse écrite et validée par deux locuteurs du MTDI ; sans réponse validée, il répond en français, le dit, et transmet la question au MTDI. Aucun texte n'est encore saisi. |
| Yoruba et dendi (§ 1) | Partiel | Même circuit, mêmes limites. |
| Oral : synthèse et reconnaissance vocales | Partiel | Lecture et dictée par le navigateur, en français seulement ; voix en langues nationales à enregistrer (licence Meta MMS à trancher). |
| Corpus linguistique développé et intégré | Partiel | Corpus par langue, file des questions réellement posées par les producteurs, reformulations ; contenu à produire par le MTDI. |
| Qualité validée par des locuteurs natifs, justesse des réponses | Fait | Validation par un second représentant (jamais l'auteur) ; justesse mesurée par langue sur les reformulations. |
| Canaux SMS, USSD, vocal | Simulé | Menus et commandes réels, aucun opérateur raccordé. La météo USSD et SMS est désormais réelle. |
| Formats ouverts, pas de système propriétaire | Fait | |
| Sécurité, confidentialité, protection des données | Fait | Consentements, journal chaîné, périmètres, minimisation. |
| Code source, documentation, scripts d'installation | Fait | |
| Cadre de réentraînement des modèles | Fait côté outil | Cadre rédigé (`docs/REENTRAINEMENT.md`), qualité mesurée sur les données de la plateforme (`/models/quality`), export d'entraînement pseudonymisé. **Aucun modèle appris à ce jour** ; les seuils chiffrés sont des propositions pour le comité ; il manque le consentement « amélioration des modèles », l'AIPD et l'avis de l'APDP. |

## 5. Hors logiciel (non comptés)

Rapport de démarrage, rapport de diagnostic, rapports de mission et techniques, consultations multi-acteurs, validation par le CoPil et le CoTech, 4 sessions de formation des développeurs et administrateurs, 5 sessions de formation des agents (50 participants dont 40 % de femmes et de jeunes, 50 agents formés au scoring), modèle économique de pérennisation sur 3 ans, garantie et support de 6 mois, hébergement à arrêter avec le CoPil.

## 6. Vos points du 20 octobre

| Point | Réponse |
| --- | --- |
| Météo fiable sur le tableau de bord producteur | **Corrigé.** Prévision réelle Open-Meteo (données ouvertes, modèles ECMWF et Météo-France) au centre de la première parcelle du producteur, sinon au centre de son département ; source et heure affichées ; mise en cache 1 h. Sans Internet, la démonstration reprend la main et l'écran affiche « Prévision simulée ». Météo-Bénin reste à raccorder si une API existe. |
| Récolte : quantité stockée ≤ quantité produite | **Déjà en place** : refusé par le serveur si stocké + vendu dépasse la récolte, rappelé dans le formulaire. |
| Chevauchement des parcelles | **Effectif** : comparé à toutes les parcelles **de tous les producteurs du même département**, alerte au-delà de 20 % de recouvrement. Limites inchangées : une parcelle à cheval sur deux départements n'est comparée qu'au sien ; c'est une alerte, pas un blocage. |
| Offre : suspendre, retirer, fermer | **Corrigé** : l'auteur suspend (annonce masquée, reprise possible), marque vendue ou retire (définitif). À la fermeture ou au retrait, les demandes de contact en attente sont refusées et leurs auteurs prévenus. |
| Demande avec prix fixé | **Clarifié** : le prix reste demandé (il sert à pré-calculer le paiement) mais s'intitule « Prix de vente proposé » ou « Prix d'achat proposé » selon l'annonce, avec la mention qu'il est indicatif et que le montant reste modifiable au paiement. |
| Gérer une coopérative | **Corrigé** : un producteur membre du bureau (président, secrétaire, trésorier) voit « Gérer la coopérative » et a les mêmes droits que le gestionnaire (membres, demandes d'adhésion), sans pouvoir décider de sa propre demande. Organisations de filière ajoutées au-dessus des coopératives. |
| Écrire à un agent | **Corrigé** : « Mes messages » a un onglet « Mon agent ATDA » ; l'agent qui suit la commune reçoit le message, répond dans « Messages des producteurs », et le producteur est prévenu aussi par SMS. |
| Assistant natif en fon, yoruba, dendi, bariba, écrit et oral | **Circuit prêt, contenu à produire** : voir § 4. Le prototype ne fabrique pas de texte en langue nationale ; c'est la condition de qualité du TDR (§ 3.4). |
| Corpus par langue et justesse des réponses | **Fait côté outil** : corpus par langue, validation par un second locuteur, justesse mesurée sur les reformulations, file des questions posées par les producteurs, triées par fréquence. |
| Traçabilité des matières premières | **Corrigé** : lots créés depuis une récolte, livrés, transformés ; le code d'un lot remonte jusqu'au producteur, à la parcelle, à la saison et aux intrants reçus avant la récolte. |
| Promotion des services, innovations, financements mobilisés | **Corrigé** : page « Services et innovations » par département et filière, total des financements publiés et des appuis remis. |

## 7. Compléments faits le 20 octobre

- Marché : suspension, reprise, fermeture et retrait d'une annonce ; libellés de prix selon le type d'annonce.
- Coopératives : gestion par le bureau ; organisations de filière (union, fédération, interprofession, OIA, OPA) avec effectifs, réunions, prix convenus et formations.
- Diagnostic : niveau de risque affiché.
- Messagerie producteur et agent.
- Météo réelle (écrans, USSD, SMS) et contexte parcelle et météo transmis à l'assistant.
- Traçabilité : sites géolocalisés, lots, collecte, livraison, transformation, remontée.
- Services, innovations et financements mobilisés.
- Assistant en langues nationales : corpus validé, réponse native, file des questions, mesure de la justesse ; second compte MTDI de démonstration (0197000012) pour montrer la validation.

### Lots A à E (même journée, après la relecture)

- **A, argent des appuis** : créances à échéances (appui remboursable, prêt d'une institution financière, équipement du plateau), paiement en un clic, rappels, taux de recouvrement, revenu du producteur, facteur « Appuis remboursés » du score de crédit.
- **B, terres** : aménagements et travaux, superficies disponible, exploitable et exploitée, analyses de sol lues sans dose, utilisation des terres, risques climatiques par bilan hydrique.
- **C, exploitations** : matériel des producteurs, mécanisation, semences certifiées distribuées en appuis, annuaire des PMEA vérifiés.
- **D, marchés** : relevés de prix réels, stocks et ruptures, analyses prospectives, enquêtes publiques de satisfaction, formations, vitrine des produits.
- **E, pilotage** : suivi-évaluation détaillé, couverture de la consommation nationale, carte commune des acteurs, qualité mesurée des modèles et cadre de réentraînement.

Aucun de ces écrans n'a été vu dans un navigateur : ils sont vérifiés par des tests du serveur et de l'application, pas par un parcours à l'écran. Les nouveaux écrans de D et de E partent vides dans la démonstration : les pas 34 à 38 de `docs/DEMO.md` les remplissent à la main.

## 8. Ajouts sans lien avec le TDR, ou incohérents

- **Pages « Collecte » et « Offres »** : toujours remplies de données écrites dans le code (`frontend/src/features/supply/demo.ts`). La traçabilité réelle est dans « Traçabilité », et les stocks réels dans la nouvelle page « Stocks et ruptures » ; ces deux pages sont à retirer ou à brancher dessus. L'encart des récoltes attendues de la page « Marché » reste aussi de la démonstration.
- **Traduction de l'interface** : utile, mais distincte de l'exigence du TDR (assistant en langue nationale), désormais couverte par le corpus.
- **Sélection de bénéficiaires sur 200 000 fermes synthétiques** réparties à égalité entre départements : le calcul est réel, les données non ; les chiffres ne se recoupent pas avec le tableau de bord (10 053 contre 16 667 en Alibori).
- **Parcelle de démonstration de 97,75 ha** pour un petit producteur, d'où une récolte estimée à 146 tonnes.
- **Carte producteur avec code de vérification** et **page d'accueil en 3D** : absents du TDR, sans incohérence.
