from .base import ConfigBase


class DevelopmentConfig(ConfigBase):
    DEBUG = True
    ALLOWED_HOSTS = ["localhost", "127.0.0.1", "*"]
    
    # Adiciona ngrok aos domínios confiáveis para CSRF
    CSRF_TRUSTED_ORIGINS = [
        "https://viable-gator-touched.ngrok-free.app",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    # CORS Configuration para desenvolvimento
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    CORS_ALLOW_CREDENTIALS = True

    def __init__(self):
        super().__init__()
        print("Development environment.")
