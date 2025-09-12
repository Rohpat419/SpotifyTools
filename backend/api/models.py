from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

import time

class SpotifyToken(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    access_token = models.CharField(max_length=512)
    refresh_token = models.CharField(max_length=512)
    expires_at = models.DateTimeField()
    scope = models.TextField()

    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

class PKCEState(models.Model):
    state = models.CharField(max_length=255, unique=True)
    code_verifier = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def is_expired(self):
        # Spotify auth codes expire in ~10 minutes
        return (time.time() - self.created_at.timestamp()) > 600
