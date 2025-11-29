from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


class CustomPasswordValidator:
    def validate(self, password, user=None):
        if not any(char.islower() for char in password):
            raise ValidationError(_("A senha deve conter pelo menos uma letra minúscula."))
        if not any(char.isupper() for char in password):
            raise ValidationError(_("A senha deve conter pelo menos uma letra maiúscula."))
        if not any(char.isdigit() for char in password):
            raise ValidationError(_("A senha deve conter pelo menos um número."))

    def get_help_text(self):
        return _("Sua senha deve conter pelo menos uma letra minúscula, uma letra maiúscula e um número.")
