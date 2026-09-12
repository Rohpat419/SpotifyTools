from datetime import timedelta
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import AuthState, LoginHandoff, UserSession


class Command(BaseCommand):
    help = "Delete expired sessions, OAuth states, and login handoffs. Schedule daily."

    def handle(self, *args, **options):
        now = timezone.now()
        UserSession.objects.filter(created_at__lte=now-timedelta(days=settings.SESSION_MAX_AGE_DAYS)).delete()
        AuthState.objects.filter(created_at__lte=now-timedelta(minutes=10)).delete()
        LoginHandoff.objects.filter(created_at__lte=now-timedelta(seconds=60)).delete()
        self.stdout.write("Expired authentication records removed.")
