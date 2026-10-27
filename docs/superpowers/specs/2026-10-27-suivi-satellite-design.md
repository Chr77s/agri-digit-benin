# Suivi satellite : données Sentinel-2 réelles et console d'analyse

Date : 27/10/2026 · Statut : conception, à relire · Chemin : architectural

## 1. Intention

Ce que vous avez demandé : récupérer le code en ligne, intégrer correctement les données satellitaires, rendre l'affichage le plus attractif possible en s'inspirant de « wildfire analysis prototype », et rester légèrement fidèle à agri-digit-benin.vercel.app pour les fonctionnalités et les noms.

Choix confirmés en chat :
- Source : **NDVI Sentinel-2 calculé côté serveur** (Copernicus Data Space).
- Affichage : **console 2D, avec relief 3D optionnel**.
- Humidité : **remplacée par le NDMI** (humidité de la végétation).
- Contours des 12 départements : **geoBoundaries (CC BY 4.0)**, téléchargement autorisé.

Hypothèses, à corriger si elles sont fausses :
- Les noms du site Vercel (« Suivi satellite », route `/satellite`, rôles, libellés de tableau) restent tels quels.
- La charte « Bénin Vert » de `DESIGN.md` s'applique. Le français est la langue de référence.
- Le prototype wildfire n'existe que comme vidéo sur X (Dilum Sanjaya, 8/10/2026), non consultée. Je m'appuie sur la description de presse : relief avec traces orange, colonne de couches à droite, frise temporelle et graphiques en bas.

## 2. Constats vérifiés (état du code au 27/10/2026)

- `GET /api/v1/satellite` fabrique NDVI et humidité par hachage SHA-256 (`backend/apps/satellite/api.py`). Aucune image n'est lue. Le bandeau « démonstration » est déjà affiché.
- `sat-geotiff-fr/` contient le contour de la **Barbade** (ISO BB), une image RGB du 28/01/2024 et un README annonçant 2025-2026. Le TIFF (115 Mo) n'est ni dans le dépôt ni sur le poste. Ce jeu **n'est pas utilisé** par cette conception.
- `ParcelBasemaps.tsx` fournit quatre fonds réels (OSM, relief, Sentinel-2 EOX 2025, Esri). Aucune couche d'indice n'existe, et la carte n'est pas reliée au tableau.
- `ParcelDetail.tsx` affiche un NDVI du département pour une parcelle (« le serveur ne calcule pas encore par parcelle »).
- Aucun contour de département n'existe dans le dépôt. `Department` ne porte que `lat` et `lon`.
- Le projet suit déjà le schéma « service externe, repli démo étiqueté » avec `WEATHER_BACKEND`, `integrations/market_data.py` et des tests qui remplacent `httpx.get`. Cette conception le réutilise.

## 3. Hors périmètre

Niveau commune, alertes déclenchées par le satellite, couche de feux actifs (un test de tuile NASA GIBS a renvoyé 404, non creusé), humidité réelle du sol (radar), réparation ou suppression de `sat-geotiff-fr/`. Je ne touche pas à ce dossier. Vous pouvez recommander la zone « Bénin » chez NextGIS plus tard.

## 4. Backend

### 4.1 Configuration (`backend/config/settings.py`, modèle de `WEATHER_BACKEND`)

| Variable | Défaut | Rôle |
|---|---|---|
| `SATELLITE_BACKEND` | `auto` | `auto` : Copernicus si les deux clés sont renseignées, sinon démo. `cdse` : force. `demo` : valeurs simulées |
| `CDSE_CLIENT_ID`, `CDSE_CLIENT_SECRET` | vides | Client OAuth créé par vous. **Jamais** dans Git, Vercel ou le frontend |
| `CDSE_TOKEN_URL` | `https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token` | Documenté par Copernicus |
| `CDSE_STATS_URL` | `https://sh.dataspace.copernicus.eu/api/v1/statistics` | **À confirmer** par `satellite_check` (§8) |

### 4.2 `backend/integrations/copernicus.py`

