import json
import random
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import reset_queries

from apps.farms.models import FarmPOC
from apps.referentiel.data import DEPARTMENTS, nearest_department, slug

BATCH = 2000
DEC = json.JSONDecoder()
WS = {" ", ",", chr(9), chr(10), chr(13)}


def iter_items(path, chunk=1 << 16):
    """Itère sur les objets d'un tableau JSON racine sans le charger en entier."""
    buf, pos, started = "", 0, False
    with open(path, encoding="utf-8") as f:
        while True:
            data = f.read(chunk)
            buf = buf[pos:] + data
            pos = 0
            if not started:
                buf = buf.lstrip()
                if not buf:
                    return
                if buf[0] != "[":
                    raise ValueError("racine attendue : tableau JSON")
                pos, started = 1, True
            while True:
                while pos < len(buf) and buf[pos] in WS:
                    pos += 1
                if pos >= len(buf) or buf[pos] == "]":
                    break
                try:
                    obj, pos2 = DEC.raw_decode(buf, pos)
                except json.JSONDecodeError:
                    break  # objet incomplet : lire la suite
                yield obj
                pos = pos2
            if not data:
                return


class Command(BaseCommand):
    help = "Importe les fermes du POC (farms_analyzed.json) ; à défaut, 200 000 fermes synthétiques."

    def add_arguments(self, parser):
        parser.add_argument("path", nargs="?", default=str(settings.BASE_DIR / "data/poc/farms_analyzed.json"))
        parser.add_argument("--synthetic", type=int, default=200_000)

    def handle(self, path, synthetic, **opts):
        settings.DEBUG = False  # sinon chaque requête SQL massive est conservée en mémoire
        FarmPOC.objects.all().delete()
        rows = self._real(Path(path)) if Path(path).exists() else self._synthetic(synthetic)
        buf, n = [], 0
        for r in rows:
            buf.append(FarmPOC(**r))
            if len(buf) >= BATCH:
                FarmPOC.objects.bulk_create(buf, batch_size=BATCH)
                n += len(buf)
                buf = []
                reset_queries()  # DEBUG=True conserve chaque requête : on vide pour tenir en mémoire
        FarmPOC.objects.bulk_create(buf, batch_size=BATCH)
        n += len(buf)
        self.stdout.write(f"{n} fermes importées")

    def _real(self, path):
        # format POC : [{"id","a" (ha),"maize" 0/1,"conf","road" (m),"g" [[lon,lat],...]}], sans département.
        # Lecture en flux (77 Mo, json.load lève MemoryError sur le PC cible) ; seule la position centrale est gardée.
        for f in iter_items(path):
            g = f["g"]
            lon, lat = sum(p[0] for p in g) / len(g), sum(p[1] for p in g) / len(g)
            # shortcut: département = centre départemental le plus proche (localisation approximative), commune
            # non renseignée ; à remplacer par une jointure spatiale sur les limites officielles.
            name = nearest_department(lon, lat)[0]
            yield dict(farm_id=f["id"], lon=round(lon, 5), lat=round(lat, 5), department=slug(name), commune="",
                       is_maize=bool(f.get("maize")), maize_confidence=f.get("conf") or 0.0,
                       road_distance_m=f.get("road") or 0.0, area_ha=f.get("a") or 0.0, source="poc_agri_digit")

    def _synthetic(self, count):
        rnd = random.Random(42)
        for i in range(count):
            name, (clon, clat), communes = DEPARTMENTS[i % len(DEPARTMENTS)]
            yield dict(farm_id=f"SYN-{i + 1:06d}", lon=round(clon + rnd.uniform(-0.4, 0.4), 5),
                       lat=round(clat + rnd.uniform(-0.3, 0.3), 5), department=slug(name),
                       commune=slug(rnd.choice(communes)), is_maize=rnd.random() < 0.6,
                       maize_confidence=round(rnd.uniform(0.3, 0.99), 3),
                       road_distance_m=round(rnd.uniform(10, 5000), 1), area_ha=round(rnd.uniform(0.2, 8), 2),
                       source="synthetique_demo")
