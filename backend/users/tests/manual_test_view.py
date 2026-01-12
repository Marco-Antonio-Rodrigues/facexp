import logging

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status

User = get_user_model()


@override_settings(EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend")
class RealEmailUserTest(TestCase):
    def setUp(self):
        self.email = "marcoantoniorodrigues200201@gmail.com"
        self.user = {
            "email": self.email,
            "password": "@Kr3of1sj40",
            "name": "Diego Caio Nelson Dias",
        }

        # views that send email
        self.user_url = reverse("users:user")

    def register_user(self, user, function=""):
        response = self.client.post(self.user_url, user)

        if response.status_code != 201:
            logging.debug(f'\n{function}: {response.content.decode("utf-8")}\n')

        return response

    def test_register_user(self):
        response = self.register_user(self.user)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email=self.user["email"]).exists())

    def test_resend_confirmation_email(self):
        self.register_user(self.user)

        response = self.client.post(self.resend_confirmation_email_url, {"email": self.user["email"]})

        if response.status_code != 200:
            logging.debug(f'\ntest_resend_confirmation_email: {response.content.decode("utf-8")}\n')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Email de confirmação reenviado.")