- `token()` : OAuth2 `client_credentials`, jeton gardé en mémoire jusqu'à `exp` moins 60 s (l'endpoint est limité en débit, erreur 429).
- `series(geometry, start, end)` : un appel Statistical API par zone, `aggregationInterval` de 10 jours sur 90 jours, `maxCloudCoverage` de 80 %.
- evalscript : bandes `B04`, `B08`, `B8A`, `B11`, `SCL`, `dataMask`. NDVI = (B08 − B04) / (B08 + B04). NDMI = (B8A − B11) / (B8A + B11). Pixels exclus (`dataMask = 0`) si `SCL` vaut 0, 1, 3, 8, 9, 10 ou 11 (absence de donnée, saturation, ombre, nuages, neige).
- Retour : liste de `{from, to, ndvi, ndmi, valid_pct}`. `valid_pct` est la part de pixels clairs. Sous 20 %, `ndvi` et `ndmi` valent `null` (intervalle trop nuageux).
- Lecture tolérante de la réponse (`data[].outputs.<id>.bands.B0.stats.mean`). La forme exacte n'a pas pu être confirmée dans la documentation : c'est le risque n° 1 (§9).

### 4.3 Données et zones

- Fichier `backend/apps/referentiel/benin_departements.geojson` : 12 polygones simplifiés (geoBoundaries ADM1 BEN), associés aux `Department.code` par `slug(nom)`. Attribution dans `docs/DONNEES.md`. Un test impose 12 correspondances sur 12.
- Modèle `SatelliteObservation` (app `satellite`, nouvelle migration) : `zone_kind` (`department` ou `parcel`), `zone_code`, `period_start`, `period_end`, `ndvi`, `ndmi`, `valid_pct`, `fetched_at`. Unicité sur `(zone_kind, zone_code, period_start)`.
- `apps/satellite/services.py` : `refresh(zones)` interroge Copernicus seulement pour les zones sans observation ou plus vieilles de 24 h. Quatre fils en parallèle, délai global de 20 s, une erreur par zone est journalisée et n'interrompt pas les autres.
- Commande `manage.py refresh_satellite` pour préchauffer par tâche planifiée. Commande `manage.py satellite_check` (§8).

### 4.4 API (préfixe `/api/v1/`, rôles inchangés : agent et producteur limités à leur département)

- `GET satellite?department=` garde sa forme. Ajouts : `simulated` (booléen global) et par ligne `ndmi`, `valid_pct`, `simulated` ; objet `series` : `{ "<code>": [{from, to, ndvi, ndmi, valid_pct}, …] }` (12 départements × 9 intervalles, quelques ko). `soil_moisture_pct` est **supprimé** (remplacé par `ndmi`) ; `types.ts`, `docs/API_CONTRACT_V2.md` et `docs/openapi.json` suivent.
- `GET satellite/zones` : FeatureCollection des 12 départements avec leur `code`. Source unique pour le frontend.
- `GET parcels/<uuid>/satellite` : même forme pour une parcelle, avec la portée d'accès existante de `parcels/api.py` (un producteur ne lit que ses parcelles). En mode démo, retombe sur la valeur du département, étiquetée comme telle.
- `source` : « Copernicus Sentinel-2 L2A via Copernicus Data Space » en réel ; texte actuel en démo.

### 4.5 Erreurs et repli

Copernicus indisponible, clés absentes ou quota dépassé : dernière observation stockée, avec sa date visible. Aucune observation : valeurs démo, `simulated: true`, bandeau actuel. Le réel n'est jamais affiché sous une étiquette « démonstration » et la démo jamais sous une étiquette réelle.

## 5. Frontend : « Suivi satellite » (`/satellite`)

### 5.1 Composition (dossier `frontend/src/features/satellite/`)

Page existante conservée comme conteneur. Nouveaux fichiers : `SatelliteMap.tsx`, `LayersPanel.tsx`, `Timeline.tsx`, `Relief3D.tsx` (chargé à la demande), `scale.ts` (échelle de couleurs partagée).

Disposition, de haut en bas :
1. **Bandeau d'honnêteté** : réel ou simulé, avec la date du dernier passage.
2. **Chiffres clés** : NDVI moyen du pays, département le plus vert, département à surveiller, part de pixels clairs.
3. **Console** : carte pleine largeur (hauteur `min(72vh, 680px)`). Départements colorés par l'indice choisi, infobulle texte, clic pour sélectionner. Panneau de couches **à droite** : fonds de carte (les quatre existants, via un état local à la place du contrôle Leaflet), indice (NDVI ou NDMI), bascule des départements, liste « Zones à surveiller » (NDVI sous 0,4, repère orange latérite comme les traces du prototype), légende en dégradé, bouton « Relief 3D ». **Frise en bas** : curseur sur les 9 intervalles, bouton lecture, courbe NDVI du département sélectionné (SVG avec équivalent texte).
4. **Tableau** « Passages du satellite » existant : titre, colonnes et export CSV conservés. La colonne d'humidité devient « Humidité de la végétation (NDMI) ».

