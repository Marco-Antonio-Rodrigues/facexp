import os

ENV = os.getenv("ENV", "development")

if ENV == "production":
    from .config.production import ProductionConfig as Config
elif ENV == "testing":
    from .config.testing import TestingConfig as Config
else:
    from .config.development import DevelopmentConfig as Config

config = Config()
config.init_app()

for key in dir(config):
    if not key.startswith("_") and not callable(getattr(config, key)):  # Ignorar métodos e atributos privados
        globals()[key] = getattr(config, key)
