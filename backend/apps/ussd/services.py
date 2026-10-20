"""Téléphone simple (maquette mobile « Téléphone simple : USSD et SMS ») : menus USSD numérotés et commandes SMS.

Sans état côté serveur : la passerelle de l'opérateur renvoie tout le chemin saisi (« 4*1*1 »), comme les
passerelles USSD courantes. Textes sans accents (GSM-7) et 182 caractères au plus par écran."""
import unicodedata

from django.db import transaction

from apps.accounts.models import User
from apps.assistant.services import ask
from apps.production.models import Support
from apps.production.services import confirm_support, report_support_issue
from apps.referentiel.models import Commune
from integrations.market_data import PRICE_CHAINS, prices

MAX_CHARS = 182
CHAINS = [("mais", "Mais"), ("soja", "Soja"), ("riz", "Riz"), ("niebe", "Niebe"), ("manioc", "Manioc"),
          ("anacarde", "Anacarde")]
assert [c for c, _ in CHAINS] == list(PRICE_CHAINS)  # mêmes filières que les prix de démonstration
LANGS = [("fr", "Francais"), ("fon", "Fon"), ("bba", "Bariba"), ("yo", "Yoruba"), ("dnd", "Dendi")]
DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]


def gsm(text):
    """Sans accents ni caractères hors GSM-7, coupé à 182 caractères."""
    t = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return t if len(t) <= MAX_CHARS else t[:MAX_CHARS - 3].rstrip() + "..."


def con(text):
    return True, gsm(text)


def end(text):
    return False, gsm(text)


def _producer(phone):
    u = User.objects.filter(phone=phone, is_active=True).select_related("producer").first()
    p = getattr(u, "producer", None) if u else None
    return u, p if p is not None and p.status == "valide" else None


def _place(producer):
    if producer is None:
        return "benin", "Benin"
    c = Commune.objects.filter(code=producer.commune).first()
    return producer.commune, c.name if c else producer.commune


def weather_text(producer):
    from datetime import date

    from apps.satellite.api import place_of
    from integrations.market_data import weather

    key, name = _place(producer)
    lat, lon, _, _ = place_of(producer)
    w = weather(lat, lon, key, days=3)
    lines = [f"METEO {name.upper()}"]
    for i, d in enumerate(w["days"]):
        label = "Auj" if i == 0 else DAYS[date.fromisoformat(d["date"]).weekday()]
        lines.append(f"{label} {d['tmax']}C pluie {d['rain_pct']}% {d['rain_mm']}mm")
    lines.append("(simulation)" if w["simulated"] else "(Open-Meteo)")
    return "\n".join(lines)


def prices_text(chain):
    name = dict(CHAINS).get(chain, chain)
    rows = [f"{p['market'].split(' (')[0]} {p['price']}" for p in prices(chain)]
    return "\n".join([f"PRIX {name.upper()} (F/kg)", *rows, "(demonstration)"])


def _supports(producer):
    return list(Support.objects.filter(producer=producer, status="remis").order_by("created_at", "item")[:5])


def _support_label(s):
    return f"{s.quantity.normalize():f} {s.unit} {s.item}"


def handle(phone, text):
    """Écran suivant pour le chemin saisi. Renvoie (continuer, texte)."""
    path = text.split("*") if text else []
    user, producer = _producer(phone)
    if not path:
        return con("AGRI-DIGIT BENIN\n1 Meteo\n2 Prix\n3 Conseil\n4 Mes appuis\n5 Langue")
    choice, rest = path[0], path[1:]
    if choice == "1":
        return end(weather_text(producer))
    if choice == "2":
        if not rest:
            return con("PRIX\n" + "\n".join(f"{i} {n}" for i, (_, n) in enumerate(CHAINS, 1)))
        i = int(rest[0]) if rest[0].isdigit() else 0
        return end(prices_text(CHAINS[i - 1][0])) if 1 <= i <= len(CHAINS) else end("Choix inconnu.")
    if producer is None:  # conseil, appuis et langue : réservés aux producteurs inscrits et validés
        return end("Numero inconnu ou fiche non validee. Inscrivez-vous aupres de votre agent ATDA.")
    if choice == "3":
        if not rest or not rest[0].strip():
            return con("CONSEIL\nEcrivez votre question en quelques mots.")
        r = ask(user, rest[0].strip())
        if r["status"] == "escalated":
            return end("Question de dosage : pas de reponse automatique. Transmise a votre agent ATDA, "
                       "qui vous contactera.")
        if r["status"] != "answered":
            return end("Pas de reponse sure pour cette question. Posez-la a votre agent ATDA.")
        return end(f"{r['answer']}\nConseil indicatif, voir agent ATDA.")
    if choice == "4":
        sup = _supports(producer)
        if not sup:
            return end("MES APPUIS\nAucun appui en attente de confirmation.")
        if not rest:
            return con("MES APPUIS\n" + "\n".join(f"{i} {_support_label(s)}" for i, s in enumerate(sup, 1)))
        i = int(rest[0]) if rest[0].isdigit() else 0
        if not 1 <= i <= len(sup):
            return end("Choix inconnu.")
        s = sup[i - 1]
        if len(rest) == 1:
            return con(f"{_support_label(s)}\nremis le {s.created_at:%d/%m}.\n"
                       "1 Je confirme\n2 Il en manque\n3 Rien recu")
        with transaction.atomic():
            if rest[1] == "1":
                confirm_support(user, s)
                return end("Merci, reception confirmee. Votre agent est prevenu.")
            if rest[1] in ("2", "3"):
                report_support_issue(user, s, "manque" if rest[1] == "2" else "rien_recu")
                return end("Signalement enregistre. Votre agent ATDA va vous contacter.")
        return end("Choix inconnu.")
    if choice == "5":
        if not rest:
            return con("LANGUE\n" + "\n".join(f"{i} {n}" for i, (_, n) in enumerate(LANGS, 1)))
        i = int(rest[0]) if rest[0].isdigit() else 0
        if not 1 <= i <= len(LANGS):
            return end("Choix inconnu.")
        user.language = LANGS[i - 1][0]
        user.save(update_fields=["language"])
        note = "" if i == 1 else " Les menus restent en francais en attendant la validation de la langue."
        return end(f"Langue enregistree : {LANGS[i - 1][1]}.{note}")
    return end("Choix inconnu.")


HELP = "AGRI-DIGIT : envoyez METEO, ou PRIX suivi de la filiere (PRIX MAIS). Filieres : " + \
       ", ".join(n.upper() for _, n in CHAINS) + "."


def sms_reply(phone, text):
    """Réponse à un SMS entrant (commandes simples, mêmes données que l'USSD) et département du producteur."""
    words = gsm(text or "").upper().split()
    _, producer = _producer(phone)
    dep = producer.department if producer else ""
    if words[:1] == ["METEO"]:
        return gsm(weather_text(producer)), dep
    if words[:1] == ["PRIX"]:
        codes = {n.upper(): c for c, n in CHAINS}
        chain = codes.get(words[1]) if len(words) > 1 else None
        return gsm(prices_text(chain) if chain else HELP), dep
    return gsm(HELP), dep
