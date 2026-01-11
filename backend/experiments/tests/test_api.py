from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from experiments.models import Experiment, Factor, ResponseVariable, ExperimentRun
from experiments.tests.factories import (
    UserFactory,
    ExperimentFactory,
    FactorFactory,
    ResponseVariableFactory,
    ExperimentRunFactory
)


class ExperimentViewSetTest(APITestCase):
    """Testes para o ExperimentViewSet."""
    
    def setUp(self):
        self.user = UserFactory()
        self.other_user = UserFactory()
        self.client.force_authenticate(user=self.user)
    
    def test_list_experiments(self):
        """Testa listagem de experimentos do usuário."""
        ExperimentFactory.create_batch(3, owner=self.user)
        ExperimentFactory.create_batch(2, owner=self.other_user)
        
        url = reverse('experiment-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)
    
    def test_create_experiment(self):
        """Testa criação de experimento."""
        url = reverse('experiment-list')
        data = {
            'title': 'New Experiment',
            'description': 'Test description',
            'design_type': 'full_factorial',
            'status': 'draft'
        }
        
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Experiment.objects.count(), 1)
        self.assertEqual(Experiment.objects.first().owner, self.user)
    
    def test_retrieve_experiment(self):
        """Testa detalhamento de experimento."""
        experiment = ExperimentFactory(owner=self.user)
        url = reverse('experiment-detail', kwargs={'slug': experiment.slug})
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], experiment.title)
    
    def test_update_experiment(self):
        """Testa atualização de experimento."""
        experiment = ExperimentFactory(owner=self.user)
        url = reverse('experiment-detail', kwargs={'slug': experiment.slug})
        data = {
            'title': 'Updated Title',
            'description': experiment.description,
            'design_type': experiment.design_type,
        }
        
        response = self.client.put(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        experiment.refresh_from_db()
        self.assertEqual(experiment.title, 'Updated Title')
        # Status não é atualizável via API, permanece como criado
        self.assertEqual(experiment.status, 'draft')
    
    def test_delete_experiment(self):
        """Testa deleção de experimento."""
        experiment = ExperimentFactory(owner=self.user)
        url = reverse('experiment-detail', kwargs={'slug': experiment.slug})
        
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Experiment.objects.count(), 0)
    
    def test_cannot_access_other_user_experiment(self):
        """Testa que usuário não pode acessar experimento de outro."""
        experiment = ExperimentFactory(owner=self.other_user)
        url = reverse('experiment-detail', kwargs={'slug': experiment.slug})
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_duplicate_experiment(self):
        """Testa duplicação de experimento."""
        experiment = ExperimentFactory(owner=self.user, title='Original')
        url = reverse('experiment-duplicate', kwargs={'slug': experiment.slug})
        
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Experiment.objects.count(), 2)
        self.assertTrue('Copy' in response.data['title'])
    
    def test_archive_experiment(self):
        """Testa arquivamento de experimento."""
        experiment = ExperimentFactory(owner=self.user)
        url = reverse('experiment-archive', kwargs={'slug': experiment.slug})
        
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        experiment.refresh_from_db()
        self.assertEqual(experiment.status, Experiment.Status.ARCHIVED)
    
    def test_search_experiments(self):
        """Testa busca de experimentos."""
        ExperimentFactory(owner=self.user, title='Factorial Design')
        ExperimentFactory(owner=self.user, title='Response Surface')
        
        url = reverse('experiment-search')
        response = self.client.get(url, {'q': 'Factorial'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
    
    def test_filter_by_status(self):
        """Testa filtro por status."""
        ExperimentFactory(owner=self.user, status='draft')
        ExperimentFactory(owner=self.user, status='draft')
        ExperimentFactory(owner=self.user, status='completed')
        
        url = reverse('experiment-by-status')
        response = self.client.get(url, {'status': 'draft'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
    
    def test_requires_authentication(self):
        """Testa que endpoints requerem autenticação."""
        self.client.force_authenticate(user=None)
        url = reverse('experiment-list')
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class FactorViewSetTest(APITestCase):
    """Testes para o FactorViewSet."""
    
    def setUp(self):
        self.user = UserFactory()
        self.other_user = UserFactory()
        self.experiment = ExperimentFactory(owner=self.user)
        self.other_experiment = ExperimentFactory(owner=self.other_user)
        self.client.force_authenticate(user=self.user)
    
    def test_list_factors(self):
        """Testa listagem de fatores."""
        FactorFactory.create_batch(3, experiment=self.experiment)
        
        url = reverse('experiment-factors-list', kwargs={'experiment_slug': self.experiment.slug})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)
    
    def test_create_factor(self):
        """Testa criação de fator."""
        url = reverse('experiment-factors-list', kwargs={'experiment_slug': self.experiment.slug})
        data = {
            'name': 'Temperature',
            'symbol': 'T',
            'data_type': 'quantitative',
            'precision': 2,
            'levels_config': [-1, 1]  # 2 níveis obrigatórios como lista
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Factor.objects.count(), 1)
    
    def test_cannot_create_duplicate_symbol(self):
        """Testa que não pode criar fator com símbolo duplicado."""
        FactorFactory(experiment=self.experiment, symbol='X1')
        
        url = reverse('experiment-factors-list', kwargs={'experiment_slug': self.experiment.slug})
        data = {
            'name': 'Another Factor',
            'symbol': 'X1',
            'data_type': 'quantitative',
            'precision': 2,
            'levels_config': {}
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_duplicate_factor(self):
        """Testa duplicação de fator."""
        factor = FactorFactory(experiment=self.experiment)
        url = reverse('experiment-factors-duplicate', kwargs={
            'experiment_slug': self.experiment.slug,
            'pk': factor.pk
        })
        
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Factor.objects.count(), 2)
    
    def test_bulk_create_factors(self):
        """Testa criação em lote de fatores."""
        url = reverse('experiment-factors-bulk-create', kwargs={'experiment_slug': self.experiment.slug})
        data = [
            {'name': 'Factor 1', 'symbol': 'X1', 'data_type': 'quantitative', 'precision': 2, 'levels_config': [-1, 1]},
            {'name': 'Factor 2', 'symbol': 'X2', 'data_type': 'quantitative', 'precision': 2, 'levels_config': [0, 10]},
        ]
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Factor.objects.count(), 2)
    
    def test_cannot_access_other_user_factors(self):
        """Testa que não pode acessar fatores de outro usuário."""
        url = reverse('experiment-factors-list', kwargs={'experiment_slug': self.other_experiment.slug})
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ResponseVariableViewSetTest(APITestCase):
    """Testes para o ResponseVariableViewSet."""
    
    def setUp(self):
        self.user = UserFactory()
        self.experiment = ExperimentFactory(owner=self.user)
        self.client.force_authenticate(user=self.user)
    
    def test_list_response_variables(self):
        """Testa listagem de variáveis de resposta."""
        ResponseVariableFactory.create_batch(2, experiment=self.experiment)
        
        url = reverse('experiment-response-variables-list', kwargs={'experiment_slug': self.experiment.slug})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
    
    def test_create_response_variable(self):
        """Testa criação de variável de resposta."""
        url = reverse('experiment-response-variables-list', kwargs={'experiment_slug': self.experiment.slug})
        data = {
            'name': 'Yield',
            'unit': '%',
            'optimization_goal': 'maximize'
        }
        
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ResponseVariable.objects.count(), 1)
    
    def test_cannot_create_duplicate_name(self):
        """Testa que não pode criar variável com nome duplicado."""
        ResponseVariableFactory(experiment=self.experiment, name='Yield')
        
        url = reverse('experiment-response-variables-list', kwargs={'experiment_slug': self.experiment.slug})
        data = {
            'name': 'Yield',
            'unit': 'kg',
            'optimization_goal': 'maximize'
        }
        
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_bulk_create_response_variables(self):
        """Testa criação em lote de variáveis de resposta."""
        url = reverse('experiment-response-variables-bulk-create', kwargs={'experiment_slug': self.experiment.slug})
        # Cada experimento pode ter apenas 1 variável de resposta
        data = [
            {'name': 'Yield', 'unit': '%'},
        ]
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ResponseVariable.objects.count(), 1)


