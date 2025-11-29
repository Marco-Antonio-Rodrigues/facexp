from .base import ConfigBase


class TestingConfig(ConfigBase):
    DEBUG = True

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": ":memory:",
        }
    }

    def __init__(self):
        super().__init__()
        print("Running tests...")
