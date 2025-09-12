from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User

from spotify_tools.client import SpotifyClient
from spotify_tools.duplicates import group_duplicates, DEFAULT_TOLERANCE
from spotify_tools.explicit import explicit_report_from_playlist
from spotify_tools.tops import get_user_top
from spotify_tools.auth.user_token_from_refresh import get_user_access_token


def _get_client_from_request(request) -> SpotifyClient:
    """Helper to resolve User -> SpotifyClient with valid token."""
    username = (
        request.data.get("user")
        if hasattr(request, "data")
        else request.query_params.get("user")
    )
    if not username:
        return None, Response({"error": "user is required"}, status=400)

    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return None, Response({"error": "unknown user"}, status=404)

    token = get_user_access_token(user)
    return SpotifyClient(access_token=token), None


@api_view(["POST"])
def get_duplicate_tracks(request):
    client, err = _get_client_from_request(request)
    if err:
        return err

    playlist_id = request.data.get("playlist_id")
    strict = request.data.get("strict", False)
    tol_secs = int(request.data.get("tol_secs", DEFAULT_TOLERANCE))

    items = list(client.iter_playlist_items(playlist_id))
    groups = group_duplicates(items, strict=strict, tol_secs=tol_secs)
    return Response({"groups": [g.key for g in groups], "count": len(groups)})


@api_view(["POST"])
def delete_duplicate_tracks(request):
    client, err = _get_client_from_request(request)
    if err:
        return err

    playlist_id = request.data.get("playlist_id")
    result = client.clear_dupes_then_readd(playlist_id)
    return Response(result)


@api_view(["POST"])
def explicit_report(request):
    client, err = _get_client_from_request(request)
    if err:
        return err

    playlist_id = request.data.get("playlist_id")
    mode = request.data.get("mode", "metadata")
    extra = request.data.get("extra_banned_words")
    rows = explicit_report_from_playlist(
        client, playlist_id, mode=mode, extra_banned_words=extra
    )
    return Response({"rows": rows})


@api_view(["POST"])
def create_clean_playlist(request):
    client, err = _get_client_from_request(request)
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

    # Fetch all tracks in the playlist
    items = list(client.iter_playlist_items(playlist_id))
    all_uris = [t.get("track", {}).get("uri") for t in items if t.get("track")]
    clean_uris = [u for u in all_uris if u and u not in explicit_uris]

    # Create new playlist
    user_id = client.get_current_user_id()
    old_name = client.playlist_name_from_id(playlist_id)
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


@api_view(["GET"])
def top_items(request):
    client, err = _get_client_from_request(request)
    if err:
        return err

    kind = request.query_params.get("kind", "tracks")
    time_range = request.query_params.get("time_range", "short_term")
    limit = int(request.query_params.get("limit", 5))

    items = get_user_top(client, kind=kind, time_range=time_range, limit=limit)
    return Response({"items": items})


@api_view(["GET"])
def ping(request):
    return Response({"status": "ok", "message": "pong"})