class ExperimentRunViewSetTest(APITestCase):
    """Testes para o ExperimentRunViewSet."""
    
    def setUp(self):
        self.user = UserFactory()
        self.experiment = ExperimentFactory(owner=self.user)
        self.response1 = ResponseVariableFactory(experiment=self.experiment)
        self.response2 = ResponseVariableFactory(experiment=self.experiment)
        self.client.force_authenticate(user=self.user)
    
    def test_list_runs(self):
        """Testa listagem de runs."""
        ExperimentRunFactory.create_batch(5, experiment=self.experiment)
        
        url = reverse('experiment-runs-list', kwargs={'experiment_slug': self.experiment.slug})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 5)
    
    def test_create_run(self):
        """Testa criação de run."""
        url = reverse('experiment-runs-list', kwargs={'experiment_slug': self.experiment.slug})
        data = {
            'standard_order': 1,
            'run_order': 1,
            'is_center_point': False,
            'factor_values': {'1': -1, '2': 1},
            'response_values': {},
            'is_excluded': False
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ExperimentRun.objects.count(), 1)
    
    def test_cannot_create_duplicate_standard_order(self):
        """Testa que não pode criar run com standard_order duplicado."""
        ExperimentRunFactory(experiment=self.experiment, standard_order=1, run_order=10)
        
        url = reverse('experiment-runs-list', kwargs={'experiment_slug': self.experiment.slug})
        data = {
            'standard_order': 1,
            'run_order': 2,
            'is_center_point': False,
            'factor_values': {},
            'response_values': {},
            'is_excluded': False
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_toggle_exclude(self):
        """Testa alternância de exclusão de run."""
        run = ExperimentRunFactory(experiment=self.experiment, is_excluded=False)
        url = reverse('experiment-runs-toggle-exclude', kwargs={
            'experiment_slug': self.experiment.slug,
            'pk': run.pk
        })
        
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        run.refresh_from_db()
        self.assertTrue(run.is_excluded)
    
    def test_update_responses(self):
        """Testa atualização de respostas de um run."""
        run = ExperimentRunFactory(experiment=self.experiment, response_values={})
        url = reverse('experiment-runs-update-responses', kwargs={
            'experiment_slug': self.experiment.slug,
            'pk': run.pk
        })
        data = {
            'response_values': {str(self.response1.id): 45.2, str(self.response2.id): 98.5}
        }
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        run.refresh_from_db()
        self.assertEqual(len(run.response_values), 2)
    
    def test_bulk_create_runs(self):
        """Testa criação em lote de runs."""
        url = reverse('experiment-runs-bulk-create', kwargs={'experiment_slug': self.experiment.slug})
        data = [
            {'standard_order': 1, 'run_order': 1, 'is_center_point': False, 'factor_values': {}, 'response_values': {}, 'is_excluded': False},
            {'standard_order': 2, 'run_order': 2, 'is_center_point': False, 'factor_values': {}, 'response_values': {}, 'is_excluded': False},
        ]
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ExperimentRun.objects.count(), 2)
    
    def test_bulk_update_responses(self):
        """Testa atualização em lote de respostas."""
        run1 = ExperimentRunFactory(experiment=self.experiment)
        run2 = ExperimentRunFactory(experiment=self.experiment)
        
        url = reverse('experiment-runs-bulk-update-responses', kwargs={'experiment_slug': self.experiment.slug})
        data = [
            {'id': run1.id, 'response_values': {str(self.response1.id): 45.2}},
            {'id': run2.id, 'response_values': {str(self.response1.id): 50.0}},
        ]
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_filter_incomplete_runs(self):
        """Testa filtro de runs incompletos."""
        ExperimentRunFactory(experiment=self.experiment, response_values={})
        ExperimentRunFactory(experiment=self.experiment, response_values={
            str(self.response1.id): 45.2,
            str(self.response2.id): 98.5
        })
        
        url = reverse('experiment-runs-incomplete', kwargs={'experiment_slug': self.experiment.slug})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
    
    def test_filter_excluded_runs(self):
        """Testa filtro de runs excluídos."""
        ExperimentRunFactory(experiment=self.experiment, is_excluded=False)
        ExperimentRunFactory(experiment=self.experiment, is_excluded=True)
        ExperimentRunFactory(experiment=self.experiment, is_excluded=True)
        
        url = reverse('experiment-runs-excluded', kwargs={'experiment_slug': self.experiment.slug})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
