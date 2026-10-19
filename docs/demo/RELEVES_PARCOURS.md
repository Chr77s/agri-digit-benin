# Relevés des parcours (19 octobre 2026, clone neuf)

Libellés et valeurs vus à l'écran, pour le document qui ordonne la démo. Instance : clone neuf lancé par `start.bat reset`, numéros des étapes de `DEMO.md`.

## Ordre imposé par les données

- 1 → 2 → 22 → 12 : Awa SABI doit être inscrite puis validée avant de demander l'adhésion ; c'est aussi le seul nouveau membre possible pour l'étape 12 (les autres producteurs validés de l'Alibori sont déjà membres).
- 7 → 21 : candidater, refuser (responsable de programme), contester (producteur), décider (agent).
- 6 : le responsable lance, un agent valide (pas le même compte).
- 13 → 20 : remettre l'appui avant de le signaler ou de le confirmer.
- 15 et 19 : préparer `docs/demo/photo-feuille-douteuse.jpg` (46 %, part à l'agronome) et `photo-feuille-nette.jpg` (84 %, « Pas sûr ? »).
- 5, 4, 25 avant 10 et 17 : sinon « Alertes envoyées 0 », « Questions à l'assistant 0 ».
- 9 (journal) en dernier : il ne contient que ce qui a été fait depuis la remise à zéro.

## Pas revérifié le 19 octobre

- 3 (tracé de la parcelle) : fait par la session précédente ; aujourd'hui seulement la page relevée (voir plus bas). Le tracé à la souris dans le volet de test n'est pas fiable.
- 24 (agent hors ligne) : pas de coupure réseau possible dans le volet de test. Couvert par les tests automatiques de la file d'envoi.
- Export CSV (étape 9) : formulaire relevé, bouton non cliqué (téléchargement).

## 3. Parcelles (Bio GOUNOU)

- « Mes parcelles » : carte Leaflet centrée sur Banikoara, outils « Dessiner le contour de la parcelle », « Modifier le contour », « Effacer le contour » ; « Utilisez l'outil de tracé en haut de la carte, puis touchez le premier coin pour fermer la parcelle. »
- Formulaire « Nouvelle parcelle » : « Surface estimée » (« Aperçu. La surface officielle est recalculée par le serveur. »), « Nom de la parcelle », « Type de terrain » (Pluvial (plateau), Bas-fond, Irrigué), « Statut foncier » (Propriété, Location, Prêt, Droit coutumier, Autre), « Enregistrer la parcelle ». « Hors réseau, la parcelle reste sur le téléphone… »
- Parcelle existante : « Champ 1 », tracé GPS, Maïs · croissance, 97,75 ha, « Sans chevauchement ». Lien « Sur le terrain, avec un téléphone : Mesurer une nouvelle parcelle ».

## Connexion

- Onglets « Producteur » / « Agent ou partenaire ». Champ « Numéro de téléphone » (10 chiffres, commence par 01), bouton « Recevoir le code ».
- Le SMS simulé s'affiche sous le formulaire : « Agri-Digit : votre code de connexion est NNNNNN. Il expire dans 10 minutes. »
- Code : six cases « Chiffre 1 sur 6 »… Taper chiffre par chiffre (un collage rapide ne remplit que la première case), puis cliquer « Se connecter » (pas d'envoi automatique).
- Agents et partenaires : onglet « Agent ou partenaire », même code, puis champ « Mot de passe » (Entrée valide). Arrivée directe sur la page du rôle (responsable de programme : « Programmes »).
- La session tient au rechargement. Déconnexion : menu du compte (en haut à droite), « Se déconnecter ».

## 8. Crédit, côté producteur

- « Mes consentements » (menu du compte) : « Partage du profil pour le crédit », « Actif », « Texte v1, donné le 19/10/2026, canal seed ». Le consentement est déjà donné par les données de démonstration : pour le montrer, « Retirer le partage pour le crédit » puis le redonner, ou passer directement à l'agent financier.

- Agent financier (0197000007) : arrive sur « Crédit », « Producteurs ayant consenti au partage · 1 » (Bio GOUNOU). « Consulter le score » : « Calcul simulé », « 39 / 100 » ; facteurs : fiche validée et ancienneté 7/20, superficie 20/20, campagnes suivies jusqu'à la récolte 0/25, appuis remboursés 13/25, diversification 0/10. « Consultation inscrite au journal d'audit. » (Valeurs du clone ce jour ; elles bougent si l'on déclare une récolte avant.)

## 9. Audit (auditeur, 0197000006)

- Arrive sur « Journal d'audit ». Bandeau « Chaîne intègre : N entrées vérifiées le … Aucune rupture d'empreinte. » Filtres « Action », « Acteur (téléphone) », « Objet », « Du », « Au ». Mention « Aucune modification possible ».
- Chaque action de la démo y est, avec son motif : `application.create`, `application.decide` (refusee, puis acceptee), `application.contest`, `selection.run` (poids, cible, 10053), `selection.validate`, `diagnosis.create` (confidence 0.46 / 0.84), `diagnosis.ask_agronome`, `diagnosis.review`, `producer.card_issue`, `credit.score_view` (score : 39), et chaque `auth.login`.
- Le journal ne contient que ce qui a été fait depuis la dernière remise à zéro : faire les étapes avant de le montrer.

## 9 et 10. Export et tableau de bord (administrateur, 0197000005)

- Arrive sur « Tableau de bord ». Export : menu « Exports », « Jeu de données » (Producteurs, Parcelles, Agrégats des fermes POC, Coopératives et adhésions, Récoltes déclarées, Appuis remis), « Motif de l'export * » (compteur « 0 / 10 caractères minimum », exemple « préparation du comité de pilotage du 22 octobre »), avertissement loi 2017-20, « Exporter en CSV ». Bouton non cliqué ici (téléchargement).
- « Tableau de bord national » : bandeau « Données de démonstration ». National : 36 producteurs validés, 42 inscrits, 21 productrices (50 %) ; 4 143,3 ha de parcelles ; 200 000 fermes détectées ; 493 079,3 ha de maïs ; « Rendement moyen du maïs : non disponible, aucune source ».
- Filtre « Département » Alibori : 3 validés, 4 inscrits, 0 productrice ; 390,9 ha ; 16 667 fermes ; 40 990,3 ha de maïs ; communes Segbana 2 865, Gogounou 2 789, Karimama 2 782, Malanville 2 753, Banikoara 2 740, Kandi 2 738. « Alertes envoyées : 0 » tant que l'étape 5 n'est pas faite.
- Chaque ligne porte sa source (« Registre Agri-Digit (prototype, données fictives) » ou « Données synthétiques de démonstration ») et son heure.

## 17. Indicateurs SEA (administrateur)

- « Indicateurs SEA » : regroupés par question (« Qui et combien suit-on ? », « Les femmes et les jeunes participent-ils ? », « Où en est la production ? », « Les producteurs accèdent-ils aux intrants et au crédit ? », « Le conseil est-il utilisé et adopté ? », « Les alertes arrivent-elles ? »). Boutons « Imprimer », « Exporter ».
- Valeurs : 36 validés, 4 143,3 ha, femmes 50 %, moins de 35 ans 8,3 %, acceptation des candidatures 100 %, 42 campagnes (toutes en « Croissance »), rendement maïs « non disponible », crédits accordés « non disponible » (connecteur FNDA), adoption « non disponible » (enquête ATDA).
- À corriger : « Taux de livraison des alertes : 100 % » s'affiche alors qu'aucune alerte n'a été envoyée (devrait être « non disponible »). « Questions à l'assistant : 0 » et « Taux d'escalade : non disponible » tant que l'étape 4 n'est pas faite.

## 12. Coopérative (gestionnaire, 0197000008)

- Arrive sur « Ma coopérative » : « Coopérative des producteurs de maïs de Banikoara », 3 membres actifs (Bio GOUNOU présidente ou président, Sèdjro et Worou GOUNOU). « Ouvrir ».
- « Ajouter un membre » : « Identifiant du producteur (fourni par l'agent ATDA) » = le code BJ-AGR-…, « Rôle dans la coopérative », « Ajouter à la coopérative ».
- Les trois producteurs validés de l'Alibori sont déjà membres. Pour la démo, ajouter Awa SABI après l'avoir validée à l'étape 2 (son code s'affiche dans la liste des producteurs de l'agent).
- Défaut trouvé : un producteur « en attente » (Codjo GOUNOU, BJ-AGR-2026-000021) a pu être ajouté malgré la règle affichée. Corrigé dans le dépôt (`backend/apps/cooperatives/services.py`, refus 400 « Seul un producteur validé… », test ajouté) ; le clone de test n'a pas le correctif.
- « Mettre fin » : « Mettre fin à l'adhésion de … », « Motif de fin d'adhésion » (5 caractères minimum), « Confirmer la fin d'adhésion ». Onglet « Historique (adhésions terminées) » : dates d'adhésion et de fin, « Motif : … ».

## 22. Adhésion demandée par le producteur

- Awa SABI (0197000099, code seul, après validation), « Mes coopératives » : « Vous n'êtes membre d'aucune coopérative. », liste « Coopératives enregistrées dans votre département », « Demander à adhérer ».
- Fenêtre « Rejoindre : … » : « Message (facultatif) », case obligatoire « J'accepte que la coopérative voie mon nom, mon code producteur et ma commune. », « Envoyer la demande ». Le bouton devient « Demande envoyée ».
- Gestionnaire, sa coopérative, onglet « Demandes d'adhésion » : « Awa SABI, BJ-AGR-2026-000043 · Banikoara », « En attente », « Accepter » / « Refuser ». Accepter : statut « Acceptée », 4 membres actifs. C'est la façon d'avoir un nouveau membre pour l'étape 12 (les autres producteurs validés de l'Alibori sont déjà membres).

## 16. Langues (représentant MTDI, 0197000011)

- Arrive sur « Validation des langues ». « Avancement par langue » : Bariba et Fon « Pas encore ouverte », « 0 textes validés sur 1119 (0 %) », repère à 80 %.
- Liste « Textes à traduire et à valider » (filtres langue et statut) ; chaque ligne : clé, « Texte français », « Proposer un texte ». Fenêtre « Proposer un texte en Bariba », « Texte dans la langue », « Enregistrer la proposition ».
- Les données de démonstration n'ont qu'un représentant MTDI : la notation « par un autre représentant » ne peut pas se montrer sans créer un second compte (administrateur, « Comptes »). Ne rien saisir en langue nationale devant le public si personne ne parle la langue : montrer l'écran et la règle.

## 11. Carte (Bio GOUNOU)

- « Ma carte » : « Carte de producteur · MAEP », Bio GOUNOU, Banikoara, Alibori, BJ-AGR-2026-000001, « CODE DE VÉRIFICATION » (8 caractères, change à chaque remise à zéro : 677AQRF9 ce jour), adresse `localhost:5173/verification/<code>`.
- Boutons « Partager le lien », « Imprimer la carte ». Mention : pas encore de QR code. « Votre nom et la validité de votre fiche. Jamais votre NPI, votre téléphone ni vos parcelles. »

## 17. Satellite (producteur)

- « Suivi satellite » : bandeau « Données de démonstration, non officielles ». « Dernier passage · 16/10/2026 · Alibori », NDVI « 0,6 végétation vigoureuse », « Humidité du sol : 16,1 % · sol sec », capteur « Sentinel-2 (démonstration) ».

## 15 et 19. Diagnostic par photo (producteur)

- « Photo de plante ». Bandeau « Diagnostic simulé ». Zone « Prendre ou choisir une photo » (JPEG ou PNG, 5 Mo au maximum), « Filière » : Maïs, bouton « Envoyer la photo ».
- `docs/demo/photo-feuille-douteuse.jpg` : « Chenille légionnaire d'automne », « Confiance : 46 % », statut « Transmis à un agronome », « La confiance est faible : un agronome va vérifier la photo. Vous recevrez un message. »
- `docs/demo/photo-feuille-nette.jpg` : même problème, « Confiance : 84 % », « Diagnostic automatique », bouton « Pas sûr ? Demander un agronome ».
- « Pas sûr ? » ouvre « Demander un agronome », champ « Ce que vous voyez (facultatif) », « Envoyer la demande ». Message : « Demande envoyée. Un agronome va relire votre photo. » Le bouton « Pas sûr ? » reste affiché après l'envoi.
- Agronome (0197000003) : arrive sur « Fiches techniques » (86 fiches) ; menu « Diagnostics à revoir ». Les deux photos y sont, « le nom du producteur n'est pas affiché » ; la seconde porte « Ce que dit le producteur : « … » ». « Pathologie confirmée » est pré-remplie, « Commentaire », « Enregistrer la relecture » : « Relecture enregistrée. Le producteur est prévenu. »
- Sur un ordinateur sans appareil photo, la zone ouvre l'explorateur de fichiers : préparer les deux photos sur le bureau.

## 6. Sélection (responsable de programme, 0197000004)

- Menu « Sélections ». Poids par défaut : confiance 0,5, route 0,3, surface 0,2 (`DEMO.md` corrigé, il disait 0,4/0,3/0,3) ; cible 2 000 ; « Département (facultatif) » : Alibori. Bouton « Calculer la proposition ».
- Résultat : « Proposition du 19/10/2026 · Alibori · cible 2 000, retenus 2 000 », « 10 053 fermes évaluées (Alibori) », « Retenus 2000 », « Non retenus 8053 ». Premier rang : SYN-012973, Malanville, score 0,972.
- Rappel affiché : « La validation revient à un agent ATDA ou à un administrateur qui n'a pas lancé le calcul. »

- Agent ATDA, « Sélections » : bloc « Valider cette proposition », « Motif de la validation » (la phrase « J'ai contrôlé un échantillon… » est une case à cocher, obligatoire : le bouton reste grisé sans elle), « Valider la sélection ». Résultat : « Sélection validée. La période de contestation de 15 jours est ouverte. »
- Pas d'écran pour qu'un producteur conteste une exploitation exclue (les fermes de la sélection sont synthétiques, SYN-…) : phrase retirée de l'étape 6 de `DEMO.md`. La contestation se montre avec l'étape 21.

## 21. Refus de candidature (responsable de programme)

- Menu « Candidatures ». Le producteur apparaît par son code (BJ-AGR-2026-000001 pour Bio GOUNOU), pas par son nom.
- « Instruire » ouvre « Dossier de BJ-AGR-2026-000001 » : liste « Décision » (En instruction / Acceptée / Refusée), « Motif (obligatoire) », « Enregistrer la décision ». Motif utilisé : « Parcelle de maïs non déclarée pour la campagne 2026. »
- Producteur, « Programmes », onglet « Mes candidatures » : « Candidature refusée », « Motif : … · décision du 19/10/2026 », « Vous pouvez contester cette décision pendant 15 jours (loi n° 2017-20, art. 401). », bouton « Contester la décision ».
- Fenêtre « Contester le refus », champ « Pourquoi contestez-vous ? », bouton « Déposer la contestation ». Résultat : « Contestation déposée » avec le texte, statut « En instruction ».
- Agent ATDA, « Candidatures » : la ligne porte « En instruction » et le badge « Contestée » ; le dossier montre « Contestation du producteur » avec son texte. Décision « Acceptée » + motif : la candidature passe en « Acceptée ».

## 1. Inscription (sans compte)

- Accueil public, « S'inscrire » (ou « Créer mon compte producteur »). « Inscription d'un producteur », cinq étapes : Identité NPI, Contact et commune, Langue, Consentement, Récapitulatif.
- Étape 1 : NPI `1000000002`, Prénom Awa, Nom SABI, Sexe Femme, Date de naissance 01/07/1990, « Continuer ». Sous le NPI : « vérification simulée dans ce prototype » (texte d'aide, pas de bandeau « Simulation » à cet endroit ; `DEMO.md` corrigé).
- Étape 2 : Département Alibori, Commune Banikoara, Téléphone `0197000099`.
- Étape 3 : Français « Disponible » ; Fon, Bariba, Yoruba, Dendi « Traduction en cours de validation ».
- Étape 4 : texte du consentement v1 (« Écouter le texte »), case « J'ai lu ce texte et je donne mon consentement. », « Voir le récapitulatif ».
- Étape 5 : « Vérifiez avant d'envoyer », « Vérification : ANIP, à l'envoi, Simulé », boutons « Modifier » par bloc, « Envoyer l'inscription ».
- Résultat : « Inscription enregistrée », « Votre code producteur BJ-AGR-2026-000043 » (numéro suivant du registre), « En attente de validation par l'agent ATDA de votre commune ».

## 2. Validation (agent ATDA, 0197000002)

- Arrive sur « File de travail du jour » : compteurs « fiches à valider », « alerte urgente », « appui à faire confirmer », « récolte signalée », « contestation à instruire » ; boutons « Rédiger une alerte », « Enregistrer une remise ». La fiche d'Awa SABI est sous « Fiches à valider » (« Banikoara · BJ-AGR-2026-000043 · inscrit aujourd'hui »), « Ouvrir ».
- Fiche : « En attente de validation », NPI « Vérification ANIP simulée », bloc « Contrôles avant de valider » (NPI concordant (simulé), téléphone, département, « Aucune parcelle tracée »), boutons « Valider la fiche » et « Rejeter avec un motif… ». Valider : « Fiche validée. Le producteur a été notifié. » (un clic, pas de confirmation).
- Codjo GOUNOU (BJ-AGR-2026-000021) est une seconde fiche en attente des données de démonstration : utile pour montrer « Rejeter avec un motif… ».

## 5 et 18. Boîte d'envoi et téléphone simple (agent ATDA)

- Menu « Boîte d'envoi simulée » : compteurs « Livrés », « Échoués », « Segments facturés » ; tableau Date, Destinataire (masqué 01****0099), Message, Segments (« 1 (GSM-7) », « 2 (UCS-2) »), Statut « Livré ».
- SMS de validation : « Agri-Digit : votre inscription BJ-AGR-2026-000043 est validée. » (1 segment GSM-7).
- Défaut trouvé : les SMS de décision de candidature disaient « … est acceptee. » / « … est refusee. » (code interne). Corrigé dans le dépôt (`backend/apps/programs/services.py`, « acceptée », « refusée », « en instruction ») ; le clone de test n'a pas le correctif.
- Carte « Téléphone simple : USSD et SMS » sous le tableau. Numéro pré-rempli 0197000001. « Appeler *000# » : « AGRI-DIGIT BENIN 1 Meteo 2 Prix 3 Conseil 4 Mes appuis 5 Langue », champ « Votre réponse », « Répondre » / « Raccrocher ». 2 puis 1 : « PRIX MAIS (F/kg) Banikoara 190 Kandi 200 Malanville 225 Parakou 215 Bohicon 245 Dantokpa 260 (demonstration) ».
- SMS : champ pré-rempli « PRIX MAIS », « Envoyer » : la réponse s'affiche dans le fil et en tête de la boîte d'envoi (1 segment GSM-7).

## 4. Assistant (Bio GOUNOU)

- « Poser une question » : questions d'exemple en pastilles (« Quand semer le maïs ? »…), champ « Votre question » (exemple : « Quand semer le maïs ? »), « Culture (facultatif) », « Envoyer ». Entrée passe à la ligne : cliquer « Envoyer ». « Gardé sur ce téléphone seulement : le serveur ne conserve pas vos questions avec votre nom. »
- « Quand semer le maïs à Banikoara ? » : réponse en quelques secondes (mi-mai à mi-juin, à l'installation des pluies, éviter de semer après une pluie isolée), « Sources » : fiche « Quand semer le maïs à Banikoara (Alibori, nord du Bénin) », WOCAT/QCAT n° 6686 et recueil INRAB. À relever : une seconde source sans rapport (« Variété de cotonnier H 279-1 ») est aussi citée.
- « Quelle dose d'insecticide pour la chenille légionnaire ? » : « Question transmise à un agent », « En attente de l'agent », boutons « Écouter la réponse », « Envoyer une photo ». Le texte d'explication apparaît deux fois, presque identique.

## 5. Alerte (agent ATDA)

- Menu « Alertes », formulaire « Nouvelle alerte » (« Brouillon gardé sur l'appareil ») : « Titre », « Catégorie » (Ravageur, Météo, Programme, Marché), « Message (SMS) » avec compteur (« 140 caractères · GSM-7, 160 par SMS », « 1 SMS par destinataire ») et conseil sur les accents (UCS-2, 70 caractères), « Gravité » (Information : envoi direct ; Avertissement : envoi direct ; Urgent : second agent obligatoire), « Département » (Alibori pré-rempli), « Filières » en pastilles, « Communes ». Aperçu « ATDA-ALERTE » sur un téléphone simple et « Écouter l'aperçu » (voix simulée).
- Texte utilisé, sans accents pour rester en GSM-7 : titre « Chenille legionnaire », message « Chenille legionnaire signalee a Banikoara. Inspectez les cornets du mais cette semaine et appelez votre agent ATDA si vous voyez des degats. »
- « Enregistrer l'alerte » : elle passe dans « Prêtes ». « Envoyer l'alerte » : « Envoyée : 1 message(s), 1 livré(s), 0 échoué(s). » Un seul producteur de maïs validé dans l'Alibori (Bio GOUNOU) : un seul SMS. Pour montrer le second agent, choisir « Urgent ».

## 13 et 20. Appuis

- Agent, menu « Appuis » : « Enregistrer un appui remis » : « Producteur » (validés uniquement, liste « code + nom » ; Awa SABI y figure dès sa validation), « Programme (facultatif) », « Appui » (ex. « sacs de semences de maïs, engrais NPK »), « Quantité » + unité (kg, sac, litre, unité), « Valeur (FCFA) », interrupteur « Appui à rembourser » (désactivé par défaut), « Enregistrer l'appui ».
- Saisie utilisée : Bio GOUNOU, Subvention intrants maïs 2026, « Semences de maïs BEMA14 J-07 », 2 sac, 25 000 FCFA. Ligne : « Attendue · 0 j », « Non remboursable ».
- Producteur, « Mes appuis » : « À confirmer 1 en attente », boutons « Confirmer la réception » et « Signaler un problème ». Signalement : « Un problème avec « … » ? », choix « Il en manque une partie » / « Je n'ai rien reçu », « Envoyer le signalement ». Retour : un toast bref (« … ») et l'appui reste « à confirmer ».

- Agent, « Mes messages » : « Appui signalé », « Récolte à vérifier », « Refus contesté » arrivent en messages non lus (cloche en haut à droite). Coquilles corrigées dans le dépôt : « signale que il en manque » devient « signale qu'il en manque », « (mais) » devient « (Maïs) » (`backend/apps/production/services.py`, test renforcé).
- L'accueil de l'agent (« Appuis à faire confirmer ») liste l'appui « confirmation du producteur attendue ».

## 14 et 23. Marché et paiement simulé

- Transformateur (0197000009) : arrive sur « Marché : offres et demandes », bandeau « Simulation FakePay : aucun argent réel n'est échangé ». Onglets « Offres et demandes », « Mes mises en relation », « Paiement ». 9 annonces de démonstration (« [démo] … »), bloc « Récoltes attendues » (prévision simulée).
- « Publier une annonce » : « Type d'annonce » Offre (Je vends) / Demande (Je cherche à acheter), « Filière », « Quantité (kg) », « Prix proposé (FCFA par kg) » avec rappel « Prix du jour : Banikoara 190 F · Parakou 215 F (démonstration). », Département et Commune pré-remplis (Borgou, Parakou), « Description (facultatif) », « Publier l'annonce », « Votre numéro de téléphone n'apparaît jamais dans l'annonce. »
- Saisie : Offre, Maïs, 1 000 kg, 250 F/kg, « Farine de maïs en sacs de 25 kg, livrable à Parakou. »
- Distributeur (0197000010) : l'annonce est dans la liste (tri par prix croissant) ; « Prendre contact » : « Votre message (facultatif) », « Envoyer la demande ». Retour : « Demande envoyée. Vous la retrouverez dans « Mes mises en relation ». »
- Transformateur, « Mes mises en relation » : « En attente de réponse », « Le numéro de l'autre partie sera visible après acceptation. », « Refuser » / « Accepter ». Après « Accepter » : « Téléphone de l'autre partie : 0197000010 ».
- Défaut à signaler : après acceptation, le transformateur (vendeur de cette offre) voit aussi un bouton « Payer ». Le mode vendeur/acheteur du marché dépend du rôle (producteur et coopérative vendent, les autres achètent), pas du type d'annonce. Ne pas cliquer dessus en démo ; correctif à faire à part.
- Distributeur, « Mes mises en relation », « Payer » : « Payer en un clic », montant pré-calculé « 1 000 kg × 250 FCFA » = 250 000 FCFA, « Numéro Mobile Money du payeur » (un numéro qui finit par 0 échoue), « Payer (simulation) ».
- « Suivi du paiement » : « En attente » puis, environ 3 secondes plus tard, « Paiement réussi (simulation). » ; Payeur 01****0011, Bénéficiaire 01****0009, référence « AGD-… (FakePay) », « Le paiement est inscrit au journal d'audit. », boutons « Écouter », « Partager le reçu », « Imprimer le reçu ».

## 25. Récolte signalée

- Producteur, « Mes campagnes » : campagne « Maïs, Champ 1 », saison 2026-pluie-1, 97,75 ha (parcelle des données de démonstration), « Déclarer une récolte ».
- Fenêtre « Déclarer une récolte · Maïs, Champ 1 » : « Date de récolte », « Quantité récoltée (kg) », « Quantité stockée (kg) », « Quantité vendue (kg) », « Prix de vente (FCFA par kg) (facultatif) », repère « Estimé : 131 950 à 161 300 kg. Rendement de référence de démonstration ».
- Saisie : 400 000 kg récoltés, 300 000 stockés, 100 000 vendus. Résultat : « Estimation de la récolte : 146 621 kg », « Écart avec l'estimation : +172,8 % », « Cette récolte s'écarte fortement de l'estimation : un agent ATDA va la vérifier. »
- Agent, « Récoltes signalées » : bandeau « Estimations simulées » (seuil : écart de plus de 50 %), compteurs « À vérifier » / « Vérifiées », ligne BJ-AGR-2026-000001, 400 000 / 146 621 / +172,8 %, « Vérifier ».
- Fenêtre « Vérifier la récolte de … » : « Conclusion » (« Déclaration confirmée », « Quantité corrigée », « Visite à programmer »), « Motif (obligatoire) », « Enregistrer la vérification ».
- Piège : « Quantité corrigée » refuse une quantité inférieure au stock + ventes déclarés (« Inférieure au stock et aux ventes déjà déclarés. »). Pour montrer une correction, déclarer la récolte sans stock ni vente, ou choisir « Déclaration confirmée ».
- Défaut trouvé : une fois la dernière récolte vérifiée, la page n'affichait plus que « Aucune récolte signalée. » et l'onglet « Vérifiées » disparaissait. Corrigé dans le dépôt (`frontend/src/features/harvests/HarvestPages.tsx`, test ajouté) ; pas dans le clone de test.

## 7. Candidature (Bio GOUNOU)

- Menu « Programmes ». Compteurs « Ouverts 2 », « Mes candidatures », « Clos 1 ».
- « Subvention intrants maïs 2026 » (ouvert jusqu'au 31/12/2026), « Appui soja 2026 » (jusqu'au 31/03/2027).
- « Candidater » ouvre une fenêtre : cocher « Je confirme que les informations de ma fiche sont exactes. », puis « Déposer ma candidature ». Résultat : « Votre candidature 19/10/2026 Déposée ».
- Onglet « Clos » : « Appui coton 2025 », « Clos depuis le 31/12/2025 », « Les candidatures sont closes. » Pas de bouton « Candidater » : le message de `DEMO.md` (« Ce programme est clos depuis le… ») n'apparaît que par l'API. `DEMO.md` corrigé.
