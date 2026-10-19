import re
import unicodedata

import structlog
from django.conf import settings

from apps.knowledge.services import search
from integrations.llm import ExtractiveBackend, get_backend
from integrations.notifications import get_channel

from .models import AssistantLog

log = structlog.get_logger()
DISCLAIMER = "Conseil indicatif, vérifiez avec votre agent ATDA"
DOSAGE = re.compile(r"\b(doses?|dosages?|posologie|combien de (ml|millilitres?|litres?|l|g|grammes?|kg|cc|"
                    r"sachets?|bouteilles?)|quelle quantite|ml par|litres? par|grammes? par|g par)\b")
RISK = re.compile(r"\b(pesticides?|insecticides?|herbicides?|fongicides?|phyto\w*|traitements?|trait\w+|produits?|"
                  r"medicaments?|vaccins?|vermifuges?|antibiotiques?|veterinaires?|poisons?)\b")
STRONG = re.compile(r"\b(dosages?|posologie)\b")


def _norm(text):
    return unicodedata.normalize("NFKD", text.lower()).encode("ascii", "ignore").decode()


def is_dosage_question(q):
    n = _norm(q)
    return bool(STRONG.search(n) or (DOSAGE.search(n) and RISK.search(n)))


def _redact(q):
    # minimisation : retire numéros de téléphone / NPI éventuellement saisis
    return re.sub(r"\d{8,}", "[numéro retiré]", q)


def escalate(user, question):
    """Question de dosage : transmise aux agents ATDA du département du producteur (notification dans l'application).
    Renvoie le nombre d'agents prévenus ; 0 si le compte n'a pas de fiche producteur ou aucun agent dans le secteur."""
    from apps.accounts.models import User

    producer = getattr(user, "producer", None)
    if producer is None:
        return 0
    agents = User.objects.filter(role="agent_atda", is_active=True, department=producer.department)
    body = f"{producer.code} ({producer.commune}) demande : « {question[:300]} ». Rappelez-le au {producer.phone}."
    for a in agents:
        get_channel("in_app").send(a.phone, body, user=a, title="Question de dosage à traiter")
    return len(agents)


def ask(user, question, value_chain=None, language="fr"):
    result = {"citations": [], "disclaimer": DISCLAIMER, "backend": "extractive"}
    top = None
    if is_dosage_question(question):
        sent = escalate(user, question)
        result.update(status="escalated",
                      answer="Les questions de dosage de produits phytosanitaires ou vétérinaires ne reçoivent "
                             "pas de réponse automatique. " + (
                                 "Votre question est transmise à l'agent ATDA de votre secteur, qui vous contactera."
                                 if sent else "Posez-la à votre agent ATDA."))
    else:
        hits = search(question, value_chain)
        top = hits[0][0] if hits else None
        if not hits or top < settings.ASSISTANT_MIN_SCORE:
            result.update(status="unknown", answer="Je ne sais pas : aucune fiche publiée ne couvre cette "
                                                   "question. Contactez votre agent ATDA.")
        else:
            passages = [d for s, d in hits if s >= settings.ASSISTANT_MIN_SCORE][:2]
            # contexte sans donnée personnelle : filière, commune, saison seulement
            ctx = {"filiere": value_chain or passages[0]["value_chain"], "commune": getattr(user, "commune", "")}
            backend = get_backend()
            try:
                answer = backend.answer(question, passages, ctx)
            except Exception:
                backend = ExtractiveBackend()
                answer = backend.answer(question, passages, ctx)
            result.update(status="answered", answer=answer, backend=backend.name,
                          citations=[{"doc_id": str(d["id"]), "title": d["title"], "source": d["source"],
                                      "version": d["version"]} for d in passages])
    AssistantLog.objects.create(question=_redact(question), value_chain=value_chain or "",
                                role=getattr(user, "role", ""), status=result["status"],
                                doc_ids=[c["doc_id"] for c in result["citations"]], backend=result["backend"],
                                top_score=top)
    log.info("assistant.ask", status=result["status"], backend=result["backend"])
    return result
