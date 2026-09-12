from pathlib import Path
import re

root = Path(__file__).parent
def edit(path, fn):
    p = root / path
    p.write_text(fn(p.read_text(encoding='utf-8')), encoding='utf-8')

# Preserve the original project history before rewriting the landing page.
(root/'docs/engineering-retrospective.md').write_text((root/'README.md').read_text(encoding='utf-8'), encoding='utf-8')

def views(s):
    s = 'from dataclasses import asdict\nfrom api import serializers as inputs\nfrom api.errors import PlaylistChanged\nfrom rest_framework.exceptions import ValidationError\n' + s
    s = re.sub(r'    except Exception as e:\n        print\(.*?\)\n        return Response\(.*?\)\n', '', s)
    # Remove broad try wrappers, allowing DRF to handle exceptions centrally.
    s = s.replace('    try:\n', '')
    s = '\n'.join(line[4:] if line.startswith('        ') else line for line in s.split('\n'))
    configs = {'get_duplicate_tracks':'DuplicateInput','delete_duplicate_tracks':'DuplicateDeleteInput','remove_tracks':'RemoveInput','explicit_report':'ExplicitInput','create_clean_playlist':'CleanInput','top_items':'TopInput','liked_songs':'LikedInput','build_playlist':'BuildInput'}
    for name, cls in configs.items():
        start = s.index('def '+name+'(')
        end = s.find('\n\n@api_view', start)
        if end < 0: end = len(s)
        part = s[start:end]
        anchor = '    if err:\n        return err\n'
        part = part.replace(anchor, anchor+f'    data = inputs.validated(inputs.{cls}, request)\n', 1)
        part = part.replace('request.data.get(', 'data.get(').replace('request.query_params.get(', 'data.get(')
        s = s[:start]+part+s[end:]
    s = s.replace('    items = list(client.iter_playlist_items(playlist_id, write=False))\n    groups', '    snapshot = client.playlist_snapshot(playlist_id)\n    items = list(client.iter_playlist_items(playlist_id, write=False))\n    if client.playlist_snapshot(playlist_id) != snapshot:\n        raise PlaylistChanged()\n    groups', 1)
    s = s.replace('return Response({"groups": [g.key for g in groups], "count": len(groups)})', 'return Response({"groups": [asdict(g) for g in groups], "count": len(groups), "snapshot_id": snapshot})')
    s = s.replace('result = client.clear_dupes_then_readd(playlist_id)', '''if client.playlist_snapshot(playlist_id) != data["snapshot_id"]:
        raise PlaylistChanged()
    items = list(client.iter_playlist_items(playlist_id, write=True))
    groups = group_duplicates(items, strict=data["strict"], tol_secs=data["tol_secs"])
    positions = set(data["positions"])
    eligible = {t.playlist_idx for g in groups for t in g.tracks}
    if not positions <= eligible or any(all(t.playlist_idx in positions for t in g.tracks) for g in groups):
        raise ValidationError("Select duplicate copies and leave at least one track in each group.")
    if client.playlist_snapshot(playlist_id) != data["snapshot_id"]:
        raise PlaylistChanged()
    result = client.remove_selected_duplicates(playlist_id, items, positions)''')
    return s
edit('backend/api/views.py', views)

def client(s):
    s = s.replace('import time', 'import re')
    start = s.index('    @staticmethod\n    def playlist_id_from_input')
    end = s.index('    def iter_playlist_items', start)
    s = s[:start]+'''    @staticmethod
    def playlist_id_from_input(value: str) -> str:
        if not isinstance(value, str):
            raise ValueError("Invalid playlist ID")
        value = value.strip()
        if value.startswith("spotify:playlist:"):
            value = value.removeprefix("spotify:playlist:")
        elif value.startswith("https://"):
            parsed = up.urlparse(value)
            if parsed.netloc != "open.spotify.com" or not re.fullmatch(r"/playlist/[A-Za-z0-9]{22}/?", parsed.path):
                raise ValueError("Invalid playlist URL")
            value = parsed.path.strip("/").split("/")[-1]
        if not re.fullmatch(r"[A-Za-z0-9]{22}", value):
            raise ValueError("Invalid playlist ID")
        return value

    def playlist_snapshot(self, playlist_id: str) -> str:
        pid = self.playlist_id_from_input(playlist_id)
        r = requests.get(f"{API_URL}/playlists/{pid}", headers=self._auth_header(False),
                         params={"fields": "snapshot_id"}, timeout=TIMEOUT)
        r.raise_for_status()
        return r.json()["snapshot_id"]

    def remove_selected_duplicates(self, playlist_id, items, positions):
        # Spotify removes all occurrences of a URI. Restore unselected occurrences
        # at their resulting positions; untouched tracks retain their added dates.
        affected = {items[p]["track"]["uri"] for p in positions}
        retained = [item for p, item in enumerate(items) if p not in positions]
        restorations = [(p, item["track"]["uri"]) for p, item in enumerate(retained)
                        if (item.get("track") or {}).get("uri") in affected]
        self.remove_by_uri(playlist_id, sorted(affected))
        for position, uri in restorations:
            self.add_items(playlist_id, [uri], position=position)
        return {"original": len(items), "removed": len(positions), "kept": len(retained)}

''' + s[end:]
    start = s.index('        retry_counter = 0', s.index('    def iter_playlist_items'))
    end = s.index('    def replace_items', start)
    s = s[:start]+'''        while url:
            r = requests.get(url, headers=headers, params=params, timeout=TIMEOUT)
            r.raise_for_status()
            data = r.json()
            yield from data.get("items", [])
            url = data.get("next")
            params = None

''' + s[end:]
    start = s.index('        retry_counter = 0', s.index('    def playlist_name_from_id'))
    end = s.index('    def get_liked_songs', start)
    s = s[:start]+'''        r = requests.get(url, headers=headers, timeout=TIMEOUT)
        r.raise_for_status()
        return r.json().get("name", "")

''' + s[end:]
    s = re.sub(r'        if r.status_code == 429:\n(?:            .*\n)+', '', s)
    return s
