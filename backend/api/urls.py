from django.urls import path
from . import views, views_auth
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema")),
    path("api/", include("api.urls")),
    path("get_duplicate_tracks", views.get_duplicate_tracks),
    path("delete_duplicate_tracks", views.delete_duplicate_tracks),
    path("explicit_report", views.explicit_report),
    path("create_clean_playlist", views.create_clean_playlist),
    path("top_items", views.top_items),
    path("auth/login", views_auth.login),
    path("auth/callback", views_auth.callback),
    path("auth/success", views_auth.auth_success, name="auth_success"),
    path("debug/ping", views.ping),
]
