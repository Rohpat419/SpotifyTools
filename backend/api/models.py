from django.db import models


class UserSession(models.Model):
    """Per-user session linking a bearer token to Spotify OAuth credentials."""
    session_token = models.CharField(max_length=64, unique=True, db_index=True)
    spotify_user_id = models.CharField(max_length=255, db_index=True)
    display_name = models.CharField(max_length=255, blank=True, default="")
    access_token = models.TextField()
    refresh_token = models.TextField()
    token_expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["spotify_user_id"]),
        ]

    def __str__(self):
        return f"{self.display_name or self.spotify_user_id} ({self.session_token[:8]}...)"


class AuthState(models.Model):
    """Temporary PKCE state stored during OAuth flow. Cleaned up after use."""
    state = models.CharField(max_length=64, unique=True, db_index=True)
    code_verifier = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"AuthState {self.state[:8]}..."
