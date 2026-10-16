"""Décrit la structure de farms_analyzed.json (POC).
Usage : py -3.11 -I docs/scripts/inspect_poc.py backend/data/poc/farms_analyzed.json
Lecture seule, en flux (raw_decode objet par objet) : json.load sur 77 Mo a levé MemoryError sur le PC cible.
Le fichier téléchargé est traité comme une donnée non fiable (aucun eval)."""
import json
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")
DEC = json.JSONDecoder()


def iter_items(path, chunk=1 << 20):
    """Itère sur les objets d'un tableau JSON racine sans le charger en entier."""
    buf = ""
    started = False
    with open(path, encoding="utf-8") as f:
        while True:
            data = f.read(chunk)
            buf += data
            if not started:
                buf = buf.lstrip()
                if not buf:
                    return
                assert buf[0] == "[", "racine attendue : tableau JSON"
                buf, started = buf[1:], True
            while True:
                buf = buf.lstrip().lstrip(",").lstrip()
                if not buf or buf[0] == "]":
                    break
                try:
                    obj, end = DEC.raw_decode(buf)
                except json.JSONDecodeError:
                    break  # objet incomplet : lire la suite
                yield obj
                buf = buf[end:]
            if not data:
                return


keys, types, ids = Counter(), {}, set()
num = {k: [float("inf"), float("-inf"), 0.0] for k in ("a", "conf", "road")}
maize, npts, closed, n = Counter(), [10**9, 0, 0], 0, 0
bbox = [180, 90, -180, -90]
first = None
for it in iter_items(sys.argv[1]):
    n += 1
    first = first or it
    ids.add(it.get("id"))
    for k, v in it.items():
        keys[k] += 1
        types.setdefault(k, set()).add(type(v).__name__)
    for k, s in num.items():
        v = it.get(k)
        if isinstance(v, (int, float)):
            s[0], s[1], s[2] = min(s[0], v), max(s[1], v), s[2] + v
    maize[it.get("maize")] += 1
    g = it.get("g") or []
    npts[0], npts[1], npts[2] = min(npts[0], len(g)), max(npts[1], len(g)), npts[2] + len(g)
    closed += bool(g) and g[0] == g[-1]
    for lon, lat in g:
        bbox = [min(bbox[0], lon), min(bbox[1], lat), max(bbox[2], lon), max(bbox[3], lat)]

print("racine: tableau JSON ; nombre d'elements:", n)
for k, c in keys.most_common():
    print(f"cle {k}: presente {c} fois, types {sorted(types[k])}")
for k, s in num.items():
    print(f"{k}: min {s[0]} max {s[1]} moyenne {s[2]/n:.3f}")
print("valeurs de maize:", maize.most_common(5))
print(f"points par polygone: min {npts[0]} max {npts[1]} moyenne {npts[2]/n:.1f}")
print("polygones fermes (premier point = dernier):", closed)
print("emprise [minLon, minLat, maxLon, maxLat]:", bbox)
ex = dict(first)
ex["g"] = ex["g"][:3] + ["..."]
print("exemple:", json.dumps(ex, ensure_ascii=False))
print("identifiants uniques:", len(ids) == n)
