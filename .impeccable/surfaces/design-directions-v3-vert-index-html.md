---
version: 1
slug: "design-directions-v3-vert-index-html"
primary_target: "design/directions-v3/vert/index.html"
related_targets: []
---

# Landing Agri-Digit Bénin — v3 « Bénin Vert »

Scope : page d'accueil publique. Mode : Persuade. Publics à parts égales : producteurs et institution (MAEP, MTDI, ATDA, INRAB, FNDA, partenaires financiers). Monde imposé par l'utilisateur : le vert, la nature, les champs ; simulation de l'application du producteur sur téléphone (comme https://agri-dpi-bn.vercel.app, en nettement mieux). Fonctions : celles du TDR résumées dans PRODUCT.md. Rien d'inventé : chiffres du POC étiquetés « démonstration », écrans du téléphone étiquetés « simulation », aucune traduction fon/bariba inventée (montrer la bascule de langue et la voix, avec « traduction en cours de validation »). Les explorations v1 et v2 sont abandonnées au profit de cette direction.

## Direction contract

THESIS : on se tient dans un champ de maïs vivant (3D temps réel) et le téléphone du producteur, dans le champ, montre la plateforme au travail ; la page alterne la nature (le champ qui pousse) et la preuve (l'application qui agit). Refuse : photo + mot jaune + rangée de chiffres + grille de cartes identiques.
OWN-WORLD : vert engagé à l'échelle de la page, pas un accent : canopée #0E2F1C (sections sombres), feuille #1F5A32, jeune maïs #6FA83A, lumière après la pluie #E8F1DF (sections claires), soleil de récolte #F3C54A réservé aux données et repères, latérite #B4532D minoritaire (sol, alertes). Graphisme signature : des lignes de sillons courbes parallèles (rangs vus du ciel) comme filets et transitions entre sections. Typo display organique et contemporaine (hors liste interdite), texte très lisible.
STORY : producteur : je parle à l'assistant dans ma langue, je photographie une feuille malade, je reçois l'alerte pluie, je vends au bon prix et je suis payé en un clic, ma parcelle est mesurée au GPS, même sans smartphone (USSD/SMS). Institution : toute la chaîne de valeur suivie par filière, prédictions et scoring, pilotage « Bénin Vert », interopérabilité X-Road. Puis filières, confiance, questions, appel final.
FIRST VIEWPORT : champ de maïs 3D plein écran, lumière du matin, vent ; titre et deux actions à gauche (« Créer mon compte producteur », « Voir la démonstration ») sur un voile lisible ; à droite le téléphone debout dans le champ (~70 % de la hauteur) qui joue déjà l'assistant ; bandeau « République du Bénin · Stratégie Bénin Vert 2026–2033 ».
SIGNATURE : téléphone épinglé au défilement à travers 5 chapitres (assistant, diagnostic photo, météo et alertes, marché et paiement, parcelle GPS) : à chaque chapitre l'écran change et joue sa scène ; derrière, la saison avance (le maïs pousse, la lumière passe du matin à l'or). Puis le téléphone devient un téléphone simple pour USSD/SMS.
MOTION : une entrée orchestrée (aube sur le champ, lignes du titre, téléphone qui monte et s'allume) ; transitions d'écran du téléphone ; micro-animations dans les écrans (saisie, onde vocale, balayage de la feuille, prix, tracé GPS) ; mouvement réduit = images fixes.
FORM : direction imposée par l'utilisateur (vert, nature, champs, téléphone) ; seed 64d0ccf5 conservé pour la trace.
FINISH : unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
