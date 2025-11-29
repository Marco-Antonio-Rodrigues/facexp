import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from core.models import Address

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


class UserAddress(Address):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name="address")

    class Meta:
        verbose_name = "User Address"
        verbose_name_plural = "User Addresses"

class Transaction(models.Model):
    """Registra movimentações de saldo do usuário"""
    TRANSACTION_TYPE_CHOICES = [
        ("CREDIT_PAYMENT", "Crédito via Pagamento"),
        ("CREDIT_MANUAL", "Crédito Manual"),
        ("DEBIT_SERVICE", "Débito - Consumo de Serviço"),
        ("REFUND", "Estorno"),
    ]
    
    transaction_type = models.CharField(_("transaction type"), max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    amount = models.DecimalField(_("amount"), max_digits=10, decimal_places=2)
    description = models.CharField(_("description"), max_length=255)
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    
    # Informações administrativas para créditos manuais
    added_by = models.ForeignKey(
        "users.CustomUser", 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name="manual_transactions_added",
        help_text="Administrador que adicionou o crédito manualmente"
    )
    admin_notes = models.TextField(_("admin notes"), blank=True, help_text="Observações internas sobre a transação")
    
    class Meta:
        verbose_name = _("Transaction")
        verbose_name_plural = _("Transactions")
        ordering = ["-created_at"]
    
    def __str__(self):
        type_label = dict(self.TRANSACTION_TYPE_CHOICES).get(self.transaction_type, "")
        return f"{type_label} - R$ {self.amount} - {self.balance.user.email}"
