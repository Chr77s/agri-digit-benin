"""Vitrine des produits (TDR § 3.1 : promotion des produits) : un transformateur, un distributeur ou une coopérative
publie ses produits, tous les acteurs connectés les lisent, l'auteur (ou l'administration) les retire."""
from django.db import transaction
from django.utils import timezone

from apps.audit.services import record
from apps.core.errors import ApiError
from apps.core.permissions import ADMIN
from apps.referentiel.models import Department, ValueChain

from .models import Showcase
from .prices import PRICE_MAX

WRITERS = ("transformateur", "distributeur", "gestionnaire_cooperative")


def _bad(field, msg):
    return ApiError(msg, "validation_error", 400, fields={field: [msg]})


@transaction.atomic
def publish(actor, d):
    if not ValueChain.objects.filter(code=d["value_chain"]).exists():
        raise _bad("value_chain", "Filière inconnue.")
    if not Department.objects.filter(code=d["department"]).exists():
        raise _bad("department", "Département inconnu.")
    if d["form"] not in ("brut", "transforme"):
        raise _bad("form", "Forme inconnue (brut ou transforme).")
    price = d.get("price_xof_per_kg")
    if price is not None and not 0 < price <= PRICE_MAX:
        raise _bad("price_xof_per_kg", f"Prix indicatif entre 1 et {PRICE_MAX} FCFA/kg.")
    s = Showcase.objects.create(owner=actor, company=d["company"].strip(), name=d["name"].strip(),
                                description=d.get("description", "").strip(), value_chain=d["value_chain"],
                                form=d["form"], price_xof_per_kg=price, department=d["department"],
                                contact=d["contact"].strip())
    record(actor, "showcase.publish", s, value_chain=s.value_chain, form=s.form)
    return s


@transaction.atomic
def withdraw(actor, s):
    if s.owner_id != actor.id and actor.role != ADMIN:
        raise ApiError("Introuvable.", "not_found", 404)
    if s.status != "publie":
        raise ApiError("Ce produit est déjà retiré.", "invalid_status", 400)
    s.status, s.withdrawn_at = "retire", timezone.now()
    s.save(update_fields=["status", "withdrawn_at"])
    record(actor, "showcase.withdraw", s)
    return s
