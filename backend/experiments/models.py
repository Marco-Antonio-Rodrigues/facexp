from django.db import models
from django.utils.text import slugify
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class Experiment(models.Model):
    """
    Modelo para armazenar experimentos fatoriais.
    """
    
    class DesignType(models.TextChoices):
        FULL_FACTORIAL = 'full_factorial', _('Full Factorial')
        FRACTIONAL_FACTORIAL = 'fractional_factorial', _('Fractional Factorial')
        PLACKETT_BURMAN = 'plackett_burman', _('Plackett-Burman')
        BOX_BEHNKEN = 'box_behnken', _('Box-Behnken')
        CENTRAL_COMPOSITE = 'central_composite', _('Central Composite')
    
    class Status(models.TextChoices):
        DRAFT = 'draft', _('Draft')
        DESIGN_READY = 'design_ready', _('Design Ready')
        DATA_COLLECTION = 'data_collection', _('Data Collection')
        ANALYSIS_READY = 'analysis_ready', _('Analysis Ready')
        COMPLETED = 'completed', _('Completed')
        ARCHIVED = 'archived', _('Archived')
    
    # Identificação e Metadata
    slug = models.SlugField(_('slug'), max_length=200, unique=True, blank=True)
    title = models.CharField(_('title'), max_length=200)
    description = models.TextField(_('description'), blank=True)
    
    # Tipo e Status
    design_type = models.CharField(
        _('design type'),
        max_length=50,
        choices=DesignType.choices,
        default=DesignType.FULL_FACTORIAL
    )
    status = models.CharField(
        _('status'),
        max_length=50,
        choices=Status.choices,
        default=Status.DRAFT
    )
    
    # Relacionamentos
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='experiments',
        verbose_name=_('owner')
    )
    
    # Timestamps
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('Experiment')
        verbose_name_plural = _('Experiments')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['owner', '-created_at']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return self.title
    
    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            counter = 1
            while Experiment.objects.filter(slug=slug).exists():
                slug = f'{base_slug}-{counter}'
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)


class Factor(models.Model):
    """
    Modelo para armazenar fatores (variáveis independentes) de um experimento.
    """
    
    class DataType(models.TextChoices):
        QUANTITATIVE = 'quantitative', _('Quantitative')
        CATEGORICAL = 'categorical', _('Categorical')
    
    # Identificação
    name = models.CharField(_('name'), max_length=100)
    symbol = models.CharField(_('symbol'), max_length=20)
    
    # Tipo de Dado
    data_type = models.CharField(
        _('data type'),
        max_length=20,
        choices=DataType.choices,
        default=DataType.QUANTITATIVE
    )
    
    # Configuração de Precisão (para quantitativos)
    precision = models.IntegerField(
        _('precision'),
        default=2,
        help_text=_('Number of decimal places for quantitative factors')
    )
    
    # Configuração de Níveis (JSON)
    # Para quantitativos: {"low": -1, "high": 1, "center": 0}
    # Para categóricos: {"levels": ["A", "B", "C"]}
    levels_config = models.JSONField(
        _('levels configuration'),
        default=dict,
        help_text=_('JSON with levels configuration')
    )
    
    # Relacionamento
    experiment = models.ForeignKey(
        Experiment,
        on_delete=models.CASCADE,
        related_name='factors',
        verbose_name=_('experiment')
    )
    
    # Timestamps
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('Factor')
        verbose_name_plural = _('Factors')
        ordering = ['experiment', 'id']
        unique_together = [['experiment', 'symbol']]
        indexes = [
            models.Index(fields=['experiment', 'id']),
            models.Index(fields=['data_type']),
        ]
    
    def __str__(self):
        return f'{self.symbol} - {self.name}'


