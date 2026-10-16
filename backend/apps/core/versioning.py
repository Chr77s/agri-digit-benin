"""UC-25 : verrou optimiste pour la synchronisation hors ligne (base_version / force)."""
from .errors import ApiError


def check_version(data, obj, serialize):
    """Lève 409 `conflict` si le client a lu une version plus ancienne que celle du serveur, sauf `force: true`.
    Renvoie (forced, base_version) pour la journalisation."""
    base, force = data.get("base_version"), data.get("force") is True
    if base is None:
        return False, None
    try:
        base = int(base)
    except (TypeError, ValueError):
        raise ApiError("base_version doit être un entier.", "validation_error", 400,
                       fields={"base_version": ["Entier attendu."]})
    if base < obj.version and not force:
        raise ApiError("Cette fiche a été modifiée sur le serveur depuis votre saisie hors ligne.", "conflict", 409,
                       server=serialize(obj), server_version=obj.version)
    return force and base < obj.version, base
