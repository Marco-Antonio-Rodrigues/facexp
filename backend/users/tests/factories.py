import uuid

import factory
from django.utils import timezone

from users.models import CustomUser, UserAddress


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

    @factory.post_generation
    def address(self, create, extracted, **kwargs):
        if create and extracted:
            UserAddressFactory(user=self)


class UserAddressFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = UserAddress

    user = factory.SubFactory(CustomUserFactory)
    street = factory.Faker("street_name")
    number = factory.Faker("building_number")
    neighborhood = factory.Faker("city")
    city = factory.Faker("city")
    state = factory.Faker("state_abbr")
    complement = factory.Faker("secondary_address")
    zip_code = factory.Faker("postcode")
