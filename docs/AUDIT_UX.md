# Audit UX du frontend, 21 octobre 2026

Audit en lecture seule : aucun fichier de l'application n'a été modifié. Méthode : détecteur Impeccable sur `frontend/src` (0 résultat), contrôles automatisés dans le navigateur (cibles tactiles, noms accessibles, étiquettes, titres, contrastes, débordements), lecture du code aux endroits où un défaut a été mesuré, grille des 5 axes et heuristiques de Nielsen du skill `ui-ux-pro-max`.

Parcouru : tableau de bord et ~40 routes de l'administrateur à 1360 px et à 375 px, ~20 routes du producteur à 375 px (connexion avec le compte de démonstration), `/consentements` à 768 px, mode sombre, landing à 1360 px, formulaire d'inscription, tiroir de navigation.

## Note de santé

| # | Dimension | Note | Constat principal |
| --- | --- | --- | --- |
| 1 | Accessibilité | 3 | Base solide ; le changement de page n'est annoncé nulle part (titre, focus, défilement) |
| 2 | Performance | 3 | Estimation : `dist/` date du 19/10 (avant la refonte), rien n'a été mesuré sur le build actuel |
| 3 | Thème | 3 | Jetons centralisés, mode sombre cohérent ; initiales de l'avatar illisibles en sombre |
| 4 | Responsive | 2 | `.split` ne se replie plus : 10 pages débordent à 375 px, dont la carte, le diagnostic photo et les consentements |
| 5 | Intégrité de l'implémentation | 3 | Système propre au produit ; `DESIGN.md` décrit un autre monde que celui livré |
| | **Total** | **14 / 20** | **Bon : traiter d'abord le responsive** |

**Verdict d'intégrité : réussi.** L'interface parle du Bénin et de ce produit, pas d'un gabarit : « Prototype », « Simulation », « Démonstration » partout où c'est vrai, « non disponible » plutôt que 0, parcours de connexion par SMS, langues nationales annoncées « à valider ». Le détecteur ne remonte rien. Les réserves sont de la dérive, pas de la décoration (P1-1, P3-6).

## Synthèse

- 1 P1, 8 P2, 7 P3.
- À corriger avant tout : la règle `.split` (une règle CSS règle les 10 pages mesurées).
- Ensuite : annoncer le changement de page, ne plus tronquer les chiffres des cartes, réparer la bulle SMS de la connexion.
- Le public prioritaire (producteur, petit téléphone) est celui qui subit le P1.

## Constats

### P1 : bloquant pour le producteur sur téléphone

