import json
from collections import Counter
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db.models import Count

from apps.farms.models import FarmPOC
from apps.referentiel.models import Department

CELL = 0.05  # degrés, environ 5,5 km : une colonne du relief de la landing
OUT = settings.BASE_DIR.parent / "frontend" / "src" / "features" / "landing" / "relief.json"


class Command(BaseCommand):
    help = "Agrège les fermes du POC en colonnes de 0,05° pour le relief de la landing (aucune donnée personnelle)."

    def handle(self, *args, **opts):
        cells = Counter()
        for lon, lat in FarmPOC.objects.values_list("lon", "lat").iterator(chunk_size=20000):
            cells[(round(lon / CELL), round(lat / CELL))] += 1
        per_dep = dict(FarmPOC.objects.values_list("department").annotate(n=Count("id")))
        flat = [v for (gx, gy), n in sorted(cells.items(), key=lambda kv: (kv[0][1], kv[0][0])) for v in (gx, gy, n)]
        data = {
            "cell": CELL, "total": sum(cells.values()), "max": max(cells.values()),
            "source": "POC Agri-Digit (données de démonstration, non officielles)",
            "cells": flat,
            "departments": [
                {"code": d.code, "name": d.name, "lon": d.lon, "lat": d.lat, "farms": per_dep.get(d.code, 0)}
                for d in Department.objects.order_by("name")],
        }
        Path(OUT).parent.mkdir(parents=True, exist_ok=True)
        Path(OUT).write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        self.stdout.write(f"{len(cells)} colonnes, {data['total']} fermes -> {OUT}")
