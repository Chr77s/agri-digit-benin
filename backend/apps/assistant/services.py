import re
import unicodedata

import structlog
from django.conf import settings

from apps.audit.services import record
from apps.knowledge.services import search, tokens
from integrations.llm import DEFAULT_NAME, DEFAULT_PERSONA, NO_ANSWER, ExtractiveBackend, get_backend, system_prompt
from integrations.notifications import get_channel

from .models import AssistantLog, AssistantProfile

log = structlog.get_logger()
DISCLAIMER = "Conseil indicatif, vérifiez avec votre agent ATDA"
UNKNOWN = "Je ne sais pas : aucune fiche publiée ne couvre cette question. Contactez votre agent ATDA."
DOSAGE = re.compile(r"\b(doses?|dosages?|posologie|combien de (ml|millilitres?|litres?|l|g|grammes?|kg|cc|"
                    r"sachets?|bouteilles?)|quelle quantite|ml par|litres? par|grammes? par|g par)\b")
RISK = re.compile(r"\b(pesticides?|insecticides?|herbicides?|fongicides?|phyto\w*|traitements?|trait\w+|produits?|"
                  r"medicaments?|vaccins?|vermifuges?|antibiotiques?|veterinaires?|poisons?)\b")
STRONG = re.compile(r"\b(dosages?|posologie)\b")
# une quantité de produit rapportée à une surface ou un volume (« 20 ml par litre », « 2 l/ha ») dans la réponse du modèle
UNIT = r"(ml|cl|l|litres?|g|kg|cc|sachets?|bouchons?|cuilleres?)"
DOSE_OUT = re.compile(rf"\b\d+([.,]\d+)?\s*{UNIT}\b(\s+[a-z']+){{0,4}}?\s*(/|par|pour|a l|a la)\s*"
                      r"(ha|hectares?|litres?|l|pulverisateur|pompe|seau|10 ?l|15 ?l|are|m2)\b")
# « 50 ml de produit », « 2 kg d'engrais phytosanitaire » : une quantité de produit à appliquer, sans surface
DOSE_PRODUCT = re.compile(rf"\b\d+([.,]\d+)?\s*{UNIT}\s+(de |d')\s*(produit|pesticide|insecticide|herbicide|fongicide|poison|"
                          r"traitement|phyto\w*)")
HIST_TURNS, HIST_CHARS = 6, 1200
ESCALATED = ("Les questions de dosage de produits phytosanitaires ou vétérinaires ne reçoivent pas de réponse "
             "automatique. ")
# salutations et phrases sans conseil agricole : la conversation sans documents ne sert qu'à elles
_GREET = re.compile(r"^(bonjour|bonsoir|salut|coucou|hello)\b")
_CHAT = re.compile(r"^(merci( beaucoup| bien)?|ok|d accord|au revoir|a bientot|bonne (journee|soiree|nuit)|"
                   r"(qui es tu|tu es qui|qui etes vous|presente toi|comment (vas tu|ca va|allez vous)|"
                   r"que (sais|peux|fais) tu( faire)?|a quoi sers tu|aide( moi)?)( .*)?)$")


def _norm(text):
    return unicodedata.normalize("NFKD", text.lower()).encode("ascii", "ignore").decode()


def is_dosage_question(q):
    n = _norm(q)
    return bool(STRONG.search(n) or (DOSAGE.search(n) and RISK.search(n)))


def contains_dose(text):
    n = _norm(text)
    return bool(DOSE_OUT.search(n) or DOSE_PRODUCT.search(n))


def plain(text):
    """Le modèle met parfois du Markdown malgré la consigne : on l'enlève, l'écran affiche du texte brut."""
    t = re.sub(r"(\*\*|__|`)", "", text)
    t = re.sub(r"(?m)^\s{0,3}#{1,6}\s*", "", t)
    t = re.sub(r"(?m)^(\s*)[*•]\s+", r"\1- ", t)
    return t.strip()


def is_smalltalk(q):
    n = " ".join(re.sub(r"[^a-z0-9]+", " ", _norm(q)).split())
    n = _GREET.sub("", n).strip()
    return n == "" or bool(_CHAT.match(n))


