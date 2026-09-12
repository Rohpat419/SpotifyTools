from rest_framework import serializers
from spotify_tools.client import SpotifyClient


class PlaylistField(serializers.CharField):
    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        try:
            return SpotifyClient.playlist_id_from_input(value)
        except ValueError:
            raise serializers.ValidationError("Enter a valid Spotify playlist URL or 22-character ID.")


class PlaylistInput(serializers.Serializer):
    playlist_id = PlaylistField()


class DuplicateInput(PlaylistInput):
    strict = serializers.BooleanField(default=False)
    tol_secs = serializers.IntegerField(default=5, min_value=0, max_value=30)


class DuplicateDeleteInput(DuplicateInput):
    positions = serializers.ListField(child=serializers.IntegerField(min_value=0), allow_empty=False, max_length=100)
    snapshot_id = serializers.CharField(max_length=256)


class ExplicitInput(PlaylistInput):
    mode = serializers.ChoiceField(choices=["metadata", "lyrics"], default="metadata")
    extra_banned_words = serializers.ListField(child=serializers.RegexField(r"^[A-Za-z']+$", max_length=50), max_length=100, default=list)


class TrackRow(serializers.Serializer):
    uri = serializers.RegexField(r"^spotify:track:[A-Za-z0-9]{22}$")


class CleanInput(PlaylistInput):
    rows = TrackRow(many=True)


class RemoveInput(PlaylistInput):
    uris = serializers.ListField(child=serializers.RegexField(r"^spotify:track:[A-Za-z0-9]{22}$"), allow_empty=False, max_length=10000)


class TopInput(serializers.Serializer):
    kind = serializers.ChoiceField(choices=["tracks", "artists"], default="tracks")
    time_range = serializers.ChoiceField(choices=["short_term", "medium_term", "long_term"], default="short_term")
    limit = serializers.IntegerField(min_value=1, max_value=50, default=5)


class LikedInput(serializers.Serializer):
    offset = serializers.IntegerField(min_value=0, default=0)
    limit = serializers.IntegerField(min_value=1, max_value=50, default=50)


class BuildInput(serializers.Serializer):
    action = serializers.ChoiceField(choices=["create", "add"])
    uris = RemoveInput().fields["uris"]
    playlist_name = serializers.CharField(max_length=100, default="My Playlist")
    playlist_id = PlaylistField(required=False)

    def validate(self, data):
        if data["action"] == "add" and "playlist_id" not in data:
            raise serializers.ValidationError({"playlist_id": "Required when adding to a playlist."})
        return data


def validated(serializer, request):
    instance = serializer(data=request.query_params if request.method == "GET" else request.data)
    instance.is_valid(raise_exception=True)
    return instance.validated_data
