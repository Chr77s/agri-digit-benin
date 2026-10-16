# Structure des fichiers POC (pour l'import backend)

Fichiers téléchargés le 2026-10-16 depuis `https://agri-dpi-bn.vercel.app/data/`. Données non officielles, source d'origine à documenter par l'équipe. Détail et provenance : `docs/DONNEES.md`.

## `farms_analyzed.json` (77 477 681 octets, pas 17,8 Mo comme annoncé)

Tableau JSON à la racine, 200 873 objets, tous avec les 6 mêmes clés :

| Clé | Type | Sens | Plage observée |
| --- | --- | --- | --- |
| `id` | str | Identifiant d'exploitation `BJ-FARM-000001`, unique | 200 873 valeurs distinctes |
| `a` | float | Superficie en hectares | 2,005 à 6 424,17 (moyenne 8,0) |
| `maize` | int (0 ou 1) | Maïs détecté | 1 : 113 659 ; 0 : 87 214 |
| `conf` | float | Confiance de la détection (0 à 1) | 0,68 à 0,92 (moyenne 0,80) |
| `road` | float | Distance à la route, en mètres | 4,0 à 54 533,1 (moyenne 4 742,6) |
| `g` | list[[lon, lat]] | Anneau extérieur du polygone, WGS84, ordre lon, lat | 4 à 1 200 points, toujours fermé |

Emprise : longitude 0,7689 à 3,8432 ; latitude 6,3127 à 12,4076 (Bénin).

Exemple (polygone tronqué) :

```json
{"id": "BJ-FARM-000001", "a": 3.318699911941664, "maize": 0, "conf": 0.866, "road": 1996.9,
 "g": [[1.8564, 6.5039], [1.8565, 6.5026], [1.8562, 6.5034], "..."]}
```

Pour l'import :

- Pas de champ département ni commune : il faut les déduire (point du centroïde dans les limites administratives, ou affectation par bbox des départements). À défaut, laisser `null` et l'indiquer dans la réponse.
- Géométrie GeoJSON : `{"type": "Polygon", "coordinates": [g]}`.
- `json.load` sur ce fichier a levé `MemoryError` sur le PC cible (environ 180 Mo de RAM libre). Lire en flux, objet par objet, et insérer par lots (`bulk_create` par 5 000). Exemple de lecture en flux : `docs/scripts/inspect_poc.py` (fonction `iter_items`).
- Ne jamais servir ce fichier au navigateur.

## `total_maize_ha.txt` (9 octets)

Une seule valeur texte : `1516388.2` (hectares de maïs détectés, total national selon le POC). À exposer avec `source` et `updated_at`, libellé "données de démonstration".

## Empreintes SHA-256

- `farms_analyzed.json` : `84fcd27e8d4bdd07efedd5c0da8b2c9805a8f65e3fa3b69235d56a95d660c835`
- `total_maize_ha.txt` : `2a57eccb18db7a492169aec5c6672ebdf0b61c7016ad430a5b6057013b03e7f3`
