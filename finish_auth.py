from pathlib import Path
import re
p = Path('backend/api/views_auth.py')
s = p.read_text(encoding='utf-8')
s = s.replace('from api.models import AuthState, UserSession', 'from api.models import AuthState, UserSession, LoginHandoff\nfrom api.auth_utils import get_session_from_request\nfrom django.db import transaction\nfrom django.views.decorators.cache import never_cache')
s = s.replace('def login(request):', '@never_cache\ndef login(request):')
s = s.replace('def callback(request):', '@never_cache\ndef callback(request):')
s = s.replace('    return HttpResponseRedirect(f"{AUTH_URL}?{urlencode(params)}")', '''    response = HttpResponseRedirect(f"{AUTH_URL}?{urlencode(params)}")
    response.set_cookie("spotify_oauth_state", state, max_age=600, httponly=True,
                        secure=request.is_secure(), samesite="Lax", path="/api/auth/")
    return response''')
s = s.replace('f"{frontend_url}?error={error}"', 'f"{frontend_url}?{urlencode({\'error\': \'authorization_failed\'})}"')
s = s.replace('    if not code or not state:', '    if not code or not state or not secrets.compare_digest(state, request.COOKIES.get("spotify_oauth_state", "")):')
s = s.replace('        auth_state = AuthState.objects.get(state=state)', '''        with transaction.atomic():
            auth_state = AuthState.objects.select_for_update().get(
                state=state, created_at__gt=timezone.now()-timedelta(minutes=10))
            code_verifier = auth_state.code_verifier
            auth_state.delete()''')
s = s.replace('    code_verifier = auth_state.code_verifier\n    auth_state.delete()\n', '')
s = re.sub(r'^        print\(.*\)\n', '', s, flags=re.M)
s = s.replace('status=500)', 'status=503)')
s = s.replace('    UserSession.objects.create(', '    session = UserSession.objects.create(')
s = s.replace('    return HttpResponseRedirect(f"{frontend_url}?session={session_token}")', '''    handoff = LoginHandoff.objects.create(code=secrets.token_urlsafe(32), session=session)
    response = HttpResponseRedirect(f"{frontend_url}#code={handoff.code}")
    response.delete_cookie("spotify_oauth_state", path="/api/auth/")
    return response''')
start = s.index('    auth_header =', s.index('def auth_status'))
end = s.index('\n\n@api_view', start)
s = s[:start]+'''    session = get_session_from_request(request)
    if not session:
        return Response({"authenticated": False})
    return Response({"authenticated": True, "spotify_user_id": session.spotify_user_id,
                     "display_name": session.display_name})
''' + s[end:]
s += '''

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
'''
p.write_text(s, encoding='utf-8')
p = Path('backend/api/urls.py')
p.write_text(p.read_text().replace('    path("auth/status",', '    path("auth/exchange", views_auth.exchange),\n    path("auth/status",'), encoding='utf-8')
