from django.apps import AppConfig


class Config(AppConfig):
    name = "apps.farmservices"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self):
        from . import map_layers  # noqa: F401  (inscrit les couches PMEA et matériel sur la carte)
