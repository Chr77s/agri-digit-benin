import uuid

from django.conf import settings
from django.db import models


class NationalStat(models.Model):
    """Statistique nationale d'une filière pour une année, en tonnes, avec sa source (obligatoire).

    Rien n'est inventé par le code : ces chiffres viennent du MAEP, de l'INSAE, de la DSA ou des douanes. Une valeur
    inconnue reste vide (`None`) et s'affiche « non disponible », jamais 0.
    """

    DEMO_SOURCE = "Données de démonstration (non officielles)"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    value_chain = models.CharField(max_length=40, db_index=True)
    year = models.PositiveSmallIntegerField()
    production_t = models.FloatField(null=True, blank=True)
    consumption_t = models.FloatField(null=True, blank=True)
    imports_t = models.FloatField(null=True, blank=True)
    exports_t = models.FloatField(null=True, blank=True)
    source = models.CharField(max_length=300)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["value_chain", "year"], name="one_stat_per_chain_year")]
        ordering = ["value_chain", "year"]

    @property
    def is_demo(self):
        return self.source.startswith(self.DEMO_SOURCE)
