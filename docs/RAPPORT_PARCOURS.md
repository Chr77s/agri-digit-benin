# Déroulé de DEMO.md dans le navigateur, 21 octobre 2026

Les étapes de `docs/DEMO.md` ont été rejouées avec les comptes de démonstration, dans le navigateur intégré, sur la base existante (une partie des étapes avait déjà été jouée la veille : les doublons sont refusés proprement). Le tracé sur carte, la saisie en langue nationale, le hors ligne et les conflits n'ont pas été exécutés (voir la fin).

## Résultat par étape

| Étape | Profil | Résultat |
| --- | --- | --- |
| 1 Inscription | public | Les 5 pas passent ; l'envoi renvoie « déjà inscrit, fiche BJ-AGR-2026-000043 » (doublon NPI et téléphone refusé avec le bon code) |
| 2 Validation | agent ATDA | Codjo GOUNOU validé, producteur notifié, SMS de validation dans la boîte d'envoi |
| 3 Parcelle, campagne | producteur | Campagnes et parcelles présentes ; tracé GPS refuse sans position (message clair) ; tracé sur carte non exécuté |
| 4 Assistant | producteur | Réponse sourcée ; question de dosage transmise à l'agent |
| 5 Alerte | agent | Enregistrer puis envoyer : 2 messages livrés |
| 6 Sélection | programme, agent | Proposition Alibori calculée ; validation avec motif et case d'échantillon ; contestation de 15 jours ouverte |
| 7 Candidature | producteur | Candidatures déposées ; le programme clos affiche « Les candidatures sont closes. » |
| 8 Crédit | producteur, financier | Consentement actif ; score 68/100 avec ses facteurs ; consultation au journal |
| 9 Audit, export | auditeur, admin | Journal avec chaîne intègre (185 entrées) ; export refusé sous 10 caractères, accepté avec motif, visible au journal |
| 10 Tableau de bord | admin | Filtre Alibori, chiffres avec source, « non disponible » |
| 11 Carte | producteur, public | Code à 8 caractères ; page publique : nom et statut seulement ; code inconnu refusé |
| 12 Coopérative | gestionnaire | Ajout par code, fin d'adhésion avec motif, historique visible |
| 13 Appuis, récoltes | agent, producteur | Remise, confirmation, récolte signalée |
| 14 Marché, paiement | transformateur, distributeur | Offre publiée, contact (numéro masqué), paiement refusé sur numéro en 0 puis accepté, reçu |
| 15, 19 Diagnostic | producteur, agronome | Photo envoyée, « Pas sûr ? » avec message, relecture enregistrée |
| 16, 32 Langues | MTDI | Page ouverte, question en attente visible ; rien saisi (pas de locuteur) |
| 17 SEA, satellite | programme | Cases masquées sous 5, impact « non causal » |
| 18 USSD, SMS | agent | `*000#` : prix 180/186, appuis confirmés ; SMS `METEO` : réponse Open-Meteo |
| 20 Appui incomplet | producteur | Signalement « Il en manque une partie », appui reste à confirmer |
| 21 Contestation | programme, producteur, agent | Refus motivé, contestation, badge « Contestée » côté agent |
| 22 Adhésion | producteur, gestionnaire | Non rejoué : aucune autre coopérative dans le département du producteur de démonstration |
| 23 Partager | producteur, marché | Rappel « prix du jour » à la publication ; reçu avec lecture, partage, impression |
| 25 Récolte signalée | producteur, agent | Récolte à -86 % signalée, vérifiée avec quantité corrigée et motif |
| 26 Messages | producteur, agent | Message et réponse dans les deux sens |
| 27 Annonce | producteur | Suspendre puis reprendre |
| 28 Bureau | producteur président | Page de gestion ouverte (voir défaut 1) |
| 29 Traçabilité | gestionnaire, transformateur | Lot, livraison, transformation en farine, remontée jusqu'au producteur |
| 30 Organisations | agent | Réunion ajoutée |
| 31 Services | producteur, admin | Offres et total des financements |
| 33 Météo | producteur | Prévision Open-Meteo avec source |
| 34 Remboursement | producteur, financier | Paiement refusé puis accepté, créance ouverte par le financier |
| 35 Terres | agent | Aménagement : démarrer puis terminer ; analyse de sol saisie |
| 36 Semences | agent | Remise : stock du lot 380 à 360 kg |
| 37 Couverture, modèles | admin, agronome | Source obligatoire refusée sans source ; taux « non disponible » sous 5 cas |
| 38 Prix, enquêtes, formations | agent, public | Relevé en double refusé, prix à 25 000 refusé ; enquête : réponse puis « vous avez déjà répondu » ; formation programmée |

## Défauts constatés

