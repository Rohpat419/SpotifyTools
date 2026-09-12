# This file handles the networking between Spotify servers and the user (client). Including Auth

from __future__ import annotations
import os
import re
import urllib.parse as up
from typing import Dict, Generator, List, Optional
import requests

from spotify_tools.duplicates import compute_keep_and_delete_uris
from spotify_tools.config import *


TIMEOUT=30

API_URL = "https://api.spotify.com/v1"

class SpotifyClient: 
    def __init__(self, *, client_id: Optional[str] = None, client_secret: Optional[str] = None, user_token: Optional[str] = None):
        self.client_id = client_id or os.getenv("SPOTIFY_CLIENT_ID")
        self.client_secret = client_secret or os.getenv("SPOTIFY_CLIENT_SECRET")
        self.user_token = user_token or os.getenv("SPOTIFY_USER_TOKEN")

        # Not user supplied, client needs to cache app token from Spotify servers
        self._app_token : Optional[str] = None

    def _get_app_token(self) -> str:
        if self._app_token: 
            return self._app_token
        if not (self.client_id and self.client_secret):
            raise RuntimeError("Missing client credentials.")
        r = requests.post(
            "https://accounts.spotify.com/api/token",
            data={"grant_type": "client_credentials"},
            auth=(self.client_id, self.client_secret),
            timeout=TIMEOUT
        )
        r.raise_for_status()
        self._app_token = r.json()["access_token"]
        return self._app_token
    
    def _auth_header(self, write: bool) -> Dict[str, str]:
        if self.user_token:
            return {"Authorization": f"Bearer {self.user_token}"}
        if write:
            raise RuntimeError("User token required for write operations")
        return {"Authorization": f"Bearer {self._get_app_token()}"}
    

    @staticmethod
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

    def iter_playlist_items(self, playlist_id: str, *, write: bool = False):
        pid = self.playlist_id_from_input(playlist_id)
        headers = self._auth_header(write=write)

        url = f"{API_URL}/playlists/{pid}/tracks"
        params = {"limit": 100}

        while url:
            r = requests.get(url, headers=headers, params=params, timeout=TIMEOUT)
            r.raise_for_status()
            data = r.json()
            yield from data.get("items", [])
            url = data.get("next")
            params = None

    def replace_items(self, playlist_id: str, uris: List[str]) -> dict:
        """Replace the playlist's items with up to 100 URIs."""
        if len(uris) > 100:
            raise ValueError("replace_items accepts at most 100 URIs")
        pid = self.playlist_id_from_input(playlist_id)
        headers = self._auth_header(write=True)
        headers.update({"Content-Type": "application/json"})
        r = requests.put(f"{API_URL}/playlists/{pid}/tracks",
                        headers=headers, json={"uris": uris}, timeout=TIMEOUT)
        r.raise_for_status()
        return r.json()
    
    def remove_by_uri(self, playlist_id: str, uris: List[str]) -> None: 
        pid = self.playlist_id_from_input(playlist_id)
        headers = self._auth_header(write=True)
        headers.update({"Content-Type": "application/json"})

        seen = set()
        unique = []
        for u in uris: 
            if u and u not in seen: 
                seen.add(u)
                unique.append(u)
        # maxes out at 100 per call
        for i in range(0, len(unique), 100):
            chunk = unique[i:i+100]
            payload = {"tracks": [{"uri": u} for u in chunk]} 
            r = requests.delete(f"{API_URL}/playlists/{pid}/tracks",
                    headers=headers, json=payload, timeout=TIMEOUT)
            r.raise_for_status()
        

    def add_items(self, playlist_id: str, uris: List[str], position: Optional[int] = None) -> dict:
        """Append up to 100 URIs (or insert at a position)."""
        if len(uris) > 100:
            raise ValueError("add_items accepts at most 100 URIs")
        pid = self.playlist_id_from_input(playlist_id)
        headers = self._auth_header(write=True)
        headers.update({"Content-Type": "application/json"})
        body = {"uris": uris}
        if position is not None:
            body["position"] = int(position)
        r = requests.post(f"{API_URL}/playlists/{pid}/tracks",
                        headers=headers, json=body, timeout=TIMEOUT)
        r.raise_for_status()
        return r.json()
    
    def clear_dupes_then_readd(self, playlist_id: str, *, strict: bool = False, tol_secs: int = 2) -> dict:
        """
        Read the playlist
        Build (keep_uris, delete_uris)
        Delete all delete_uris
        Add back keep_uris
        """
        
        items = list(self.iter_playlist_items(playlist_id, write=True))
        original_count = sum(1 for it in items if (it.get("track") or {}).get("type") == "track")

        keep_uris, delete_uris = compute_keep_and_delete_uris(items, strict=strict, tol_secs=tol_secs)

        if delete_uris: 
            self.remove_by_uri(playlist_id, delete_uris)
        
        if keep_uris: 
            self.add_items(playlist_id, keep_uris)
        
        return {"original": original_count, "kept": len(keep_uris), "removed": len(delete_uris)}

    def create_playlist(self, user_id: str, name: str, description: str = "", public: bool = False) -> str: 
        """
        Create a new playlist under the given user account.
        Returns the new playlist ID.
        """
        headers = self._auth_header(write=True)
        headers.update({"Content-Type": "application/json"})
        body = {
            "name": name,
            "description": description,
            "public": public,
        }
        r = requests.post(f"{API_URL}/users/{user_id}/playlists",
                          headers=headers, json=body, timeout=30)
        r.raise_for_status()
        return r.json()["id"]

    def get_current_user_id(self) -> str:
        headers = self._auth_header(write=True)
        r = requests.get(f"{API_URL}/me", headers=headers, timeout=30)
        r.raise_for_status()
        return r.json()["id"]
    
    def playlist_name_from_id(self, playlist_id: str, write: bool) -> str: 
        headers=self._auth_header(write=write)
        pid = self.playlist_id_from_input(playlist_id)

        url = f"{API_URL}/playlists/{pid}"

        r = requests.get(url, headers=headers, timeout=TIMEOUT)
        r.raise_for_status()
        return r.json().get("name", "")

    def get_liked_songs(self, offset: int = 0, limit: int = 50) -> dict:
        """Fetch user's Liked Songs (GET /me/tracks). Returns the raw Spotify response."""
        headers = self._auth_header(write=True)
        params = {"offset": offset, "limit": min(limit, 50)}
        r = requests.get(f"{API_URL}/me/tracks", headers=headers, params=params, timeout=TIMEOUT)
        r.raise_for_status()
        return r.json()

    def get_user_playlists(self, limit: int = 50) -> dict:
        """Fetch current user's playlists (GET /me/playlists)."""
        headers = self._auth_header(write=True)
        params = {"limit": min(limit, 50)}
        r = requests.get(f"{API_URL}/me/playlists", headers=headers, params=params, timeout=TIMEOUT)
        r.raise_for_status()
        return r.json()
