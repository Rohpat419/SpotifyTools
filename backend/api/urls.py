from django.urls import path
from . import views, views_auth

urlpatterns = [
    # Feature endpoints
    path("get_duplicate_tracks", views.get_duplicate_tracks),
    path("delete_duplicate_tracks", views.delete_duplicate_tracks),
    path("explicit_report", views.explicit_report),
    path("remove_tracks", views.remove_tracks),
    path("create_clean_playlist", views.create_clean_playlist),
    path("top_items", views.top_items),
    path("liked_songs", views.liked_songs),
    path("my_playlists", views.my_playlists),
    path("build_playlist", views.build_playlist),

    # Auth endpoints
    path("auth/login", views_auth.login),
    path("auth/callback", views_auth.callback),
    path("auth/status", views_auth.auth_status),
    path("auth/logout", views_auth.logout),

    # Debug
    path("debug/ping", views.ping),
]
