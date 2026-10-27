"""Contours des 12 départements (geoBoundaries ADM1), source unique pour le calcul satellite et pour la carte."""
import json
from functools import cache
from pathlib import Path

FILE = Path(__file__).with_name("benin_departements.geojson")


@cache
def department_features():
    return json.loads(FILE.read_text(encoding="utf-8"))["features"]


def department_geometry(code):
    for f in department_features():
        if f["properties"]["code"] == code:
            return f["geometry"]
    raise KeyError(code)
