from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class SpotifyToken(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    access_token = models.CharField(max_length=512)
    refresh_token = models.CharField(max_length=512)
    expires_at = models.DateTimeField()
    scope = models.TextField()

    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at