def _redact(q):
    # minimisation : retire numéros de téléphone / NPI éventuellement saisis
    return re.sub(r"\d{8,}", "[numéro retiré]", q)


def get_profile():
    p = AssistantProfile.objects.first()
    return (p.name, p.persona) if p else (DEFAULT_NAME, DEFAULT_PERSONA)


def save_profile(actor, name, persona):
    p = AssistantProfile.objects.first() or AssistantProfile()
    p.name, p.persona, p.updated_by = name.strip(), persona.strip(), actor
    p.save()
    record(actor, "assistant.profile", p, name=p.name)
    return p


def _clean_history(history):
    """Derniers échanges, sans numéro de téléphone, bornés : c'est tout ce que le modèle sait de la conversation."""
    out = [{"role": m["role"], "content": _redact(str(m["content"]).strip())[:HIST_CHARS]}
           for m in (history or ()) if m.get("role") in ("user", "assistant") and str(m.get("content", "")).strip()]
    return out[-HIST_TURNS:]


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


def _escalated(user, question):
    sent = escalate(user, question)
    return {"status": "escalated",
            "answer": ESCALATED + ("Votre question est transmise à l'agent ATDA de votre secteur, qui vous contactera."
                                   if sent else "Posez-la à votre agent ATDA.")}


def _field_context(user):
    """Parcelle et météo du producteur, pour des conseils localisés (TDR § 3.1). Vide si rien n'est connu."""
    from apps.parcels.models import Campaign
    from apps.satellite.api import place_of
    from integrations.market_data import weather

    producer = getattr(user, "producer", None) if getattr(user, "role", "") == "producteur" else None
    if producer is None:
        return {}
    out = {}
    c = Campaign.objects.filter(parcel__producer=producer).select_related("parcel").order_by("-created_at").first()
    if c:
        out["parcelle"] = f"{c.parcel.land_type}, {c.parcel.area_ha:g} ha, {c.value_chain} au stade {c.stage}"
    lat, lon, _, key = place_of(producer)
    w = weather(lat, lon, key, days=3)
    if not w["simulated"]:  # une météo simulée tromperait le conseil
        out["meteo_3_jours"] = "; ".join(f"{d['date']} : {d['tmax']} °C, pluie {d['rain_mm']} mm ({d['rain_pct']} %)"
                                         for d in w["days"])
    return out


def _failed(backend, e):
    # jamais le message de l'erreur (il peut citer l'adresse) : son type et le code HTTP suffisent
    log.warning("assistant.llm_failed", backend=backend.name, error=type(e).__name__,
                status=getattr(getattr(e, "response", None), "status_code", None))


def _standalone(backend, question, history):
    """Une relance (« et pour le riz ? ») devient une question complète avant la recherche dans les documents."""
    if not history or len(tokens(question)) >= 7:  # une question longue se suffit ; « et combien de temps ? » non
        return question
    try:
        text = backend.rewrite(question, history)
        if text:
            return text
    except Exception as e:
        _failed(backend, e)
    last = next((m["content"] for m in reversed(history) if m["role"] == "user"), "")
    return f"{last} {question}".strip()


def _clean_title(text):
    """Titre rendu par le modèle : une seule ligne courte, sans Markdown ni guillemets ni ponctuation finale."""
    lines = (text or "").strip().splitlines()
    t = re.sub(r"[*_`#>\"«»]", "", lines[0] if lines else "")
    t = re.sub(r"^(titre|title)\s*:\s*", "", t.strip(), flags=re.I)
    t = " ".join(t.strip(" .!?:;…-–").split())
    if not t or len(t.split()) > 10 or contains_dose(t) or NO_ANSWER in t:
        return ""
    return (t[0].upper() + t[1:])[:60].rstrip()


def _fallback_title(question):
    return " ".join(_redact(question).replace("?", " ").split()[:6])[:60] or "Conversation"


def make_title(question, answer=""):
    """Titre d'une conversation d'après son premier échange. Une question de dosage ne part pas au modèle (comme dans `ask`) ;
    sans modèle ou en cas de panne, le début de la question tient lieu de titre."""
    q = _redact(question)
    backend = get_backend()
    if is_dosage_question(q) or isinstance(backend, ExtractiveBackend):
        return _fallback_title(q)
    try:
        return _clean_title(backend.title(q, _redact(answer)[:600])) or _fallback_title(q)
    except Exception as e:
        _failed(backend, e)
        return _fallback_title(q)


