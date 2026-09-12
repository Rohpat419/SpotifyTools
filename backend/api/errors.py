"""Public error contract. Never serialize upstream bodies or exception strings."""
import logging
import requests
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


class SessionExpired(APIException):
    status_code = 401
    default_detail = "Session expired. Please reconnect Spotify."
    default_code = "session_expired"


class PlaylistChanged(APIException):
    status_code = 409
    default_detail = "The playlist changed since your scan. Scan again before removing tracks."
    default_code = "playlist_changed"


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        detail = response.data.get("detail") if isinstance(response.data, dict) else None
        response.data = {"detail": str(detail or "Invalid input. Check the supplied fields."),
                         "code": getattr(exc, "default_code", "invalid_input"),
                         **({"fields": response.data} if detail is None else {})}
        return response
    headers = {}
    if isinstance(exc, requests.RequestException):
        upstream = exc.response
        upstream_status = upstream.status_code if upstream is not None else None
        code = upstream_status if upstream_status in (401, 403, 404, 429) else 502
        if isinstance(exc, (requests.Timeout, requests.ConnectionError)) or upstream_status == 503:
            code = 503
        if code == 429 and upstream is not None:
            retry = upstream.headers.get("Retry-After", "")
            if retry.isdigit():
                headers["Retry-After"] = retry
        messages = {401: "Spotify authorization expired. Please reconnect.",
                    403: "Spotify denied access. Check account approval and playlist permissions.",
                    404: "The requested resource was not found or is unavailable to this account.",
                    429: "Spotify or the lyrics service is rate limiting requests. Please try again later.",
                    502: "An upstream service failed. Please try again later.",
                    503: "An upstream service is temporarily unavailable. Please try again later."}
        return Response({"detail": messages[code], "code": f"upstream_{code}"}, status=code, headers=headers)
    logger.error("Unhandled API error in %s (%s)", context["view"].__class__.__name__, type(exc).__name__)
    return Response({"detail": "An unexpected server error occurred.", "code": "internal_error"}, status=500)
