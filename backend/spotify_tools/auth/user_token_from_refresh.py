import os, time, requests
from datetime import timedelta
from django.utils import timezone
from api.models import SpotifyToken
from django.contrib.auth.models import User

TOKEN_URL = "https://accounts.spotify.com/api/token"

CLIENT_ID     = os.getenv("SPOTIFY_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "")

def get_user_access_token(user: User) -> str:
    """
    Return a valid access token for the given user, refreshing it if expired.
    Assumes tokens are stored in SpotifyToken model.
    """
    token = SpotifyToken.objects.get(user=user)

    # If token is still valid, return cached access token
    if not token.is_expired():
        return token.access_token

    # Refresh token
    data = {
        "grant_type": "refresh_token",
        "refresh_token": token.refresh_token,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
    }
    r = requests.post(TOKEN_URL, data=data, timeout=30)
    r.raise_for_status()
    tok = r.json()

    # Update fields
    token.access_token = tok["access_token"]
    ttl = int(tok.get("expires_in", 3600))
    token.expires_at = timezone.now() + timedelta(seconds=ttl)

    if "refresh_token" in tok:  # Spotify may rotate refresh tokens
        token.refresh_token = tok["refresh_token"]

    token.save()
    return token.access_token
