"""Construit backend/apps/referentiel/benin_departements.geojson depuis le fichier geoBoundaries (BEN, ADM1).

Usage : python docs/scripts/build_departements_geojson.py chemin/geoBoundaries-BEN-ADM1_simplified.geojson
Source : https://www.geoboundaries.org (licence indiquée par l'API : Public Domain ; attribution conservée par courtoisie).
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

from shapely.geometry import mapping, shape

# graphies de geoBoundaries qui diffèrent de notre référentiel
ALIASES = {"atakora": "atacora", "kouffo": "couffo", "atlanique": "atlantique"}
OUT = Path(__file__).resolve().parents[2] / "backend" / "apps" / "referentiel" / "benin_departements.geojson"


def slug(name):
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "_", s).strip("_")


def round_coords(c):
    return [round(x, 4) for x in c] if isinstance(c[0], (int, float)) else [round_coords(x) for x in c]


def main(src):
    features = []
    for f in json.load(open(src, encoding="utf-8"))["features"]:
        raw = f["properties"]["shapeName"]
        code = ALIASES.get(slug(raw), slug(raw))
        geom = mapping(shape(f["geometry"]).simplify(0.005))
        geom["coordinates"] = round_coords(geom["coordinates"])
        features.append({"type": "Feature", "properties": {"code": code, "name": raw}, "geometry": geom})
    OUT.write_text(json.dumps({"type": "FeatureCollection", "features": sorted(features, key=lambda x: x["properties"]["code"])},
                              ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(features)} départements écrits dans {OUT} ({OUT.stat().st_size // 1024} Ko)")


if __name__ == "__main__":
    main(sys.argv[1])
