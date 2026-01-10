from django.contrib import admin
from .models import Experiment, Factor, ResponseVariable, ExperimentRun


class FactorInline(admin.TabularInline):
    model = Factor
    extra = 0
    fields = ['symbol', 'name', 'data_type', 'precision', 'levels_config']
    readonly_fields = ['created_at']
    show_change_link = True


class ResponseVariableInline(admin.TabularInline):
    model = ResponseVariable
    extra = 0
    fields = ['name', 'unit']
    readonly_fields = ['created_at']
    show_change_link = True


class ExperimentRunInline(admin.TabularInline):
    model = ExperimentRun
    extra = 0
    fields = ['run_order', 'standard_order', 'replicate_number', 'is_center_point', 'is_excluded', 'has_responses']
    readonly_fields = ['run_order', 'standard_order', 'replicate_number', 'has_responses', 'created_at']
    show_change_link = True
    can_delete = True
    
    def has_responses(self, obj):
        return '✓' if obj and obj.has_responses else '✗'
    has_responses.short_description = 'Tem Respostas?'


@admin.register(Experiment)
class ExperimentAdmin(admin.ModelAdmin):
    list_display = ['title', 'slug', 'design_type', 'status', 'owner', 'created_at']
    list_filter = ['design_type', 'status', 'created_at']
    search_fields = ['title', 'description', 'slug']
    readonly_fields = ['slug', 'created_at', 'updated_at']
    list_per_page = 20
    date_hierarchy = 'created_at'
    inlines = [FactorInline, ResponseVariableInline, ExperimentRunInline]
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('title', 'slug', 'description', 'owner')
        }),
        ('Configuração do Experimento', {
            'fields': ('design_type', 'status', 'replicates')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Factor)
class FactorAdmin(admin.ModelAdmin):
    list_display = ['symbol', 'name', 'data_type', 'experiment', 'created_at']
    list_filter = ['data_type', 'created_at']
    search_fields = ['name', 'symbol', 'experiment__title']
    readonly_fields = ['created_at', 'updated_at']
    list_per_page = 20
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('name', 'symbol', 'experiment')
        }),
        ('Configuração do Fator', {
            'fields': ('data_type', 'precision', 'levels_config')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        """
        Torna o experiment readonly após criação.
        """
        if obj:  # Editando
            return self.readonly_fields + ['experiment']
        return self.readonly_fields


@admin.register(ResponseVariable)
class ResponseVariableAdmin(admin.ModelAdmin):
    list_display = ['name', 'unit', 'experiment', 'created_at']
    list_filter = ['created_at']
    search_fields = ['name', 'unit', 'experiment__title']
    readonly_fields = ['created_at', 'updated_at']
    list_per_page = 20
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('name', 'unit', 'experiment')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        """
        Torna o experiment readonly após criação.
        """
        if obj:  # Editando
            return self.readonly_fields + ['experiment']
        return self.readonly_fields


@admin.register(ExperimentRun)
class ExperimentRunAdmin(admin.ModelAdmin):
    list_display = ['run_order', 'standard_order', 'replicate_number', 'experiment', 'is_center_point', 'is_excluded', 'has_responses', 'created_at']
    list_filter = ['is_center_point', 'is_excluded', 'replicate_number', 'created_at']
    search_fields = ['experiment__title', 'standard_order', 'run_order']
    readonly_fields = ['created_at', 'updated_at', 'has_responses', 'is_complete']
    list_per_page = 50
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Informações do Run', {
            'fields': ('experiment', 'standard_order', 'run_order', 'replicate_number')
        }),
        ('Tipo e Controle', {
            'fields': ('is_center_point', 'is_excluded')
        }),
        ('Dados do Experimento', {
            'fields': ('factor_values', 'response_values')
        }),
        ('Status', {
            'fields': ('has_responses', 'is_complete'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        """
        Torna o experiment readonly após criação.
        """
        if obj:  # Editando
            return self.readonly_fields + ['experiment', 'standard_order']
        return self.readonly_fields




