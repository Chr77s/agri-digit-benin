from django.db import models


class ValueChain(models.Model):
    code = models.CharField(max_length=40, primary_key=True)
    name = models.CharField(max_length=80)
    reserve = models.BooleanField(default=False)  # filière de réserve (hors des 10 principales)

    def __str__(self):
        return self.name


class Department(models.Model):
    code = models.CharField(max_length=40, primary_key=True)
    name = models.CharField(max_length=80)
    lon = models.FloatField()
    lat = models.FloatField()

    def __str__(self):
        return self.name


class Commune(models.Model):
    code = models.CharField(max_length=40, primary_key=True)
    name = models.CharField(max_length=80)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name="communes")

    def __str__(self):
        return self.name
