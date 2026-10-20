"""Assistant en langues nationales (TDR § 1, 3.1, 3.4) : réponse native tirée du corpus validé par le MTDI ; sinon,
réponse en français signalée et question gardée pour enrichir le corpus. Aucun texte en langue nationale n'est
inventé par la machine. La justesse se mesure par langue sur les reformulations (`accuracy`)."""
import re
import unicodedata

from django.db import transaction
from django.db.models import Count, Q
from django.http import Http404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.audit.services import record
from apps.core.errors import ApiError
from apps.core.permissions import ADMIN, roles

from .models import LANGUAGES, CorpusEntry

REPR = "repr_mtdi"
MIN_SCORE = 0.5  # part des mots de la question retrouvés dans l'entrée


def _words(text):
    n = unicodedata.normalize("NFKD", (text or "").lower())
    n = "".join(c for c in n if not unicodedata.combining(c))
    return {w for w in re.findall(r"\w+", n) if len(w) > 1}


def _score(q, entry):
    words = _words(q)
    if not words:
        return 0.0
    best = 0.0
    for text in [entry.question, *entry.paraphrases]:
        ew = _words(text)
        if ew:
            best = max(best, len(words & ew) / len(words | ew))
    return best


def match(language, question, entries=None):
    """Meilleure entrée validée pour la question, ou None sous le seuil."""
    pool = entries if entries is not None else CorpusEntry.objects.filter(language=language, status="valide")
    scored = [(_score(question, e), e) for e in pool]
    s, e = max(scored, key=lambda x: x[0], default=(0.0, None))
    return e if s >= MIN_SCORE else None


def keep_unanswered(language, question, french_question=""):
    """Question sans réponse validée : rejoint la file du MTDI (le texte est gardé sans nom ni numéro)."""
    q = re.sub(r"\d{8,}", "[numéro retiré]", question.strip())[:500]
    e = CorpusEntry.objects.filter(language=language, status__in=["a_traduire", "propose"], french_question=q).first()
    if e:
        CorpusEntry.objects.filter(pk=e.pk).update(asked_count=e.asked_count + 1)
    else:
        CorpusEntry.objects.create(language=language, status="a_traduire", french_question=q, asked_count=1)


def accuracy(language):
    """Part des reformulations validées qui retrouvent leur propre entrée (None sans reformulation)."""
    entries = list(CorpusEntry.objects.filter(language=language, status="valide"))
    tests = [(p, e.pk) for e in entries for p in e.paraphrases]
    if not tests:
        return None
    ok = sum(1 for p, pk in tests if (m := match(language, p, entries)) and m.pk == pk)
    return round(100 * ok / len(tests), 1)


class CorpusSerializer(serializers.ModelSerializer):
    language = serializers.ChoiceField(choices=LANGUAGES)
    paraphrases = serializers.ListField(child=serializers.CharField(max_length=500), required=False, max_length=20)

    class Meta:
        model = CorpusEntry
        fields = ["id", "language", "value_chain", "question", "answer", "paraphrases", "french_question",
                  "french_answer", "status", "asked_count", "created_at"]
        read_only_fields = ["id", "status", "asked_count", "created_at"]


@api_view(["GET", "POST"])
@permission_classes([roles(REPR, ADMIN)])
def corpus_list(request):
    if request.method == "POST":
        if request.user.role != REPR:
            raise ApiError("Seul un représentant du MTDI rédige le corpus.", "forbidden", 403)
        s = CorpusSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        if not s.validated_data.get("question", "").strip() or not s.validated_data.get("answer", "").strip():
            raise ApiError("Question et réponse dans la langue sont obligatoires.", "validation_error", 400)
        e = s.save(author=request.user, status="propose")
        record(request.user, "corpus.propose", e, language=e.language)
        return Response(CorpusSerializer(e).data, status=201)
    qs = CorpusEntry.objects.all().order_by("-asked_count", "-created_at")
    if lang := request.query_params.get("language"):
        qs = qs.filter(language=lang)
    if st := request.query_params.get("status"):
        qs = qs.filter(status=st)
    return Response({"results": CorpusSerializer(qs[:200], many=True).data})


@api_view(["POST"])
@permission_classes([roles(REPR)])
def corpus_answer(request, pk):
    """Le représentant rédige la question et la réponse en langue pour une question restée sans réponse."""
    e = CorpusEntry.objects.filter(pk=pk, status__in=["a_traduire", "rejete"]).first()
    if e is None:
        raise Http404
    s = CorpusSerializer(e, data={**request.data, "language": e.language}, partial=True)
    s.is_valid(raise_exception=True)
    if not s.validated_data.get("question", "").strip() or not s.validated_data.get("answer", "").strip():
        raise ApiError("Question et réponse dans la langue sont obligatoires.", "validation_error", 400)
    e = s.save(author=request.user, status="propose")
    record(request.user, "corpus.propose", e, language=e.language)
    return Response(CorpusSerializer(e).data)


@api_view(["POST"])
@permission_classes([roles(REPR)])
def corpus_validate(request, pk):
    """Validation par un autre locuteur que l'auteur ; refus avec motif possible."""
    e = CorpusEntry.objects.filter(pk=pk, status="propose").first()
    if e is None:
        raise Http404
    if e.author_id == request.user.id:
        raise ApiError("Un autre représentant doit valider votre texte.", "same_author", 400)
    ok = request.data.get("decision") != "rejete"
    with transaction.atomic():
        e.status, e.validated_by = ("valide" if ok else "rejete"), request.user
        e.save(update_fields=["status", "validated_by", "updated_at"])
        record(request.user, "corpus." + ("validate" if ok else "reject"), e, language=e.language)
    return Response(CorpusSerializer(e).data)


@api_view(["GET"])
@permission_classes([roles(REPR, ADMIN)])
def corpus_stats(request):
    rows = {r["language"]: r for r in CorpusEntry.objects.values("language").annotate(
        valid=Count("id", filter=Q(status="valide")), pending=Count("id", filter=Q(status="propose")),
        waiting=Count("id", filter=Q(status="a_traduire")))}
    return Response({"results": [{"language": lang, "valid": rows.get(lang, {}).get("valid", 0),
                                  "pending": rows.get(lang, {}).get("pending", 0),
                                  "waiting": rows.get(lang, {}).get("waiting", 0), "accuracy": accuracy(lang)}
                                 for lang in LANGUAGES]})
