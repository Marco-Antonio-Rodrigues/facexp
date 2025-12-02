import uuid
from datetime import timedelta
from random import randint

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import transaction
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.html import strip_tags
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken, TokenError

from users.serializers import (
    LoginSerializer,
    LoginWithCodeSerializer,
    RequestLoginCodeSerializer,
    ResendConfirmEmailSerializer,
    UserRegisterSerializer,
    UserSerializer,
)

from .models import CustomUser
from .utils import send_email_confirmation


class UserView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request: Request):
        """Return data from user."""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def post(self, request: Request):
        """Create a new user."""
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            send_email_confirmation(user.confirmation_token, user.email)
            return Response(serializer.data, status=201)
        
        # Flatten errors para o frontend
        error_messages = []
        for field, errors in serializer.errors.items():
            for error in errors:
                if field == 'non_field_errors':
                    error_messages.append(str(error))
                else:
                    error_messages.append(f"{field}: {error}")
        
        return Response(
            {"message": " ".join(error_messages) if error_messages else "Erro ao criar conta"},
            status=400
        )

    def patch(self, request: Request):
        """Update user data."""
        user = request.user
        with transaction.atomic():
            user_serializer = UserSerializer(user, data=request.data, partial=True)

            if not user_serializer.is_valid():
                return Response({"message": user_serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

            user_serializer.save()
        return Response(user_serializer.data)


@api_view(["POST"])
def login(request: Request):
    """Login apenas para superusers (admins) com email e senha"""
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user: CustomUser | None = authenticate(
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )
        if user:
            # Apenas superusers podem fazer login com senha
            if not user.is_superuser:
                return Response(
                    {"message": "Login com senha disponível apenas para administradores. Use login com código."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            
            if user.email_confirmed:
                refresh = RefreshToken.for_user(user)
                return Response(
                    {"access": str(refresh.access_token), "refresh": str(refresh)},
                    status=status.HTTP_200_OK,
                )
            else:
                user.confirmation_token = uuid.uuid4()
                user.save(update_fields=["confirmation_token"])
                send_email_confirmation(user.confirmation_token, user.email)
                return Response(
                    {"message": "E-mail não confirmado. Por favor, verifique seu e-mail para confirmar sua conta."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
        else:
            return Response(
                {"message": "E-mail ou senha incorretos."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
    else:
        return Response({"message": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
def request_login_code(request: Request):
    """Solicita código de login via email (para usuários normais)"""
    serializer = RequestLoginCodeSerializer(data=request.data)
    if serializer.is_valid():
        try:
            user = CustomUser.objects.get(email=serializer.validated_data["email"])
        except CustomUser.DoesNotExist:
            return Response({"message": "Usuário não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if not user.email_confirmed:
            return Response(
                {"message": "Email não confirmado. Por favor, confirme seu email primeiro."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Gera código de 6 dígitos
        login_code = str(randint(100000, 999999))
        user.login_code = login_code
        user.login_code_expires_at = timezone.now() + timedelta(minutes=30)
        user.save(update_fields=["login_code", "login_code_expires_at"])

        # Envia email com o código
        subject = "Seu código de login"
        message = f"Seu código de login é: {login_code}\n\nEste código expira em 30 minutos."
        
        try:
            send_mail(
                subject,
                message,
                settings.EMAIL_HOST_USER,
                [user.email],
                fail_silently=False,
            )
        except Exception as e:
            return Response(
                {"message": "Falha ao enviar email.", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"message": "Código de login enviado para seu email."},
            status=status.HTTP_200_OK,
        )
    else:
        return Response({"message": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
def login_with_code(request: Request):
    """Faz login usando código recebido por email"""
    serializer = LoginWithCodeSerializer(data=request.data)
    if serializer.is_valid():
        try:
            user = CustomUser.objects.get(email=serializer.validated_data["email"])
        except CustomUser.DoesNotExist:
            return Response({"message": "Usuário não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        # Verifica se o código está correto
        if user.login_code != serializer.validated_data["code"]:
            return Response(
                {"message": "Código inválido."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Verifica se o código não expirou
        if not user.login_code_expires_at or timezone.now() > user.login_code_expires_at:
            return Response(
                {"message": "Código expirado. Solicite um novo código."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Limpa o código após uso
        user.login_code = None
        user.login_code_expires_at = None
        user.save(update_fields=["login_code", "login_code_expires_at"])

        # Gera tokens JWT
        refresh = RefreshToken.for_user(user)
        return Response(
            {"access": str(refresh.access_token), "refresh": str(refresh)},
            status=status.HTTP_200_OK,
        )
    else:
        return Response({"message": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request: Request):
    refresh_token = request.data.get("refresh")

    if not refresh_token:
        return Response(
            {"message": "Token refresh não fornecido."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        decoded_token = RefreshToken(refresh_token)
        decoded_token.blacklist()
    except TokenError:
        # Se o token já está na blacklist ou é inválido, considerar logout bem-sucedido
        pass

    return Response(
        {"message": "Logout realizado com sucesso. Você foi deslogado."},
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
def resend_confirmation_email(request: Request):
    serializer = ResendConfirmEmailSerializer(data=request.data)
    if serializer.is_valid():
        try:
            user = CustomUser.objects.get(email=serializer.data["email"])
        except CustomUser.DoesNotExist:
            return Response({"message": "Usuário não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if user.email_confirmed:
            return Response(
                {"message": "Este email já foi confirmado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.confirmation_token = uuid.uuid4()
        user.save(update_fields=["confirmation_token"])

        try:
            send_email_confirmation(user.confirmation_token, user.email)
        except Exception as e:
            return Response(
                {"message": "Falha ao enviar email.", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"message": "Email de confirmação reenviado."}, status=status.HTTP_200_OK)
    else:
        return Response({"message": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
def confirm_email(request: Request):
    """Confirma email do usuário e ativa a conta automaticamente"""
    token = request.data.get("token")
    try:
        user = CustomUser.objects.get(confirmation_token=token, email_confirmed=False)
        user.email_confirmed = True
        user.is_active = True
        user.confirmation_token = None
        user.save()
        
        return Response(
            {"message": "Email confirmado com sucesso! Sua conta está ativa."},
            status=status.HTTP_200_OK
        )
    except CustomUser.DoesNotExist:
        return Response(
            {"message": "Token inválido ou usuário não encontrado."},
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["POST"])
def password_reset_request(request: Request):
    email = request.data.get("email")
    if not email:
        return Response({"message": "Email é obrigatório."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = CustomUser.objects.get(email=email)
    except CustomUser.DoesNotExist:
        return Response({"message": "Usuário não encontrado."}, status=status.HTTP_404_NOT_FOUND)

    token = default_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    reset_link = f"{settings.FRONTEND_URL}/reset-password/?uid={force_str(uid)}&token={token}"

    subject = "Redefinição de Senha"
    html_message = render_to_string("users/password_reset_email.html", {"reset_link": reset_link})
    plain_message = strip_tags(html_message)

    send_mail(
        subject,
        plain_message,
        settings.EMAIL_HOST_USER,
        [user.email],
        html_message=html_message,
        fail_silently=False,
    )

    return Response({"message": "Email de redefinição de senha enviado."}, status=status.HTTP_200_OK)


@api_view(["POST"])
def password_reset_confirm(request: Request):
    uid = request.data.get("uid")
    token = request.data.get("token")
    new_password = request.data.get("new_password")

    if not all([uid, token, new_password]):
        return Response({"message": "Informações incompletas."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        uid = force_str(urlsafe_base64_decode(uid))
        user = CustomUser.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, CustomUser.DoesNotExist):
        user = None

    if user is not None and default_token_generator.check_token(user, token):
        user.set_password(new_password)
        user.save()
        return Response({"message": "Senha redefinida com sucesso."}, status=status.HTTP_200_OK)
    else:
        return Response(
            {"message": "Token inválido ou expirado."},
            status=status.HTTP_400_BAD_REQUEST,
        )