1. **Producteur président, « Ajouter un membre »** : la liste ne propose que lui-même (déjà membre), le formulaire est inutilisable. Masquer le bouton ou ouvrir la saisie par code, comme pour le gestionnaire.
2. **Gestionnaire, « Ajouter un membre »** : le champ s'intitule « Identifiant du producteur (fourni par l'agent ATDA) » mais DEMO.md et le serveur acceptent le code `BJ-AGR-…`. Renommer le champ.
3. **Assistant** : « Comment protéger mon maïs contre la chenille ? » reçoit une fiche sur le Striga (plante parasite). La recherche extractive remonte une fiche voisine sans rapport.
4. **Codes bruts affichés** : « alibori · Maïs » (organisations), « alibori » (sites de traçabilité), « banikoara » (chemin d'un lot). Passer par `usePlaceName`.
5. **Pluriel** : « 1 producteurs », « 1 alertes » dans les cartes de chiffres.
6. **Journal d'audit** : actions brutes (`auth.login`, `credit.score_view`) et identifiants (`Compte 2e7f88c4-…`), difficile à lire pour un auditeur.
7. **Tracé de carte** : la barre d'actions de Leaflet déborde de la carte à 1100 px.
8. **Erreur dans une boîte de dialogue qui défile** (relevé de prix en double) : le message est en bas, hors de la vue.
9. **Alertes** : « Enregistrer » puis « Envoyer » en deux temps, avec la liste des alertes très bas sur la page.
10. **Fiche producteur** : le bloc « Décision sur l'inscription / Contrôles avant de valider » reste affiché après la validation.
11. **MTDI** : 1 155 boutons « Proposer un texte » identiques, 50 par page.
12. **Suivi satellite** : quatre mentions de démonstration sur un écran.
13. **Marché** : le rappel « prix du jour » montre Banikoara et Kandi alors que l'annonce est à Parakou.
14. **Messages** : « Choisissez une conversation à gauche » sur un écran à une colonne.
15. **Formation** : le public visé affichait aussi « Distributeur » alors que seul « Transformateur » avait été coché (à confirmer : case cochée par défaut ?).

Corrigés ensuite (défauts 1 à 6, avec tests) : le président et le gestionnaire saisissent le **code** du producteur (champ « Code du producteur », plus de liste du registre) ; l'assistant ne cite plus une fiche qui ne partage que « maïs » avec la question (mots d'action comme « contre » ou « lutter » ignorés, et une fiche doit porter plus de la moitié des mots de la question : la question sur la chenille répond désormais « aucune fiche publiée ne couvre cette question », la fiche chenille n'étant qu'à l'état de brouillon ; la question « taches sur le manioc » reçoit la même réponse faute de fiche qui parle de taches) ; les départements et communes s'affichent par leur nom (organisations, sites, chemin d'un lot) ; « 1 producteur », « 1 alerte » au singulier ; le journal d'audit écrit l'action en français (le code brut reste en infobulle, dans le détail et dans l'export CSV) et abrège l'identifiant de l'objet.

Corrigés enfin (défauts 7 à 15) : la barre « Terminer / Effacer / Annuler » du tracé s'empile à toute largeur (mesurée à 1100 px, dans la carte) ; une erreur qui apparaît en bas d'une boîte de dialogue qui défile entre dans la vue ; après « Enregistrer l'alerte », la page descend vers la liste où se trouve « Envoyer l'alerte » ; la fiche producteur validée n'affiche plus les contrôles ni la consigne de décision ; la liste des traductions du MTDI s'ouvre sur les textes proposés à noter (« À traduire » en un clic) au lieu des 1 155 textes à traduire ; le suivi satellite ne répète plus la mention de démonstration ; le rappel de prix d'une annonce indique le département d'un prix qui vient d'ailleurs ; « conversation à gauche » devient « dans la liste ». Le défaut 15 n'en était pas un : « Distributeur » est coché par défaut dans le formulaire de formation, avec « Transformateur » (case visible).

Corrigés dans ce passage : la case piège de l'enquête publique était visible (« Ne pas remplir ce champ ») ; la mention du chemin `docs/REENTRAINEMENT.md` s'affichait aux utilisateurs de « Qualité des modèles ».

## Effet de la simplification de l'interface

Aucune régression trouvée : la liste des producteurs s'ouvre par le nom (le bouton « Instruire » est retiré), l'écriture d'une alerte reste dans le menu de l'agent, la synchronisation reste visible dès qu'un envoi attend.

## Non exécuté

- **Étape 3, tracé sur carte** : les clics émulés n'atteignent pas la carte ; seul le message GPS refusé a été vu.
- **Étapes 16 et 32, saisie en fon ou en bariba** : DEMO.md l'interdit sans locuteur présent.
- **Étape 24, hors ligne** et **étape 17, conflits de rejeu** : demandent de couper le réseau du navigateur.
- **Étape 36, matériel entre deux producteurs** : un seul producteur de démonstration possède un tracteur.
- **Étape 1, variante NPI `1000000004`** (consentement parental) et **étape 22** (demande d'adhésion).
- Aucun test sur un vrai téléphone.
