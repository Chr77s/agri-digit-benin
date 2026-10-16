import csv
import io

from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes

from apps.audit.services import record
from apps.core.permissions import ADMIN, roles
from apps.farms.selectors import aggregates
from apps.parcels.models import Parcel
from apps.producers.models import Producer


class ExportSerializer(serializers.Serializer):
    dataset = serializers.ChoiceField(choices=["producers", "parcels", "farms_aggregates"])
    reason = serializers.CharField(min_length=10, max_length=500)


def _rows(dataset):
    if dataset == "producers":
        yield ["code", "npi", "prenom", "nom", "sexe", "naissance", "departement", "commune", "telephone", "statut"]
        for p in Producer.objects.order_by("code"):
            yield [p.code, p.npi, p.first_name, p.last_name, p.sex, p.birth_date, p.department, p.commune, p.phone,
                   p.status]
    elif dataset == "parcels":
        yield ["id", "producteur", "nom", "surface_ha", "type", "foncier", "departement", "chevauchement"]
        for p in Parcel.objects.select_related("producer").order_by("created_at"):
            yield [p.id, p.producer.code, p.name, p.area_ha, p.land_type, p.tenure, p.department, p.overlap_warning]
    else:
        yield ["departement", "fermes", "mais_ha", "source", "mis_a_jour"]
        for r in aggregates():
            yield [r["name"], r["farms"], r["maize_ha"], r["source"], r["updated_at"]]


@api_view(["POST"])
@permission_classes([roles(ADMIN)])
def export(request):
    s = ExportSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    d = s.validated_data
    buf = io.StringIO()
    w = csv.writer(buf, delimiter=";")
    n = -1
    for row in _rows(d["dataset"]):
        w.writerow(row)
        n += 1
    with transaction.atomic():
        record(request.user, "export.csv", object_type="dataset", object_id=d["dataset"], reason=d["reason"], rows=n)
    resp = HttpResponse("﻿" + buf.getvalue(), content_type="text/csv; charset=utf-8")
    resp["Content-Disposition"] = f'attachment; filename="{d["dataset"]}_{timezone.now():%Y%m%d_%H%M}.csv"'
    return resp
