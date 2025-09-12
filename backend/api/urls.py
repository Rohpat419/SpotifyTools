from django.urls import path
from . import views, views_auth

urlpatterns = [
    path("get_duplicate_tracks", views.get_duplicate_tracks),
    path("delete_duplicate_tracks", views.delete_duplicate_tracks),
    path("explicit_report", views.explicit_report),
    path("api/remove_tracks", views.remove_tracks),
    path("create_clean_playlist", views.create_clean_playlist),
    path("top_items", views.top_items),
    path("auth/login", views_auth.login),
    path("auth/callback", views_auth.callback),
    path("auth/success", views_auth.auth_success, name="auth_success"),
    path("debug/ping", views.ping),
]
