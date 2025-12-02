from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from django import forms
from decimal import Decimal

from .forms import CustomUserChangeForm, CustomUserCreationForm
from .models import CustomUser


class ManualCreditForm(forms.Form):
    """Formulário para adicionar crédito manual"""
    user = forms.ModelChoiceField(
        queryset=CustomUser.objects.all(),
        label="Usuário",
        help_text="Selecione o usuário que receberá o crédito"
    )
    amount = forms.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal('0.01'),
        label="Valor (R$)",
        help_text="Valor a ser creditado"
    )
    description = forms.CharField(
        max_length=255,
        label="Descrição",
        help_text="Motivo do crédito manual"
    )
    admin_notes = forms.CharField(
        widget=forms.Textarea(attrs={'rows': 3}),
        required=False,
        label="Observações Internas",
        help_text="Anotações visíveis apenas para administradores"
    )

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    add_form = CustomUserCreationForm
    form = CustomUserChangeForm
    model = CustomUser
    list_display = (
        "email",
        "name",
        "is_staff",
        "is_active",
    )
    list_filter = (
        "email",
        "is_staff",
        "is_active",
    )
    fieldsets = (
        (None, {"fields": ("email", "name", "email_confirmed")}),
        (
            "Permissions",
            {"fields": ("is_staff", "is_active")},
        ),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "is_staff",
                    "is_active",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
    )
    search_fields = ("email",)
    ordering = ("email",)
