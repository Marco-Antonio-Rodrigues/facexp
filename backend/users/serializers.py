from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from core.validators import validate_zip_code

from .models import CustomUser, UserAddress


class GetUserAddressSerializer(serializers.ModelSerializer):
    """Class for getting user addresse"""

    class Meta:
        model = UserAddress
        exclude = ("id", "user")


class UserAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAddress
        exclude = ("id",)

    def update(self, instance, validated_data):
        if validated_data.get("user"):
            raise serializers.ValidationError("Você não pode alterar user.")
        return super().update(instance, validated_data)

    def validate_zip_code(self, value):
        return validate_zip_code(value)


class UserRegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ["name", "email"]

    def validate_name(self, value):
        if len(value) < 5:
            raise serializers.ValidationError("Nome deve ter pelo menos 5 caracteres")
        return value

    def create(self, validated_data):
        user = CustomUser(**validated_data)
        # Usuário criado sem senha - será definida após confirmar email
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    address = GetUserAddressSerializer(read_only=True)
    balance = serializers.SerializerMethodField()

    class Meta:
        model = get_user_model()
        fields = ["name", "email", "date_birth", "phone_number", "address", "balance"]
    
    def get_balance(self, obj):
        """Retorna o saldo do usuário"""
        try:
            return str(obj.user_balance.remaining)
        except AttributeError:
            return "0.00"

    def validate_email(self, value):
        raise serializers.ValidationError("O email não pode ser alterado.")

    def validate_date_birth(self, value):
        if value >= timezone.now().date():
            raise serializers.ValidationError("A data de nascimento não pode ser maior que a data de hoje.")
        return value


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class ResendConfirmEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()


class RequestLoginCodeSerializer(serializers.Serializer):
    """Serializer para solicitar código de login via email"""
    email = serializers.EmailField()


class LoginWithCodeSerializer(serializers.Serializer):
    """Serializer para fazer login com código recebido por email"""
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6, min_length=6)


class TransactionSerializer(serializers.Serializer):
    """Serializer para histórico de transações"""
    id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    description = serializers.CharField()
    service_name = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField()
    
    def get_service_name(self, obj):
        """Retorna o nome do serviço se houver"""
        return obj.service.name if obj.service else None
