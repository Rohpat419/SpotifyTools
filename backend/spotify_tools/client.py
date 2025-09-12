# This file handles the networking between Spotify servers and the user (client). Including Auth

from __future__ import annotations
import os
import time
import urllib.parse as up
from typing import Dict, Generator, List, Optional
import requests

from spotify_tools.duplicates import compute_keep_and_delete_uris

TIMEOUT = 30
API_URL = "https://api.spotify.com/v1"


class SpotifyClient:
    """
    A Spotify Web API client that always uses a per-user access_token.
    App-level client credentials flow has been removed for clarity:
    every operation is tied to the logged-in Spotify user.
    """

    def __init__(self, access_token: str):
        if not access_token:
            raise ValueError("SpotifyClient requires a valid access token")
        self.access_token = access_token

    def _auth_header(self) -> Dict[str, str]:
        return {"Authorization": f"Bearer {self.access_token}"}

    @staticmethod
    def playlist_id_from_input(input: str) -> str:
        if input.startswith("http"):
            parsed = up.urlparse(input)
            parts = parsed.path.strip("/").split("/")
            if len(parts) >= 2 and parts[-2] == "playlist":
                return parts[-1]

        # Already an ID
        return input

    def iter_playlist_items(self, playlist_id: str) -> Generator[dict, None, None]:
        pid = self.playlist_id_from_input(playlist_id)
        headers = self._auth_header()

        url = f"{API_URL}/playlists/{pid}/tracks"
        params = {"limit": 100}

        retry_counter = 0
        while url and retry_counter < 10:
            r = requests.get(url, headers=headers, params=params, timeout=TIMEOUT)
            retry_counter += 1
            if r.status_code == 429:
                retry_timer = int(r.headers.get("Retry-After", "1"))
                time.sleep(retry_timer)
                continue

            r.raise_for_status()
            data = r.json()
            for item in data.get("items", []):
                yield item
            url = data.get("next")
            params = None  # next already contains query params

    def replace_items(self, playlist_id: str, uris: List[str]) -> dict:
        """Replace the playlist's items with up to 100 URIs."""
        if len(uris) > 100:
            raise ValueError("replace_items accepts at most 100 URIs")
        pid = self.playlist_id_from_input(playlist_id)
        headers = self._auth_header()
        headers.update({"Content-Type": "application/json"})
        r = requests.put(
            f"{API_URL}/playlists/{pid}/tracks",
            headers=headers,
            json={"uris": uris},
            timeout=TIMEOUT,
        )
        r.raise_for_status()
        return r.json()

    def remove_by_uri(self, playlist_id: str, uris: List[str]) -> None:
        pid = self.playlist_id_from_input(playlist_id)
        headers = self._auth_header()
        headers.update({"Content-Type": "application/json"})

        seen = set()
        unique = []
        for u in uris:
            if u and u not in seen:
                seen.add(u)
                unique.append(u)
        for i in range(0, len(unique), 100):
            chunk = unique[i : i + 100]
            payload = {"tracks": [{"uri": u} for u in chunk]}
            r = requests.delete(
                f"{API_URL}/playlists/{pid}/tracks",
                headers=headers,
                json=payload,
                timeout=TIMEOUT,
            )
            r.raise_for_status()

    def add_items(
        self, playlist_id: str, uris: List[str], position: Optional[int] = None
    ) -> dict:
        """Append up to 100 URIs (or insert at a position)."""
        if len(uris) > 100:
            raise ValueError("add_items accepts at most 100 URIs")
        pid = self.playlist_id_from_input(playlist_id)
        headers = self._auth_header()
        headers.update({"Content-Type": "application/json"})
        body = {"uris": uris}
        if position is not None:
            body["position"] = int(position)
        r = requests.post(
            f"{API_URL}/playlists/{pid}/tracks",
            headers=headers,
            json=body,
            timeout=TIMEOUT,
        )
        r.raise_for_status()
        return r.json()

    def clear_dupes_then_readd(
        self, playlist_id: str, *, strict: bool = False, tol_secs: int = 2
    ) -> dict:
        items = list(self.iter_playlist_items(playlist_id))
        original_count = sum(
            1 for it in items if (it.get("track") or {}).get("type") == "track"
        )

        keep_uris, delete_uris = compute_keep_and_delete_uris(
            items, strict=strict, tol_secs=tol_secs
        )

        if delete_uris:
            self.remove_by_uri(playlist_id, delete_uris)

        if keep_uris:
            self.add_items(playlist_id, keep_uris)

        return {
            "original": original_count,
            "kept": len(keep_uris),
            "removed": len(delete_uris),
        }

    def create_playlist(
        self, user_id: str, name: str, description: str = "", public: bool = False
    ) -> str:
        """Create a new playlist under the given user account."""
        headers = self._auth_header()
        headers.update({"Content-Type": "application/json"})
        body = {"name": name, "description": description, "public": public}
        r = requests.post(
            f"{API_URL}/users/{user_id}/playlists",
            headers=headers,
            json=body,
            timeout=TIMEOUT,
        )
        r.raise_for_status()
        return r.json()["id"]

    def get_current_user_id(self) -> str:
        headers = self._auth_header()
        r = requests.get(f"{API_URL}/me", headers=headers, timeout=TIMEOUT)
        r.raise_for_status()
        return r.json()["id"]

    def playlist_name_from_id(self, playlist_id: str) -> str:
        headers = self._auth_header()
        pid = self.playlist_id_from_input(playlist_id)

        url = f"{API_URL}/playlists/{pid}"

        retry_counter = 0
        while retry_counter < 5:
            r = requests.get(url, headers=headers, timeout=TIMEOUT)
            retry_counter += 1
            if r.status_code == 429:
                retry_timer = int(r.headers.get("Retry-After", "1"))
                time.sleep(retry_timer)
                continue
            try:
                r.raise_for_status()
            except requests.HTTPError as e:
                status = getattr(e.response, "status_code", None)
                if status in (401, 404):
                    # With per-user tokens, retries here usually mean bad playlist ID or permissions
                    raise
                else:
                    raise

            data = r.json()
            return data.get("name", "")

        return ""