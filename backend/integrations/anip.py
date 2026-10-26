"""Vérification d'identité ANIP. SIMULATION : MockAnipClient sert des fiches fictives (aucune donnée réelle)."""
from dataclasses import dataclass
from datetime import date

from django.conf import settings


class AnipUnavailable(Exception):
    pass


@dataclass
class AnipRecord:
    npi: str
    first_name: str
    last_name: str
    birth_date: date
    sex: str


class AnipClient:
    def lookup(self, npi: str) -> AnipRecord | None:
        """Renvoie la fiche, None si NPI inconnu ; lève AnipUnavailable si le service ne répond pas."""
        raise NotImplementedError


_FIRST = [("Bio", "M"), ("Adjoa", "F"), ("Sabi", "M"), ("Rissikatou", "F"), ("Codjo", "M"), ("Affiavi", "F"),
          ("Orou", "M"), ("Gnon", "F"), ("Kossi", "M"), ("Mariam", "F"), ("Yaya", "M"), ("Fatouma", "F"),
          ("Sèdjro", "M"), ("Nafissatou", "F"), ("Dossou", "M"), ("Houéfa", "F"), ("Worou", "M"), ("Bake", "F"),
          ("Komlan", "M"), ("Ablawa", "F")]
_LAST = ["GOUNOU", "SABI", "HOUNSOU", "ADJOVI", "BIO TCHANE", "DOSSA", "KPADONOU", "OROU KOTO", "AHOUANDJINOU",
         "SANNI", "TOSSOU", "BONI", "AGBODJAN", "SOUROU", "ZINSOU", "YAROU", "GBAGUIDI", "CHABI", "AKPLOGAN",
         "IDRISSOU", "LOKO"]

FICHES = {
    "1000000001": AnipRecord("1000000001", "Bio", "GOUNOU", date(1985, 3, 12), "M"),
    "1000000002": AnipRecord("1000000002", "Awa", "SABI", date(1990, 7, 1), "F"),
    "1000000003": AnipRecord("1000000003", "Koffi", "HOUNSOU", date(1978, 11, 20), "M"),
    "1000000004": AnipRecord("1000000004", "Mariam", "ZATO", date(2011, 5, 4), "F"),
}
for _i in range(5, 46):  # fiches des ~40 producteurs du seed
    _fn, _sex = _FIRST[_i % len(_FIRST)]
    _npi = f"10000000{_i:02d}"
    FICHES[_npi] = AnipRecord(_npi, _fn, _LAST[(_i * 7) % len(_LAST)],
                              date(1960 + _i % 35, 1 + _i % 12, 1 + _i % 27), _sex)


# Bouton « Démo » de l'inscription : tout NPI de 10 chiffres commençant par 8 est une fiche fictive libre,
# calculée à partir du numéro (même NPI, même fiche). Elle sert à rejouer l'inscription sans doublon.
DEMO_NPI_PREFIX = "8"


def demo_record(npi: str) -> AnipRecord | None:
    if len(npi) != 10 or not npi.isdigit() or not npi.startswith(DEMO_NPI_PREFIX):
        return None
    n = int(npi[1:])
    fn, sex = _FIRST[n % len(_FIRST)]
    return AnipRecord(npi, fn, _LAST[(n // len(_FIRST)) % len(_LAST)],
                      date(1970 + n % 30, 1 + n % 12, 1 + n % 28), sex)


class MockAnipClient(AnipClient):
    def lookup(self, npi):
        if npi == "9999999999":
            raise AnipUnavailable()
        return FICHES.get(npi) or demo_record(npi)


class RealAnipClient(AnipClient):
    """À brancher sur l'API ANIP (via X-Road) après convention. Non implémenté."""

    def lookup(self, npi):
        raise NotImplementedError("Connecteur ANIP réel non disponible dans le prototype.")


def get_client() -> AnipClient:
    return RealAnipClient() if settings.ANIP_BACKEND == "real" else MockAnipClient()
