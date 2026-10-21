---
name: Agri-Digit Bénin
description: Monde « Bénin Vert » — un champ de maïs vivant, et le téléphone du producteur qui montre la plateforme au travail.
colors:
  canopy: "#0E2F1C"
  canopy-deep: "#0A2415"
  canopy-2: "#12391F"
  leaf: "#1F5A32"
  leaf-hover: "#276B3D"
  maize: "#6FA83A"
  maize-hover: "#82BC4A"
  rain: "#E8F1DF"
  rain-2: "#DCE9D0"
  sun: "#F3C54A"
  laterite: "#B4532D"
  ink: "#0E2F1C"
  ink-2: "#33513C"
  on-dark: "#F1F6EC"
  on-dark-2: "#C3D6B9"
  app-bg: "#F3F7EE"
  app-ink: "#13261A"
  app-ink-2: "#4A5E4F"
  app-line: "#DCE6D3"
typography:
  display:
    fontFamily: "Bricolage Grotesque, Atkinson Hyperlegible Next, sans-serif"
    fontSize: "clamp(2.35rem, .9rem + 3.7vw, 4.6rem)"
    fontWeight: 750
    lineHeight: 0.98
    letterSpacing: "-0.035em"
    fontVariation: "\"opsz\" 96"
  headline:
    fontFamily: "Bricolage Grotesque, Atkinson Hyperlegible Next, sans-serif"
    fontSize: "clamp(2rem, 1.3rem + 2.6vw, 3.6rem)"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Bricolage Grotesque, Atkinson Hyperlegible Next, sans-serif"
    fontSize: "clamp(1.25rem, 1.1rem + .5vw, 1.55rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  lead:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, sans-serif"
    fontSize: "clamp(1.1rem, 1rem + .35vw, 1.3rem)"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 700
    letterSpacing: "0.02em"
  app:
    fontFamily: "Figtree, Segoe UI, Roboto, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.42
  lcd:
    fontFamily: "VT323, ui-monospace, Consolas, monospace"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.05
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  xl: "18px"
  panel: "22px"
  console: "26px"
  pill: "999px"
  phone: "46px"
spacing:
  gutter: "clamp(16px, 4vw, 56px)"
  section: "clamp(56px, 8vw, 120px)"
  header: "64px"
  wrap: "1240px"
components:
  button-primary:
    backgroundColor: "{colors.maize}"
    textColor: "{colors.canopy}"
    rounded: "{rounded.pill}"
    padding: "0.7em 1.35em"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.maize-hover}"
  button-primary-light:
    backgroundColor: "{colors.leaf}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "0.7em 1.35em"
    height: "48px"
  button-primary-light-hover:
    backgroundColor: "{colors.leaf-hover}"
  button-ghost:
    textColor: "{colors.on-dark}"
    rounded: "{rounded.pill}"
    padding: "0.7em 1.35em"
    height: "48px"
  tag-demo:
    textColor: "{colors.sun}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
    typography: "{typography.label}"
  tag-sim:
    textColor: "#F2B79B"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
    typography: "{typography.label}"
  chapter-panel:
    rounded: "{rounded.panel}"
    padding: "clamp(22px, 3vw, 34px)"
    width: "560px"
  console:
    backgroundColor: "{colors.canopy}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.console}"
  lang-select:
    rounded: "{rounded.md}"
    height: "44px"
---

<!-- Établi à partir du code livré : maquettes/landing/ (page.css, phone.css, fonts.css, page.js, phone.js, field3d.js). Ce monde est celui de la landing publique (frontend/src/features/landing) ; le reste du frontend React livre « Argile et verre », décrit en fin de fichier. -->

# Design System: Agri-Digit Bénin

## Overview

**Creative North Star: "Le champ et la preuve"**

On se tient dans un champ de maïs vivant, rendu en 3D temps réel, et le téléphone du producteur, debout dans le champ, montre la plateforme au travail. La page alterne la nature (le champ qui pousse, la lumière qui passe du matin à l'or au fil du défilement) et la preuve (l'écran simulé qui agit). Le vert est engagé à l'échelle de la page, jamais un simple accent : sections sombres en canopée, sections claires en lumière après la pluie.

La densité est calme et lisible : une colonne de texte à gauche, le téléphone épinglé à droite, des panneaux de chapitre translucides posés sur le champ. Les données sont toujours étiquetées honnêtement (« démonstration », « simulé », « écran simulé »). Les transitions entre sections sont des sillons : des courbes parallèles, comme des rangs vus du ciel, qui se tracent à l'apparition.

