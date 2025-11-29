from django.core.mail import EmailMessage
from django.template.loader import render_to_string

from core import settings


def send_email_confirmation(confirmation_token: str, email: str) -> None:
    # Usa FRONTEND_URL ou fallback para localhost
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    confirmation_url = f"{frontend_url}/confirm-email/?token={confirmation_token}"

    try:
        email_html = render_to_string("users/confirmation_email.html", {"confirmation_url": confirmation_url})
        email_message = EmailMessage("Confirme seu email", email_html, settings.EMAIL_HOST_USER, [email])
        email_message.content_subtype = "html"
        email_message.send()
    except Exception as e:
        # Log do erro para debug
        print(f"Erro ao enviar email de confirmação: {str(e)}")
        raise