Style : console sombre (`canopy`, `canopy-2`, texte `on-dark`, accent `maize`, alertes `laterite`) du `DESIGN.md`, fond de carte clair par défaut. Mobile : le panneau devient un tiroir, la frise passe sous la carte, cibles tactiles de 44 px. La couleur ne porte jamais seule l'information (valeur et niveau écrits). `prefers-reduced-motion` désactive la lecture automatique.

### 5.2 Relief 3D optionnel

Bouton visible seulement si WebGL est disponible. `import()` dynamique de `Relief3D` (three.js 0.169 est déjà une dépendance, utilisé par `landing/field3d.ts`) : aucun octet de 3D dans le chargement initial. Relief : tuiles altimétriques Terrarium (AWS, niveau 7, environ 10 tuiles couvrant le Bénin), exagération verticale pour un relief très doux (maximum d'environ 658 m). Texture : départements colorés par l'indice de l'intervalle choisi sur la frise. Rotation et zoom à la souris ou au doigt. En cas d'échec (WebGL, réseau, CORS des tuiles), message clair et retour à la 2D.

### 5.3 Parcelle

`ParcelDetail` affiche le NDVI et le NDMI de la parcelle quand ils existent, sinon ceux du département avec la mention existante « simulé » ou « du département ».

### 5.4 Fidélité au site Vercel

Inchangés : route `/satellite`, entrée de menu « Suivi satellite », rôles autorisés, titre « Passages du satellite », colonnes Zone, Date d'acquisition, NDVI, Capteur, filtre département, textes d'aide. Changements assumés : colonne d'humidité renommée (§5.1), `sensor` = « Sentinel-2 L2A ».

### 5.5 i18n et crédits

Nouvelles clés dans `fr.json` et `fr/producteur.json` ; `keys.test.ts` doit rester vert ; les langues locales (bba, dnd, fon, yo) suivent le mécanisme « à valider » existant. Attributions affichées : « Contient des données Copernicus Sentinel modifiées » et « Contours : geoBoundaries (CC BY 4.0) », en plus de celles de ParcelBasemaps (EOX est non commercial : note existante conservée).

## 6. Prérequis de votre côté

1. Compte gratuit sur dataspace.copernicus.eu, puis Dashboard, « User Settings », « OAuth clients », « Create ». Ne cochez pas l'option application monopage.
2. Mettre `CDSE_CLIENT_ID` et `CDSE_CLIENT_SECRET` dans `backend/.env` en local et dans les variables d'environnement de Render. **Je ne manipule aucun secret.**
3. Lancer une fois `python manage.py satellite_check` et me transmettre la sortie si elle diffère de l'attendu.

## 7. Tests

- Backend (`pytest`, `httpx` remplacé comme dans `apps/satellite/tests.py`) : démo inchangée et étiquetée, mode Copernicus avec jeton et réponse de test, panne puis dernier stocké puis démo, portée par rôle, 12 contours sur 12 départements, accès aux parcelles d'autrui refusé.
- Le test existant `test_satellite_is_deterministic_and_labelled` doit rester vert.
- Frontend : `vitest` sur l'échelle et la frise ; Playwright sur la console (panneau, curseur, bouton 3D masqué sans WebGL) ; `keys.test.ts`.
- `npm run build` (tsc puis vite), puis contrôle visuel dans le navigateur à 1280 et 390 px.

## 8. Ce que je ne pourrai pas vérifier moi-même

Sans vos clés, **aucun appel réel à Copernicus** n'est possible depuis ici. Les tests utilisent des réponses simulées écrites d'après la forme attendue. `satellite_check` obtient un jeton, interroge un département et affiche la réponse brute : c'est votre première validation, et la mienne si vous me la communiquez. La 3D n'est testée que dans le navigateur intégré.

## 9. Risques

1. **Forme de la réponse Statistical API et URL exacte** non confirmées par la documentation lue. Parade : lecture tolérante, URL configurable, `satellite_check`.
2. **Nuages** en saison des pluies : intervalles de 10 jours souvent peu valides. Parade : `valid_pct`, valeur `null` sous 20 %, repli sur le dernier intervalle valide affiché avec sa date. Les paramètres (seuil de 20 %, 80 % de nébulosité de tuile) sont à régler sur données réelles.
3. **Quota gratuit** Copernicus : 12 départements × 1 appel par jour au plus, grâce au délai de 24 h. Les parcelles ne sont interrogées qu'à l'ouverture de la fiche.
4. **Premier chargement lent** (jusqu'à 20 s) sur l'hébergement gratuit : `refresh_satellite` planifié le supprime.
5. **CORS des tuiles altimétriques** non testé : la 3D est optionnelle et repliable.