class ResponseVariable(models.Model):
    """
    Modelo para armazenar variáveis de resposta (variáveis dependentes) de um experimento.
    """
    
    class OptimizationGoal(models.TextChoices):
        MAXIMIZE = 'maximize', _('Maximize')
        MINIMIZE = 'minimize', _('Minimize')
        TARGET = 'target', _('Target')
        NONE = 'none', _('None')
    
    # Identificação
    name = models.CharField(_('name'), max_length=100)
    
    # Unidade de Medida
    unit = models.CharField(
        _('unit'),
        max_length=50,
        blank=True,
        help_text=_('Unit of measurement (e.g., kg, °C, %)')
    )
    
    # Objetivo de Otimização
    optimization_goal = models.CharField(
        _('optimization goal'),
        max_length=20,
        choices=OptimizationGoal.choices,
        default=OptimizationGoal.NONE,
        help_text=_('Whether to maximize, minimize, or target this response')
    )
    
    # Relacionamento
    experiment = models.ForeignKey(
        Experiment,
        on_delete=models.CASCADE,
        related_name='response_variables',
        verbose_name=_('experiment')
    )
    
    # Timestamps
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('Response Variable')
        verbose_name_plural = _('Response Variables')
        ordering = ['experiment', 'id']
        unique_together = [['experiment', 'name']]
        indexes = [
            models.Index(fields=['experiment', 'id']),
            models.Index(fields=['optimization_goal']),
        ]
    
    def __str__(self):
        return self.name


class ExperimentRun(models.Model):
    """
    Modelo para armazenar as corridas (runs) de um experimento.
    Cada run representa uma combinação específica de níveis de fatores e suas respostas.
    """
    
    # Ordem no Design
    standard_order = models.IntegerField(
        _('standard order'),
        help_text=_('Order in the standard design matrix')
    )
    run_order = models.IntegerField(
        _('run order'),
        help_text=_('Randomized order of execution')
    )
    
    # Tipo de Ponto
    is_center_point = models.BooleanField(
        _('is center point'),
        default=False,
        help_text=_('Whether this run is a center point (for replication)')
    )
    
    # Valores dos Fatores (JSON)
    # Estrutura: {"factor_id": value, ...}
    # Exemplo: {"1": -1, "2": 1, "3": 0}
    factor_values = models.JSONField(
        _('factor values'),
        default=dict,
        help_text=_('Dictionary mapping factor IDs to their values for this run')
    )
    
    # Valores das Respostas (JSON)
    # Estrutura: {"response_variable_id": value, ...}
    # Exemplo: {"1": 45.2, "2": 98.5}
    response_values = models.JSONField(
        _('response values'),
        default=dict,
        help_text=_('Dictionary mapping response variable IDs to their measured values')
    )
    
    # Controle
    is_excluded = models.BooleanField(
        _('is excluded'),
        default=False,
        help_text=_('Whether to exclude this run from analysis (e.g., outlier)')
    )
    
    # Relacionamento
    experiment = models.ForeignKey(
        Experiment,
        on_delete=models.CASCADE,
        related_name='runs',
        verbose_name=_('experiment')
    )
    
    # Timestamps
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('Experiment Run')
        verbose_name_plural = _('Experiment Runs')
        ordering = ['experiment', 'run_order']
        unique_together = [
            ['experiment', 'standard_order'],
            ['experiment', 'run_order']
        ]
        indexes = [
            models.Index(fields=['experiment', 'run_order']),
            models.Index(fields=['experiment', 'standard_order']),
            models.Index(fields=['is_excluded']),
            models.Index(fields=['is_center_point']),
        ]
    
    def __str__(self):
        return f'Run {self.run_order} (Std: {self.standard_order})'
    
    @property
    def has_responses(self):
        """Verifica se o run possui valores de resposta."""
        return bool(self.response_values)
    
    @property
    def is_complete(self):
        """Verifica se todos os valores de resposta esperados foram preenchidos."""
        expected_responses = self.experiment.response_variables.count()
        filled_responses = len(self.response_values)
        return filled_responses >= expected_responses if expected_responses > 0 else False



