from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExperimentViewSet, FactorViewSet, ResponseVariableViewSet, ExperimentRunViewSet

# Router principal
router = DefaultRouter()
router.register('', ExperimentViewSet, basename='experiment')

urlpatterns = [
    path('', include(router.urls)),
    # Rotas aninhadas para fatores
    path(
        '<slug:experiment_slug>/factors/',
        FactorViewSet.as_view({
            'get': 'list',
            'post': 'create'
        }),
        name='experiment-factors-list'
    ),
    path(
        '<slug:experiment_slug>/factors/<int:pk>/',
        FactorViewSet.as_view({
            'get': 'retrieve',
            'put': 'update',
            'patch': 'partial_update',
            'delete': 'destroy'
        }),
        name='experiment-factors-detail'
    ),
    path(
        '<slug:experiment_slug>/factors/<int:pk>/duplicate/',
        FactorViewSet.as_view({'post': 'duplicate'}),
        name='experiment-factors-duplicate'
    ),
    path(
        '<slug:experiment_slug>/factors/bulk_create/',
        FactorViewSet.as_view({'post': 'bulk_create'}),
        name='experiment-factors-bulk-create'
    ),
    # Rotas aninhadas para variáveis de resposta
    path(
        '<slug:experiment_slug>/response-variables/',
        ResponseVariableViewSet.as_view({
            'get': 'list',
            'post': 'create'
        }),
        name='experiment-response-variables-list'
    ),
    path(
        '<slug:experiment_slug>/response-variables/<int:pk>/',
        ResponseVariableViewSet.as_view({
            'get': 'retrieve',
            'put': 'update',
            'patch': 'partial_update',
            'delete': 'destroy'
        }),
        name='experiment-response-variables-detail'
    ),
    path(
        '<slug:experiment_slug>/response-variables/<int:pk>/duplicate/',
        ResponseVariableViewSet.as_view({'post': 'duplicate'}),
        name='experiment-response-variables-duplicate'
    ),
    path(
        '<slug:experiment_slug>/response-variables/bulk_create/',
        ResponseVariableViewSet.as_view({'post': 'bulk_create'}),
        name='experiment-response-variables-bulk-create'
    ),
    # Rotas aninhadas para runs
    path(
        '<slug:experiment_slug>/runs/',
        ExperimentRunViewSet.as_view({
            'get': 'list',
            'post': 'create'
        }),
        name='experiment-runs-list'
    ),
    path(
        '<slug:experiment_slug>/runs/<int:pk>/',
        ExperimentRunViewSet.as_view({
            'get': 'retrieve',
            'put': 'update',
            'patch': 'partial_update',
            'delete': 'destroy'
        }),
        name='experiment-runs-detail'
    ),
    path(
        '<slug:experiment_slug>/runs/<int:pk>/toggle_exclude/',
        ExperimentRunViewSet.as_view({'post': 'toggle_exclude'}),
        name='experiment-runs-toggle-exclude'
    ),
    path(
        '<slug:experiment_slug>/runs/<int:pk>/update_responses/',
        ExperimentRunViewSet.as_view({'patch': 'update_responses'}),
        name='experiment-runs-update-responses'
    ),
    path(
        '<slug:experiment_slug>/runs/bulk_create/',
        ExperimentRunViewSet.as_view({'post': 'bulk_create'}),
        name='experiment-runs-bulk-create'
    ),
    path(
        '<slug:experiment_slug>/runs/bulk_delete/',
        ExperimentRunViewSet.as_view({'post': 'bulk_delete'}),
        name='experiment-runs-bulk-delete'
    ),
    path(
        '<slug:experiment_slug>/runs/import_from_excel/',
        ExperimentRunViewSet.as_view({'post': 'import_from_excel'}),
        name='experiment-runs-import-from-excel'
    ),
    path(
        '<slug:experiment_slug>/runs/bulk_update_responses/',
        ExperimentRunViewSet.as_view({'patch': 'bulk_update_responses'}),
        name='experiment-runs-bulk-update-responses'
    ),
    path(
        '<slug:experiment_slug>/runs/incomplete/',
        ExperimentRunViewSet.as_view({'get': 'incomplete'}),
        name='experiment-runs-incomplete'
    ),
    path(
        '<slug:experiment_slug>/runs/excluded/',
        ExperimentRunViewSet.as_view({'get': 'excluded'}),
        name='experiment-runs-excluded'
    ),
]
