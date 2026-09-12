from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("api", "0001_initial")]
    operations = [migrations.CreateModel(name="LoginHandoff", fields=[
        ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
        ("code", models.CharField(max_length=64, unique=True)),
        ("created_at", models.DateTimeField(auto_now_add=True)),
        ("session", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="api.usersession")),
    ])]
