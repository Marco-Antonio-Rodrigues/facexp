import uuid

import factory
from django.utils import timezone

from users.models import CustomUser


class CustomUserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = CustomUser

    email = factory.Faker("email")
    name = factory.Faker("name")
    phone_number = factory.Faker("phone_number")
    date_birth = factory.Faker("date_of_birth")
    email_confirmed = False
    confirmation_token = factory.LazyFunction(uuid.uuid4)
    confirmation_token_created_at = factory.LazyFunction(timezone.now)

    password = factory.PostGenerationMethodCall("set_password", "@Kr3of1sj40")