edit('backend/spotify_tools/client.py', client)

def duplicates(s):
    start = s.index('    tracks: List[Track] = []', s.index('def compute_keep_and_delete_uris'))
    s = s[:start]+'''    groups = group_duplicates(items, strict=strict, tol_secs=tol_secs)
    keep = [min(g.tracks, key=lambda t: t.playlist_idx).uri for g in groups]
    delete = list(dict.fromkeys(t.uri for g in groups for t in g.tracks))
    return keep, delete
'''
    s = '\n'.join(line for line in s.split('\n') if 'COME BACK' not in line)
    s = s.replace('    merged: Dict[KeyFormat, List[Track]] = {}', '    merged: Dict[KeyFormat, List[Track]] = {}\n    candidates = {}')
    s = s.replace('for existingKey in list(merged.keys()):', 'for existingKey in candidates.get((title, artists), []):')
    s = s.replace('            merged[(title, artists, sec)] = group', '            merged[(title, artists, sec)] = group\n            candidates.setdefault((title, artists), []).append((title, artists, sec))')
    s = s.replace('from typing import Dict, Iterable, List, Tuple, Set', 'from typing import Dict, Iterable, List, Tuple')
    return s
edit('backend/spotify_tools/duplicates.py', duplicates)

def normalize(s):
    start = s.index('    out = []', s.index('def _strip_accents_latin_only'))
    end = s.index('\n# Strip accents', start)
    return s[:start]+'''    out = []
    latin_base = False
    for ch in unicodedata.normalize("NFD", s):
        if unicodedata.combining(ch):
            if not latin_base:
                out.append(ch)
        else:
            latin_base = "LATIN" in unicodedata.name(ch, "")
            out.append(ch)
    return unicodedata.normalize("NFC", "".join(out))

''' + s[end:]
edit('backend/spotify_tools/normalize.py', normalize)

def explicit(s):
    s = s.replace('from .client import SpotifyClient, API_URL', 'from .client import SpotifyClient')
    s = s.replace('        return None\n    except Exception:\n        return None', '        if r.status_code == 404:\n            return None\n        r.raise_for_status()\n        return None\n    except ValueError:\n        raise requests.RequestException("Invalid lyrics service response")')
    s = s.replace('banned = set(load_banned_words_from_purgomalum())', 'banned = set(load_banned_words_from_purgomalum()) if mode == "lyrics" else set()')
    start = s.index('    try: \n        items = list(client.iter_playlist_items')
    end = s.index('    out: List[Dict]', start)
    s = s[:start]+'    items = list(client.iter_playlist_items(playlist_id, write=False))\n'+s[end:]
    start = s.index('            elif not lyrics:')
    end = s.index('    return out', start)
    s = s[:start]+s[end:]
    return s
edit('backend/spotify_tools/explicit.py', explicit)

edit('backend/spotifytools_backend/settings.py', lambda s: s.replace('import dj_database_url', 'import dj_database_url\nfrom dotenv import load_dotenv\nload_dotenv(Path(__file__).resolve().parents[2] / ".env")').replace('"DEFAULT_SCHEMA_CLASS":', '"EXCEPTION_HANDLER": "api.errors.api_exception_handler",\n    "DEFAULT_SCHEMA_CLASS":')+'\nSESSION_MAX_AGE_DAYS = int(os.getenv("SESSION_MAX_AGE_DAYS", "7"))\nCORS_EXPOSE_HEADERS = ["Retry-After"]\n')

def auth(s):
    s = s.replace('from api.models import UserSession', 'from api.models import UserSession\nfrom django.conf import settings\nfrom api.errors import SessionExpired')
    s = s.replace('        return UserSession.objects.get(session_token=token)', '        session = UserSession.objects.get(session_token=token)\n        if session.created_at <= timezone.now() - timedelta(days=settings.SESSION_MAX_AGE_DAYS):\n            session.delete()\n            return None\n        return session')
    start = s.index('    try:\n        r = requests.post')
    end = s.index('    tok = r.json()', start)
    s = s[:start]+'''    r = requests.post(TOKEN_URL, headers=headers, data=data, timeout=30)
    if r.status_code in (400, 401):
        session.delete()
        raise SessionExpired()
    r.raise_for_status()

''' + s[end:]
    start = s.index('    try:\n        access_token = get_spotify_token')
    end = s.index('    return session, access_token', start)
    s = s[:start]+'    access_token = get_spotify_token(session)\n'+s[end:]
    return s
edit('backend/api/auth_utils.py', auth)
