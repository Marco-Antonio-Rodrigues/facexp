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
    fields = ['name', 'unit', 'optimization_goal']
    readonly_fields = ['created_at']
    show_change_link = True


@admin.register(Experiment)
class ExperimentAdmin(admin.ModelAdmin):
    list_display = ['title', 'slug', 'design_type', 'status', 'owner', 'created_at']
    list_filter = ['design_type', 'status', 'created_at']
    search_fields = ['title', 'description', 'slug']
    readonly_fields = ['slug', 'created_at', 'updated_at']
    list_per_page = 20
    date_hierarchy = 'created_at'
    inlines = [FactorInline, ResponseVariableInline]
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('title', 'slug', 'description', 'owner')
        }),
        ('Configuração do Experimento', {
            'fields': ('design_type', 'status')
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
    list_display = ['name', 'unit', 'optimization_goal', 'experiment', 'created_at']
    list_filter = ['optimization_goal', 'created_at']
    search_fields = ['name', 'unit', 'experiment__title']
    readonly_fields = ['created_at', 'updated_at']
    list_per_page = 20
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('name', 'unit', 'experiment')
        }),
        ('Configuração da Variável', {
            'fields': ('optimization_goal',)
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
    list_display = ['run_order', 'standard_order', 'experiment', 'is_center_point', 'is_excluded', 'created_at']
    list_filter = ['is_center_point', 'is_excluded', 'created_at']
    search_fields = ['experiment__title', 'standard_order', 'run_order']
    readonly_fields = ['created_at', 'updated_at']
    list_per_page = 50
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Informações do Run', {
            'fields': ('experiment', 'standard_order', 'run_order')
        }),
        ('Tipo e Controle', {
            'fields': ('is_center_point', 'is_excluded')
        }),
        ('Dados do Experimento', {
            'fields': ('factor_values', 'response_values')
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




