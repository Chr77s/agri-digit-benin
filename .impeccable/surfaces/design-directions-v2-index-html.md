---
version: 1
slug: "design-directions-v2-index-html"
primary_target: "design/directions-v2/index.html"
related_targets: []
---

# Landing Agri-Digit Bénin — exploration v2

Scope : page d'accueil publique. Mode : Persuade. Publics à parts égales : producteurs (s'inscrire, suivre, vendre) et institution (MAEP, partenaires : croire à un outil sérieux et conforme). Preuves réelles : chiffres du POC (200 873 fermes, 12 départements, 77 communes, 13 filières, démonstration), garanties loi 2017-20, photos Wikimedia créditées (`design/assets/credits.json`). Rien d'inventé : pas de témoignage ni de partenaire. Images générées autorisées si signalées comme illustrations. Rut refusé : photo plein écran + titre avec un mot coloré + rangée de chiffres + grille de cartes identiques (https://agri-dpi-bn.vercel.app), et son opposé (noir + néon).

Trois maquettes construites pour le choix de l'utilisateur (il a demandé trois maquettes finies plutôt qu'un tableau de cartes). Seed 64d0ccf5. Verdicts : affiche WPA compétitive (porte B), notice de montage compétitive (porte C), boîtes d'allumettes, cape à cordon, tableau de bord d'avion, ebru refusés.

## Direction contract

### A — Le grenier (Tata Somba)
THESIS : la plateforme est la tour-grenier du foyer de l'Atacora ; on y entre, on y vit, on y engrange. Refuse la photo + cartes.
OWN-WORLD : banco ocre (#B98A5E, #8C5B3B), latérite (#A4442A), chaume gris (#6F6A5D), ciel de brume, encre brun-noir (#24170F) ; filets incisés comme les stries du banco ; silhouettes de tours arrondies qui portent les sections ; toits de chaume coniques comme seuls ornements.
STORY : le visiteur voit un vrai foyer du nord, comprend que l'outil suit la récolte jusqu'au grenier, s'inscrit ; l'institution voit les garanties gravées comme des fondations.
FIRST VIEWPORT : photo Baliola en pleine page (homme, sac sur la tête, Tata Somba, maïs) ; titre et action posés sur une bande de banco à gauche, en bas ; « Créer mon compte producteur » visible sans défiler ; crédit photo visible.
SIGNATURE : coupe de Tata Somba en SVG pilotée au défilement : rez-de-chaussée (inscription), étage de vie (suivi des 4 stades), grenier sur le toit qui se remplit de grains à la récolte.
RAISES : (boîte d'allumettes) chaque fonction est un seul objet avec une seule composition ; (tableau d'avion) chaque département tient une seule vérité dans l'index ; (cape) un seul geste transforme la coupe.
FORM : candidat 3 de ma liste ordonnée (assigné), seed 64d0ccf5.
FINISH : unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

### B — L'affiche des saisons (sérigraphie, fusion affiche WPA)
THESIS : le paysage du Bénin en grands aplats sérigraphiés, une saison par stade ; l'affiche est la page, ses pièces fonctionnent.
OWN-WORLD : quatre encres plates par saison (aube : ciel corail, collines prune ; croissance : vert pluie, ciel turquoise ; floraison : jaune soufre, vert olive ; récolte : or, latérite, nuit bleu ardoise), papier visible comme lumière ; capitales géométriques dans une barre de légende sous la scène.
STORY : le visiteur traverse une saison entière en défilant et comprend que l'outil l'accompagne à chaque stade.
FIRST VIEWPORT : scène de l'Atacora en 5 plans SVG (ciel, chaîne, savane, champ de maïs, premier plan) ; barre de légende en bas avec le titre, l'impératif et le bouton d'inscription.
SIGNATURE : le défilement fait passer les encres d'une saison à l'autre et le maïs du premier plan pousse ; parallaxe douce des plans.
RAISES : (notice) chaque stade dit une seule action.
FORM : challenger compétitif fusionné, seed 64d0ccf5.
FINISH : unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

### C — La notice (sans mots, fusion notice de montage)
THESIS : expliquer la plateforme comme une notice de montage illustrée, lisible par un producteur peu lettré.
OWN-WORLD : fond bleu ciel de notice, contour noir de chaque pièce, rouge pour la pièce nouvelle de chaque étape, jaune pour l'inventaire, grille de module stricte ; grands numéros d'étape.
STORY : inventaire (téléphone, parcelle, agent ATDA, appui, marché), puis étapes numérotées où chaque pièce s'emboîte ; l'institution voit la rigueur.
FIRST VIEWPORT : étape 1 éclatée : un téléphone et une parcelle en pièces, flèches pointillées ; titre et action d'inscription dans l'encadré de la page.
SIGNATURE : les pièces tombent le long de leurs flèches et s'emboîtent sur la grille quand l'étape entre à l'écran ; l'étape précédente reste en fantôme.
RAISES : (WPA) une saison peut être un état de la même scène.
FORM : challenger compétitif fusionné, seed 64d0ccf5.
FINISH : unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