**Key Characteristics:**
- Vert à l'échelle de la page : canopée sombre et lumière claire alternent par section.
- Champ de maïs 3D plein écran en fond fixe, piloté par le défilement (croissance et lumière), avec photo de repli.
- Téléphone simulé épinglé, qui change d'écran à chaque chapitre puis devient un téléphone simple (USSD/SMS).
- Sillons courbes comme filets et transitions.
- Soleil de récolte réservé aux données, repères et focus ; latérite minoritaire (sol, alertes, simulation).
- Polices auto-hébergées, texte en Atkinson Hyperlegible Next.

## Colors

Une gamme de verts du sous-bois à la jeune pousse, ponctuée d'un jaune soleil rare et d'une terre latérite minoritaire.

### Primary
- **Canopée** (canopy): fond des sections sombres, du `body`, de la console institutionnelle ; aussi l'encre du texte sur fond clair. Variante plus profonde (canopy-deep) pour le bandeau République, le pied de page et les voiles de lecture.
- **Feuille** (leaf): bouton principal et contours sur fond clair, noms propres de la chaîne (rôles, nœuds X-Road), sillons vers le clair, onglet actif et bulles « moi » dans le téléphone.
- **Jeune maïs** (maize): bouton principal sur fond sombre, puces cochées, barres de données, sillons vers le sombre, graine séparatrice des filières.

### Secondary
- **Soleil de récolte** (sun): données et repères uniquement : courbe de prévision, poids du scoring, département sélectionné, point actif du rail de saison, anneau de focus, sélection de texte, étiquette « Démonstration ».

