import os
import base64
import hashlib
import secrets
import requests
from datetime import timedelta
from urllib.parse import urlencode

from django.http import JsonResponse, HttpResponseRedirect
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from spotify_tools.config import *  # noqa: F401,F403 — trigger env loading
from api.models import AuthState, UserSession, LoginHandoff
from api.auth_utils import get_session_from_request
from django.db import transaction
from django.views.decorators.cache import never_cache

AUTH_URL = "https://accounts.spotify.com/authorize"
TOKEN_URL = "https://accounts.spotify.com/api/token"

CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI")
SCOPES = os.getenv(
    "SPOTIFY_SCOPES",
    "playlist-modify-private playlist-read-private user-top-read user-library-read",
)


@never_cache
def login(request):
    """Generate PKCE challenge, store state in DB, redirect to Spotify."""
    code_verifier = secrets.token_urlsafe(64)
    code_challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(code_verifier.encode()).digest())
        .rstrip(b"=")
        .decode("utf-8")
    )
    state = secrets.token_urlsafe(16)

    # Clean up stale auth states (>10 min old)
    AuthState.objects.filter(
        created_at__lt=timezone.now() - timedelta(minutes=10)
    ).delete()

    AuthState.objects.create(state=state, code_verifier=code_verifier)

    params = {
        "client_id": CLIENT_ID,
        "response_type": "code",
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPES,
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    response = HttpResponseRedirect(f"{AUTH_URL}?{urlencode(params)}")
    response.set_cookie("spotify_oauth_state", state, max_age=600, httponly=True,
                        secure=request.is_secure(), samesite="Lax", path="/api/auth/")
    return response


@never_cache
def callback(request):
    """Handle Spotify OAuth callback: exchange code, fetch profile, create session."""
    error = request.GET.get("error")
    if error:
        frontend_url = os.getenv("FRONTEND_SUCCESS_URL", "http://localhost:3000/auth/success")
        return HttpResponseRedirect(f"{frontend_url}?{urlencode({'error': 'authorization_failed'})}")

    code = request.GET.get("code")
    state = request.GET.get("state")
    if not code or not state or not secrets.compare_digest(state, request.COOKIES.get("spotify_oauth_state", "")):
        return JsonResponse({"error": "Missing code or state"}, status=400)

    # Look up and consume PKCE state
    try:
        with transaction.atomic():
            auth_state = AuthState.objects.select_for_update().get(
                state=state, created_at__gt=timezone.now()-timedelta(minutes=10))
            code_verifier = auth_state.code_verifier
            auth_state.delete()
    except AuthState.DoesNotExist:
        return JsonResponse({"error": "Invalid or expired state"}, status=400)


    # Exchange authorization code for tokens
    token_data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
        "client_id": CLIENT_ID,
        "code_verifier": code_verifier,
    }
    try:
        r = requests.post(TOKEN_URL, data=token_data, timeout=30)
    except requests.RequestException as e:
        return JsonResponse({"error": "Token exchange failed (network)"}, status=503)

    if r.status_code != 200:
        frontend_url = os.getenv("FRONTEND_SUCCESS_URL", "http://localhost:3000/auth/success")
        return HttpResponseRedirect(f"{frontend_url}?error=token_exchange_failed")

    tok = r.json()
    access_token = tok["access_token"]
    refresh_token = tok.get("refresh_token", "")
    expires_in = int(tok.get("expires_in", 3600))
    token_expires_at = timezone.now() + timedelta(seconds=expires_in)

    # Fetch Spotify user profile
    try:
        profile_r = requests.get(
            "https://api.spotify.com/v1/me",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=15,
        )
        profile_r.raise_for_status()
        profile = profile_r.json()
        spotify_user_id = profile["id"]
        display_name = profile.get("display_name", "")
    except requests.exceptions.HTTPError as e:
        frontend_url = os.getenv("FRONTEND_SUCCESS_URL", "http://localhost:3000/auth/success")
        if profile_r.status_code == 403:
            return HttpResponseRedirect(f"{frontend_url}?error=not_approved")
        return HttpResponseRedirect(f"{frontend_url}?error=profile_fetch_failed")
    except Exception as e:
        frontend_url = os.getenv("FRONTEND_SUCCESS_URL", "http://localhost:3000/auth/success")
        return HttpResponseRedirect(f"{frontend_url}?error=profile_fetch_failed")

    # Create session token and upsert user session
    session_token = secrets.token_urlsafe(48)

    # Delete old sessions for this Spotify user (keep it clean)
    UserSession.objects.filter(spotify_user_id=spotify_user_id).delete()

    session = UserSession.objects.create(
        session_token=session_token,
        spotify_user_id=spotify_user_id,
        display_name=display_name,
        access_token=access_token,
        refresh_token=refresh_token,
        token_expires_at=token_expires_at,
    )

    frontend_url = os.getenv("FRONTEND_SUCCESS_URL", "http://localhost:3000/auth/success")
    handoff = LoginHandoff.objects.create(code=secrets.token_urlsafe(32), session=session)
    response = HttpResponseRedirect(f"{frontend_url}#code={handoff.code}")
    response.delete_cookie("spotify_oauth_state", path="/api/auth/")
    return response


@api_view(["GET"])
def auth_status(request):
    """Check if the caller's session token is valid."""
    session = get_session_from_request(request)
    if not session:
        return Response({"authenticated": False})
    return Response({"authenticated": True, "spotify_user_id": session.spotify_user_id,
                     "display_name": session.display_name})


@api_view(["POST"])
def logout(request):
    """Delete the caller's session."""
    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        UserSession.objects.filter(session_token=token).delete()
    return Response({"ok": True})


@api_view(["POST"])
def exchange(request):
    code = request.data.get("code") if isinstance(request.data, dict) else None
    if not isinstance(code, str) or len(code) > 64:
        return Response({"detail": "Invalid login code.", "code": "invalid_login_code"}, status=400)
    with transaction.atomic():
        handoff = LoginHandoff.objects.select_for_update().filter(
            code=code, created_at__gt=timezone.now()-timedelta(seconds=60)).first()
        if not handoff:
            return Response({"detail": "Login code expired or already used.", "code": "invalid_login_code"}, status=400)
        token = handoff.session.session_token
        handoff.delete()
    response = Response({"session_token": token})
    response["Cache-Control"] = "no-store"
    return response
