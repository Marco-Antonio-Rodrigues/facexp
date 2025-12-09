from django.test import TestCase
from django.db import IntegrityError
from experiments.models import Experiment, Factor, ResponseVariable, ExperimentRun
from experiments.tests.factories import (
    UserFactory,
    ExperimentFactory,
    FactorFactory,
    ResponseVariableFactory,
    ExperimentRunFactory
)


class ExperimentModelTest(TestCase):
    """Testes para o modelo Experiment."""
    
    def setUp(self):
        self.user = UserFactory()
        self.experiment = ExperimentFactory(owner=self.user)
    
    def test_experiment_creation(self):
        """Testa criação básica de experimento."""
        self.assertIsNotNone(self.experiment.id)
        self.assertEqual(self.experiment.owner, self.user)
        self.assertEqual(self.experiment.status, Experiment.Status.DRAFT)
    
    def test_slug_auto_generation(self):
        """Testa geração automática de slug único."""
        experiment1 = ExperimentFactory(title='Test Experiment', owner=self.user)
        experiment2 = ExperimentFactory(title='Test Experiment', owner=self.user)
        
        self.assertIsNotNone(experiment1.slug)
        self.assertIsNotNone(experiment2.slug)
        self.assertNotEqual(experiment1.slug, experiment2.slug)
        self.assertTrue(experiment2.slug.startswith('test-experiment'))
    
    def test_design_type_choices(self):
        """Testa tipos de design válidos."""
        for design_type, _ in Experiment.DesignType.choices:
            exp = ExperimentFactory(design_type=design_type, owner=self.user)
            self.assertEqual(exp.design_type, design_type)
    
    def test_status_choices(self):
        """Testa status válidos."""
        for status, _ in Experiment.Status.choices:
            exp = ExperimentFactory(status=status, owner=self.user)
            self.assertEqual(exp.status, status)
    
    def test_str_representation(self):
        """Testa representação string."""
        self.assertEqual(str(self.experiment), self.experiment.title)
    
    def test_ordering(self):
        """Testa ordenação padrão por created_at decrescente."""
        import time
        # Remove experimentos existentes do setUp
        Experiment.objects.all().delete()
        
        exp1 = ExperimentFactory(owner=self.user, title='First')
        time.sleep(0.01)  # Garante diferença no created_at
        exp2 = ExperimentFactory(owner=self.user, title='Second')
        
        experiments = list(Experiment.objects.all())
        self.assertEqual(experiments[0], exp2)  # Mais recente primeiro
        self.assertEqual(experiments[1], exp1)


class FactorModelTest(TestCase):
    """Testes para o modelo Factor."""
    
    def setUp(self):
        self.user = UserFactory()
        self.experiment = ExperimentFactory(owner=self.user)
        self.factor = FactorFactory(experiment=self.experiment)
    
    def test_factor_creation(self):
        """Testa criação básica de fator."""
        self.assertIsNotNone(self.factor.id)
        self.assertEqual(self.factor.experiment, self.experiment)
    
    def test_unique_symbol_per_experiment(self):
        """Testa que símbolos devem ser únicos por experimento."""
        with self.assertRaises(IntegrityError):
            FactorFactory(
                experiment=self.experiment,
                symbol=self.factor.symbol
            )
    
    def test_same_symbol_different_experiments(self):
        """Testa que o mesmo símbolo pode ser usado em experimentos diferentes."""
        experiment2 = ExperimentFactory(owner=self.user)
        factor2 = FactorFactory(
            experiment=experiment2,
            symbol=self.factor.symbol
        )
        self.assertEqual(factor2.symbol, self.factor.symbol)
    
    def test_data_type_choices(self):
        """Testa tipos de dados válidos."""
        for data_type, _ in Factor.DataType.choices:
            factor = FactorFactory(
                experiment=self.experiment,
                data_type=data_type
            )
            self.assertEqual(factor.data_type, data_type)
    
    def test_str_representation(self):
        """Testa representação string."""
        expected = f'{self.factor.symbol} - {self.factor.name}'
        self.assertEqual(str(self.factor), expected)
    
    def test_json_field_levels_config(self):
        """Testa armazenamento JSON no levels_config."""
        config = {"low": -1, "high": 1, "center": 0}
        factor = FactorFactory(
            experiment=self.experiment,
            levels_config=config
        )
        self.assertEqual(factor.levels_config, config)


