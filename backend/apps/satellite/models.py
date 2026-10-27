from django.db import models


class SatelliteObservation(models.Model):
    """Indices Sentinel-2 d'une zone (département ou parcelle) sur un intervalle de 10 jours, gardés 24 h."""
    zone_kind = models.CharField(max_length=12)  # department | parcel
    zone_code = models.CharField(max_length=64)
    period_start = models.DateField()
    period_end = models.DateField()
    ndvi = models.FloatField(null=True)
    ndmi = models.FloatField(null=True)
    valid_pct = models.FloatField(null=True)  # part de pixels clairs, en %
    fetched_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["zone_kind", "zone_code", "period_start"], name="satellite_zone_period")]
