from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from spotify_tools.client import SpotifyClient
from spotify_tools.duplicates import group_duplicates, DEFAULT_TOLERANCE
from spotify_tools.explicit import explicit_report_from_playlist
from spotify_tools.tops import get_user_top
from api.auth_utils import require_auth


def _client_for_request(request):
    """Return (SpotifyClient, error_response). error_response is None on success."""
    session, result = require_auth(request)
    if session is None:
        return None, result
    return SpotifyClient(user_token=result), None


@api_view(["POST"])
def get_duplicate_tracks(request):
    try:
        client, err = _client_for_request(request)
        if err:
            return err
        playlist_id = request.data.get("playlist_id")
        strict = request.data.get("strict", False)
        tol_secs = int(request.data.get("tol_secs", DEFAULT_TOLERANCE))
        items = list(client.iter_playlist_items(playlist_id, write=False))
        groups = group_duplicates(items, strict=strict, tol_secs=tol_secs)
        return Response({"groups": [g.key for g in groups], "count": len(groups)})
    except Exception as e:
        print(f"[get_duplicate_tracks] Error: {e}")
        return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
def delete_duplicate_tracks(request):
    try:
        client, err = _client_for_request(request)
        if err:
            return err
        playlist_id = request.data.get("playlist_id")
        result = client.clear_dupes_then_readd(playlist_id)
        return Response(result)
    except Exception as e:
        print(f"[delete_duplicate_tracks] Error: {e}")
        return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
def remove_tracks(request):
    try:
        client, err = _client_for_request(request)
        if err:
            return err
        playlist_id = request.data.get("playlist_id")
        uris = request.data.get("uris", [])
        if not playlist_id or not isinstance(uris, list) or not uris:
            return Response(
                {"detail": "playlist_id and non-empty uris[] required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        client.remove_by_uri(playlist_id, uris)
        return Response({"removed_count": len(uris), "removed_uris": uris})
    except Exception as e:
        print(f"[remove_tracks] Error: {e}")
        return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
def explicit_report(request):
    try:
        client, err = _client_for_request(request)
        if err:
            return err
        playlist_id = request.data.get("playlist_id")
        mode = request.data.get("mode", "metadata")
        extra = request.data.get("extra_banned_words")
        rows = explicit_report_from_playlist(client, playlist_id, mode=mode, extra_banned_words=extra)
        return Response({"rows": rows})
    except Exception as e:
        print(f"[explicit_report] Error: {e}")
        return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
def create_clean_playlist(request):
    try:
        client, err = _client_for_request(request)
        if err:
            return err
        playlist_id = request.data.get("playlist_id")
        rows = request.data.get("rows", [])

        if not playlist_id or not isinstance(rows, list):
            return Response(
                {"detail": "playlist_id and rows[] required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        explicit_uris = {r.get("uri") for r in rows if r.get("uri")}
        items = list(client.iter_playlist_items(playlist_id, write=True))
        all_uris = [t.get("track", {}).get("uri") for t in items if t.get("track")]
        clean_uris = [u for u in all_uris if u and u not in explicit_uris]

        user_id = client.get_current_user_id()
        old_name = client.playlist_name_from_id(playlist_id, write=False)
        new_name = f"Clean version of {old_name}" if old_name else "Clean Version"

        new_id = client.create_playlist(
            user_id,
            name=new_name,
            description=f"Filtered copy of {playlist_id}",
            public=False,
        )

        for i in range(0, len(clean_uris), 100):
            client.add_items(new_id, clean_uris[i : i + 100])

        return Response({"new_playlist_id": new_id, "added_count": len(clean_uris)})
    except Exception as e:
        print(f"[create_clean_playlist] Error: {e}")
        return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
def top_items(request):
    try:
        client, err = _client_for_request(request)
        if err:
            return err
        kind = request.query_params.get("kind", "tracks")
        time_range = request.query_params.get("time_range", "short_term")
        limit = int(request.query_params.get("limit", 5))
        items = get_user_top(client, kind=kind, time_range=time_range, limit=limit)
        return Response({"items": items})
    except Exception as e:
        print(f"[top_items] Error: {e}")
        return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
def liked_songs(request):
    """Paginated fetch of user's Liked Songs from Spotify."""
    try:
        client, err = _client_for_request(request)
        if err:
            return err
        offset = int(request.query_params.get("offset", 0))
        limit = int(request.query_params.get("limit", 50))
        limit = min(limit, 50)

        data = client.get_liked_songs(offset=offset, limit=limit)
        items = []
        for item in data.get("items", []):
            track = item.get("track")
            if not track:
                continue
            album = track.get("album") or {}
            items.append({
                "uri": track.get("uri", ""),
                "name": track.get("name", ""),
                "artists": [a.get("name", "") for a in track.get("artists", [])],
                "album": album.get("name", ""),
                "album_image": (album.get("images") or [{}])[0].get("url", ""),
                "release_date": album.get("release_date", ""),
                "duration_ms": track.get("duration_ms", 0),
                "added_at": item.get("added_at", ""),
                "explicit": track.get("explicit", False),
            })

        return Response({
            "items": items,
            "total": data.get("total", 0),
            "offset": offset,
            "limit": limit,
        })
    except Exception as e:
        print(f"[liked_songs] Error: {e}")
        return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
def my_playlists(request):
    """Fetch the authenticated user's playlists."""
    try:
        client, err = _client_for_request(request)
        if err:
            return err

        data = client.get_user_playlists()
        playlists = []
        for p in data.get("items", []):
            playlists.append({
                "id": p.get("id", ""),
                "name": p.get("name", ""),
                "image": (p.get("images") or [{}])[0].get("url", ""),
                "track_count": (p.get("tracks") or {}).get("total", 0),
                "public": p.get("public", False),
            })
        return Response({"playlists": playlists})
    except Exception as e:
        print(f"[my_playlists] Error: {e}")
        return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
def build_playlist(request):
    """Create a new playlist or add tracks to an existing one."""
    try:
        client, err = _client_for_request(request)
        if err:
            return err

        action = request.data.get("action")  # "create" or "add"
        uris = request.data.get("uris", [])

        if not uris or not isinstance(uris, list):
            return Response({"detail": "Non-empty uris[] required"}, status=status.HTTP_400_BAD_REQUEST)

        if action == "create":
            playlist_name = request.data.get("playlist_name", "My Playlist")
            user_id = client.get_current_user_id()
            new_id = client.create_playlist(user_id, name=playlist_name, public=False)
            for i in range(0, len(uris), 100):
                client.add_items(new_id, uris[i : i + 100])
            return Response({"playlist_id": new_id, "added_count": len(uris), "action": "created"})

        elif action == "add":
            playlist_id = request.data.get("playlist_id")
            if not playlist_id:
                return Response({"detail": "playlist_id required for 'add' action"}, status=status.HTTP_400_BAD_REQUEST)
            for i in range(0, len(uris), 100):
                client.add_items(playlist_id, uris[i : i + 100])
            return Response({"playlist_id": playlist_id, "added_count": len(uris), "action": "added"})

        else:
            return Response({"detail": "action must be 'create' or 'add'"}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        print(f"[build_playlist] Error: {e}")
        return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
def ping(request):
    return Response({"status": "ok", "message": "pong"})
