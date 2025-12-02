import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .managers import CustomUserManager


class CustomUser(AbstractUser):
    email = models.EmailField(_("email address"), unique=True)
    name = models.CharField(_("name"), max_length=50)
    phone_number = models.CharField(_("phone_number"), max_length=20, null=True)
    date_birth = models.DateField(_("date birth"), null=True)
    email_confirmed = models.BooleanField(default=False)
    confirmation_token = models.UUIDField(default=uuid.uuid4, editable=False, null=True, blank=True)
    confirmation_token_created_at = models.DateTimeField(default=timezone.now)
    
    # Campos para login sem senha (código por email)
    login_code = models.CharField(_("login code"), max_length=6, null=True, blank=True)
    login_code_expires_at = models.DateTimeField(_("login code expires at"), null=True, blank=True)

    username = None
    first_name: None
    last_name: None
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    def __str__(self):
        return self.email