# Cadre de réentraînement des modèles

Réponse au TDR § 3.4 (qualité : cadre de réentraînement). Ce document dit **quels modèles** la plateforme porte, **quelles données** il faut pour les entraîner et les juger, **quand** les réentraîner, **qui décide**, et **comment revenir en arrière**. Il s'accompagne de trois outils réels : la mesure de qualité sur les données de la plateforme (`GET /models/quality`, page « Qualité des modèles »), l'export d'un jeu d'entraînement pseudonymisé (`manage.py export_training_set`) et la conservation de la réponse du modèle de diagnostic (`Diagnosis.predicted_pathology`).

**État honnête.** Aucun modèle appris n'est en service : le diagnostic est une simulation, les autres « modèles » sont des grilles ou des règles (`docs/MODEL_CARD.md`). Les seuils chiffrés de ce document sont des **propositions** que le comité (§ 6) doit arrêter avant usage ; ils ne viennent d'aucune donnée réelle de la plateforme. Les valeurs « n = 5 » (aucune valeur sous 5 cas) et « n = 30 » (indicative sous 30 cas) sont celles que la plateforme applique déjà.

## 1. Modèles concernés

| Modèle | Nature aujourd'hui | Ce qu'on entraîne ou étalonne | Mesure en place | Mesurable aujourd'hui |
| --- | --- | --- | --- | --- |
| Diagnostic photo | Simulation tirée du hachage de l'image (`integrations/diagnosis.py`) | Classifieur d'images par filière (pathologies de la liste INRAB) | Renvoi à l'agronome, confirmation par l'agronome, tendance mensuelle | Oui, sur la simulation (bandeau « Simulation ») |
| Prévision de rendement | Rendement de référence × surface (`ReferenceYield`, valeurs de démonstration) | Régression par filière : surface, variété, semis, pluie, sol, intrants | Écart absolu moyen, écart relatif, biais, par filière | Oui, contre la quantité déclarée puis corrigée |
| Score de crédit | Grille à cinq facteurs (`docs/MODEL_CARD.md` § 2) | Régression logistique explicable (`MODEL_CARD.md` § 4) | Taux d'échéances échues payées par tranche de score | Seulement au-delà de 30 échéances échues |
| Risque climatique | Règles sur la pluie et l'ET0 (`apps/lands/climate.py`) | Seuils étalonnés sur des sinistres observés | Aucune | Non : aucun sinistre n'est enregistré |
| Lecture des analyses de sol | Seuils généraux (`apps/lands/services.py`) | Seuils par culture et par zone, fournis par l'INRAB | Aucune | Non : aucune référence INRAB chargée |
| Sélection des bénéficiaires | Grille pondérée sur les fermes du POC (`MODEL_CARD.md` § 1) | Pas d'apprentissage prévu ; évaluation d'équité et d'efficacité | Aucune | Non : aucune issue rattachée aux sélectionnés |

La page « Qualité des modèles » affiche pour chaque modèle ce qu'elle mesure, sur combien de cas (`n`), et pourquoi elle ne mesure pas le reste. Elle ne remplace pas le jeu de référence du § 3.

## 2. Données à collecter et protocole d'étiquetage

**Diagnostic photo.** Une ligne = une photo (JPEG ou PNG réencodé, sans EXIF), sa filière, la réponse du modèle (`predicted_pathology`, conservée depuis cette version), l'étiquette de l'agronome. Protocole :
1. L'étiquette est la pathologie retenue par l'agronome à la relecture (liste de codes de `integrations/diagnosis.py`, plus « autre » avec commentaire). Elle ne compte comme étiquette d'entraînement que si elle a été donnée par un agronome, jamais déduite de la réponse du modèle.
2. Sur 10 % des cas relus, une seconde lecture indépendante par un autre agronome ; désaccord : troisième avis INRAB. On suit le taux d'accord entre lecteurs, qui borne la justesse atteignable.
3. Un échantillon de 20 % des relectures se fait **à l'aveugle** (l'agronome ne voit pas la réponse du modèle), pour que la confirmation ne soit pas influencée par elle.
4. Une photo avec une personne, floue ou hors sujet est écartée et comptée (la consigne de prise de vue est déjà affichée).
5. Toutes les photos d'une même parcelle vont du même côté (entraînement ou validation), pour éviter la fuite entre les deux.

**Prévision de rendement.** L'étiquette idéale est un **rendement pesé** (carrés de rendement par l'agent sur un échantillon de parcelles par département et par filière). La quantité déclarée est un substitut, d'où le champ `label_quality` du jeu exporté (`declaree` < `confirmee` < `corrigee`) : l'entraînement pondère par fiabilité. Variables : surface mesurée, surface exploitable, type de terrain, variété, mois de semis, pluie cumulée, intrants reçus, saison.

