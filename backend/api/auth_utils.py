"""Utilities for extracting and refreshing per-user Spotify tokens from DB sessions."""

import os
import base64
import requests
from datetime import timedelta

from django.utils import timezone
from rest_framework.response import Response
from rest_framework import status

from api.models import UserSession
from django.conf import settings
from api.errors import SessionExpired

TOKEN_URL = "https://accounts.spotify.com/api/token"
CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "")


def get_session_from_request(request):
    """Extract Bearer token from Authorization header and return the UserSession, or None."""
    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:]
    try:
        session = UserSession.objects.get(session_token=token)
        if session.created_at <= timezone.now() - timedelta(days=settings.SESSION_MAX_AGE_DAYS):
            session.delete()
            return None
        return session
    except UserSession.DoesNotExist:
        return None


def get_spotify_token(session: UserSession) -> str:
    """Return a valid Spotify access token, refreshing if expired. Updates DB in place."""
    if session.token_expires_at > timezone.now() + timedelta(seconds=60):
        return session.access_token

    # Token is expired or about to expire — refresh it
    basic = base64.b64encode(f"{CLIENT_ID}:{CLIENT_SECRET}".encode()).decode()
    headers = {"Authorization": f"Basic {basic}"}
    data = {"grant_type": "refresh_token", "refresh_token": session.refresh_token}

    r = requests.post(TOKEN_URL, headers=headers, data=data, timeout=30)
    if r.status_code in (400, 401):
        session.delete()
        raise SessionExpired()
    r.raise_for_status()

    tok = r.json()
    session.access_token = tok["access_token"]
    session.token_expires_at = timezone.now() + timedelta(seconds=int(tok.get("expires_in", 3600)))

    # Spotify may rotate the refresh token
    if "refresh_token" in tok:
        session.refresh_token = tok["refresh_token"]

    session.save(update_fields=["access_token", "refresh_token", "token_expires_at", "updated_at"])
    return session.access_token


def require_auth(request):
    """Convenience: returns (session, access_token) or (None, error_response)."""
    session = get_session_from_request(request)
    if not session:
        return None, Response(
            {"detail": "Authentication required. Please connect your Spotify account."},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    access_token = get_spotify_token(session)
    return session, access_token
