from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler


class ApiError(exceptions.APIException):
    """Erreur métier au format du contrat : {detail, code, fields?, ...extra}."""

    def __init__(self, detail, code="error", status_code=400, **extra):
        self.status_code = status_code
        self.payload = {"detail": detail, "code": code, **extra}
        super().__init__(detail, code)


def handler(exc, context):
    if isinstance(exc, ApiError):
        return Response(exc.payload, status=exc.status_code)
    if isinstance(exc, Http404):
        return Response({"detail": "Introuvable.", "code": "not_found"}, status=404)
    response = exception_handler(exc, context)
    if response is None:
        return None
    if isinstance(exc, exceptions.ValidationError):
        data = exc.detail if isinstance(exc.detail, dict) else {"non_field_errors": exc.detail}
        response.data = {"detail": "Données invalides.", "code": "validation_error", "fields": data}
    elif isinstance(exc, exceptions.NotAuthenticated | exceptions.AuthenticationFailed):
        response.data = {"detail": "Connexion requise.", "code": "not_authenticated"}
        response.status_code = status.HTTP_401_UNAUTHORIZED
    elif isinstance(exc, exceptions.PermissionDenied):
        response.data = {"detail": "Action non autorisée pour votre rôle.", "code": "forbidden"}
    elif isinstance(exc, exceptions.Throttled):
        response.data = {"detail": "Trop d'essais, réessayez plus tard.", "code": "throttled"}
    else:
        response.data = {"detail": str(exc.detail), "code": getattr(exc, "default_code", "error")}
    return response
