from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema

from .models import Experiment, Factor, ResponseVariable, ExperimentRun
from .serializers import (
    ExperimentListSerializer,
    ExperimentDetailSerializer,
    ExperimentCreateSerializer,
    ExperimentUpdateSerializer,
    FactorListSerializer,
    FactorDetailSerializer,
    FactorCreateSerializer,
    FactorUpdateSerializer,
    ResponseVariableListSerializer,
    ResponseVariableDetailSerializer,
    ResponseVariableCreateSerializer,
    ResponseVariableUpdateSerializer,
    ExperimentRunListSerializer,
    ExperimentRunDetailSerializer,
    ExperimentRunCreateSerializer,
    ExperimentRunUpdateSerializer,
)


@extend_schema(tags=['Experiments'])
class ExperimentViewSet(viewsets.ModelViewSet):
    """
    ViewSet para CRUD completo de Experiments.
    
    list: Lista todos os experimentos do usuário autenticado
    retrieve: Retorna detalhes de um experimento específico
    create: Cria um novo experimento
    update: Atualiza completamente um experimento
    partial_update: Atualiza parcialmente um experimento
    destroy: Remove um experimento
    """
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'slug'
    
    def get_queryset(self):
        """
        Retorna apenas os experimentos do usuário autenticado.
        Admins podem ver todos os experimentos.
        """
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return Experiment.objects.all()
        return Experiment.objects.filter(owner=user)
    
    def get_serializer_class(self):
        """
        Usa serializers diferentes baseado na action.
        """
        if self.action == 'list':
            return ExperimentListSerializer
        elif self.action == 'create':
            return ExperimentCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ExperimentUpdateSerializer
        return ExperimentDetailSerializer
    
    def perform_create(self, serializer):
        """
        Define o owner como o usuário autenticado ao criar.
        """
        serializer.save(owner=self.request.user)
    
    def perform_update(self, serializer):
        """
        Atualiza o experimento.
        """
        serializer.save()
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, slug=None):
        """
        Duplica um experimento existente.
        """
        experiment = self.get_object()
        
        # Cria uma cópia do experimento
        new_experiment = Experiment.objects.create(
            title=f"{experiment.title} (Copy)",
            description=experiment.description,
            design_type=experiment.design_type,
            status=Experiment.Status.DRAFT,  # Reset para draft
            owner=request.user
        )
        
        serializer = ExperimentDetailSerializer(new_experiment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def archive(self, request, slug=None):
        """
        Arquiva um experimento (muda status para archived).
        """
        experiment = self.get_object()
        experiment.status = Experiment.Status.ARCHIVED
        experiment.save()
        
        serializer = ExperimentDetailSerializer(experiment)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Busca experimentos por título ou descrição.
        """
        query = request.query_params.get('q', '')
        
        if not query:
            return Response(
                {'detail': 'Query parameter "q" is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(
            Q(title__icontains=query) | Q(description__icontains=query)
        )
        
        serializer = ExperimentListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_status(self, request):
        """
        Filtra experimentos por status.
        """
        status_param = request.query_params.get('status', '')
        
        if not status_param:
            return Response(
                {'detail': 'Query parameter "status" is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(status=status_param)
        serializer = ExperimentListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def generate_runs(self, request, slug=None):
        """
        Gera as corridas experimentais baseado nos fatores cadastrados.
        """
        import random
        from itertools import product
        
        experiment = self.get_object()
        
        # Verifica se já existem runs
        existing_runs = experiment.runs.count()
        if existing_runs > 0:
            return Response(
                {'detail': f'Experiment already has {existing_runs} runs. Delete them first to regenerate.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Busca todos os fatores do experimento
        factors = experiment.factors.all()
        
        if not factors.exists():
            return Response(
                {'detail': 'Experiment must have at least one factor to generate runs.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Prepara os níveis de cada fator
        factor_levels = []
        for factor in factors:
            if factor.data_type == Factor.DataType.QUANTITATIVE:
                # Quantitativo: array de números ou formato legado {low, center, high}
                if isinstance(factor.levels_config, list):
                    levels = factor.levels_config
                else:
                    # Formato legado
                    levels = [
                        factor.levels_config['low'],
                        factor.levels_config['center'],
                        factor.levels_config['high']
                    ]
            else:
                # Categórico: array direto ou formato legado {'levels': [...]}
                levels = factor.levels_config if isinstance(factor.levels_config, list) else factor.levels_config.get('levels', [])
            
            factor_levels.append((factor.id, levels))
        
        # Gera todas as combinações (fatorial completo)
        # Para outros designs, implementar lógica específica
        combinations = list(product(*[levels for _, levels in factor_levels]))
        
        # Cria os runs com réplicas
        runs_created = []
        replicates = experiment.replicates if experiment.replicates > 0 else 1
        total_runs = len(combinations) * replicates
        run_orders = list(range(1, total_runs + 1))
        random.shuffle(run_orders)  # Randomiza a ordem de execução
        
        run_index = 0
        for std_order, combination in enumerate(combinations, start=1):
            # Cria réplicas para esta combinação
            for replicate_num in range(1, replicates + 1):
                # Monta o dicionário de valores dos fatores
                factor_values = {}
                for (factor_id, _), value in zip(factor_levels, combination):
                    factor_values[str(factor_id)] = value
                
                # Verifica se é ponto central (todos os fatores no nível médio/central)
                is_center = all(
                    (isinstance(factor.levels_config, list) and 
                     len(factor.levels_config) % 2 == 1 and 
                     factor_values[str(fid)] == factor.levels_config[len(factor.levels_config) // 2]) or
                    (isinstance(factor.levels_config, dict) and 
                     factor_values[str(fid)] == factor.levels_config.get('center'))
                    for fid, factor in [(f.id, f) for f in factors]
                    if factor.data_type == Factor.DataType.QUANTITATIVE
                )
                
                run = ExperimentRun.objects.create(
                    experiment=experiment,
                    standard_order=std_order,
                    run_order=run_orders[run_index],
                    replicate_number=replicate_num,
                    is_center_point=is_center,
                    factor_values=factor_values,
                    response_values={}
                )
                runs_created.append(run)
                run_index += 1
        
        # Atualiza status do experimento para DESIGN_READY
        if experiment.status == Experiment.Status.DRAFT:
            experiment.status = Experiment.Status.DESIGN_READY
            experiment.save()
        
        serializer = ExperimentRunListSerializer(runs_created, many=True)
        return Response({
            'detail': f'{len(runs_created)} runs generated successfully.',
            'runs': serializer.data
        }, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Experiments'])
class FactorViewSet(viewsets.ModelViewSet):
    """
    ViewSet para CRUD completo de Factors.
    
    Fatores são sempre associados a um experimento específico.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Retorna fatores do experimento especificado.
        Filtra por experimentos que o usuário possui.
        """
        experiment_slug = self.kwargs.get('experiment_slug')
        
        # Verifica se o usuário tem acesso ao experimento
        experiment = get_object_or_404(
            Experiment,
            slug=experiment_slug,
            owner=self.request.user
        )
        
        return Factor.objects.filter(experiment=experiment)
    
    def get_serializer_class(self):
        """
        Usa serializers diferentes baseado na action.
        """
        if self.action == 'list':
            return FactorListSerializer
        elif self.action == 'create':
            return FactorCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return FactorUpdateSerializer
        return FactorDetailSerializer
    
    def get_serializer_context(self):
        """
        Adiciona experiment_id ao contexto do serializer.
        """
        context = super().get_serializer_context()
        experiment_slug = self.kwargs.get('experiment_slug')
        
        if experiment_slug:
            experiment = get_object_or_404(
                Experiment,
                slug=experiment_slug,
                owner=self.request.user
            )
            context['experiment_id'] = experiment.id
        
        return context
    
    def perform_create(self, serializer):
        """
        Cria o fator associado ao experimento.
        """
        experiment_slug = self.kwargs.get('experiment_slug')
        experiment = get_object_or_404(
            Experiment,
            slug=experiment_slug,
            owner=self.request.user
        )
        serializer.save(experiment=experiment)
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, experiment_slug=None, pk=None):
        """
        Duplica um fator dentro do mesmo experimento.
        """
        factor = self.get_object()
        
        # Gera um novo símbolo único
        base_symbol = factor.symbol
        new_symbol = f"{base_symbol}_copy"
        counter = 1
        
        while Factor.objects.filter(
            experiment=factor.experiment,
            symbol=new_symbol
        ).exists():
            new_symbol = f"{base_symbol}_copy_{counter}"
            counter += 1
        
        # Cria uma cópia
        new_factor = Factor.objects.create(
            name=f"{factor.name} (Copy)",
            symbol=new_symbol,
            data_type=factor.data_type,
            precision=factor.precision,
            levels_config=factor.levels_config.copy(),
            experiment=factor.experiment
        )
        
        serializer = FactorDetailSerializer(new_factor)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'])
    def bulk_create(self, request, experiment_slug=None):
        """
        Cria múltiplos fatores de uma vez.
        Espera uma lista de fatores no body.
        """
        experiment = get_object_or_404(
            Experiment,
            slug=experiment_slug,
            owner=request.user
        )
        
        factors_data = request.data
        if not isinstance(factors_data, list):
            return Response(
                {'detail': 'Expected a list of factors.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created_factors = []
        errors = []
        
        for idx, factor_data in enumerate(factors_data):
            serializer = FactorCreateSerializer(
                data=factor_data,
                context={'experiment_id': experiment.id}
            )
            
            if serializer.is_valid():
                factor = serializer.save(experiment=experiment)
                created_factors.append(factor)
            else:
                errors.append({
                    'index': idx,
                    'data': factor_data,
                    'errors': serializer.errors
                })
        
        if errors:
            return Response(
                {
                    'created': len(created_factors),
                    'errors': errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = FactorDetailSerializer(created_factors, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Experiments'])
class ResponseVariableViewSet(viewsets.ModelViewSet):
    """
    ViewSet para CRUD completo de Response Variables.
    
    Variáveis de resposta são sempre associadas a um experimento específico.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Retorna variáveis de resposta do experimento especificado.
        Filtra por experimentos que o usuário possui.
        """
        experiment_slug = self.kwargs.get('experiment_slug')
        
        # Verifica se o usuário tem acesso ao experimento
        experiment = get_object_or_404(
            Experiment,
            slug=experiment_slug,
            owner=self.request.user
        )
        
        return ResponseVariable.objects.filter(experiment=experiment)
    
    def get_serializer_class(self):
        """
        Usa serializers diferentes baseado na action.
        """
        if self.action == 'list':
            return ResponseVariableListSerializer
        elif self.action == 'create':
            return ResponseVariableCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ResponseVariableUpdateSerializer
        return ResponseVariableDetailSerializer
    
    def get_serializer_context(self):
        """
        Adiciona experiment_id ao contexto do serializer.
        """
        context = super().get_serializer_context()
        experiment_slug = self.kwargs.get('experiment_slug')
        
        if experiment_slug:
            experiment = get_object_or_404(
                Experiment,
                slug=experiment_slug,
                owner=self.request.user
            )
            context['experiment_id'] = experiment.id
        
        return context
    
    def perform_create(self, serializer):
        """
        Cria a variável de resposta associada ao experimento.
        """
        experiment_slug = self.kwargs.get('experiment_slug')
        experiment = get_object_or_404(
            Experiment,
            slug=experiment_slug,
            owner=self.request.user
        )
        serializer.save(experiment=experiment)
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, experiment_slug=None, pk=None):
        """
        Duplica uma variável de resposta dentro do mesmo experimento.
        """
        response_var = self.get_object()
        
        # Gera um novo nome único
        base_name = response_var.name
        new_name = f"{base_name} (Copy)"
        counter = 1
        
        while ResponseVariable.objects.filter(
            experiment=response_var.experiment,
            name=new_name
        ).exists():
            new_name = f"{base_name} (Copy {counter})"
            counter += 1
        
        # Cria uma cópia
        new_response_var = ResponseVariable.objects.create(
            name=new_name,
            unit=response_var.unit,
            optimization_goal=response_var.optimization_goal,
            experiment=response_var.experiment
        )
        
        serializer = ResponseVariableDetailSerializer(new_response_var)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'])
    def bulk_create(self, request, experiment_slug=None):
        """
        Cria múltiplas variáveis de resposta de uma vez.
        Espera uma lista de variáveis no body.
        """
        experiment = get_object_or_404(
            Experiment,
            slug=experiment_slug,
            owner=request.user
        )
        
        response_vars_data = request.data
        if not isinstance(response_vars_data, list):
            return Response(
                {'detail': 'Expected a list of response variables.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created_response_vars = []
        errors = []
        
        for idx, response_var_data in enumerate(response_vars_data):
            serializer = ResponseVariableCreateSerializer(
                data=response_var_data,
                context={'experiment_id': experiment.id}
            )
            
            if serializer.is_valid():
                response_var = serializer.save(experiment=experiment)
                created_response_vars.append(response_var)
            else:
                errors.append({
                    'index': idx,
                    'data': response_var_data,
                    'errors': serializer.errors
                })
        
        if errors:
            return Response(
                {
                    'created': len(created_response_vars),
                    'errors': errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ResponseVariableDetailSerializer(created_response_vars, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Experiments'])
class ExperimentRunViewSet(viewsets.ModelViewSet):
    """
    ViewSet para CRUD completo de Experiment Runs.
    
    Runs são sempre associados a um experimento específico.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Retorna runs do experimento especificado.
        Filtra por experimentos que o usuário possui.
        """
        experiment_slug = self.kwargs.get('experiment_slug')
        
        # Verifica se o usuário tem acesso ao experimento
        experiment = get_object_or_404(
            Experiment,
            slug=experiment_slug,
            owner=self.request.user
        )
        
        return ExperimentRun.objects.filter(experiment=experiment)
    
    def get_serializer_class(self):
        """
        Usa serializers diferentes baseado na action.
        """
        if self.action == 'list':
            return ExperimentRunListSerializer
        elif self.action == 'create':
            return ExperimentRunCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ExperimentRunUpdateSerializer
        return ExperimentRunDetailSerializer
    
    def get_serializer_context(self):
        """
        Adiciona experiment_id ao contexto do serializer.
        """
        context = super().get_serializer_context()
        experiment_slug = self.kwargs.get('experiment_slug')
        
        if experiment_slug:
            experiment = get_object_or_404(
                Experiment,
                slug=experiment_slug,
                owner=self.request.user
            )
            context['experiment_id'] = experiment.id
        
        return context
    
    def perform_create(self, serializer):
        """
        Cria o run associado ao experimento.
        """
        experiment_slug = self.kwargs.get('experiment_slug')
        experiment = get_object_or_404(
            Experiment,
            slug=experiment_slug,
            owner=self.request.user
        )
        serializer.save(experiment=experiment)
    
    @action(detail=True, methods=['post'])
    def toggle_exclude(self, request, experiment_slug=None, pk=None):
        """
        Alterna o status de exclusão do run.
        """
        run = self.get_object()
        run.is_excluded = not run.is_excluded
        run.save()
        
        serializer = ExperimentRunDetailSerializer(run)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def update_responses(self, request, experiment_slug=None, pk=None):
        """
        Atualiza apenas os valores de resposta de um run.
        """
        run = self.get_object()
        response_values = request.data.get('response_values', {})
        
        if not isinstance(response_values, dict):
            return Response(
                {'detail': 'response_values must be a dictionary.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Atualiza apenas response_values
        run.response_values = response_values
        run.save()
        
        serializer = ExperimentRunDetailSerializer(run)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def bulk_create(self, request, experiment_slug=None):
        """
        Cria múltiplos runs de uma vez.
        Espera uma lista de runs no body.
        """
        experiment = get_object_or_404(
            Experiment,
            slug=experiment_slug,
            owner=request.user
        )
        
        runs_data = request.data
        if not isinstance(runs_data, list):
            return Response(
                {'detail': 'Expected a list of runs.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created_runs = []
        errors = []
        
        for idx, run_data in enumerate(runs_data):
            serializer = ExperimentRunCreateSerializer(
                data=run_data,
                context={'experiment_id': experiment.id}
            )
            
            if serializer.is_valid():
                run = serializer.save(experiment=experiment)
                created_runs.append(run)
            else:
                errors.append({
                    'index': idx,
                    'data': run_data,
                    'errors': serializer.errors
                })
        
        if errors:
            return Response(
                {
                    'created': len(created_runs),
                    'errors': errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ExperimentRunDetailSerializer(created_runs, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['patch'])
    def bulk_update_responses(self, request, experiment_slug=None):
        """
        Atualiza valores de resposta de múltiplos runs de uma vez.
        Espera uma lista no formato: [{"id": 1, "response_values": {...}}, ...]
        """
        experiment = get_object_or_404(
            Experiment,
            slug=experiment_slug,
            owner=request.user
        )
        
        updates_data = request.data
        if not isinstance(updates_data, list):
            return Response(
                {'detail': 'Expected a list of updates.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        updated_runs = []
        errors = []
        
        for idx, update_data in enumerate(updates_data):
            run_id = update_data.get('id')
            response_values = update_data.get('response_values', {})
            
            if not run_id:
                errors.append({
                    'index': idx,
                    'error': 'Missing run id'
                })
                continue
            
            try:
                run = ExperimentRun.objects.get(
                    id=run_id,
                    experiment=experiment
                )
                run.response_values = response_values
                run.save()
                updated_runs.append(run)
            except ExperimentRun.DoesNotExist:
                errors.append({
                    'index': idx,
                    'id': run_id,
                    'error': 'Run not found'
                })
        
        if errors:
            return Response(
                {
                    'updated': len(updated_runs),
                    'errors': errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ExperimentRunDetailSerializer(updated_runs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def incomplete(self, request, experiment_slug=None):
        """
        Lista apenas runs incompletos (sem todas as respostas preenchidas).
        """
        queryset = self.get_queryset()
        incomplete_runs = [run for run in queryset if not run.is_complete]
        
        serializer = ExperimentRunListSerializer(incomplete_runs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def excluded(self, request, experiment_slug=None):
        """
        Lista apenas runs excluídos.
        """
        queryset = self.get_queryset().filter(is_excluded=True)
        serializer = ExperimentRunListSerializer(queryset, many=True)
        return Response(serializer.data)




