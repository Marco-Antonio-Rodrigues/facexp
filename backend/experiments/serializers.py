from rest_framework import serializers
from .models import Experiment, Factor, ResponseVariable, ExperimentRun


class ExperimentListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listagem de experimentos.
    """
    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    owner_name = serializers.CharField(source='owner.name', read_only=True)
    
    class Meta:
        model = Experiment
        fields = [
            'id',
            'slug',
            'title',
            'design_type',
            'status',
            'owner_email',
            'owner_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']


class ExperimentDetailSerializer(serializers.ModelSerializer):
    """
    Serializer completo para detalhes do experimento.
    """
    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    owner_name = serializers.CharField(source='owner.name', read_only=True)
    
    class Meta:
        model = Experiment
        fields = [
            'id',
            'slug',
            'title',
            'description',
            'design_type',
            'status',
            'owner',
            'owner_email',
            'owner_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'owner', 'created_at', 'updated_at']


class ExperimentCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para criação de experimentos.
    """
    
    class Meta:
        model = Experiment
        fields = [
            'slug',
            'title',
            'description',
            'design_type',
            'status',
        ]
        read_only_fields = ['slug']
    
    def create(self, validated_data):
        # O owner será definido na view
        return super().create(validated_data)


class ExperimentUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer para atualização de experimentos.
    """
    
    class Meta:
        model = Experiment
        fields = [
            'title',
            'description',
            'design_type',
            'status',
        ]


class FactorListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listagem de fatores.
    """
    
    class Meta:
        model = Factor
        fields = [
            'id',
            'name',
            'symbol',
            'data_type',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class FactorDetailSerializer(serializers.ModelSerializer):
    """
    Serializer completo para detalhes do fator.
    """
    experiment_title = serializers.CharField(source='experiment.title', read_only=True)
    experiment_slug = serializers.SlugField(source='experiment.slug', read_only=True)
    
    class Meta:
        model = Factor
        fields = [
            'id',
            'name',
            'symbol',
            'data_type',
            'precision',
            'levels_config',
            'experiment',
            'experiment_title',
            'experiment_slug',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'experiment', 'created_at', 'updated_at']


class FactorCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para criação de fatores.
    """
    
    class Meta:
        model = Factor
        fields = [
            'name',
            'symbol',
            'data_type',
            'precision',
            'levels_config',
        ]
    
    def validate_symbol(self, value):
        """
        Valida que o símbolo é único dentro do experimento.
        """
        experiment_id = self.context.get('experiment_id')
        if experiment_id and Factor.objects.filter(
            experiment_id=experiment_id,
            symbol=value
        ).exists():
            raise serializers.ValidationError(
                f'Factor with symbol "{value}" already exists in this experiment.'
            )
        return value
    
    def validate_levels_config(self, value):
        """
        Valida a estrutura do levels_config baseado no data_type.
        """
        if not isinstance(value, dict):
            raise serializers.ValidationError('levels_config must be a dictionary.')
        return value


class FactorUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer para atualização de fatores.
    """
    
    class Meta:
        model = Factor
        fields = [
            'name',
            'symbol',
            'data_type',
            'precision',
            'levels_config',
        ]
    
    def validate_symbol(self, value):
        """
        Valida que o símbolo é único dentro do experimento (exceto o próprio fator).
        """
        instance = self.instance
        if instance and Factor.objects.filter(
            experiment=instance.experiment,
            symbol=value
        ).exclude(id=instance.id).exists():
            raise serializers.ValidationError(
                f'Factor with symbol "{value}" already exists in this experiment.'
            )
        return value


class ResponseVariableListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listagem de variáveis de resposta.
    """
    
    class Meta:
        model = ResponseVariable
        fields = [
            'id',
            'name',
            'unit',
            'optimization_goal',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ResponseVariableDetailSerializer(serializers.ModelSerializer):
    """
    Serializer completo para detalhes da variável de resposta.
    """
    experiment_title = serializers.CharField(source='experiment.title', read_only=True)
    experiment_slug = serializers.SlugField(source='experiment.slug', read_only=True)
    
    class Meta:
        model = ResponseVariable
        fields = [
            'id',
            'name',
            'unit',
            'optimization_goal',
            'experiment',
            'experiment_title',
            'experiment_slug',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'experiment', 'created_at', 'updated_at']


class ResponseVariableCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para criação de variáveis de resposta.
    """
    
    class Meta:
        model = ResponseVariable
        fields = [
            'name',
            'unit',
            'optimization_goal',
        ]
    
    def validate_name(self, value):
        """
        Valida que o nome é único dentro do experimento.
        """
        experiment_id = self.context.get('experiment_id')
        if experiment_id and ResponseVariable.objects.filter(
            experiment_id=experiment_id,
            name=value
        ).exists():
            raise serializers.ValidationError(
                f'Response variable with name "{value}" already exists in this experiment.'
            )
        return value


class ResponseVariableUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer para atualização de variáveis de resposta.
    """
    
    class Meta:
        model = ResponseVariable
        fields = [
            'name',
            'unit',
            'optimization_goal',
        ]
    
    def validate_name(self, value):
        """
        Valida que o nome é único dentro do experimento (exceto a própria variável).
        """
        instance = self.instance
        if instance and ResponseVariable.objects.filter(
            experiment=instance.experiment,
            name=value
        ).exclude(id=instance.id).exists():
            raise serializers.ValidationError(
                f'Response variable with name "{value}" already exists in this experiment.'
            )
        return value


class ExperimentRunListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listagem de runs.
    """
    has_responses = serializers.ReadOnlyField()
    is_complete = serializers.ReadOnlyField()
    
    class Meta:
        model = ExperimentRun
        fields = [
            'id',
            'standard_order',
            'run_order',
            'is_center_point',
            'is_excluded',
            'has_responses',
            'is_complete',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ExperimentRunDetailSerializer(serializers.ModelSerializer):
    """
    Serializer completo para detalhes do run.
    """
    experiment_title = serializers.CharField(source='experiment.title', read_only=True)
    experiment_slug = serializers.SlugField(source='experiment.slug', read_only=True)
    has_responses = serializers.ReadOnlyField()
    is_complete = serializers.ReadOnlyField()
    
    class Meta:
        model = ExperimentRun
        fields = [
            'id',
            'standard_order',
            'run_order',
            'is_center_point',
            'factor_values',
            'response_values',
            'is_excluded',
            'experiment',
            'experiment_title',
            'experiment_slug',
            'has_responses',
            'is_complete',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'experiment', 'created_at', 'updated_at']


class ExperimentRunCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para criação de runs.
    """
    
    class Meta:
        model = ExperimentRun
        fields = [
            'standard_order',
            'run_order',
            'is_center_point',
            'factor_values',
            'response_values',
            'is_excluded',
        ]
    
    def validate_standard_order(self, value):
        """
        Valida que a standard_order é única dentro do experimento.
        """
        experiment_id = self.context.get('experiment_id')
        if experiment_id and ExperimentRun.objects.filter(
            experiment_id=experiment_id,
            standard_order=value
        ).exists():
            raise serializers.ValidationError(
                f'Run with standard_order {value} already exists in this experiment.'
            )
        return value
    
    def validate_run_order(self, value):
        """
        Valida que a run_order é única dentro do experimento.
        """
        experiment_id = self.context.get('experiment_id')
        if experiment_id and ExperimentRun.objects.filter(
            experiment_id=experiment_id,
            run_order=value
        ).exists():
            raise serializers.ValidationError(
                f'Run with run_order {value} already exists in this experiment.'
            )
        return value
    
    def validate_factor_values(self, value):
        """
        Valida a estrutura do factor_values.
        """
        if not isinstance(value, dict):
            raise serializers.ValidationError('factor_values must be a dictionary.')
        return value
    
    def validate_response_values(self, value):
        """
        Valida a estrutura do response_values.
        """
        if not isinstance(value, dict):
            raise serializers.ValidationError('response_values must be a dictionary.')
        return value


class ExperimentRunUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer para atualização de runs.
    """
    
    class Meta:
        model = ExperimentRun
        fields = [
            'standard_order',
            'run_order',
            'is_center_point',
            'factor_values',
            'response_values',
            'is_excluded',
        ]
    
    def validate_standard_order(self, value):
        """
        Valida que a standard_order é única dentro do experimento (exceto o próprio run).
        """
        instance = self.instance
        if instance and ExperimentRun.objects.filter(
            experiment=instance.experiment,
            standard_order=value
        ).exclude(id=instance.id).exists():
            raise serializers.ValidationError(
                f'Run with standard_order {value} already exists in this experiment.'
            )
        return value
    
    def validate_run_order(self, value):
        """
        Valida que a run_order é única dentro do experimento (exceto o próprio run).
        """
        instance = self.instance
        if instance and ExperimentRun.objects.filter(
            experiment=instance.experiment,
            run_order=value
        ).exclude(id=instance.id).exists():
            raise serializers.ValidationError(
                f'Run with run_order {value} already exists in this experiment.'
            )
        return value