**Score de crédit.** L'issue est « échéance échue payée ». Il faut l'**instantané** des facteurs à la date de la consultation : aujourd'hui seul le score est journalisé (`credit.score_view`) ; avant le premier entraînement, journaliser aussi les cinq facteurs. Population : producteurs avec consentement crédit actif seulement. Le facteur « Appuis remboursés » ne doit pas servir à prédire les remboursements (la mesure l'écarte déjà).

**Risque climatique et sols.** Sinistres déclarés par les agents (type, date, parcelle) et analyses de laboratoire rapprochées d'un rendement observé. Rien n'est collecté aujourd'hui : c'est un chantier de collecte avant tout étalonnage.

## 3. Jeux de validation

Jamais utilisés pour entraîner, versionnés (empreinte du fichier) et décrits par un fichier de description.
- **Diagnostic** : jeu de référence constitué et validé par l'INRAB, au moins 50 photos par classe et 30 par classe rare, stratifié par filière, photos prises avec des téléphones de producteurs. Renouvelé d'un cinquième chaque année. Le test se fait aussi **par département** non vu à l'entraînement (généralisation).
- **Rendement** : validation **dans le temps** (entraînement sur les saisons passées, test sur la dernière), jamais tirage au hasard ; résultats par filière et par département.
- **Crédit** : validation par cohortes de dates de décision.
- Un taux n'est affiché que sur au moins 5 cas et signalé indicatif sous 30 ; toute décision de seuil s'appuie sur un intervalle de confiance, pas sur un taux seul.

## 4. Métriques et seuils de déclenchement (propositions à arrêter par le comité)

| Modèle | Métrique de suivi | Alerte : étudier un réentraînement | Blocage : retour à la version précédente ou retrait |
| --- | --- | --- | --- |
| Diagnostic | Justesse sur le jeu de référence INRAB ; rappel des maladies à risque « élevé » | Justesse sous 85 % ou rappel « élevé » sous 90 % | Justesse sous 75 % ou rappel « élevé » sous 80 % |
| Diagnostic (en service) | Taux de confirmation par l'agronome (≥ 30 cas relus par mois) ; part renvoyée à l'agronome | Confirmation sous 75 % deux mois de suite ; renvoi au-dessus de 40 % ou sous 5 % | Confirmation sous 60 % |
| Rendement | Écart relatif moyen par filière (≥ 30 récoltes) ; biais | Écart au-dessus de 30 % ou biais au-delà de ± 10 % | Écart au-dessus de 50 % |
| Crédit | AUC sur cohorte ; monotonie du taux de paiement par tranche de score ; écart de score moyen entre femmes et hommes, moins de 35 ans et plus, à caractéristiques égales | AUC sous 0,65 ; inversion de la monotonie ; écart au-delà de 5 points | AUC sous 0,60 ou écart au-delà de 10 points : retour à l'aide à la décision sans score |
| Tous | Dérive d'entrée : indice de stabilité de population (PSI) sur chaque variable | PSI au-dessus de 0,2 | PSI au-dessus de 0,3 sur une variable principale |

Un modèle appris n'entre en service qu'au-dessus des seuils d'alerte sur le jeu de référence. Une alerte ouvre un dossier au comité ; un blocage déclenche le retour arrière du § 7 sans attendre sa réunion.

## 5. Surveillance de la dérive

- **Déjà en place** : la page « Qualité des modèles » donne chaque mois le nombre de diagnostics, la part renvoyée à l'agronome et le taux de confirmation ; l'écart d'estimation de rendement par filière ; le taux de paiement par tranche de score une fois 30 échéances échues.
- **À ajouter avec le premier modèle appris** : PSI mensuel des variables d'entrée (surface, filière, département, confiance du modèle) par rapport à la période d'entraînement ; répartition des classes prédites ; alerte quand la répartition s'écarte.
- Le responsable désigné (§ 6) relit la page chaque mois et consigne dans le journal d'audit toute décision de réentraîner, de bloquer ou de maintenir.

## 6. Gouvernance

