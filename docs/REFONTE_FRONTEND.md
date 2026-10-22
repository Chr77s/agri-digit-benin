# Refonte du frontend : « Argile et verre »

Journal de reprise. **Un agent qui reprend ce travail lit ce fichier en entier, puis continue à la première case non cochée de la section « Avancement ».** Chaque décision est notée ici *avant* d'être codée, chaque phase est commitée (`git log --oneline` raconte la même histoire).

Demande de l'utilisateur (21 octobre 2026) : refondre le frontend d'après deux images de référence, fusionner leurs styles, s'appuyer sur le skill `ui-ux-pro-max` pour le design et les parcours globaux, pouvoir revoir toutes les pages et tous les composants, **ne pas toucher au backend**, consigner les choix pour qu'on puisse reprendre après une coupure.

## 1. Les deux références

| | Image 1 : « DentaCare » | Image 2 : tableau de bord musique |
| --- | --- | --- |
| Style | **Glassmorphism** : cartes de verre dépoli sur un dégradé bleu clair, reflets, bordure blanche fine, lueurs | **Claymorphism** : volumes « pâte à modeler », ombres doubles (portée douce + lumière intérieure), très arrondis |
| Couleur | un seul ton (bleu), accent cyan, CTA en dégradé cyan | fond crème, **cartes pastel teintées** (menthe, pêche, beurre, ciel), CTA corail, barre latérale sauge |
| Structure | accueil en tuiles d'icônes, bas de page à 4 onglets, héros avec illustration 3D, étapes de réservation en pastilles | barre latérale à gauche avec avatar et salutation, grande carte d'accueil, 4 cartes de chiffres, graphiques pastel, listes avec bouton lecture |
| À retenir | translucidité, flou, halo, pilules, un héros qui salue | pastel par catégorie, volume, chaleur, ton humain (« Bonjour, Mia ! ») |

