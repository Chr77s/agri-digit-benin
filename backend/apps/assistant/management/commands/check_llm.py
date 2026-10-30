"""Vérifie le LLM de l'assistant : mode retenu, modèle, appel réel et durée. La clé n'est jamais affichée."""
import time

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.knowledge.services import search
from integrations.llm import ExtractiveBackend, get_backend

# repli si aucune fiche publiée ne répond à la question d'essai
ESSAI = [{"title": "Fiche d'essai", "body": "Au nord du Bénin, le maïs se sème à l'installation des pluies, après une pluie suffisante."}]


class Command(BaseCommand):
    help = "Appelle le LLM configuré avec une question d'essai et affiche le mode, le modèle, la réponse et la durée."

    def add_arguments(self, parser):
        parser.add_argument("--question", default="Quand semer le maïs à Banikoara ?")

    def handle(self, *args, question, **options):
        backend = get_backend()
        self.stdout.write(f"LLM_BACKEND={settings.LLM_BACKEND} : mode retenu « {backend.name} »")
        if backend.name == "openai":
            self.stdout.write(f"  adresse : {settings.OPENAI_BASE_URL}\n"
                              f"  modèle : {settings.OPENAI_MODEL or '(premier modèle annoncé par la passerelle)'}\n"
                              f"  clé : renseignée ; délai {settings.OPENAI_TIMEOUT} s ; {settings.OPENAI_MAX_TOKENS} jetons au plus")
        if isinstance(backend, ExtractiveBackend):
            raise CommandError("Aucun LLM utilisé (clé absente ou service injoignable) : l'assistant reste extractif. "
                               "Renseigner OPENAI_API_KEY, OPENAI_BASE_URL et OPENAI_MODEL dans backend/.env.")
        passages = [d for _, d in search(question, None)[:2]] or ESSAI
        t0 = time.time()
        try:
            text = backend.answer(question, passages, {"filiere": "mais", "commune": "banikoara"})
        except Exception as e:  # jamais le message : il peut citer l'adresse du service
            status = getattr(getattr(e, "response", None), "status_code", None)
            detail = f" : {e}" if isinstance(e, ValueError) else ""  # nos propres messages seulement
            raise CommandError(f"Échec de l'appel : {type(e).__name__}" + (f" (HTTP {status})" if status else "") + detail)
        enc = getattr(self.stdout._out, "encoding", None) or "utf-8"  # console Windows en cp1252 : pas de plantage sur les espaces insécables
        shown = text.encode(enc, "replace").decode(enc)
        self.stdout.write(self.style.SUCCESS(f"Réponse en {time.time() - t0:.1f} s :\n{shown}"))
