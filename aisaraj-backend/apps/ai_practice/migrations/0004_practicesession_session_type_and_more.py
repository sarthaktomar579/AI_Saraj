from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ai_practice', '0003_track_based_interview'),
    ]

    operations = [
        migrations.AddField(
            model_name='practicesession',
            name='scheduled_interview_id',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='practicesession',
            name='session_type',
            field=models.CharField(
                choices=[('practice', 'Practice'), ('scheduled', 'Scheduled')],
                default='practice',
                max_length=20,
            ),
        ),
    ]
