# Suivi satellite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer les indices satellite simulés par du NDVI/NDMI Sentinel-2 réel (Copernicus), avec repli démo étiqueté, et offrir une console d'analyse 2D avec relief 3D optionnel.

**Architecture:** Un client `integrations/copernicus.py` (jeton OAuth + Statistical API) alimente un cache en base (`SatelliteObservation`) via `apps/satellite/services.py`. L'API `/api/v1/satellite` garde sa route et gagne `series`, `ndmi`, `simulated`. Le frontend découpe la page en carte, panneau de couches et frise, et charge la 3D à la demande.

**Tech Stack:** Django 5.2 + DRF, httpx 0.28, shapely 2.1, pytest ; React 18, react-leaflet 4.2, three 0.169, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-27-suivi-satellite-design.md`

## Global Constraints

- Noms inchangés : route `/satellite`, menu « Suivi satellite », titre « Passages du satellite », colonnes Zone, Date d'acquisition, NDVI, Capteur. Seule l'humidité devient « Humidité de la végétation (NDMI) ».
- Codes des 12 départements : `alibori, atacora, atlantique, borgou, collines, couffo, donga, littoral, mono, oueme, plateau, zou`.
- Intervalles de 10 jours, 9 intervalles (90 jours). Cache de 24 h. Délai global d'un rafraîchissement : 20 s, 4 fils. `valid_pct` sous 20 : `ndvi` et `ndmi` valent `null`. `maxCloudCoverage` 80.
- Pixels exclus si `SCL` vaut 0, 1, 3, 8, 9, 10 ou 11. NDVI = (B08−B04)/(B08+B04). NDMI = (B8A−B11)/(B8A+B11).
- Source réelle : « Copernicus Sentinel-2 L2A via Copernicus Data Space ». Source démo (inchangée) : « Données de démonstration (POC), non officielles ». Capteur réel : « Sentinel-2 L2A ».
- Aucun secret dans Git, Vercel ou le frontend. `CDSE_CLIENT_ID` et `CDSE_CLIENT_SECRET` viennent de `backend/.env` et de Render.
- Tests réseau : `httpx.post` remplacé, jamais d'appel réel. `conftest.py` force `SATELLITE_BACKEND = "demo"`.
- Commits : seulement après l'accord explicite de l'utilisateur au début de l'exécution, sur une branche `feat/suivi-satellite` créée depuis `mr/docker-supabase`. Aucun push.
- Ne pas toucher `sat-geotiff-fr/`. Texte français, avec accents.

## Review Focus

1. Intervalle entièrement masqué (Copernicus renvoie `"NaN"` ou rien) : `null` partout, pas d'exception (Task 3).
2. Copernicus répond 401, 429 ou expire : repli sur le dernier stocké, puis sur la démo, jamais une erreur 500 (Task 4).
3. Mode `cdse` forcé sans clés : repli étiqueté, pas de 500 (Task 4).
4. Un producteur demande la parcelle d'un autre : 404 ; un agent filtrant un autre département : ignoré (Task 5).
5. Tous les indices `null` (saison des pluies) : le tableau, la frise et la carte affichent « Nuageux » sans `NaN` ni plantage ; sans WebGL le bouton 3D n'existe pas (Tasks 8 et 9).

## File Structure

| Fichier | Rôle |
|---|---|
| `backend/config/settings.py` | variables `SATELLITE_BACKEND`, `CDSE_*` |
| `backend/apps/satellite/models.py`, `migrations/0001_initial.py` | `SatelliteObservation` |
| `backend/apps/referentiel/zones.py` + `benin_departements.geojson` | contours des 12 départements |
| `backend/integrations/copernicus.py` | jeton, appel Statistical API, lecture de la réponse |
| `backend/apps/satellite/services.py` | périodes, cache, rafraîchissement, repli démo |
| `backend/apps/satellite/api.py` | vues `satellite`, `zones`, `parcel_satellite` |
| `backend/apps/satellite/management/commands/{refresh_satellite,satellite_check}.py` | exploitation et validation de la clé |
| `frontend/src/features/satellite/{scale.ts,api.ts,SatelliteMap.tsx,LayersPanel.tsx,Timeline.tsx,Relief3D.tsx,terrain.ts,satellite.css}` | données, couleurs, console, 3D |
| `frontend/src/features/parcels/{ParcelBasemaps.tsx,ParcelDetail.tsx}` | fonds exportés, carte de parcelle |

---

### Task 1: Configuration et modèle

**Files:**
- Modify: `backend/config/settings.py` (après la ligne `WEATHER_URL`), `backend/conftest.py` (fixture `_setup`)
- Create: `backend/apps/satellite/models.py`, `backend/apps/satellite/migrations/__init__.py`, migration générée
- Test: `backend/apps/satellite/tests.py`

**Interfaces:**
- Produces: `settings.SATELLITE_BACKEND: str = "auto"`, `settings.CDSE_CLIENT_ID: str = ""`, `settings.CDSE_CLIENT_SECRET: str = ""`, `settings.CDSE_TOKEN_URL`, `settings.CDSE_STATS_URL` (valeurs du tableau §4.1 de la spec). `SatelliteObservation(zone_kind: 'department'|'parcel', zone_code: str(64), period_start: date, period_end: date, ndvi: float|None, ndmi: float|None, valid_pct: float|None, fetched_at: datetime auto_now)`, unique sur `(zone_kind, zone_code, period_start)`.

- [ ] **Step 1: Créer la branche** : `git switch -c feat/suivi-satellite`.
- [ ] **Step 2: Test** `test_observation_is_unique_per_zone_and_period` : deux `create` identiques lèvent `IntegrityError` ; une période différente passe.
- [ ] **Step 3: Lancer** `cd backend && pytest apps/satellite/tests.py::test_observation_is_unique_per_zone_and_period -q`. Attendu : échec (modèle absent).
- [ ] **Step 4: Implémenter** les réglages (`env(...)` comme `WEATHER_BACKEND`), le modèle, puis `python manage.py makemigrations satellite`. Ajouter `settings.SATELLITE_BACKEND = "demo"` dans `_setup` de `conftest.py`.
- [ ] **Step 5: Lancer** la même commande puis `pytest apps/interop/tests.py::test_satellite_is_deterministic_and_labelled -q`. Attendu : PASS.
- [ ] **Step 6: Commit** `feat(satellite): réglages Copernicus et modèle d'observation`.