def _smalltalk(backend, name, question, history, system, fmt=lambda t: t):
    canned = (f"Bonjour ! Je suis {name}, l'assistant agricole d'Agri-Digit Bénin. Posez-moi votre question sur vos "
              f"cultures (semis, maladies, stockage…) : je réponds à partir des fiches techniques de l'INRAB et de l'ATDA.")
    if isinstance(backend, ExtractiveBackend):
        return canned, backend
    try:
        text = fmt(backend.answer(_redact(question), [], {}, history, system))
        return (canned, ExtractiveBackend()) if contains_dose(text) else (text, backend)
    except Exception as e:
        _failed(backend, e)
        return canned, ExtractiveBackend()


def ask(user, question, value_chain=None, language="fr", history=(), markdown=False):
    from apps.translations import corpus

    result = {"citations": [], "disclaimer": DISCLAIMER, "backend": "extractive", "language": "fr"}
    top = None
    name, persona = get_profile()
    system = system_prompt(name, persona, markdown)
    fmt = (lambda t: t.strip()) if markdown else plain  # l'écran affiche du Markdown ; l'USSD et le SMS du texte brut
    history = _clean_history(history)
    native = corpus.match(language, question) if language in corpus.LANGUAGES else None
    if native:  # réponse écrite et validée par des locuteurs (MTDI), jamais générée
        result.update(status="answered", answer=native.answer, backend="corpus", language=language)
    elif is_dosage_question(question):
        result.update(_escalated(user, question))
    elif is_smalltalk(question):
        text, backend = _smalltalk(get_backend(), name, question, history, system, fmt)
        result.update(status="answered", answer=text, backend=backend.name)
    else:
        backend = get_backend()
        standalone = _standalone(backend, question, history)
        hits = search(standalone, value_chain, strict=standalone == question)
        top = hits[0][0] if hits else None
        if standalone != question and is_dosage_question(standalone):
            result.update(_escalated(user, standalone))
        elif not hits or top < settings.ASSISTANT_MIN_SCORE:
            result.update(status="unknown", answer=UNKNOWN)
        else:
            # d'autres extraits ne sont cités que s'ils portent sur la même filière (sinon : coton cité pour le maïs)
            passages = [d for s, d in hits if s >= settings.ASSISTANT_MIN_SCORE
                        and d["value_chain"] == hits[0][1]["value_chain"]][:3]
            # contexte sans donnée personnelle : filière, commune, parcelle (type, surface, stade) et météo à venir
            ctx = {"filiere": value_chain or passages[0]["value_chain"], "commune": getattr(user, "commune", ""),
                   **_field_context(user)}
            try:
                answer = fmt(backend.answer(_redact(standalone), passages, ctx, history, system))  # relance : la question complète
                if contains_dose(answer):  # le modèle a donné un dosage malgré la consigne : refusé, jamais montré
                    raise ValueError("dosage dans la réponse du modèle")
                if NO_ANSWER in answer:  # les extraits ne répondent pas : même réponse que sans fiche
                    result.update(status="unknown", answer=UNKNOWN, backend=backend.name)
                    answer = None
            except Exception as e:
                _failed(backend, e)
                backend = ExtractiveBackend()
                answer = backend.answer(question, passages, ctx)
            if answer is not None:
                result.update(status="answered", answer=answer, backend=backend.name,
                              citations=[{"doc_id": str(d["id"]), "title": d["title"], "source": d["source"],
                                          "version": d["version"]} for d in passages])
    if language in corpus.LANGUAGES and not native:
        corpus.keep_unanswered(language, question)
        result["language_notice"] = "no_validated_answer"  # l'écran explique : réponse en français pour l'instant
    AssistantLog.objects.create(question=_redact(question), value_chain=value_chain or "",
                                role=getattr(user, "role", ""), status=result["status"],
                                doc_ids=[c["doc_id"] for c in result["citations"]], backend=result["backend"],
                                top_score=top)
    log.info("assistant.ask", status=result["status"], backend=result["backend"])
    return result
