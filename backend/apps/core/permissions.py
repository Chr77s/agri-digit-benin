from rest_framework.permissions import BasePermission

PRODUCTEUR = "producteur"
AGENT = "agent_atda"
AGRONOME = "agronome_inrab"
RESPONSABLE = "responsable_programme"
ADMIN = "admin_maep"
AUDITEUR = "auditeur_copil"
FINANCIER = "agent_financier"


def roles(*allowed):
    """Fabrique une permission DRF qui n'accepte que les rôles donnés."""

    class _Roles(BasePermission):
        def has_permission(self, request, view):
            u = request.user
            return bool(u and u.is_authenticated and u.role in allowed)

    _Roles.__name__ = "Roles_" + "_".join(allowed)
    return _Roles


def in_scope(user, department, commune=None):
    """Périmètre : seul l'agent ATDA est limité à son département (et sa commune si définie)."""
    if user.role != AGENT or not user.department:
        return True
    return user.department == department and (not user.commune or user.commune == commune)
