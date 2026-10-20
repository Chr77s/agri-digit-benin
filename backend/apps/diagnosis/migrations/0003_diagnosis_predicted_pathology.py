from django.db import migrations, models


def backfill(apps, schema_editor):
    # Un diagnostic non relu garde la réponse du modèle dans `pathology` ; pour un diagnostic déjà relu, elle est perdue.
    apps.get_model("diagnosis", "Diagnosis").objects.exclude(status="revu").update(predicted_pathology=models.F("pathology"))


class Migration(migrations.Migration):

    dependencies = [
        ('diagnosis', '0002_diagnosis_producer_note'),
    ]

    operations = [
        migrations.AddField(
            model_name='diagnosis',
            name='predicted_pathology',
            field=models.CharField(blank=True, max_length=60),
        ),
        migrations.RunPython(backfill, migrations.RunPython.noop),
    ]