**[P1-1] La règle `.split` ne se replie plus sous 1100 px**
- Lieu : `frontend/src/shared/ui/skin.css:382` écrase `frontend/src/shared/ui/kit.css:150` (même spécificité, `skin.css` est chargé après). 26 pages utilisent `.split`.
- Catégorie : responsive.
- Mesure à 375 px : `/ma-carte`, `/diagnostic`, `/consentements`, `/alertes`, `/selection`, `/appuis`, `/marche`, `/previsions`, `/couverture`, `/recouvrement` agrandissent la page (largeur de mise en page de 380 à 482 px). Deux colonnes de 225 px et 98 px. À 768 px, `/consentements` défile à l'horizontale (782 px pour 768) et le bouton « Demander une copie de mes données » sort de sa carte.
- Effet : la carte du producteur affiche « Bio GO UN OU » en colonne étroite et rognée ; le formulaire « Nouvelle photo » du diagnostic, action principale de la fonction, tient dans une colonne d'environ 85 px ; les consentements (loi 2017-20) se lisent mot à mot.
- Norme : WCAG 1.4.10 (reflux), AA.
- Preuve de cause : une règle `@media (max-width: 1100px) { .split { grid-template-columns: minmax(0, 1fr); } }` injectée après `skin.css` supprime le débordement sur les 7 pages testées (retirée ensuite, rien n'est écrit dans le dépôt).
- Recommandation : remettre le repli dans `skin.css` juste après la ligne 382. Le même recouvrement existe pour `.sidebar` (`kit.css` sous 1023,98 px contre `skin.css`) : le tiroir s'ouvre correctement au téléphone, mais à revérifier à 768 px.
- Commande : `/impeccable adapt`.

### P2 : gêne importante

**[P2-1] Le changement de page n'est ni annoncé ni remis à zéro**
- Lieu : `frontend/src/app/Layout.tsx:327-331` (`Main`) ; aucun `scrollTo`, aucun `document.title`, aucun `focus()` dans l'application.
- Mesure : après la connexion, l'accueil du producteur s'ouvre à 452 px de défilement (la salutation et la météo sont hors écran) ; le titre du document reste « Agri-Digit Bénin » sur toutes les routes ; le focus reste sur `body` ; `main` a `tabIndex={-1}` mais personne ne l'utilise.
- Norme : WCAG 2.4.2 (titre de page), 2.4.3.
- Recommandation : un seul effet dans `Main`, à chaque changement de `pathname` : défilement en haut, `document.title` = titre de la page, focus sur `main` sans défilement.
- Commande : `/impeccable harden`.

**[P2-2] Les cartes de chiffres coupent la valeur ou l'unité**
- Lieu : `skin.css:207` (`.stat { overflow: hidden }`), grille de 5 colonnes de `DashboardPage`.
- Mesure à 1360 px : « 200 873 fermes » devient « 200 873 ferme » (carte de 181 px, contenu de 189 px) ; « 1 123 052,9 ha » est aussi tronqué. Même type de coupe sur le libellé « Couverture et importations » du menu (`kit.css:200`, sans infobulle).
- Effet : un chiffre officiel dont l'unité est coupée se lit mal, sur la page que l'institution regarde en premier.
- Recommandation : unité sous le nombre ou retour à la ligne autorisé, `title` sur les libellés tronqués.
- Commande : `/impeccable layout`.

**[P2-3] La bulle du SMS simulé chevauche son titre à la connexion**
- Lieu : `LoginPage.tsx:146` met un `<span className="sms">` (en ligne) ; `producers/agent.css:27` le style comme une bulle de bloc (`padding: 10px 12px 22px`).
- Mesure à 375 px : le texte du SMS passe sous la pastille « Simulation », la première ligne est coupée, la bulle déborde de l'encadré.
- Effet : c'est l'écran où le visiteur lit son code pour se connecter.
- Recommandation : `display: block` sur `.sms` (ou une `div`).
- Commande : `/impeccable polish`.

**[P2-4] Cibles tactiles sous les 44 px que le projet s'impose**
- Règle du projet : « cibles tactiles 44 px » (`PRODUCT.md`). Mesures à 375 px : onglets de `/marche` 42 px, pastilles de filtre 38 px, boutons secondaires et discrets 38 px, cases à cocher de « À faire cette semaine » 28 × 28 px, lien de marque 30 × 44 px ; à 1360 px, boutons de tri 32 px, pagination 40 px, bouton « Exporter en CSV » 38 px.
- Norme : WCAG 2.5.8 (24 px) est respectée ; c'est la règle du projet qui ne l'est pas.
- Recommandation : `min-height: 44px` sur `.chip`, `.btn-sm`, `.tab` ; zone cliquable agrandie autour des cases.
- Commande : `/impeccable adapt`.

**[P2-5] Des cases à cocher qui n'enregistrent rien**
- Lieu : bloc « À faire cette semaine » de l'accueil producteur : « Cocher une tâche ne l'enregistre pas. »
- Effet : une case promet un changement d'état ; la phrase du dessous la contredit. Heuristique 4 (cohérence avec les conventions), 5 (prévention des erreurs).
- Recommandation : remplacer par une action qui mène au bon formulaire (« Semer », « Déclarer la récolte »).
- Commande : `/impeccable clarify`.

**[P2-6] Après une erreur de formulaire, le focus n'avance pas**
- Mesure sur `/inscription` : « Continuer » avec les champs vides affiche cinq messages clairs (icône, texte, consigne : « Recopiez-le depuis votre carte »), mais le focus reste sur le bouton et le premier message est hors écran ; le groupe Sexe n'a pas `aria-invalid`.
- Norme : WCAG 3.3.1 respectée ; 2.4.3 et les bonnes pratiques de 3.3 non.
- Recommandation : focus sur le premier champ en erreur, résumé d'erreurs facultatif en tête.
- Commande : `/impeccable harden`.

**[P2-7] Navigation trop longue pour l'administrateur et l'agent**
- Mesure : 37 liens en 5 groupes pour l'administrateur (« Registre et terrain » : 15), 1 986 px de menu pour 860 px visibles ; 28 liens dans le tiroir du producteur, alors que la barre du bas n'en montre que 5.
- Atténuant : la recherche de page (`/`) existe.
- Recommandation : groupes repliables, favoris par rôle, ordre par fréquence d'usage.
- Commande : `/impeccable distill`.

**[P2-8] Photo de démonstration avec filigrane « iStock »**
- Lieu : résultat de diagnostic de `/diagnostic` (producteur de démonstration) ; la source du fichier n'a pas été retrouvée.
- Effet : sur une plateforme ministérielle, un filigrane de banque d'images dément « Dire vrai » (`PRODUCT.md`) et pose une question de licence ; les vignettes de la landing sont, elles, créditées CC BY-SA.
- Commande : `/impeccable polish` (remplacer par une image libre, créditée).

### P3 : finition

1. **Avatar en mode sombre** : `skin.css:279` fixe `color: #5A4600` quel que soit le thème, sur `--butter` devenu brun foncé (≈ 1,2:1) ; les initiales disparaissent dans l'en-tête de chaque page.
2. **Descriptions de page coupées au téléphone** : `mobile.css:49` limite `.page-desc` à 2 lignes ; « …le code de vérification permet de… » s'arrête en pleine phrase, sans moyen de lire la suite.
3. **Bouton « Écouter »** : au téléphone, tantôt avec son libellé (`/consentements`), tantôt en pastille ronde à pictogramme minuscule (connexion) ou avec libellé masqué (`/ma-carte`, `/appuis`, `/meteo-prix`), alors qu'il vise un public peu lettré. La synthèse vocale est figée en `fr-FR` (`ui/index.tsx:201`, `AssistantPage.tsx:85`) et `<html lang>` ne suit pas la langue choisie (`i18n/index.ts:72`).
4. **Code SMS à la saisie automatique** : `OtpInput` (`kit.tsx:85-109`) met `maxLength={1}` et ne garde que le dernier caractère ; `autoComplete="one-time-code"` n'est que sur la première case. À essayer sur un vrai téléphone quand les SMS ne seront plus simulés.
5. **Landing** : pas de repère `<main>` (le lien d'évitement mène à `#qui`), libellés du relief et texte posés sur un fond 3D chargé. À essayer à 375 px (non parcouru) et sur un téléphone d'entrée de gamme (rendu 3D, `backdrop-filter` sur toutes les cartes de `skin.css`).
6. **Documentation du design** : `DESIGN.md` dit que le frontend React n'a pas adopté le monde « Bénin Vert » (canopée, maïs, soleil) ; l'application livre « Argile et verre » (`docs/REFONTE_FRONTEND.md`). Deux fiches de surface pointent vers des fichiers disparus (`design/directions-v2`, `design/directions-v3`).
7. **Mouvement réduit** : `kit.css:731` ramène toutes les durées à 0,01 ms ; les retours d'état par couleur perdent leur transition. Acceptable, mais un état de remplacement serait plus net.

## Lecture par axes (skill `ui-ux-pro-max`)

| Axe | Verdict |
| --- | --- |
| Clarté | Bonne : étapes numérotées, fil d'Ariane, état du réseau (« Synchronisé »), mentions honnêtes. Réserve : P2-5. |
| Efficacité | Bonne pour le producteur (5 onglets, tuiles, action principale par écran) ; trop de liens pour l'administrateur (P2-7). |
| Accessibilité | Bonne base (aucun champ sans étiquette, aucune image sans `alt`, un seul `h1` par page, anneau de focus 2 px + halo) ; P2-1, P2-4, P2-6. |
| Cohérence | Bonne : un kit, un jeu de jetons. Le P1-1 est une incohérence de cascade, pas de design. |
| Confiance et ton | Très bonne : français clair, erreurs avec la solution, « Simulation » partout. Réserve : P2-8. |

## Ce qui fonctionne et doit rester

- Lien d'évitement, `main`, repères de navigation, cloche avec nombre de messages dans son nom accessible.
- Formulaires : étiquettes visibles, aide sous le champ, messages à côté du champ avec icône, pas de couleur seule.
- Connexion producteur par téléphone et code, minuteur de renvoi, mention du blocage après 5 essais, collage du code entier.
- Tableaux transformés en cartes au téléphone, bandeau hors ligne, squelettes de chargement.
- Choix de la langue au premier lancement avec haut-parleur par langue et pastille « À valider ».
- Pas de texte sous 12 px, pas d'emoji comme icône, liens légaux à 44 px, mode sombre cohérent.

## Actions recommandées

1. **[P1] `/impeccable adapt`** : repli de `.split`, puis cibles à 44 px (P2-4), puis revue du tiroir à 768 px.
2. **[P2] `/impeccable harden`** : titre, défilement et focus au changement de page (P2-1) ; focus sur la première erreur (P2-6).
3. **[P2] `/impeccable layout`** : cartes de chiffres sans coupe (P2-2).
4. **[P2] `/impeccable polish`** : bulle SMS (P2-3), image du diagnostic (P2-8), avatar sombre, texte « Écouter ».
5. **[P2] `/impeccable clarify`** : tâches de la semaine (P2-5) ; descriptions de page entières au téléphone.
6. **[P2] `/impeccable distill`** : navigation de l'administrateur (P2-7).
7. **[P3] `/impeccable document`** : mettre `DESIGN.md` en phase avec « Argile et verre ».
8. **`/impeccable polish`** en dernier, puis relancer cet audit.

## Non vérifié

- Production : aucune mesure de poids ni de temps (le dossier `dist/` est antérieur à la refonte ; un `vite build` n'a pas été lancé sur ce poste de 3,5 Go).
- Landing à 375 px, parcours de l'inscription jusqu'au bout, gestes tactiles du tracé GPS et de la carte, lecteur d'écran, appareil réel.
- Rôles transformateur, distributeur, gestionnaire, agent financier : seulement par les routes que l'administrateur peut ouvrir.
- Le P1-1 a été prouvé par une règle injectée au navigateur, pas par un correctif dans le dépôt.

## Annexe : critique Impeccable (charge visuelle, contraste, polices)

Deuxième passe du même jour, avec Impeccable 4.7.0 : revue de design et détecteur menés par deux sous-agents isolés, l'un après l'autre. Rapport complet : `.impeccable/critique/2026-10-21T10-39-35Z__frontend-src.md`. Note de santé : **28/40 (bon, limite basse)**.

Correction à la passe technique ci-dessus : les cinq libellés de groupe du menu (`.sb-group`, `skin.css:113`) échouent bien le contraste (3,6 à 3,9:1 à cause de `opacity: .85`) ; je les avais écartés à tort comme faux positif.

| Priorité | Constat | Lieu | Commande |
| --- | --- | --- | --- |
| P1 | Repères sous les seuils : libellés du menu 3,6–3,9:1 ; initiales d'avatar en sombre 1,14:1 ; recherche et langue de la barre du haut 1,0:1 ; barre du haut sans flou sous « réduire la transparence » | `skin.css:113`, `:279`, `:52`, `:127` | `/impeccable colorize` |
| P1 | Chiffres rognés dans les cartes de chiffres, colonne « Rendement » cachée | `skin.css:207` | `/impeccable layout` |
| P1 | « Écouter » réduit à un disque vide au téléphone ; saisie et micro de l'Assistant sous la barre d'onglets | `skin.css:151` contre `mobile.css:52` | `/impeccable adapt` |
| P2 | Charge visuelle du pilotage : 38 liens, 30 ombres, 13 fonds, 8 tailles de police, pastel qui reprend les teintes d'alerte | `skin.css` | `/impeccable distill`, `/impeccable quieter` |
| P2 | Landing au téléphone : chapeau à 1,61:1 sur le relief, trois voix typographiques | `landing.css`, `DESIGN.md` | `/impeccable typeset` |

Détecteur : 0 résultat sur le code (recherche par motifs seulement, donc un minimum) ; sur les pages : `low-contrast` ×5, `nested-cards` (1 à 6 selon la page), `line-length` ×2, `cream-palette` (voulu, décision D6). Aucun faux positif retenu.
