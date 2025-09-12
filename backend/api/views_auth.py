# api/views_auth.py
import os, base64, hashlib, secrets, requests, time, json
from urllib.parse import urlencode
from django.http import JsonResponse, HttpResponseRedirect
from django.conf import settings
from django.http import HttpResponse

# trigger env var loading, helps in dev, doesn't do anything in prod
from spotify_tools.config import *

from pathlib import Path

# Support for multiple user tokens
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth.models import User
from api.models import SpotifyToken, PKCEState

AUTH_URL  = "https://accounts.spotify.com/authorize"
TOKEN_URL = "https://accounts.spotify.com/api/token"

CLIENT_ID     = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")   # used only on backend
REDIRECT_URI  = os.getenv("SPOTIFY_REDIRECT_URI")    # e.g. https://your-backend.onrender.com/api/auth/callback
SCOPES        = os.getenv("SPOTIFY_SCOPES", "playlist-modify-private playlist-read-private user-top-read")

FRONTEND_SUCCESS_URL = os.getenv("FRONTEND_SUCCESS_URL", "http://localhost:3000/auth/success")

# In-memory PKCE cache (replace with DB/Redis for production multi-instance)
# PKCE_CACHE = {}
STATE_FILE = Path("/tmp/pkce_state.json")

def save_state(state, verifier):
    try:
        if STATE_FILE.exists():
            data = json.load(STATE_FILE.open())
        else:
            data = {}
        data[state] = {"verifier": verifier, "ts": time.time()}
        with STATE_FILE.open("w") as f:
            json.dump(data, f)
    except Exception as e:
        print("Save state error:", e)

def load_state(state):
    if not STATE_FILE.exists():
        return None
    data = json.load(STATE_FILE.open())
    return data.pop(state, None)

def login(request):
    # Generate PKCE values
    code_verifier = secrets.token_urlsafe(64)
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).rstrip(b"=").decode("utf-8")

    # Generate state and persist verifier in DB
    state = secrets.token_urlsafe(16)
    PKCEState.objects.update_or_create(
        state=state,
        defaults={"code_verifier": code_verifier}
    )

    # Build authorize URL
    params = {
        "client_id": CLIENT_ID,
        "response_type": "code",
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPES,
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    return HttpResponseRedirect(f"{AUTH_URL}?{urlencode(params)}")

def callback(request):
    error = request.GET.get("error")
    if error:
        return JsonResponse({"error": error}, status=400)

    code = request.GET.get("code")
    state = request.GET.get("state")
    if not code or not state:
        return JsonResponse({"error": "Missing code/state"}, status=400)

    # --- Load and validate PKCE verifier from DB ---
    try:
        pkce = PKCEState.objects.get(state=state)
        if pkce.is_expired():
            pkce.delete()
            return JsonResponse({"error": "Expired state"}, status=400)
        code_verifier = pkce.code_verifier
        pkce.delete()  # one-time use
    except PKCEState.DoesNotExist:
        return JsonResponse({"error": "Invalid state"}, status=400)

    # --- Prepare token exchange ---
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "code_verifier": code_verifier,
    }
    print("DEBUG token request (sanitized):",
          {**data, "code": "<hidden>", "client_secret": "<hidden>", "code_verifier": "<hidden>"})

    r = requests.post(TOKEN_URL, data=data, timeout=30)
    if r.status_code != 200:
        print("DEBUG Spotify token exchange failed:", r.status_code, r.text)
        # If code was already used, just redirect to frontend success
        if "invalid_grant" in r.text:
            return HttpResponseRedirect(f"{FRONTEND_SUCCESS_URL}?ok=1")
        return JsonResponse({"error": "Token exchange failed", "details": r.text}, status=500)

    tok = r.json()

    # --- Log response safely ---
    sanitized_tok = tok.copy()
    if "access_token" in sanitized_tok:
        sanitized_tok["access_token"] = "<hidden>"
    if "refresh_token" in sanitized_tok:
        sanitized_tok["refresh_token"] = "<hidden>"
    print("DEBUG Spotify token exchange response:", sanitized_tok)

    if "access_token" not in tok:
        return JsonResponse({"error": "No access token in response", "details": sanitized_tok}, status=500)

    # --- Save tokens (dummy user until real auth implemented) ---
    user, _ = User.objects.get_or_create(username="testuser")
    expires_at = timezone.now() + timedelta(seconds=tok["expires_in"])
    SpotifyToken.objects.update_or_create(
        user=user,
        defaults={
            "access_token": tok["access_token"],
            "refresh_token": tok.get("refresh_token", ""),
            "expires_at": expires_at,
            "scope": tok.get("scope", ""),
        },
    )

    # --- Redirect to frontend success ---
    return HttpResponseRedirect(f"{FRONTEND_SUCCESS_URL}?ok=1")

def auth_success(request):
    return HttpResponse("<h1> DEV Spotify login successful!</h1><p>You may close this tab now.</p>")