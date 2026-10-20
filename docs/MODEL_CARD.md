# Fiche descriptive des grilles de score

Deux grilles transparentes, sans apprentissage automatique en v1 : (1) score de sélection des bénéficiaires (UC-17), (2) score de crédit (UC-19, UC-20). Les poids ci-dessous sont les valeurs par défaut du prototype, **non calibrées sur des données réelles**. Si le code (`backend/apps/programs`) diffère, le code fait foi et ce document doit être mis à jour.

## 1. Score de sélection des bénéficiaires

- Usage prévu : classer des exploitations pour proposer une liste de bénéficiaires à un agent. Le résultat est une **proposition** (statut `proposition`) ; un agent différent du lanceur la valide avec un motif (art. 401).
- Usage exclu : décision automatique, exclusion définitive, évaluation d'une personne.
- Données : exploitations du POC (`farms_analyzed.json`) : `conf`, `road`, `a`, `maize`. Filtre par défaut : `maize = 1` (maïs détecté) et, si fourni, département.

| Facteur | Champ source | Transformation | Poids par défaut | Sens |
| --- | --- | --- | --- | --- |
| Confiance de détection | `conf` | normalisation min-max sur les candidats | 0,4 | plus la détection est sûre, plus le score monte |
| Distance à la route | `road` (m) | 1 - normalisation min-max | 0,3 | plus l'exploitation est proche d'une route, plus le score monte |
| Taille de l'exploitation | `a` (ha) | normalisation min-max, plafonnée au 99e centile | 0,3 | plus l'exploitation est grande, plus le score monte |

Score = somme des contributions (poids x valeur normalisée), entre 0 et 1. Rang par score décroissant ; les `target_count` premiers sont `selected`. Les poids sont fixés avant le calcul, enregistrés avec le résultat (`selection_run.weights`) et modifiables par le responsable de programme (somme ramenée à 1).

Limites :
- Le critère distance favorise les exploitations proches des routes : il peut écarter les plus isolées, souvent les plus vulnérables. À discuter avec le MAEP selon l'objectif du programme (efficacité logistique ou équité).
- Le critère superficie favorise les grandes exploitations. Pour un programme d'appui aux petits producteurs, inverser ou retirer ce poids.
- Détection satellite d'origine non documentée, date d'acquisition inconnue, erreurs possibles sur cultures associées.
- Exploitation non rattachée à un producteur identifié dans le prototype.

## 2. Score de crédit

- Usage prévu : aide à l'appréciation par un agent financier d'un producteur qui a donné un consentement explicite et révocable. La décision de crédit reste hors plateforme.
- Accès : seulement si le consentement est actif ; chaque consultation est journalisée et visible par l'auditeur.

| Facteur | Source | Transformation | Poids par défaut |
| --- | --- | --- | --- |
| Fiche validée et ancienneté | `producer.validated_at` | 0 si non validée, puis croissant jusqu'à 3 campagnes | 0,2 |
| Superficie cultivée | somme `parcel.area_ha` (calculée serveur) | plafonnée, normalisée | 0,2 |
| Campagnes suivies jusqu'à la récolte | `campaign.stage = recolte` | part des campagnes complètes | 0,25 |
| Appuis remboursés | échéances des créances `appui` et `pret` (`production.Installment`) | part des échéances **échues** déjà payées ; neutre (0,5) tant qu'aucune n'est échue | 0,25 |
| Diversification | nombre de filières | 1 filière : 0 ; 2 ou plus : 1 | 0,1 |

Score affiché sur 100 avec, pour chaque facteur : nom, poids, valeur (0 à 1), contribution (points sur 100). Mention renvoyée par l'API : "Aide à la décision. La décision de crédit revient à une personne (art. 401)." Implémentation : `backend/apps/credit/services.py`. Superficie plafonnée à 10 ha ; ancienneté = min(1, nombre de campagnes / 3) si la fiche est validée ; sans campagne, facteur récolte neutre (0,5). Depuis le lot « recouvrement » (20 octobre 2026), le facteur "Appuis remboursés" suit les échéances réellement payées ; sans échéance échue il reste neutre (0,5). Les poids n'ont pas changé.

Données jamais utilisées : sexe, âge, langue, commune en tant que telle, données sensibles (art. 394), contenu des questions à l'assistant.

Limites : aucune calibration sur des remboursements réels ; peu de données pour un nouveau producteur (score neutre, pas défavorable) ; les données déclaratives non vérifiées peuvent biaiser le score.

## 3. Contestation

- Sélection : un producteur ou un agent pour son compte conteste via `POST /selection-runs/{id}/contest` (`farm_id`, motif). Statut `deposee`, traitée par un agent qui motive sa réponse ; journalisé.
- Crédit : le producteur voit ses facteurs, peut signaler une donnée inexacte (correction par l'agent, nouvelle version de la fiche) et retirer son consentement à tout moment.

## 4. Évolution

Calibration sur données réelles avec scikit-learn seulement après AIPD finale (art. 428), en gardant un modèle explicable (régression logistique) et un suivi des écarts par département et par sexe.

## 5. Risques climatiques et lecture des analyses de sol

Deux modèles **à règles**, sans apprentissage : leurs seuils sont des repères agronomiques généraux, **non validés**. Ils doivent être relus par l'INRAB avant tout usage opérationnel.

- Risques climatiques (`apps/lands/climate.py`). Données : pluie et évapotranspiration de référence (ET0) des 14 derniers jours et prévision de 7 jours, Open-Meteo, au centre de la parcelle ; sans réseau, pluie de démonstration et ET0 fixe de 4,5 mm/jour, signalées `simulated`.
  - Stress hydrique : pluie reçue ÷ (coefficient cultural du stade × ET0 cumulée). Coefficients : semis 0,4 ; croissance 0,8 ; floraison 1,15 ; récolte 0,6. Moins de 0,4 : élevé ; moins de 0,7 : moyen.
  - Sécheresse : nombre de jours de suite sans 1 mm de pluie. 10 jours ou plus : élevé ; 6 : moyen. 10 mm ou plus annoncés dans les 3 jours retirent 3 jours à la série.
  - Inondation : plus forte pluie cumulée sur 3 jours dans la prévision. Plateau : moyen à 50 mm, élevé à 80 ; périmètre irrigué : 45 et 70 ; bas-fond : 35 et 60.
  - Limites : le point est le centre de la parcelle (maille d'environ 1 km), le stade est celui de la dernière campagne déclarée, la texture et le drainage du sol ne sont pas pris en compte, aucune confrontation à des sinistres observés.
- Lecture des analyses de sol (`apps/lands/services.py`). pH eau : très acide sous 5,0 ; acide sous 5,5 ; légèrement alcalin au-dessus de 7,0 ; très alcalin au-dessus de 7,8. Matière organique : très faible sous 1 % ; faible sous 2 %. Phosphore assimilable (Bray 1) : faible sous 8 ppm ; moyen sous 15 ppm. Les textes sont qualitatifs et **ne donnent jamais de dose** : la recommandation chiffrée revient à l'agent ou à l'INRAB (même règle que l'assistant).
- Mise à jour : quand l'INRAB fournit des seuils par culture et par zone, les remplacer dans `KC`, `FLOOD_MM` et `interpret`, puis compléter cette section.
