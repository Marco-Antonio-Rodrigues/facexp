import logging

from django.core import mail
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from users.tests.factories import CustomUserFactory


class UserTests(APITestCase):
    def setUp(self):
        # URLs
        self.user_url = reverse("users:user")
        self.login_url = reverse("users:token")
        self.refresh_token_url = reverse("users:refresh")
        self.logout_url = reverse("users:revoke")
        self.resend_confirmation_email_url = reverse("users:resend-email-confirmation")
        self.confirm_email_url = reverse("users:confirm_email")
        self.password_reset_request_url = reverse("users:password_reset_request")

        # Criar usuário ativo e inativo com factories
        self.user = CustomUserFactory(email="renan_renato_pereira@inpa.gov.br", name="Renan Renato Levi Pereira", email_confirmed=True)
        self.user.set_password("@RnP5eSmHho")
        self.user.save()

        self.user_inactive = CustomUserFactory(email="gael.henry.alves@outlook.com", name="Gael Henry Alves", email_confirmed=False)
        self.user_inactive.set_password("@k2ghRLRX9Y")
        self.user_inactive.save()

    def register_user(self, user_data, function=""):
        response = self.client.post(self.user_url, user_data)

        if response.status_code != 201:
            logging.debug(f'\n{function}: {response.content.decode("utf-8")}\n')

        return response

    def login_user(self, email, password, function=""):
        response = self.client.post(self.login_url, {"email": email, "password": password})

        if response.status_code != 200:
            logging.debug(f'\n{function}: {response.content.decode("utf-8")}\n')

        return response

    def prepare_login(self, user):
        user.is_active = True
        user.email_confirmed = True
        user.save()

        response = self.login_user(user.email, "@RnP5eSmHho", "prepare_login")
        return response.data

    def test_register_user(self):
        response = self.register_user(
            {
                "email": "userregister@example.com",
                "name": "user testador",
                "password": "@RnP5eSmHho",
            }
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(CustomUserFactory._meta.model.objects.filter(email="userregister@example.com").exists())

    def test_register_user_with_password_weak(self):
        weak_passwords = ["", "123", "12345678", "userregister@example.com", "User123"]
        for password in weak_passwords:
            response = self.register_user(
                {
                    "email": "userregister@example.com",
                    "name": "user testador",
                    "password": password,
                }
            )

            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertFalse(CustomUserFactory._meta.model.objects.filter(email="userregister@example.com").exists())

    def test_login_user(self):
        response = self.login_user(self.user.email, "@RnP5eSmHho", "test_login_user")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_inactive_user(self):
        response = self.login_user(self.user_inactive.email, "@k2ghRLRX9Y", "test_login_inactive_user")

        self.assertFalse(self.user_inactive.email_confirmed)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["message"],
            "E-mail não confirmado. Por favor, verifique seu e-mail para confirmar sua conta.",
        )

    def test_refresh_token(self):
        tokens = self.prepare_login(self.user)
        response_refresh = self.client.post(
            self.refresh_token_url,
            data={"refresh": tokens["refresh"]},
            headers={"Authorization": f"Bearer {tokens['access']}"},
        )

        if response_refresh.status_code != 200:
            logging.debug(f'\ntest_refresh_token: {response_refresh.content.decode("utf-8")}\n')

        self.assertEqual(response_refresh.status_code, status.HTTP_200_OK)
        self.assertIn("access", response_refresh.data)

    def test_logout_user(self):
        response_login = self.login_user(self.user.email, "@RnP5eSmHho", "test_logout_user")
        self.assertEqual(response_login.status_code, status.HTTP_200_OK)

        response = self.client.post(
            self.logout_url,
            data={"refresh": response_login.data["refresh"]},
            headers={"Authorization": f"Bearer {response_login.data['access']}"},
        )

        if response.status_code != 200:
            logging.debug(f'\ntest_logout_user: {response.content.decode("utf-8")}\n')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Logout realizado com sucesso. Você foi deslogado.")

    def test_confirm_email(self):
        token = self.user_inactive.confirmation_token

        response = self.client.post(self.confirm_email_url, {"token": token})

        self.user_inactive.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(self.user_inactive.email_confirmed)
        self.assertIsNone(self.user_inactive.confirmation_token)

    def test_resend_confirmation_email(self):
        mail.outbox = []
        response = self.client.post(self.resend_confirmation_email_url, {"email": self.user_inactive.email})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Email de confirmação reenviado.")
        self.assertEqual(len(mail.outbox), 1)

    def test_resend_confirmation_email_with_email_confimed(self):
        mail.outbox = []
        response = self.client.post(self.resend_confirmation_email_url, {"email": self.user.email})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(len(mail.outbox), 0)

    def test_password_reset_request(self):
        # Testando o envio do pedido de redefinição de senha
        response = self.client.post(self.password_reset_request_url, {"email": self.user.email})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Testando pedido de redefinição para um e-mail que não existe
        response_user_no_exist = self.client.post(self.password_reset_request_url, {"email": "noexist@example.com"})
        self.assertEqual(response_user_no_exist.status_code, status.HTTP_404_NOT_FOUND)

        # Testando pedido de redefinição de senha sem fornecer dados
        response_no_body = self.client.post(self.password_reset_request_url, {})
        self.assertEqual(response_no_body.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_user_with_valid_data(self):
        tokens = self.prepare_login(self.user)

        response_update = self.client.patch(
            self.user_url,
            {
                "name": "Leonardo",
                "date_birth": "24/05/2000",
                "phone_number": "(31) 9 7121-0575",
                "address": {
                    "street": "lá na esquina",
                    "number": "731",
                    "neighborhood": "Camargos",
                    "city": "Belo Horizonte",
                    "state": "MG",
                    "complement": "Teste",
                    "zip_code": "30520-420",
                },
            },
            headers={"Authorization": f"Bearer {tokens['access']}"},
            format="json",
        )

        if response_update.status_code != 200:
            logging.debug(f'\ntest_update_user_with_valid_data: {response_update.content.decode("utf-8")}\n')

        self.assertEqual(response_update.status_code, status.HTTP_200_OK)

    def test_update_user_with_invalid_data(self):
        tokens = self.prepare_login(self.user)

        response_update = self.client.patch(
            self.user_url,
            {
                "name": "",
                "atributo_que_nao_existe": "nao_existo",
                "email": "teste@.",
                "date_birth": "24/05/2050",
                "phone_number": "(00) 0 7121-0575",
                "address": {"state": "M", "complement": "Teste", "zip_code": "30520"},
            },
            headers={"Authorization": f"Bearer {tokens['access']}"},
            format="json",
        )

        self.assertEqual(response_update.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_user_address_with_field_prohibited(self):
        tokens = self.prepare_login(self.user)

        # Atualizando o endereço inicialmente
        response_update = self.client.patch(
            self.user_url,
            {
                "name": "Leonardo",
                "date_birth": "24/05/2000",
                "phone_number": "(31) 9 7121-0575",
                "address": {
                    "street": "lá na esquina",
                    "number": "731",
                    "neighborhood": "Camargos",
                    "city": "Belo Horizonte",
                    "state": "MG",
                    "complement": "Teste",
                    "zip_code": "30520-420",
                },
            },
            headers={"Authorization": f"Bearer {tokens['access']}"},
            format="json",
        )

        self.assertEqual(response_update.status_code, status.HTTP_200_OK)

        # Tentando atualizar com campos proibidos
        response_update = self.client.patch(
            self.user_url,
            {
                "address": {"user": 1, "bussiness": 2},
            },
            headers={"Authorization": f"Bearer {tokens['access']}"},
            format="json",
        )

        self.assertEqual(response_update.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_user_with_email(self):
        tokens = self.prepare_login(self.user)

        response_update = self.client.patch(
            self.user_url,
            {"email": "newmail@example.com"},
            headers={"Authorization": f"Bearer {tokens['access']}"},
            format="json",
        )
        self.assertEqual(
            response_update.status_code,
            status.HTTP_400_BAD_REQUEST,
            "Não deve ser permitido alterar o email.",
        )

    def test_update_user_with_invalid_name(self):
        tokens = self.prepare_login(self.user)

        response_update = self.client.patch(
            self.user_url,
            {"name": ""},
            headers={"Authorization": f"Bearer {tokens['access']}"},
            format="json",
        )
        self.assertNotEqual(
            response_update.status_code,
            status.HTTP_200_OK,
            "O sistema aceitou um nome inválido",
        )

    def test_update_user_with_valid_name(self):
        tokens = self.prepare_login(self.user)
        response_update = self.client.patch(
            self.user_url,
            {"name": "Leonardo"},
            headers={"Authorization": f"Bearer {tokens['access']}"},
            format="json",
        )

        if response_update.status_code != 200:
            logging.debug(f'\ntest_update_user_with_valid_name: {response_update.content.decode("utf-8")}\n')

        self.assertEqual(
            response_update.status_code,
            status.HTTP_200_OK,
            "Erro ao atualizar com o nome válido",
        )

    def test_update_user_with_invalid_birth_date(self):
        tokens = self.prepare_login(self.user)

        # Data de nascimento inválida
        response_update = self.client.patch(
            self.user_url,
            {"date_birth": "30/02/2050"},
            headers={"Authorization": f"Bearer {tokens['access']}"},
            format="json",
        )
        self.assertNotEqual(
            response_update.status_code,
            status.HTTP_200_OK,
            "O sistema aceitou uma data de nascimento inválida e que não existe.",
        )

        # Data de nascimento no futuro inválida
        response_update = self.client.patch(
            self.user_url,
            {"date_birth": "02/09/2054"},
            headers={"Authorization": f"Bearer {tokens['access']}"},
            format="json",
        )
        self.assertNotEqual(
            response_update.status_code,
            status.HTTP_200_OK,
            "O sistema aceitou uma data de nascimento inválida.",
        )

    def test_update_user_with_valid_birth_date(self):
        tokens = self.prepare_login(self.user)

        # Data de nascimento válida
        response_update = self.client.patch(
            self.user_url,
            {"date_birth": "24/05/2000"},  # Data de nascimento válida
            headers={"Authorization": f"Bearer {tokens['access']}"},
            format="json",
        )
        if response_update.status_code != 200:
            logging.debug(f'\ntest_update_user_with_valid_birth_date: {response_update.content.decode("utf-8")}\n')
        self.assertEqual(
            response_update.status_code,
            status.HTTP_200_OK,
            "Erro ao atualizar a data de nascimento válida",
        )
