from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('programs', '0003_draft_criteria'),
    ]

    operations = [
        migrations.AddField(
            model_name='application',
            name='decided_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='application',
            name='contest_reason',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='application',
            name='contested_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