### Task 2: Contours des départements

**Files:**
- Create: `docs/scripts/build_departements_geojson.py`, `backend/apps/referentiel/benin_departements.geojson`, `backend/apps/referentiel/zones.py`
- Test: `backend/apps/satellite/tests.py`

**Interfaces:**
- Produces: `zones.department_features() -> list[dict]` (GeoJSON Features, `properties = {"code", "name"}`, mis en cache) ; `zones.department_geometry(code: str) -> dict` (lève `KeyError` si inconnu).

- [ ] **Step 1: Télécharger** (autorisé par l'utilisateur) la liste `https://www.geoboundaries.org/api/current/gbOpen/BEN/ADM1/`, puis le fichier `simplifiedGeometryGeoJSON` qu'elle indique, dans le dossier scratchpad (jamais dans le dépôt). Noter la taille et la licence indiquées.
- [ ] **Step 2: Test** `test_zones_cover_the_12_departments` : `{f["properties"]["code"] for f in department_features()} == set(Department.objects.values_list("code", flat=True))` (12) ; chaque géométrie est un `Polygon` ou `MultiPolygon` valide (`shapely.geometry.shape(g).is_valid`). `test_unknown_department_raises_keyerror`.
- [ ] **Step 3: Lancer** les deux tests. Attendu : échec.
- [ ] **Step 4: Écrire** `docs/scripts/build_departements_geojson.py` (entrée : chemin du fichier brut en argument) : associe `shapeName` à `Department.code` par `apps.referentiel.data.slug`, simplifie à `0.005` degré avec shapely, arrondit à 4 décimales, écrit une `FeatureCollection` de moins de 300 Ko. Lancer le script, puis implémenter `zones.py` (lecture unique du fichier, `functools.cache`). Si un nom ne correspond pas, corriger par une table explicite dans le script, jamais par un contour manquant.
- [ ] **Step 5: Lancer** les tests. Attendu : PASS. Vérifier la taille du fichier.
- [ ] **Step 6: Commit** `feat(referentiel): contours des 12 départements (geoBoundaries, CC BY 4.0)`.

### Task 3: Client Copernicus

**Files:**
- Create: `backend/integrations/copernicus.py`
- Test: `backend/apps/satellite/tests.py`

**Interfaces:**
- Consumes: `settings.CDSE_*`.
- Produces: `class CopernicusError(Exception)` ; `token() -> str` ; `raw_statistics(geometry: dict, start: date, end: date, resolution: float) -> dict` (JSON brut de la réponse) ; `series(geometry: dict, start: date, end: date, resolution: float) -> list[dict]` avec `{"from": date, "to": date, "ndvi": float|None, "ndmi": float|None, "valid_pct": float|None}`.

- [ ] **Step 1: Tests** (réponses écrites en fixture, `httpx.post` remplacé) :
  - `test_token_is_cached_until_expiry` : deux `series` provoquent un seul POST sur `CDSE_TOKEN_URL` (corps `grant_type=client_credentials`).
  - `test_series_reads_ndvi_ndmi_and_valid_pct` : fixture à 2 intervalles `outputs.ndvi.bands.B0.stats.mean`, `outputs.ndmi…`, `sampleCount` et `noDataCount` ; attendu `ndvi == 0.61`, `valid_pct == 80.0` pour `sampleCount=100, noDataCount=20`.
  - `test_fully_masked_interval_gives_none` : `mean` valant `"NaN"` ou absent, ou `valid_pct < 20` : `ndvi is None and ndmi is None`.
  - `test_http_errors_become_copernicus_error` : 401, 429 et `httpx.ConnectError` lèvent `CopernicusError`.
  - `test_missing_keys_raise_copernicus_error`.
  - `test_request_body` : le corps envoyé contient `aggregationInterval == {"of": "P10D"}`, `maxCloudCoverage == 80`, `resx == resy == resolution`, et l'evalscript ci-dessous.
- [ ] **Step 2: Lancer** `pytest apps/satellite/tests.py -k "token or series or masked or http_errors or missing_keys or request_body" -q`. Attendu : échec.
- [ ] **Step 3: Implémenter.** Jeton : POST formulaire, cache module jusqu'à `exp − 60 s` (`expires_in`). Requête : POST JSON sur `CDSE_STATS_URL`, en-tête `Authorization: Bearer`, délai 15 s, `bounds.properties.crs = "http://www.opengis.net/def/crs/OGC/1.3/CRS84"`, `data = [{"type": "sentinel-2-l2a", "dataFilter": {"maxCloudCoverage": 80}}]`. Lecture tolérante (`.get` en chaîne, `float()` dans un `try`, `"NaN"` donne `None`). `valid_pct = 100 * (1 − noDataCount / sampleCount)`, arrondi à 1 décimale, `None` si `sampleCount` est nul. Evalscript exact :

```js
//VERSION=3
function setup() {
  return { input: [{ bands: ["B04", "B08", "B8A", "B11", "SCL", "dataMask"] }],
    output: [{ id: "ndvi", bands: 1, sampleType: "FLOAT32" }, { id: "ndmi", bands: 1, sampleType: "FLOAT32" }, { id: "dataMask", bands: 1 }] };
}
function evaluatePixel(s) {
  const bad = [0, 1, 3, 8, 9, 10, 11].includes(s.SCL);
  return { ndvi: [(s.B08 - s.B04) / (s.B08 + s.B04)], ndmi: [(s.B8A - s.B11) / (s.B8A + s.B11)], dataMask: [bad ? 0 : s.dataMask] };
}
```

- [ ] **Step 4: Lancer** les mêmes tests. Attendu : PASS.
- [ ] **Step 5: Commit** `feat(satellite): client Copernicus Statistical API`.

### Task 4: Services, cache et repli

**Files:**
- Create: `backend/apps/satellite/services.py`
- Test: `backend/apps/satellite/tests.py`

**Interfaces:**
- Consumes: `copernicus.series`, `zones.department_geometry`, `SatelliteObservation`, `settings.SATELLITE_BACKEND`.
- Produces: `periods(today: date) -> list[tuple[date, date]]` (les 9 blocs complets de 10 jours, alignés sur `date.toordinal() // 10`, précédant le bloc de `today`, du plus ancien au plus récent) ; `backend() -> "cdse" | "demo"` (`auto` donne `cdse` si les deux clés existent) ; `zone_series(kind: str, codes_geoms: dict[str, dict], today: date) -> dict[str, dict]` où chaque valeur est `{"simulated": bool, "points": [{"from": date, "to": date, "ndvi", "ndmi", "valid_pct"}]}` (9 points) ; constantes `TTL`, `DEADLINE_S = 20`, `WORKERS = 4`, et `RESOLUTION = {"department": 0.003, "parcel": 0.0001}`.

- [ ] **Step 1: Tests** :
  - `test_periods_are_9_contiguous_complete_blocks` : longueur 9, chaque intervalle dure 10 jours, `début == fin précédente + 1 jour`, dernière fin `< today`.
  - `test_demo_mode_never_touches_the_network` : `httpx.post` lève ; tous les points `simulated`, valeurs identiques à deux appels.
  - `test_cdse_mode_fetches_stores_then_serves_from_cache` : première lecture : N appels et lignes en base ; seconde : zéro appel.
  - `test_outage_serves_last_stored` : lignes stockées plus vieilles de 25 h, `CopernicusError` : `simulated is False`, valeurs stockées.
  - `test_outage_without_stored_falls_back_to_labelled_demo` : `simulated is True`.
  - `test_forced_cdse_without_keys_falls_back` : `SATELLITE_BACKEND="cdse"`, clés vides, pas d'exception, `simulated is True`.
  - `test_one_failing_zone_does_not_block_others` : l'échec de `zou` laisse `alibori` réel.
- [ ] **Step 2: Lancer** `pytest apps/satellite/tests.py -k "periods or demo_mode or cdse_mode or outage or forced or failing_zone" -q`. Attendu : échec.
- [ ] **Step 3: Implémenter.** Une zone est périmée sans ligne ou si `max(fetched_at) < now − 24 h`. Rafraîchissement : `ThreadPoolExecutor(WORKERS)`, délai global `DEADLINE_S` (les futures non terminées sont ignorées), `update_or_create` par intervalle, `CopernicusError` journalisée (structlog) et avalée. Lecture : lignes stockées de la zone sur les 9 périodes ; période absente donne des `None`. Démo : `ndvi = 0.3 + 0.55 * u`, `ndmi = −0.1 + 0.6 * u2`, `valid_pct = 100.0`, avec `u = _unit(f"{code}:ndvi", période.fin)` (reprendre `_unit` d'`api.py`, le déplacer ici).
- [ ] **Step 4: Lancer** les mêmes tests. Attendu : PASS.
- [ ] **Step 5: Commit** `feat(satellite): cache d'observations et repli démo étiqueté`.

### Task 5: API

**Files:**
- Modify: `backend/apps/satellite/api.py`, `backend/config/urls.py:192` (à côté de `satellite`), `docs/API_CONTRACT_V2.md`
- Test: `backend/apps/satellite/tests.py`, `backend/apps/interop/tests.py:43`

**Interfaces:**
- Consumes: `services.zone_series`, `services.backend`, `zones.department_features`, `parcels.api.parcels_for`.
- Produces :
  - `GET /api/v1/satellite?department=` → `{"source": str, "simulated": bool, "scope": "department", "results": [{"department", "commune": None, "ndvi", "ndmi", "valid_pct", "acquired_at": ISO, "sensor", "simulated"}], "series": {code: [{"from", "to", "ndvi", "ndmi", "valid_pct"}]}}`. Une ligne par département : dernier point non nul, sinon valeurs `None` ; `acquired_at` = fin de cet intervalle à 10:30 UTC.
  - `GET /api/v1/satellite/zones` → `{"type": "FeatureCollection", "features": [...]}`.
  - `GET /api/v1/parcels/<uuid:pk>/satellite` → même forme avec `scope: "parcel"`, `results` d'une ligne dont `department` est celui de la parcelle, `series` clé = `str(pk)`. En démo ou sans observation : valeur du département et `scope: "department"`.
  - Règles inchangées : agent et producteur limités à leur département ; `soil_moisture_pct` supprimé.

- [ ] **Step 1: Tests** :
  - `test_satellite_demo_shape` : `simulated is True`, 12 lignes pour `admin`, `len(series) == 12`, 9 points chacune, `"non officielles" in source`.
  - `test_satellite_real_mode_label` : fixture Copernicus : `simulated is False`, `source == "Copernicus Sentinel-2 L2A via Copernicus Data Space"`, `sensor == "Sentinel-2 L2A"`.
  - `test_agent_cannot_widen_department_filter` : agent d'Alibori demandant `?department=zou` reçoit uniquement `alibori`.
  - `test_zones_endpoint_requires_auth_and_lists_12` : 401 sans compte, 12 features avec compte.
  - `test_parcel_satellite_is_scoped` : le producteur lit sa parcelle (200), celle d'un autre producteur donne 404, un utilisateur non autorisé 403 (comportement de `parcels_for`).
  - `test_parcel_satellite_demo_falls_back_to_department` : `scope == "department"`.
  - Adapter `test_satellite_is_deterministic_and_labelled` : garder ses assertions, ajouter `"series" in a`.
- [ ] **Step 2: Lancer** `pytest apps/satellite apps/interop/tests.py -k satellite -q`. Attendu : échec.
- [ ] **Step 3: Implémenter** les trois vues (`@api_view(["GET"])`, `Http404` pour une parcelle inaccessible). Tableau global `simulated = any(ligne.simulated)` ; `source` = source réelle si aucune ligne simulée, sinon source démo. Documenter les trois routes dans `docs/API_CONTRACT_V2.md` (en retirant `soil_moisture_pct`).
- [ ] **Step 4: Lancer** `pytest -q` (suite complète). Attendu : tout PASS.
- [ ] **Step 5: Commit** `feat(satellite): API série, NDMI, contours et parcelle`.

### Task 6: Commandes d'exploitation

**Files:**
- Create: `backend/apps/satellite/management/__init__.py`, `management/commands/__init__.py`, `refresh_satellite.py`, `satellite_check.py`
- Test: `backend/apps/satellite/tests.py`

**Interfaces:**
- Consumes: `services.zone_series`, `copernicus.token`, `copernicus.raw_statistics`.
- Produces: `manage.py refresh_satellite` (tous les départements, code de sortie 0 même si une zone échoue, résumé « réel : n, repli : m ») ; `manage.py satellite_check [--department alibori]` (affiche « jeton OK », puis le JSON brut de `raw_statistics` sur 30 jours, sinon le message de `CopernicusError` et code 1).

- [ ] **Step 1: Tests** : `test_refresh_command_reports_counts` (réponses simulées, sortie contient « réel : 12 ») ; `test_check_command_prints_raw_json` (sortie contient une clé de la fixture) ; `test_check_command_without_keys_exits_1` (`CommandError`).
- [ ] **Step 2: Lancer** `pytest apps/satellite/tests.py -k "command" -q`. Attendu : échec.
- [ ] **Step 3: Implémenter** les deux commandes.
- [ ] **Step 4: Lancer** les tests. Attendu : PASS.
- [ ] **Step 5: Commit** `feat(satellite): commandes refresh_satellite et satellite_check`.

### Task 7: Couche de données et échelle de couleurs (frontend)

**Files:**
- Modify: `frontend/src/shared/api/types.ts:155-156`, `frontend/src/features/satellite/api.ts`
- Create: `frontend/src/features/satellite/scale.ts`, `frontend/src/features/satellite/scale.test.ts`

**Interfaces:**
- Produces (types) : `SatellitePoint {from: string; to: string; ndvi: number|null; ndmi: number|null; valid_pct: number|null}` ; `SatelliteRow {department; commune: string|null; ndvi; ndmi; valid_pct; acquired_at: string; sensor: string; simulated: boolean}` ; `SatelliteData {source: string; simulated: boolean; scope: 'department'|'parcel'; results: SatelliteRow[]; series: Record<string, SatellitePoint[]>}`.
- Produces (api.ts) : `useSatellite(department?: string)`, `useSatelliteZones()` (renvoie la FeatureCollection, `staleTime` 1 h), `useParcelSatellite(id: string)` ; `ndviLevel` conservé ; `moistureLevel` remplacé par `ndmiLevel(v: number): 'low'|'mid'|'high'` (seuils 0,1 et 0,3).
- Produces (scale.ts) : `type IndexKind = 'ndvi'|'ndmi'` ; `LOW_NDVI = 0.4` ; `indexColor(kind: IndexKind, v: number|null): string` (rampe NDVI `#C9B79A #E2D58A #A7CC6E #4E8A2B #016648` sur 0 à 1 ; rampe NDMI `#C9B79A #B9D3D0 #6FB7C9 #2F86B5 #0E4F8B` sur −0,2 à 0,6 ; `null` donne `#9AA39C`) ; `indexRange(kind) -> [number, number]`.

- [ ] **Step 1: Test** `scale.test.ts` : `indexColor('ndvi', 0) === '#C9B79A'`, `indexColor('ndvi', 1) === '#016648'`, `indexColor('ndvi', null) === '#9AA39C'`, valeur hors bornes bornée (`indexColor('ndvi', 2) === '#016648'`), `indexColor('ndmi', -0.2) === '#C9B79A'`, `ndmiLevel(0.05) === 'low'`.
- [ ] **Step 2: Lancer** `cd frontend && npm test -- scale` (voir le script `test` de `package.json`). Attendu : échec.
- [ ] **Step 3: Implémenter** types, hooks et `scale.ts` (interpolation linéaire entre arrêts). `npm run typecheck` signalera `SatellitePage.tsx` et `ParcelDetail.tsx` : les corriger au strict nécessaire (remplacer `soil_moisture_pct` par `ndmi`) pour garder le build vert avant les Tasks 8 et 10.
- [ ] **Step 4: Lancer** `npm test -- scale && npm run typecheck`. Attendu : PASS.
- [ ] **Step 5: Commit** `feat(satellite): types, hooks et échelle de couleurs`.

### Task 8: Console 2D

**Files:**
- Modify: `frontend/src/features/parcels/ParcelBasemaps.tsx`, `frontend/src/features/satellite/SatellitePage.tsx`, `frontend/src/i18n/fr.json` (bloc `satellite`, ligne 1305), `frontend/src/i18n/fr/producteur.json` (bloc `satellite`)
- Create: `SatelliteMap.tsx`, `LayersPanel.tsx`, `Timeline.tsx`, `Timeline.test.tsx`, `LayersPanel.test.tsx`, `satellite.css` (tous dans `frontend/src/features/satellite/`), `frontend/e2e/satellite.spec.ts`

**Interfaces:**
- Consumes: Task 7 (hooks, `indexColor`, `LOW_NDVI`).
- Produces :
  - `ParcelBasemaps.tsx` exporte `BASEMAPS: {key: 'street'|'relief'|'sentinel'|'satellite'; label: string /* clé i18n */; url: string; attribution: string; maxZoom: number; maxNativeZoom?: number; subdomains?: string}[]` ; le composant `ParcelBasemaps` existant l'utilise sans changer de comportement.
  - `Timeline({points: SatellitePoint[]; index: number; onIndex(i: number): void; playing: boolean; onPlay(): void; label: string})`, curseur `<input type="range">` (`min 0`, `max points.length-1`), bouton lecture, courbe SVG du NDVI avec `<title>` et résumé texte ; point `null` : texte « Nuageux ».
  - `LayersPanel({basemap, onBasemap, kind: IndexKind, onKind, showDepartments, onToggleDepartments, watch: {code: string; ndvi: number}[], onSelect(code: string): void, onRelief?: () => void})`.
  - `SatelliteMap({zones, rows, kind, index, series, basemap, selected, onSelect, showDepartments})` : couche GeoJSON colorée par `indexColor(kind, series[code][index][kind])`, infobulle texte (nom, valeur, niveau), contour renforcé pour `selected`.
  - Textes (clés `satellite.*` de `fr.json`) : `console.title` « Console d'analyse », `layers` « Couches », `basemap` « Fond de carte », `index` « Indice », `ndmi` « Humidité de la végétation (NDMI) », `watch` « Zones à surveiller », `watchNone` « Aucune zone sous 0,4 sur ce passage. », `cloudy` « Nuageux », `play` « Lecture », `pause` « Pause », `period` « Passage du {{from}} au {{to}} », `real` « Données Copernicus Sentinel-2 L2A », `credits` « Contient des données Copernicus Sentinel modifiées · Contours : geoBoundaries (CC BY 4.0) », `kpi.mean` « NDVI moyen du pays », `kpi.best` « Département le plus vert », `kpi.worst` « À surveiller », `kpi.valid` « Pixels clairs ». La clé `satellite.moisture` devient « Humidité de la végétation (NDMI) » ; `satellite.sensor` reste. `banner` n'apparaît que si `simulated`.

- [ ] **Step 1: Tests vitest** : `Timeline.test.tsx` (9 points rend 9 positions ; `fireEvent.change` du curseur appelle `onIndex(3)` ; un point `ndvi: null` rend « Nuageux » et aucun « NaN » dans le DOM ; le bouton lecture appelle `onPlay`). `LayersPanel.test.tsx` (choisir NDMI appelle `onKind('ndmi')` ; sans `onRelief`, le bouton « Relief 3D » est absent ; la liste `watch` vide affiche `watchNone`).
- [ ] **Step 2: Lancer** `npm test -- Timeline LayersPanel`. Attendu : échec.
- [ ] **Step 3: Implémenter** `BASEMAPS` (déplacer les constantes d'URL et d'attribution existantes sans les modifier), les trois composants et `satellite.css` (console `canopy`/`canopy-2`/`on-dark`/`maize`/`laterite` de `DESIGN.md` ; carte `min(72vh, 680px)` ; panneau fixe à droite dès 1024 px, tiroir sous 1024 px ; cibles de 44 px ; `@media (prefers-reduced-motion)` sans lecture automatique). Réécrire `SatellitePage.tsx` selon la spec §5.1 : bandeau (visible si `simulated`, sinon la mention `real` et la date), 4 chiffres clés, console, tableau existant (colonne NDMI avec `Bar` et `ndmiLevel`, valeur `null` donne « Nuageux »). État : `index` (dernier), `kind` (`ndvi`), `basemap` (`sentinel`), `selected`, `playing` (avance d'un cran par seconde, arrêt à la fin, jamais lancé si `prefers-reduced-motion`). Ajouter les clés i18n listées ; langues locales selon le mécanisme existant.
- [ ] **Step 4: Lancer** `npm test && npm run build`. Attendu : PASS, build vert (`keys.test.ts` inclus).
- [ ] **Step 5: Test e2e** `satellite.spec.ts` (style de `p2.spec.ts`) : ouvrir `/satellite`, voir « Console d'analyse », changer l'indice, déplacer le curseur et lire la période affichée, constater l'absence de « NaN » et du bouton « Relief 3D ». Si le serveur de test n'est pas disponible, l'indiquer et le lancer à la main (voir `docs/DEMO.md`).
- [ ] **Step 6: Vérifier au navigateur** (serveur local, voir `start.bat`) : captures à 1280 et 390 px, console sans erreur, fonds de carte et contours visibles.
- [ ] **Step 7: Commit** `feat(satellite): console d'analyse 2D avec frise et panneau de couches`.

### Task 9: Relief 3D optionnel

**Files:**
- Create: `frontend/src/features/satellite/terrain.ts`, `terrain.test.ts`, `Relief3D.tsx`
- Modify: `frontend/src/features/satellite/SatellitePage.tsx`

**Interfaces:**
- Produces (terrain.ts) : `decodeTerrarium(r: number, g: number, b: number): number` (= `r*256 + g + b/256 − 32768`) ; `tileRange(bbox: [west, south, east, north], z: number): {x0: number; x1: number; y0: number; y1: number}` (tuiles XYZ) ; `hasWebGL(): boolean` ; `TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'` ; `BENIN_BBOX = [0.7, 6.2, 3.9, 12.4]`.
- Produces (Relief3D.tsx) : export par défaut `Relief3D({rows, series, kind, index, onClose, onError})`, chargé par `React.lazy`. Maillage déformé par l'altitude (exagération ×8), texture : contours colorés par `indexColor`, rotation et zoom à la souris ou au doigt (`OrbitControls` de `three/examples/jsm/controls/OrbitControls.js`).
- Page : le bouton « Relief 3D » (`onRelief`) n'est passé que si `hasWebGL()` ; l'ouverture affiche `Relief3D` dans un `Suspense` ; `onError` referme et affiche « Le relief 3D n'est pas disponible. La carte 2D reste complète. ».

- [ ] **Step 1: Tests** `terrain.test.ts` : `decodeTerrarium(128, 0, 0) === 0`, `decodeTerrarium(128, 100, 0) === 100`, `tileRange(BENIN_BBOX, 7)` couvre `x0 <= x1` et `y0 <= y1` avec au plus 12 tuiles, `hasWebGL()` renvoie `false` sous jsdom.
- [ ] **Step 2: Lancer** `npm test -- terrain`. Attendu : échec.
- [ ] **Step 3: Implémenter** `terrain.ts`, `Relief3D.tsx` (libération des géométries, textures et rendu au démontage ; décoder les tuiles via canvas ; un échec réseau ou CORS appelle `onError`) et l'intégration à la page.
- [ ] **Step 4: Lancer** `npm test && npm run build`. Attendu : PASS ; la sortie de build montre un fragment séparé contenant three pour `Relief3D`.
- [ ] **Step 5: Vérifier au navigateur** : ouvrir le relief, tourner, changer de période sur la frise, fermer ; tester le repli en bloquant les requêtes vers `s3.amazonaws.com`.
- [ ] **Step 6: Commit** `feat(satellite): relief 3D optionnel chargé à la demande`.

### Task 10: Fiche parcelle, documentation et vérification finale

**Files:**
- Modify: `frontend/src/features/parcels/ParcelDetail.tsx:138-164`, `docs/DONNEES.md`, `docs/DEPLOIEMENT.md`, `docs/DECISIONS.md`

**Interfaces:**
- Consumes: `useParcelSatellite(id)`. La fiche reçoit déjà l'identifiant de la parcelle (vérifier la prop ou le paramètre de route dans le fichier).

- [ ] **Step 1: Implémenter** `SatelliteCard` avec `useParcelSatellite` : NDVI et NDMI de la parcelle ; si `scope === 'department'`, la mention existante `parcels.satScope`/`satDate` ; badge « simulé » seulement si `simulated`.
- [ ] **Step 2: Documenter** : attributions Copernicus et geoBoundaries (`DONNEES.md`) ; variables `SATELLITE_BACKEND`, `CDSE_CLIENT_ID`, `CDSE_CLIENT_SECRET`, tâche planifiée `python manage.py refresh_satellite` toutes les 24 h sur Render (`DEPLOIEMENT.md`) ; décision et renvoi à la spec (`DECISIONS.md`).
- [ ] **Step 3: Vérification complète** : `cd backend && pytest -q && ruff check .` ; `cd ../frontend && npm test && npm run build`. Attendu : tout vert. Lancer `graphify update .` à la racine.
- [ ] **Step 4: Navigateur** : parcours producteur (fiche parcelle) et responsable (console), 1280 et 390 px, sans erreur de console.
- [ ] **Step 5: Commit** `feat(satellite): fiche parcelle et documentation`.

### Task 11: Validation avec vos clés Copernicus (avec l'utilisateur)

**Files:** aucun.

- [ ] **Step 1: Guider l'utilisateur** pas à pas pour créer le compte et le client OAuth (écran par écran, sans jamais lui demander le secret). Il renseigne `backend/.env` lui-même.
- [ ] **Step 2: Il lance** `cd backend && python manage.py satellite_check --department alibori` et m'en transmet la sortie, secret exclu.
- [ ] **Step 3: Comparer** la réponse brute à `outputs.ndvi.bands.B0.stats` et à `sampleCount`/`noDataCount`. Corriger `copernicus.py` et la fixture de test si la forme diffère ; confirmer ou corriger `CDSE_STATS_URL`.
- [ ] **Step 4: Lancer** `python manage.py refresh_satellite`, puis ouvrir `/satellite` : le bandeau « démonstration » doit avoir disparu et les valeurs être plausibles (NDVI saison sèche du nord, 0,2 à 0,4 ; saison des pluies, 0,5 à 0,8). Régler au besoin le seuil de 20 % de `valid_pct`.
- [ ] **Step 5: Commit** `fix(satellite): ajustements après validation sur données réelles` (seulement s'il y a des corrections).