### Tertiary
- **Latérite** (laterite): minoritaire. Alertes (pluie, risque, enregistrement vocal), tendance de prix à la baisse, étiquette « Simulé » (teintée, texte #F2B79B sur sombre).

### Neutral
- **Lumière après la pluie** (rain / rain-2): fond des sections claires, toast, avatar et pastille d'onglet dans le téléphone.
- **Texte sur sombre** (on-dark / on-dark-2): texte principal et secondaire sur canopée.
- **Encre secondaire** (ink-2): paragraphes sur fond clair.
- **Filets** : `rgba(195,214,185,.22)` sur sombre, `rgba(14,47,28,.16)` sur clair. Ce sont les seuls séparateurs.
- **Écran d'application** (app-bg, app-ink, app-ink-2, app-line): palette interne du téléphone simulé, cartes blanches sur fond vert très pâle.

### Named Rules
**The Sun Is Data Rule.** Le jaune soleil marque une donnée, un repère ou un focus. Il ne colore ni un fond de section, ni un titre, ni un bouton.

**The Honest Label Rule.** Tout chiffre du POC porte « Démonstration » (soleil) ; tout écran ou calcul fictif porte « Simulé » / « écran simulé » (latérite ou badge vert dans le téléphone).

## Typography

**Display Font:** Bricolage Grotesque (500–800, variable, axe opsz), repli Atkinson Hyperlegible Next
**Body Font:** Atkinson Hyperlegible Next (400/600/700), repli Segoe UI
**App Font:** Figtree (400–800), uniquement dans le téléphone simulé
**LCD Font:** VT323, uniquement sur l'écran du téléphone simple

**Character:** une grotesque organique et serrée pour les titres, une linéale conçue pour la lisibilité pour tout le reste. Toutes les polices sont auto-hébergées en woff2 (latin + latin-ext) via fonts.css.

### Hierarchy
- **Display** (750, clamp 2.35–4.6rem, 0.98, -0.035em, opsz 96): titre du héros, révélé ligne par ligne.
- **Headline** (700, clamp 2–3.6rem, 1.04, -0.025em, `text-wrap: balance`): titres de section ; chapitres un cran plus bas (clamp 1.9–3.1rem).
- **Title** (700, clamp 1.25–1.55rem, 1.15): titres de panneau, définitions ; Bricolage à 650 pour les questions de la FAQ et les légendes de galerie.
- **Lead** (400, clamp 1.1–1.3rem, 1.55, max 60ch): chapeau sous le titre.
- **Body** (400, 1.0625rem, 1.6 ; 1rem sous 520px): paragraphes, max 68–70ch.
- **Label** (700, 0.78rem, 0.02em): étiquettes Démonstration / Simulé. Pas de capitales.

### Named Rules
**The Lining Figures Rule.** Chiffres alignés partout ; chiffres tabulaires (`.num`, `tabular-nums`) pour toute valeur comparée : prix, surfaces, pourcentages, heures.

## Layout

Gouttière fluide (`spacing.gutter`), sections verticales en `spacing.section`, contenu plafonné à 1240px. La première partie (« saison ») est une grille à deux colonnes : texte à gauche, scène du téléphone à droite (largeur du téléphone + deux gouttières), téléphone `position: sticky` sur 100svh. Chaque chapitre occupe ~108svh, son panneau limité à 560px ; le chapitre inactif est atténué (opacité .45). Un rail de saison fixe à gauche signale le chapitre courant (masqué sous 960px).

Points de rupture observés : 1100px (console sur une colonne, chaîne de valeur en 3), 960px (menu tiroir, grilles à une colonne, rail masqué), 820px (téléphone réduit à clamp(132px, 38vw, 176px) et épinglé en haut sous l'en-tête, textes qui défilent dessous, voile vertical), 520px (boutons du héros pleine largeur), 360px (marque réduite au logo).

## Elevation & Depth

Hybride : la profondeur vient d'abord du décor (champ 3D fixe derrière tout, voiles de dégradé canopée pour la lisibilité) et du verre teinté (panneaux de chapitre `rgba(10,36,21,.74)` + `backdrop-filter: blur(6px)`, en-tête `blur(14px)`). Les ombres sont longues, douces, à étalement négatif et teintées de vert ou de noir ; jamais d'ombre dure décalée.

### Shadow Vocabulary
- **Panneau flottant** (`0 30px 70px -40px rgba(0,0,0,.8)`): panneaux de chapitre sur le champ.
- **Console** (`0 50px 90px -50px rgba(14,47,28,.9), 0 0 0 1px rgba(14,47,28,.9)`): tableau de bord posé sur fond clair.
- **Tiroir / toast** (`0 24px 60px -20px rgba(0,0,0,.7)`, `0 18px 40px -16px rgba(0,0,0,.6)`).
- **Bouton clair** (`0 10px 26px -14px rgba(31,90,50,.9)`): bouton principal sur fond clair uniquement.
- **Nœud** (`0 1px 0 rgba(14,47,28,.08), 0 10px 24px -18px rgba(14,47,28,.5)`): cartes blanches X-Road.
- **Appareil** (`0 34px 60px -24px rgba(6,22,12,.6), 0 14px 26px -14px rgba(6,22,12,.45)` + filets intérieurs): coque du téléphone, plus une ombre portée radiale floutée au sol.

## Shapes

Formes douces et organiques. Boutons, étiquettes, pastilles et bouton de mouvement en pilule ; contrôles de navigation et sélecteurs à 10px ; panneaux de chapitre à 22px, console à 26px ; photos de galerie à 18px. Les séparateurs sont des filets fins de 1px, jamais des bordures épaisses. La graine de maïs (ovale asymétrique) sépare les noms de filières. Les sillons sont des faisceaux de 7 courbes de Bézier parallèles, trait 1.5px non mis à l'échelle, extrémités arrondies : feuille à 55 % vers le clair, maïs à 60 % vers le sombre. La chaîne de valeur se lit sur un tracé en pointillés (8px plein / 6px vide) entre des pastilles cerclées.

## Components

### Buttons
- **Shape:** pilule (999px), hauteur min 48px (44px en petit), contour 1.5px.
- **Primary:** maïs sur canopée (texte canopée, 700) sur fond sombre ; feuille + texte blanc + ombre verte sur fond clair.
- **Hover / Focus:** éclaircissement de la teinte (maize-hover / leaf-hover), enfoncement `translateY(1px) scale(.985)` à l'appui ; anneau de focus 3px soleil (feuille sur clair), décalé de 3px.
- **Ghost:** contour `rgba(241,246,236,.55)` sur voile canopée .35 ; sur clair, contour et texte feuille, fond transparent.
- **Icon button:** cercle 48px, contour filet, pour la galerie.

### Chips
- **Style:** étiquettes Démonstration (soleil teinté) et Simulé (latérite teintée), pilule, label 0.78rem/700. Sur fond clair, Démonstration passe en #FBEFC8 / #6B4E00.

### Cards / Containers
- **Panneau de chapitre:** verre canopée .74, filet `rgba(195,214,185,.14)`, rayon 22px, ombre « panneau flottant ».
- **Console institutionnelle:** canopée, rayon 26px, barre d'en-tête canopée plus sombre, grille 1.25fr / 1fr séparée par filets, pied de console en filet.
- **Listes à filets:** rôles, garanties, FAQ, canaux : rangées séparées par des filets, pas de cartes.

### Inputs / Fields
- **Sélecteur de langue:** 44px, rayon 10px, filet clair, voile canopée .4, globe à gauche, chevron dessiné. Toute langue autre que le français déclenche un toast « traduction en cours de validation ».

### Navigation
- **En-tête:** collant, transparent sur le champ puis « solide » après 40px (canopée .82 + flou + filet). Liens 600, cibles 44px, survol `rgba(241,246,236,.08)`. Sous 960px : bouton menu et tiroir arrondi 20px.
- **Bandeau République:** canopy-deep, 0.82rem, drapeau, au-dessus de l'en-tête.

### Champ 3D (signature)
Canvas WebGL plein écran fixe derrière la page, piloté par `page.js` : `grow` 0.5→1 et `light` 0.28→0.98 suivent le défilement de la saison, interpolés. Photo de repli (capture du même champ) affichée d'abord, fondu vers la 3D. Qualité adaptative (DPR plafonné, réduit si les images ralentissent), mode allégé sur mobile ou machine faible, rendu suspendu hors champ ou onglet masqué. Voile de lecture : dégradé canopée horizontal sur desktop, vertical sous 820px.

### Téléphone simulé (signature)
Dessiné à 300 × 624 px puis mis à l'échelle. Coque graphite à reflet, écran 38px de rayon, badge « Simulation » dans la barre d'état. Cartes blanches 16px sur fond app-bg, barre d'onglets à pastille, chips ok / latérite / soleil. Écrans : accueil, assistant (bulles, onde vocale, citation de source), diagnostic (viseur, balayage, fiche), météo (alerte, barres de pluie), marché (prix, paiement), parcelle (tracé GPS). Mode « basic » : téléphone à touches avec écran LCD vert et police VT323 pour l'USSD/SMS.

### Motion
Courbe de page `cubic-bezier(.16,1,.3,1)` ; courbe du téléphone `cubic-bezier(.22,1,.36,1)`. Entrée orchestrée : aube (voile qui se lève, 1.4s), lignes du titre qui montent (décalées de .1s), téléphone qui monte puis s'allume. Sillons tracés au `stroke-dashoffset` (1.6s, décalés de .07s). Barres et courbes de la console se remplissent à l'apparition.

**The Still Field Rule.** En mouvement réduit (préférence système ou bouton du pied de page, classe `html.reduce`) : animations et transitions ramenées à 0.01ms, un seul rendu figé du champ, téléphone en pause, balayage masqué. Le bouton de mouvement du pied de page est obligatoire.

## Do's and Don'ts

### Do:
- **Do** alterner sections canopée et sections lumière après la pluie, reliées par des sillons.
- **Do** réserver le soleil (#F3C54A) aux données, repères et focus.
- **Do** étiqueter tout chiffre du POC « Démonstration » et tout écran fictif « Simulé ».
- **Do** garder des cibles tactiles d'au moins 44px et un anneau de focus 3px visible.
- **Do** fournir une image fixe et un mode mouvement réduit pour le champ 3D et le téléphone.
- **Do** séparer les listes par des filets de 1px plutôt que par des cartes.

### Don't:
- **Don't** traiter le vert comme un simple accent sur fond blanc ou gris.
- **Don't** reprendre le schéma photo + mot en jaune + rangée de chiffres + grille de cartes identiques.
- **Don't** utiliser la latérite comme couleur dominante d'une section.
- **Don't** inventer de traduction fon, bariba ou autre : montrer la bascule et la mention de validation.
- **Don't** utiliser Figtree ou VT323 hors du téléphone simulé.

## Application : « Argile et verre »

Hors landing, l'application (connexion, accueils, pages de tous les rôles) livre un second monde, clair, décidé le 21 octobre 2026 d'après deux images de référence (`docs/REFONTE_FRONTEND.md`, décisions D1 à D18). Jetons dans `frontend/src/shared/ui/tokens.ts`, peau dans `shared/ui/skin.css` (chargé après `kit.css` et `mobile.css`).

- **Surfaces** : crème `#F6F3E8` avec deux halos flous, cartes de verre dépoli (`rgba(255,255,255,.66)`, flou 18 px, bordure blanche, ombre portée + lumière intérieure). Sans `backdrop-filter` ou sous « réduire la transparence » : blanc presque opaque.
- **Couleurs** : vert de marque `#1A6E43`, sarcelle `#0F7C82` (seconde extrémité du dégradé d'action), sauge `#CFE3D3` (barre latérale), corail `#C84B24` (appel à l'action d'accueil, alertes). Pastels menthe, pêche, beurre, ciel pour les cartes de chiffres, jamais seuls : libellé et icône les accompagnent.
- **Typographie** : Bricolage Grotesque (titres, chiffres), Atkinson Hyperlegible Next (texte), auto-hébergées. Young Serif reste réservée à la landing.
- **Formes** : rayons 10, 14, 22, 30 px ; boutons, pastilles et badges en pilule ; action principale en dégradé vert-sarcelle.
- **Mobile** : barre d'onglets flottante de 5 entrées, cibles de 44 px, tableaux en cartes.
- **Règle de cascade** : `skin.css` vient après `kit.css` et `mobile.css` ; une règle qui y redit une règle de `kit.css` ou `mobile.css` reprend aussi son `@media` (cause du repli de `.split` et du bouton « Écouter » cassés).
- **Contraste** : texte 4,5:1, bords de contrôles et icônes 3:1 (`--line-input` pour les champs) ; `frontend/scripts/contrast.mjs` vérifie les paires de jetons.
