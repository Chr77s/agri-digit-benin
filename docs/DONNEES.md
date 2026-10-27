# Données utilisées par le prototype

Mention obligatoire : **source d'origine à documenter par l'équipe, données non officielles.**

## 1. Données du POC en ligne

| Fichier | URL | Téléchargé le | Taille | Statut |
| --- | --- | --- | --- | --- |
| `backend/data/poc/farms_analyzed.json` | https://agri-dpi-bn.vercel.app/data/farms_analyzed.json | 2026-10-16, ~13h31 (UTC+1), HTTP 200 | 77 477 681 octets | réussi |
| `backend/data/poc/total_maize_ha.txt` | https://agri-dpi-bn.vercel.app/data/total_maize_ha.txt | 2026-10-16, ~13h31, HTTP 200 | 9 octets | réussi |
| Tuiles `/data/maize_tiles/{z}/{x}/{y}.png` | | | | non téléchargées (choix : le prototype affiche les exploitations, pas le raster) |

En-têtes du serveur pour le JSON : `Last-Modified: Fri, 16 Oct 2026 11:53:55 GMT`, `ETag: "5d9f22f8e9b82481d01a2316968167fb"`. Empreintes SHA-256 dans `backend/data/poc/STRUCTURE.md`.

Le MASTER_PROMPT annonçait environ 17,8 Mo : le fichier réel fait 77,5 Mo (coordonnées complètes des polygones). Le nombre d'exploitations, 200 873, correspond.

Les fichiers téléchargés sont traités comme données non fiables : lus avec `json` en lecture seule, jamais exécutés.

## 2. Structure réelle de `farms_analyzed.json`

Mesurée par `py -3.11 -I docs/scripts/inspect_poc.py backend/data/poc/farms_analyzed.json` (lecture en flux, car `json.load` a levé `MemoryError` sur le PC cible).

- Racine : tableau JSON de 200 873 objets, identifiants uniques.
- Clés, présentes dans tous les objets : `id` (str), `a` (float, hectares), `maize` (int 0/1), `conf` (float), `road` (float, mètres), `g` (liste de `[lon, lat]`).
- `a` : 2,005 à 6 424,17 ha, moyenne 8,0. Seules les exploitations de 2 ha et plus sont présentes.
- `maize` : 113 659 exploitations avec maïs détecté, 87 214 sans.
- `conf` : 0,68 à 0,92, moyenne 0,80.
- `road` : 4 à 54 533 m, moyenne 4 743 m.
- `g` : 4 à 1 200 points (moyenne 18,1), tous les anneaux sont fermés.
- Emprise : lon 0,7689 à 3,8432, lat 6,3127 à 12,4076.
- Aucun champ département, commune, date d'acquisition ni méthode de détection.

Exemple :

```json
{"id": "BJ-FARM-000001", "a": 3.318699911941664, "maize": 0, "conf": 0.866, "road": 1996.9,
 "g": [[1.8564, 6.5039], [1.8565, 6.5026], [1.8562, 6.5034], "..."]}
```

`total_maize_ha.txt` contient `1516388.2` (hectares de maïs détectés).

## 3. Limites à afficher

- Date d'acquisition des images, capteur et méthode de détection inconnus : chaque chiffre issu de ces fichiers porte la source "POC agri-dpi-bn (données de démonstration)" et la date de téléchargement.
- La superficie `a` vient du POC ; pour les parcelles saisies dans le prototype, le serveur recalcule la surface.
- Le rattachement aux départements et communes est calculé par le prototype, pas fourni par la source.

## 4. Base de connaissances

Fichiers `backend/data/knowledge/<filiere>.json`. Source principale : INRAB, « Recueil des technologies agricoles prometteuses développées par le système national de recherche agricole » (PDF téléchargé le 2026-10-16 depuis inrab.bj, 6,3 Mo). Chaque passage cite la fiche (par exemple D-20) et la page imprimée. Le passage « Quand semer le maïs à Banikoara » cite aussi la fiche WOCAT n° 6686, consultée par extrait de moteur de recherche (la page n'a pas pu être ouverte directement) : à confirmer par l'INRAB ou l'ATDA.

Passages sans source en ligne : `source: "a_sourcer"`, `status: "brouillon_non_valide"`, aucune dose de produit phytosanitaire ou vétérinaire. Les passages sourcés sont `publie` pour la démonstration, mais restent à relire par l'INRAB (voir `ACTIONS_HUMAINES.md`).

## 5. Données de seed

Producteurs, NPI, téléphones : fictifs (voir `MOCKS.md`). Aucune donnée réelle de personne.

## 6. Données satellite (suivi satellite)

- **Indices** : NDVI et NDMI de Sentinel-2 L2A, calculés par la Statistical API de Copernicus Data Space (intervalles de 10 jours, nuages et ombres écartés par la bande SCL). Source affichée : « Copernicus Sentinel-2 L2A via Copernicus Data Space ». Sans clés Copernicus ou sans mesure stockée, l'écran passe en démonstration, étiquetée « non officielles ».
- **Mention obligatoire** : « Contient des données Copernicus Sentinel modifiées ». Conditions : https://sentinels.copernicus.eu/documents/247904/690755/Sentinel_Data_Legal_Notice
- **Contours des 12 départements** : geoBoundaries (BEN, ADM1, version simplifiée), licence indiquée par l'API : Public Domain ; attribution conservée (CC BY 4.0 affiché par prudence). Fichier : `backend/apps/referentiel/benin_departements.geojson`, reconstruit par `docs/scripts/build_departements_geojson.py`.
- **Fonds de carte** (affichage seulement, hors calcul) : OpenStreetMap, OpenTopoMap, Sentinel-2 cloudless 2025 d'EOX (CC BY-NC-SA 4.0, usage commercial non autorisé), Esri World Imagery.
- **Relief 3D** : tuiles d'altitude Terrarium (AWS Open Data), chargées à la demande.
- Le dossier `sat-geotiff-fr/` (image NextGIS) couvre la Barbade et non le Bénin : il n'est pas utilisé.
