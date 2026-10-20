# Conformité du prototype au TDR (révision du TDR « Agri-Digit Bénin »)

Relecture du 20 octobre 2026 : TDR lu en entier, chaque exigence confrontée au code, puis compléments développés le même jour (section 7). Légende : **Fait** (réel et testé), **Simulé** (l'écran existe, les données sont fictives), **Partiel** (une partie seulement), **Absent**.

## Verdict

Le prototype ne couvre pas encore 99 % du TDR. Sur les **66 exigences logicielles** des tableaux ci-dessous : 30 faites (45 %), 6 simulées, 21 partielles, 9 absentes. Le matin du 20 octobre, sur 64 : 15 faites (23 %), 8 simulées, 14 partielles, 27 absentes.

Ce qui empêche d'aller plus loin ne dépend plus seulement du code :

1. **Le contenu en langues nationales.** Le circuit est prêt (corpus, validation par un second locuteur, mesure de la justesse, file des questions posées), mais aucun texte en fon, bariba, yoruba ou dendi n'existe tant que le MTDI ne l'a pas écrit. La machine n'en invente pas.
2. **Les données réelles** : modèle de diagnostic validé par l'INRAB, rendements de référence, imagerie satellite, prix des marchés (SIM), raccordements X-Road, ANIP, Mobile Money et opérateur SMS.
3. **Trois maillons non développés** : aménagements (réhabilitation, entretien des périmètres), mécanisation, enquêtes de satisfaction des consommateurs.

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
| Transformation | Prix brut et transformé | Partiel : prix des annonces et prix convenus par les organisations ; relevés de marché simulés |
| Transformation | Renforcement du plateau, recouvrement | Fait (équipement remis à un transformateur en créance remboursable ; formations enregistrées) |
| Distribution | Distributeurs, magasins, points de vente par GPS | Fait (sites « point de vente ») |
| Distribution | Stocks et anticipation des ruptures | Partiel : stocks réels par lot ; pas d'anticipation des ruptures |
| Distribution | Prix | Partiel (prix des annonces ; relevés simulés) |
| Distribution | Enquêtes de satisfaction des consommateurs | Absent |
| Gouvernance | Interprofessions, OIA, fédérations | Fait (organisations de filière : union, fédération, interprofession, OIA, OPA) |
| Gouvernance | Coopératives et effectifs | Fait (membres, effectifs par organisation dont femmes) |
| Gouvernance | Fonctionnement des interprofessions, mécanismes de prix, renforcement des capacités | Fait (assemblées, réunions, prix convenus, formations avec femmes et jeunes) |
| Suivi-évaluation | Production par filière, effectifs, impact des appuis | Partiel (indicateurs SEA) |
| Suivi-évaluation | Taux de couverture de la consommation nationale, importations, tendances, veille | Absent |
| Suivi-évaluation | Cartographie des acteurs | Partiel (fermes POC, parcelles, sites géolocalisés ; pas encore de carte commune) |

## 3. Services aux acteurs (§ 3.1)

| Acteur | Service | État |
| --- | --- | --- |
| Tous | Météo | Fait (Open-Meteo, données ouvertes, au point de la parcelle ; repli signalé si le service ne répond pas). Météo-Bénin non raccordé. |
| Tous | Prix | Simulé (relevés de marché) |
| Tous | Conseil par l'assistant | Fait (français) |
| Tous | Disponibilités en produits | Fait (marché) |
| Tous | Services de partenaires : e-banking, assurance, publicité | Fait (« Services et innovations », par département et filière) |
| Tous | Promotion des innovations, financements mobilisés au bénéfice des filières | Fait (publications, total des financements et des appuis) |
| Tous | Analyses prospectives des marchés | Absent |
| Producteur | Mise en relation avec un transformateur, appui à la vente | Fait (marché, suspension, retrait et fermeture d'une annonce) |
| Producteur | Échange avec son agent | Fait (messagerie, réponse aussi par SMS) |
| Producteur | Accès aux PMEA de la zone | Fait (annuaire par département et service, entreprises vérifiées par l'agent de la zone) |
| Producteur | Suivi du revenu | Fait (ventes déclarées − dépenses déclarées − remboursements payés, par campagne) |
| Producteur | Paiement en un clic des appuis reçus | Fait (prochaine échéance, FakePay simulé) |
| Transformateur, distributeur | Mise en relation, paiement en un clic | Fait |
| Transformateur, distributeur | Prévision des récoltes | Simulé |
| Transformateur, distributeur | Circuit de collecte | Fait (mise en lot depuis la récolte, livraison) |
| Transformateur, distributeur | Renforcement des capacités, promotion des produits | Partiel (formations, annonces du marché) |
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
| Cadre de réentraînement des modèles | Absent | À rédiger dans le rapport final. |

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

## 8. Ajouts sans lien avec le TDR, ou incohérents

- **Pages « Collecte » et « Offres »** : toujours remplies de données écrites dans le code (`frontend/src/features/supply/demo.ts`). La traçabilité réelle est dans « Traçabilité » ; ces deux pages sont à retirer ou à brancher dessus.
- **Traduction de l'interface** : utile, mais distincte de l'exigence du TDR (assistant en langue nationale), désormais couverte par le corpus.
- **Sélection de bénéficiaires sur 200 000 fermes synthétiques** réparties à égalité entre départements : le calcul est réel, les données non ; les chiffres ne se recoupent pas avec le tableau de bord (10 053 contre 16 667 en Alibori).
- **Parcelle de démonstration de 97,75 ha** pour un petit producteur, d'où une récolte estimée à 146 tonnes.
- **Carte producteur avec code de vérification** et **page d'accueil en 3D** : absents du TDR, sans incohérence.
