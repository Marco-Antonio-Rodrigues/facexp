import factory
from factory.django import DjangoModelFactory
from django.contrib.auth import get_user_model
from experiments.models import Experiment, Factor, ResponseVariable, ExperimentRun

User = get_user_model()


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ('email',)
    
    email = factory.Sequence(lambda n: f'user{n}@example.com')
    name = factory.Faker('name')
    email_confirmed = True


class ExperimentFactory(DjangoModelFactory):
    class Meta:
        model = Experiment
    
    title = factory.Sequence(lambda n: f'Experiment {n}')
    description = factory.Faker('text', max_nb_chars=200)
    design_type = Experiment.DesignType.FULL_FACTORIAL
    status = Experiment.Status.DRAFT
    owner = factory.SubFactory(UserFactory)


class FactorFactory(DjangoModelFactory):
    class Meta:
        model = Factor
    
    name = factory.Sequence(lambda n: f'Factor {n}')
    symbol = factory.Sequence(lambda n: f'X{n}')
    data_type = Factor.DataType.QUANTITATIVE
    precision = 2
    levels_config = factory.LazyFunction(lambda: {"low": -1, "high": 1, "center": 0})
    experiment = factory.SubFactory(ExperimentFactory)


class ResponseVariableFactory(DjangoModelFactory):
    class Meta:
        model = ResponseVariable
    
    name = factory.Sequence(lambda n: f'Response {n}')
    unit = 'kg'
    experiment = factory.SubFactory(ExperimentFactory)


class ExperimentRunFactory(DjangoModelFactory):
    class Meta:
        model = ExperimentRun
    
    standard_order = factory.Sequence(lambda n: n)
    run_order = factory.Sequence(lambda n: n)
    is_center_point = False
    factor_values = factory.LazyFunction(lambda: {"1": -1, "2": 1})
    response_values = factory.LazyFunction(lambda: {})
    is_excluded = False
    experiment = factory.SubFactory(ExperimentFactory)
