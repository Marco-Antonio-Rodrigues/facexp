from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from .models import CustomUser


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
    class Meta:
        model = get_user_model()
        fields = ["name", "email"]

    def validate_email(self, value):
        raise serializers.ValidationError("O email não pode ser alterado.")

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