**Fusion retenue** : un monde **crème et sauge** (le vert de la marque reste la couleur d'action) dont les surfaces sont du **verre dépoli clair** (`backdrop-filter`, bordure blanche, reflet) **avec le volume de l'argile** (ombre portée douce + lumière intérieure en haut + ombre intérieure en bas). Les chiffres clés prennent des **teintes pastel** par rang. Les actions principales sont des **pilules en dégradé vert-sarcelle** (cyan de l'image 1 ramené vers la marque), le **corail** de l'image 2 sert aux appels à l'action d'accueil et aux alertes.

## 2. Décisions de design (skill ui-ux-pro-max)

Sorties du skill (`search.py --design-system`, domaines `style` et `ux`) : style **Organic Biophilic** (coins 16 à 24 px, ombres naturelles), **Claymorphism** (doubles ombres, 16 à 24 px, bordures épaisses facultatives, pastel), **Glassmorphism** (flou 10 à 20 px, blanc 15 à 30 %, bordure 1 px), pré-livraison : pas d'emoji comme icône (sprite SVG), `cursor: pointer`, transitions 150 à 300 ms, contraste 4,5:1, focus visible, `prefers-reduced-motion`, essais à 375, 768, 1024 et 1440 px.

| # | Décision | Raison |
| --- | --- | --- |
| D1 | Mode **clair par défaut** (le mode système n'est plus suivi sans choix explicite) ; le mode sombre reste (« verre sombre » vert profond) | Les deux références sont claires ; le public visé est en plein soleil sur téléphone |
| D2 | Les couleurs restent **uniquement** dans `shared/ui/tokens.ts` → `tailwind.config.ts` → variables `--c-*` → `kit.css` | Une seule source ; les 40 fichiers de pages basculent sans être touchés |
| D3 | Rayons : sm 10, md 14, lg 22, xl 30 px ; boutons, puces et badges en pilule | Argile : très arrondi ; skill : 16 à 24 px |
| D4 | Surface « verre-argile » = `rgba(255,255,255,.66)` + flou 18 px + bordure blanche 1,5 px + ombre `--sh-card` (portée + lumière intérieure) ; repli sans `backdrop-filter` : blanc opaque 92 % | Lisibilité d'abord : le verre ne sert qu'au-dessus d'un fond doux, jamais sous du texte long sans contraste vérifié |
| D5 | Pastel des chiffres : **menthe, pêche, beurre, ciel** appliqués par CSS (`:nth-child` dans `.grid-fit` et classe `stat--mint/peach/butter/sky`), jamais la couleur seule : chaque carte garde son libellé et son icône | Image 2 ; accessibilité |
| D6 | Fond de page : crème `#F6F3E8` + deux halos flous (menthe en haut à gauche, ciel en bas à droite) posés sur `body` en `background-attachment: fixed` ; aucun halo en mode sombre sauf un vert profond | Donne au verre quelque chose à flouter (image 1) sans image ni requête externe |
| D7 | Barre latérale = **panneau flottant sauge** (marge 14 px, rayon 30 px) avec avatar, « Bonjour, <prénom> », et lien actif en **pilule crème** à pastille d'icône (image 2) ; repliée : icônes seules | Reprend l'image 2 sans changer la navigation ni les routes |
| D8 | Barre du haut : transparente, recherche en pilule de verre, cloche et profil en pastilles rondes | Images 1 et 2 |
| D9 | Mobile (< 640 px) : barre d'onglets du bas **flottante en verre** (marge 12 px, rayon 26 px, cinq onglets au plus, pastille de l'onglet actif) ; garde le comportement actuel (`TABS` dans `Layout.tsx`) | Image 1 ; règle du skill : navigation du bas à 5 entrées au plus |
| D10 | Accueil producteur et accueil agent = **tableau de bord** : carte d'accueil corail-crème (salutation, météo du jour, bouton), 4 cartes pastel de chiffres, tuiles d'icônes d'accès rapide (4), listes récentes | Image 2 + tuiles de l'image 1 ; les données restent celles de l'API actuelle |
| D11 | Polices : on garde Bricolage Grotesque (titres) et Atkinson Hyperlegible Next (texte), auto-hébergées | Aucune requête externe (règle du projet) ; Atkinson est la plus lisible pour un public peu lettré |
| D12 | Boutons : primaire = pilule en dégradé vert→sarcelle avec reflet intérieur ; secondaire = verre ; accent = corail ; danger = latérite | Images 1 et 2 |
| D13 | Mouvement : ressorts doux 200 à 300 ms (`--ease`), apparition en cascade 40 ms des cartes d'accueil ; tout coupé sous `prefers-reduced-motion` | Skill |
| D14 | Aucun changement de route, de rôle, de texte (i18n) ni d'appel d'API ; seuls les libellés des nouveaux éléments décoratifs s'ajoutent dans `i18n/fr/refonte.json` | « Ne pas toucher au backend » ; le test des clés doit rester vert |
| D15 | Contrastes : texte ≥ 4,5:1 sur le verre (le fond est supposé crème ; on calcule sur le pire cas) ; `frontend/scripts/contrast.mjs` est mis à jour avec la nouvelle palette | Skill, accessibilité |

## 3. Palette (clair ; le sombre est dans `tokens.ts`)

| Jeton | Valeur | Usage |
| --- | --- | --- |
| `bg` | `#F6F3E8` | crème, fond |
| `surface` | `#FFFFFF` | cartes (rendues en verre par `kit.css`) |
| `text` | `#16301F` | texte |
| `muted` | `#4B6354` | texte secondaire |
| `border` | `#E3E8DA` | filets |
| `brand` | `#1A6E43` | action, liens (blanc dessus : 6,3:1 ; 4,6:1 au moins sur les pastels) |
| `brandHover` | `#135A37` | survol |
| `sage` | `#CFE3D3` | barre latérale |
| `mint` / `peach` / `butter` / `sky` | `#DDEFE3` / `#FBDDCD` / `#FBEBBF` / `#D8E8F6` | cartes pastel |
| `coral` | `#C84B24` | appel à l'action d'accueil (`coralInk` dessus : blanc en clair, brun foncé en sombre) |
| `teal` | `#0F7C82` | seconde extrémité du dégradé d'action (blanc dessus : 5:1) |

## 4. Fichiers concernés (carte)

- Jetons : `frontend/src/shared/ui/tokens.ts`, `frontend/tailwind.config.ts`
- Kit : `frontend/src/shared/ui/kit.css` (composants), `mobile.css` (téléphone), `kit.tsx` et `index.tsx` (composants React), `Icon.tsx`
- Coque : `frontend/src/app/Layout.tsx`
- Fond et base : `frontend/src/index.css`
- Pages : `frontend/src/features/*` (17 fichiers `.css` de pages ; les couleurs en dur sont à passer sur les variables)
- Accueils : `features/producers/ProducerHome.tsx`, `AgentHome.tsx`, `features/dashboard/DashboardPage.tsx`
- Accès et vitrine publique : `features/auth/*`, `features/landing/*`, `features/onboarding/*`
- Garde-fous : `i18n/keys.test.ts`, `shared/ui/kit.test.tsx`, `app/MobileShell.test.tsx`, `frontend/scripts/contrast.mjs`

## 5. Règles de travail (poste de 3,5 Go)

Une seule commande lourde à la fois (`tsc`, `vitest`, `vite build`) ; si `tsc` plante : `NODE_OPTIONS=--max-old-space-size=1400` et relancer. Les fichiers existants sont en CRLF : modifier avec l'outil d'édition, jamais réécrire un fichier entier par script. Un script Python collé en heredoc se déforme avec des accents : l'écrire dans un fichier. Serveurs de prévisualisation arrêtés quand on ne s'en sert pas.

## 6. Avancement (cocher au fil de l'eau)

- [x] P0 : lecture du skill, des deux images, du kit ; ce journal
- [x] P1 : jetons (`tokens.ts`, `tailwind.config.ts`), thème clair par défaut (`useTheme.ts` et son test)
- [x] P2 : **`shared/ui/skin.css`** (nouveau, chargé après `kit.css` et `mobile.css` dans `main.tsx`) : toute la peau verre-argile ; `kit.css` garde la structure
- [x] P3 : coque : barre latérale flottante sauge + avatar et « Bonjour », barre du haut en verre, onglets du bas flottants (dans `skin.css` ; `Layout.tsx` : bloc `sb-role`)
- [x] P4 : accueils producteur et agent (`Hero`, `QuickTiles`, `Stat` avec `icon` et `tone` dans `kit.tsx`) ; le tableau de bord de pilotage hérite de la peau (cartes pastel par rang) : à revoir en P7
- [x] P5 : CSS de pages : accueil téléphone, bulles de l'assistant, météo (`producteur.css`), file de l'agent (`agent.css`). Les objets sombres voulus restent (carte d'identité, aperçu SMS, illustrations de bienvenue, scène de la landing)
- [x] P6 : connexion vérifiée (la peau suffit) ; **landing : D16, scène sombre conservée**
- [x] P7 : passe sur les pages : toutes héritent de la peau ; vérifiées au navigateur : accueils producteur et agent, tableau de bord, producteurs, marché, parcelles (carte), connexion, mobile 375 px, mode sombre
- [x] P8 : contraste (`scripts/contrast.mjs`, 0 échec), types, 150 tests d'application, parcours navigateur à 375 et 1360 px
- [x] P9 : tableau de bord et indicateurs SEA en cartes pastel avec icône (`DashboardPage` : une grille de `Stat` ; `SeaPage` : une teinte et une pastille par question de suivi) ; pages des rôles transformateur, distributeur, gestionnaire, agent financier, agronome, MTDI et auditeur parcourues au navigateur (1360 px, mode sombre et 375 px pour le pilotage)
- [ ] **Reste possible (non fait, par choix ou faute de temps)** : (a) landing en clair (D16) ; (b) illustrations 3D de l'image 1 (dent) : l'équivalent agricole serait un épi de maïs ou une parcelle rendus en canvas comme la scène de la landing ; (c) captures d'écran de revue à 768 px

## 7. Journal des décisions prises en cours de route

- 2026-10-21 D16 : la **landing** garde sa scène 3D sombre (relief du Bénin et champ de maïs dessinés en canvas, c'est l'équivalent de la dent 3D de l'image 1) ; la connexion, l'inscription et les pages de l'application prennent la peau claire. Raison : refaire la scène en clair coûte un rendu entier et la scène sombre est le meilleur « héros » du site.
- 2026-10-21 : `skin.css` est chargé **avant** les CSS des pages (ordre d'import) ; pour surcharger une règle d'une CSS de page, soit modifier cette CSS, soit préfixer par `.main`. Les accueils étaient en bloc vert foncé : passés en carte chaude.
- 2026-10-21 : le vert de marque passe de `#1E7A4C` à `#1A6E43` (contraste sur les pastels) ; `scripts/contrast.mjs` couvre désormais les pastels, la sauge, la sarcelle et le corail (aucun échec).

(une ligne par décision : date, quoi, pourquoi)

- 2026-10-21 : refonte lancée ; décisions D1 à D15 ci-dessus.
- 2026-10-21 D17 (parcours) : aucune route, aucun menu, aucun rôle n'a changé. La hiérarchie d'un accueil devient : carte de bienvenue (une action principale en corail) → 4 chiffres pastel cliquables → 6 tuiles d'accès rapide → détails. Raison : règle du skill « une action principale par écran, navigation du bas à 5 entrées au plus » et image 2.
- 2026-10-21 : piège rencontré : `skin.css` est chargé après `kit.css`, donc `.btn { padding }` écrase `.btn-icon { padding: 0 }` ; les surcharges de taille (`.btn-sm`, `.btn-icon`) sont redites après `.btn` dans `skin.css`. À garder en tête pour toute règle générique ajoutée à la peau.
- 2026-10-21 D18 : un indicateur sans source reste écrit « non disponible » (jamais 0) dans sa carte pastel, avec « aucune source » en pied ; la valeur n'est jamais portée par la seule couleur (les teintes alternent par rang, le texte dit tout). Le tableau d'indicateurs du tableau de bord est remplacé par des cartes ; l'export CSV de cette page n'en dépendait pas.
- 2026-10-21 : retouches de revue : `.cell-sub.num` aligné à gauche (la sous-ligne du tableau des coopératives était collée à droite), pastilles de filtre (`.chip`) avec bordure visible dans une carte blanche, `.split` passe à 2,3 fr / 1 fr et ses tableaux resserrent leurs cellules (le score de crédit débordait à 1360 px).
- 2026-10-21 correctifs de la critique Impeccable (`docs/AUDIT_UX.md`, annexe) : `skin.css` écrasait deux règles de `kit.css`/`mobile.css` (même spécificité, chargé après) : `.split` ne se repliait plus sous 1100 px (10 pages débordaient à 375 px) et `.btn-listen` perdait son `padding: 0`. À retenir : toute règle de `skin.css` qui redit une règle de `kit.css` ou `mobile.css` doit reprendre son `@media`. Aussi : unité des cartes de chiffres sous le nombre (`.stat-value` en flex), `.sb-group` sans opacité (4,7:1), avatar sombre lisible (8,1:1), bords de la recherche et de la langue en `--line-input`, barre du haut opaque sous « réduire la transparence », bordures des boutons secondaires renforcées, saisie de l’Assistant avant l’avertissement au téléphone, `.m-hero` sans marge négative (débordait de 4 px). Non fait : pastel porteur de sens, menu à 7 entrées, landing au téléphone (P2).
- 2026-10-21 niveau 3 de la critique Impeccable : pastel des cartes de chiffres porteur de sens (menthe par défaut, pêche = échec ou retard, beurre = en attente, ciel = information, plus de teinte par rang) ; menu des rôles à plus de 12 liens en rubriques repliables (page courante et première ouvertes) ; ombres retirées des petits contrôles et du bloc de rôle de la barre latérale ; voile vertical de la landing au téléphone (le texte est en haut) ; échelle de police de l’accueil mobile resserrée (aucun texte sous 14 px hors onglets de 13 px). Non fait : action principale de l’accueil producteur avant l’alerte de remboursement (question ouverte), photo de démonstration sans filigrane (image à fournir).
- 2026-10-21 palette « Sunny Farm » (planche fournie par l’utilisateur : blanc, vert #00A563, vert profond #016648, orange #F6732F) : marque et liens en #016648 (7:1 sur blanc), #00A563 réservé aux graphiques, aux dégradés et aux fonds où le texte est sombre (blanc dessus ne passe pas, 3,2:1), orange #F6732F en accent d’appel à l’action avec texte brun foncé (blanc dessus ne passe pas), barre latérale en vert profond avec texte blanc, pastels recalés (menthe, orange clair, beige chaud, vert tendre), landing : accent #12BE78 et ocre #F8793A (éclaircis pour tenir 4,5:1 sur le fond sombre). `scripts/contrast.mjs` couvre désormais la barre latérale et ces accents (aucun échec). Le sarcelle et le crème de la refonte disparaissent.
- 2026-10-21 minimalisme (demande de l’utilisateur : le moins d’informations possible, y compris en mode sombre) : barre latérale sans bloc profil ; barre du haut réduite à recherche (qui s’ouvre), synchro (visible seulement s’il reste quelque chose à envoyer), langue (un bouton qui passe à la suivante), cloche, avatar seul ; fil d’Ariane, descriptions de page et sous-titres de carte lus par les lecteurs d’écran seulement ; chiffres sans icône, source et détails derrière une icône (`details`) ; tableaux : export en icône, compte de lignes lu seulement ; accueils producteur et agent allégés (plus de tuiles, de carte météo, de colonne latérale, cartes vides masquées) ; connexion sans indicateur d’étapes ; suivi-évaluation : indicateurs sans source repliés ; comptes : un menu « … » par ligne. Le bandeau « Prototype » du haut reste la seule mention de démonstration sur les pages de pilotage (les doublons sont retirés), les cartes de données gardent leur pastille « Démonstration » et la source reste lisible derrière l’icône. Vérifié en clair et en sombre ; `contrast.mjs` sans échec.
- 2026-10-22 nouvelle page d'accueil (`features/home/`, demande de l'utilisateur : style du tableau de bord, illustrations, fluide, simple, complète, pied de page exemplaire) : la route `/` des visiteurs sert `HomePage` (verre, cartes pastel, panneau vert profond, SVG en ligne colorés par les jetons donc valables en mode sombre, apparition au défilement coupée en mouvement réduit). **L'ancienne landing 3D est conservée telle quelle** dans `features/landing/` et reste servie sur `/accueil-3d` (le test e2e `landing-overlap` pointe désormais là). Textes : réutilisation des clés `landing.*`, nouvelles clés dans `i18n/fr/vitrine.json`. Pied de page commun `features/home/SiteFooter.tsx` (marque, 4 rubriques, langue, thème, barre de bas de page, retour en haut), aussi utilisé par la coque publique ; la barre compacte reste dans l'application connectée. Pages ajoutées : accessibilité (`/accessibilite`), contact et assistance (`/contact`), plan du site (`/plan-du-site`) ; la déclaration d'accessibilité dit honnêtement qu'aucun audit externe n'a eu lieu. `LangButton` sorti de `Layout.tsx` (`app/LangButton.tsx`).
- 2026-10-22 landing allégée (demande de l'utilisateur : épurée, l'essentiel, animations amusantes mais sobres) : en-tête sans menu, premier écran, trois étapes (image et titre seulement), pied de page à trois rubriques ; chiffres, saison, acteurs, garanties, galerie et questions retirés (ils restent dans l'historique git et sur `/accueil-3d`). Animations en CSS pur, coupées en mouvement réduit : entrée en cascade, maïs qui se balance, soleil qui bat, nuages qui dérivent, parcelle qui se trace, pastilles flottantes.