class ResponseVariableModelTest(TestCase):
    """Testes para o modelo ResponseVariable."""
    
    def setUp(self):
        self.user = UserFactory()
        self.experiment = ExperimentFactory(owner=self.user)
        self.response = ResponseVariableFactory(experiment=self.experiment)
    
    def test_response_variable_creation(self):
        """Testa criação básica de variável de resposta."""
        self.assertIsNotNone(self.response.id)
        self.assertEqual(self.response.experiment, self.experiment)
    
    def test_unique_name_per_experiment(self):
        """Testa que nomes devem ser únicos por experimento."""
        with self.assertRaises(IntegrityError):
            ResponseVariableFactory(
                experiment=self.experiment,
                name=self.response.name
            )
    
    def test_same_name_different_experiments(self):
        """Testa que o mesmo nome pode ser usado em experimentos diferentes."""
        experiment2 = ExperimentFactory(owner=self.user)
        response2 = ResponseVariableFactory(
            experiment=experiment2,
            name=self.response.name
        )
        self.assertEqual(response2.name, self.response.name)
    
    def test_optimization_goal_choices(self):
        """Testa objetivos de otimização válidos."""
        for goal, _ in ResponseVariable.OptimizationGoal.choices:
            response = ResponseVariableFactory(
                experiment=self.experiment,
                optimization_goal=goal
            )
            self.assertEqual(response.optimization_goal, goal)
    
    def test_str_representation(self):
        """Testa representação string."""
        self.assertEqual(str(self.response), self.response.name)


class ExperimentRunModelTest(TestCase):
    """Testes para o modelo ExperimentRun."""
    
    def setUp(self):
        self.user = UserFactory()
        self.experiment = ExperimentFactory(owner=self.user)
        self.factor1 = FactorFactory(experiment=self.experiment)
        self.factor2 = FactorFactory(experiment=self.experiment)
        self.response1 = ResponseVariableFactory(experiment=self.experiment)
        self.response2 = ResponseVariableFactory(experiment=self.experiment)
        self.run = ExperimentRunFactory(experiment=self.experiment)
    
    def test_run_creation(self):
        """Testa criação básica de run."""
        self.assertIsNotNone(self.run.id)
        self.assertEqual(self.run.experiment, self.experiment)
    
    def test_unique_standard_order_per_experiment(self):
        """Testa que standard_order deve ser único por experimento."""
        with self.assertRaises(IntegrityError):
            ExperimentRunFactory(
                experiment=self.experiment,
                standard_order=self.run.standard_order,
                run_order=999
            )
    
    def test_unique_run_order_per_experiment(self):
        """Testa que run_order deve ser único por experimento."""
        with self.assertRaises(IntegrityError):
            ExperimentRunFactory(
                experiment=self.experiment,
                standard_order=999,
                run_order=self.run.run_order
            )
    
    def test_has_responses_property(self):
        """Testa property has_responses."""
        # Run sem respostas
        run_empty = ExperimentRunFactory(
            experiment=self.experiment,
            response_values={}
        )
        self.assertFalse(run_empty.has_responses)
        
        # Run com respostas
        run_with_responses = ExperimentRunFactory(
            experiment=self.experiment,
            response_values={str(self.response1.id): 45.2}
        )
        self.assertTrue(run_with_responses.has_responses)
    
    def test_is_complete_property(self):
        """Testa property is_complete."""
        # Run sem nenhuma resposta
        run_incomplete = ExperimentRunFactory(
            experiment=self.experiment,
            response_values={}
        )
        self.assertFalse(run_incomplete.is_complete)
        
        # Run com apenas uma resposta (faltam outras)
        run_partial = ExperimentRunFactory(
            experiment=self.experiment,
            response_values={str(self.response1.id): 45.2}
        )
        self.assertFalse(run_partial.is_complete)
        
        # Run com todas as respostas
        run_complete = ExperimentRunFactory(
            experiment=self.experiment,
            response_values={
                str(self.response1.id): 45.2,
                str(self.response2.id): 98.5
            }
        )
        self.assertTrue(run_complete.is_complete)
    
    def test_str_representation(self):
        """Testa representação string."""
        expected = f'Run {self.run.run_order} (Std: {self.run.standard_order})'
        self.assertEqual(str(self.run), expected)
    
    def test_json_fields(self):
        """Testa armazenamento JSON nos campos."""
        factor_values = {"1": -1, "2": 1}
        response_values = {"1": 45.2, "2": 98.5}
        
        run = ExperimentRunFactory(
            experiment=self.experiment,
            factor_values=factor_values,
            response_values=response_values
        )
        
        self.assertEqual(run.factor_values, factor_values)
        self.assertEqual(run.response_values, response_values)
    
    def test_is_excluded_default(self):
        """Testa valor padrão de is_excluded."""
        self.assertFalse(self.run.is_excluded)
    
    def test_is_center_point_default(self):
        """Testa valor padrão de is_center_point."""
        self.assertFalse(self.run.is_center_point)
