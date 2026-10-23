from django.http import Http404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.models import User
from apps.core.errors import ApiError
from apps.core.pagination import Cursor
from apps.core.permissions import ADMIN, AGENT, AUDITEUR, FINANCIER, PRODUCTEUR, RESPONSABLE, in_scope, roles
from apps.producers.selectors import get_producer

from . import recovery
from .models import Claim, ClaimPayment

TRANSFORMATEUR = "transformateur"
READERS = (PRODUCTEUR, TRANSFORMATEUR, AGENT, ADMIN, RESPONSABLE, AUDITEUR, FINANCIER)
DEBTORS = (PRODUCTEUR, TRANSFORMATEUR)


class ClaimIn(serializers.Serializer):
    kind = serializers.ChoiceField(choices=["pret", "plateau"])  # l'appui s'ouvre à la confirmation de sa réception
    producer = serializers.UUIDField(required=False)  # prêt
    debtor_phone = serializers.RegexField(r"^01\d{8}$", required=False)  # équipement du plateau
    label = serializers.CharField(max_length=150)
    amount_xof = serializers.IntegerField(min_value=1)
    installments = serializers.IntegerField(min_value=1, max_value=recovery.MAX_INSTALLMENTS,
                                            default=recovery.DEFAULT_INSTALLMENTS)
    first_due = serializers.DateField(required=False)


def payment_out(p):
    return {"id": str(p.id), "claim": str(p.claim_id), "amount_xof": p.amount_xof, "status": p.status,
            "provider": p.provider, "reference": p.reference, "created_at": p.created_at, "paid_at": p.paid_at}


@api_view(["GET", "POST"])
@permission_classes([roles(*READERS)])
def claim_list(request):
    u = request.user
    if request.method == "GET":
        qs = recovery.claims_for(u)
        if kind := request.query_params.get("kind"):
            qs = qs.filter(kind=kind)
        pg = Cursor()
        return pg.get_paginated_response([recovery.summary(c) for c in pg.paginate_queryset(qs, request)])
    s = ClaimIn(data=request.data)
    s.is_valid(raise_exception=True)
    d = s.validated_data
    if d["kind"] == "pret":
        if u.role != FINANCIER or "producer" not in d:
            raise ApiError("Seule une institution financière ouvre un prêt, pour un producteur.", "forbidden", 403)
        producer = get_producer(u, d["producer"])  # seulement ceux qui ont consenti au crédit
        if producer.status != "valide" or producer.user is None:
            raise ApiError("Ce producteur n'a pas de compte validé.", "not_validated", 400)
        debtor, department = producer.user, producer.department
    else:
        if u.role not in (AGENT, ADMIN) or "debtor_phone" not in d:
            raise ApiError("Seul un agent ou l'administration ouvre un équipement du plateau, pour un transformateur.",
                           "forbidden", 403)
        debtor = User.objects.filter(phone=d["debtor_phone"], role=TRANSFORMATEUR, is_active=True).first()
        if debtor is None or not in_scope(u, debtor.department, debtor.commune):
            raise Http404
        department = debtor.department
    c = recovery.open_claim(u, debtor, d["kind"], d["label"], d["amount_xof"], installments=d["installments"],
                            first_due=d.get("first_due"), creditor=u, department=department)
    return Response(recovery.summary(c), status=201)


@api_view(["GET"])
@permission_classes([roles(*READERS)])
def claim_portfolio(request):
    return Response(recovery.portfolio(request.user))


@api_view(["GET"])
@permission_classes([roles(*READERS)])
def claim_detail(request, pk):
    c = recovery.claims_for(request.user).filter(pk=pk).first()
    if c is None:
        raise Http404
    return Response({**recovery.summary(c), "payments": [payment_out(p) for p in c.payments.order_by("-created_at")]})


@api_view(["POST"])
@permission_classes([roles(*DEBTORS)])
def claim_pay(request, pk):
    c = Claim.objects.filter(pk=pk, debtor=request.user).first()
    if c is None:
        raise Http404
    amount = request.data.get("amount_xof")
    try:
        amount = int(amount) if amount not in (None, "") else None
    except (TypeError, ValueError):
        raise ApiError("Montant invalide.", "validation_error", 400,
                       fields={"amount_xof": ["Nombre entier."]}) from None
    p = recovery.pay(request.user, c, request.data.get("payer_phone") or "", amount)
    return Response(payment_out(p), status=201)


@api_view(["GET"])
@permission_classes([roles(*READERS)])
def claim_payment_detail(request, pk):
    p = ClaimPayment.objects.filter(pk=pk, claim__in=recovery.claims_for(request.user)).first()
    if p is None:
        raise Http404
    return Response(payment_out(recovery.refresh(p)))
