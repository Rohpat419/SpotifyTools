from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="UserSession",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("session_token", models.CharField(db_index=True, max_length=64, unique=True)),
                ("spotify_user_id", models.CharField(db_index=True, max_length=255)),
                ("display_name", models.CharField(blank=True, default="", max_length=255)),
                ("access_token", models.TextField()),
                ("refresh_token", models.TextField()),
                ("token_expires_at", models.DateTimeField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "indexes": [
                    models.Index(fields=["spotify_user_id"], name="api_userses_spotify_f0c498_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="AuthState",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("state", models.CharField(db_index=True, max_length=64, unique=True)),
                ("code_verifier", models.CharField(max_length=128)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