- **Comité de suivi des modèles** : MAEP (DSA ou DPP, président), INRAB (relecture des étiquettes et du jeu de référence), ATDA (agents qui étiquettent), MTDI (technique), point focal de la protection des données, un représentant des organisations de producteurs. Réunion trimestrielle, extraordinaire sur blocage.
- **Avant tout entraînement sur de nouvelles données** : AIPD à jour (art. 428) et avis ou déclaration à l'APDP si le traitement change de finalité. Les consentements actuels (`donnees_personnelles`, `parental`, `credit`) ne couvrent pas l'**amélioration des modèles** : un consentement distinct, retirable, est à ajouter avant le premier export réel. La commande d'export n'est donc qu'un outil technique : elle exclut déjà les producteurs sans consentement « données personnelles » actif, ce qui est un minimum, pas la base légale.
- **Droit de retrait** : le retrait d'un consentement exclut la personne de l'export suivant ; les modèles déjà entraînés sont documentés (date, jeu, empreinte) et réentraînés à la prochaine version sans ses données.
- **Relecture INRAB** : étiquettes du jeu de référence, liste des pathologies et niveaux de risque (`RISK`, aujourd'hui de démonstration), rendements de référence (`ReferenceYield`, aujourd'hui de démonstration).
- **Équité** : chaque version d'un score est évaluée par sexe, classe d'âge et département avant mise en service (`MODEL_CARD.md` § 4).

## 7. Versionnement et retour arrière

- Chaque modèle appris a une version `<modèle>-<année>.<n>` (par exemple `diag-2027.1`) et sa fiche (`MODEL_CARD.md`) : jeu d'entraînement (empreinte du fichier de description), jeu de référence, métriques, date, auteur, décision du comité.
- À la mise en service du premier modèle appris, chaque diagnostic et chaque score enregistre la version qui l'a produit (champ à ajouter alors ; la simulation actuelle n'en a pas besoin).
- Déploiement en trois temps : **ombre** (le modèle répond sans être montré, on compare), **10 % des cas**, **100 %**. À chaque palier, les seuils du § 4 s'appliquent.
- **Retour arrière** : la version précédente reste installée et sélectionnable par configuration (`get_backend()` pour le diagnostic) ; la bascule se fait sans migration de données. Critères : seuil de blocage franchi, incident de sécurité, ou décision du comité. Pour le score de crédit, le retour arrière est la grille transparente actuelle.
- Les diagnostics produits par une version retirée restent consultables avec la mention de leur version.

## 8. Calendrier

| Quand | Quoi |
| --- | --- |
| Chaque mois | Lecture de la page « Qualité des modèles » et des PSI ; consignation dans le journal |
| Chaque trimestre | Comité : alertes ouvertes, taux d'accord des lecteurs, équité |
| Avant la campagne (février–mars) | Gel de la version, vérification sur le jeu de référence, contrôle des rendements de référence |
| Après la campagne (décembre–janvier) | Export du jeu d'entraînement, réentraînement candidat, validation sur le jeu de référence, décision du comité, déploiement progressif |
| Chaque semestre | Réévaluation complète sur le jeu de référence, même sans alerte |
| Chaque année | Renouvellement d'un cinquième du jeu de référence, revue de l'AIPD et des consentements |

## 9. Outils livrés

- `GET /models/quality` (administration, responsable de programme, agronome, auditeur) et la page « Qualité des modèles ». Chaque mesure porte son `n` ; sous 5 cas la valeur est absente (jamais 0) ; le diagnostic simulé est signalé. Limites : les relectures de l'agronome portent sur les cas douteux (le taux de confirmation sous-estime la justesse là où le modèle est sûr) ; la « vérité » du rendement est déclarative ; les anciennes relectures (avant `predicted_pathology`) sont exclues du taux de confirmation ; le score est recalculé aujourd'hui, pas celui vu lors du prêt.
- `python manage.py export_training_set <diagnostic|rendement> --output <dossier> [--with-images]` : écrit un fichier CSV et son fichier de description (champs, effectifs par étiquette, filtres, empreinte SHA-256 du fichier, données exclues). Aucun nom, téléphone, NPI, code producteur, identifiant de la base ni coordonnée exacte ; l'identifiant d'une ligne est une empreinte salée par la clé du serveur ; les dates sont au mois, les surfaces arrondies à 0,1 ha ; l'image est référencée par l'empreinte de son contenu (copiée sous ce nom avec `--with-images`). Seuls les producteurs avec un consentement « données personnelles » actif sont repris ; l'export est journalisé (`training_set.export`).
- Le fichier exporté sort de la plateforme : il se protège et se conserve comme une donnée personnelle pseudonymisée (accès limité, durée fixée par l'AIPD).

## 10. Ce que ce cadre ne fait pas

Il ne livre aucun modèle entraîné, aucune étiquette réelle ni aucune image de l'INRAB. Il ne fixe pas les seuils : il les propose. Il ne remplace ni l'AIPD, ni l'avis de l'APDP, ni le consentement spécifique à l'amélioration des modèles, qui restent à obtenir.
