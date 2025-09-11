# api/views_auth.py
import os, base64, hashlib, secrets, requests, time, json
from urllib.parse import urlencode
from django.http import JsonResponse, HttpResponseRedirect
from django.conf import settings
from django.http import HttpResponse

# trigger env var loading
from spotify_tools.config import *

AUTH_URL  = "https://accounts.spotify.com/authorize"
TOKEN_URL = "https://accounts.spotify.com/api/token"

CLIENT_ID     = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")   # used only on backend
REDIRECT_URI  = os.getenv("SPOTIFY_REDIRECT_URI")    # e.g. https://your-backend.onrender.com/api/auth/callback
SCOPES        = os.getenv("SPOTIFY_SCOPES", "playlist-modify-private playlist-read-private user-top-read")

# In-memory PKCE cache (replace with DB/Redis for production multi-instance)
PKCE_CACHE = {}

def login(request):
    code_verifier = secrets.token_urlsafe(64)
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).rstrip(b"=").decode("utf-8")

    state = secrets.token_urlsafe(16)
    PKCE_CACHE[state] = {"verifier": code_verifier, "ts": time.time()}

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

    pkce = PKCE_CACHE.pop(state, None)
    if not pkce:
        return JsonResponse({"error": "Invalid state"}, status=400)

    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
        "client_id": CLIENT_ID,
        "code_verifier": pkce["verifier"],
    }
    r = requests.post(TOKEN_URL, data=data, timeout=30)
    if r.status_code != 200:
        return JsonResponse({"error": "Token exchange failed", "details": r.text}, status=500)

    tok = r.json()

    # Save refresh token for this user (TODO: tie to user identity)
    save_path = os.getenv("SPOTIFY_TOKEN_PATH", settings.BASE_DIR / "spotify_tokens.json")
    with open(save_path, "w", encoding="utf-8") as f:
        json.dump(tok, f, indent=2)

    # Redirect back to frontend success page
    frontend_url = os.getenv("FRONTEND_SUCCESS_URL", "http://localhost:3000/auth/success")
    return HttpResponseRedirect(f"{frontend_url}?ok=1")

def auth_success(request):
    return HttpResponse("<h1> DEV Spotify login successful!</h1><p>You may close this tab now.</p>")