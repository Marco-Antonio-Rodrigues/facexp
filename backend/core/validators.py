import re

from rest_framework import serializers


def validate_zip_code(value):
    pattern = r"^\d{5}-\d{3}$"  # Padrão para o formato 'xxxxx-xxx'
    if not re.match(pattern, value):
        raise serializers.ValidationError("Formato de CEP inválido. O formato correto é 'xxxxx-xxx'.")
    return value
