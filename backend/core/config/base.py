import os
from datetime import timedelta
from pathlib import Path


class ConfigBase:
    BASE_DIR = Path(__file__).resolve().parent.parent

    SECRET_KEY = os.getenv("SECRET_KEY")

    CORS_ALLOW_ALL_ORIGINS = True

    ROOT_URLCONF = "core.urls"

    WSGI_APPLICATION = "core.wsgi.application"

    LANGUAGE_CODE = "pt-br"
    TIME_ZONE = "UTC"
    USE_I18N = True  # ativa traduções
    USE_L10N = False  # desativa formatações baseadas na localização
    USE_TZ = True  # ativa o suporte para fuso horário

    AUTH_USER_MODEL = "users.CustomUser"

    STATIC_URL = "static/"

    DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

    FRONTEND_URL = os.getenv("FRONTEND_URL")
    
    # Backend URL (para webhooks)
    BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

    EMAIL_HOST = os.getenv("EMAIL_HOST")
    EMAIL_PORT = int(os.getenv("EMAIL_PORT"))
    EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
    EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")
    EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS") == "True"
    DEFAULT_FROM_EMAIL = EMAIL_HOST_USER
    SERVER_EMAIL = EMAIL_HOST_USER
    EMAIL_BACKEND = os.getenv("EMAIL_BACKEND")

    # InfinitePay Configuration
    INFINITEPAY_HANDLE = os.getenv("INFINITEPAY_HANDLE")
    INFINITEPAY_WEBHOOK_URL = os.getenv("INFINITEPAY_WEBHOOK_URL")
    
    INSTALLED_APPS = [
        "django.contrib.admin",
        "django.contrib.auth",
        "django.contrib.contenttypes",
        "django.contrib.sessions",
        "django.contrib.messages",
        "django.contrib.staticfiles",
        # third parties
        "corsheaders",
        "rest_framework",
        "rest_framework_simplejwt",
        "rest_framework_simplejwt.token_blacklist",
        "drf_spectacular",
        # our apps
        "core",
        "users",
        "experiments",
    ]

    MIDDLEWARE = [
        "django.middleware.security.SecurityMiddleware",
        "corsheaders.middleware.CorsMiddleware",
        "django.contrib.sessions.middleware.SessionMiddleware",
        "django.middleware.common.CommonMiddleware",
        "django.middleware.csrf.CsrfViewMiddleware",
        "django.contrib.auth.middleware.AuthenticationMiddleware",
        "django.contrib.messages.middleware.MessageMiddleware",
        "django.middleware.clickjacking.XFrameOptionsMiddleware",
    ]

    TEMPLATES = [
        {
            "BACKEND": "django.template.backends.django.DjangoTemplates",
            "DIRS": [],
            "APP_DIRS": True,
            "OPTIONS": {
                "context_processors": [
                    "django.template.context_processors.debug",
                    "django.template.context_processors.request",
                    "django.contrib.auth.context_processors.auth",
                    "django.contrib.messages.context_processors.messages",
                ],
            },
        },
    ]

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "./../db.sqlite3",
        }
    }

    AUTH_PASSWORD_VALIDATORS = [
        {
            "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
            "OPTIONS": {
                "user_attributes": ("email", "name"),
                "max_similarity": 0.7,
            },
        },
        {
            "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
            "OPTIONS": {
                "min_length": 8,
            },
        },
        {
            "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
        },
        {
            "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
        },
        {
            "NAME": "users.validators.CustomPasswordValidator",
        },
    ]

    REST_FRAMEWORK = {
        "EXCEPTION_HANDLER": "core.exceptions.custom_exception_handler",
        "DEFAULT_AUTHENTICATION_CLASSES": (
            "rest_framework_simplejwt.authentication.JWTAuthentication",
            "rest_framework.authentication.SessionAuthentication",
        ),
        "DATE_INPUT_FORMATS": [
            "%d/%m/%Y",
        ],
        "DATE_FORMAT": "%d/%m/%Y",
        "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    }
    
    SPECTACULAR_SETTINGS = {
        'TITLE': 'My API',
        'DESCRIPTION': 'Documentação automática da API',
        'VERSION': '1.0.0',
        'SERVE_INCLUDE_SCHEMA': False
    }

    SIMPLE_JWT = {
        "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60*24),
        "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
        "ROTATE_REFRESH_TOKENS": True,
        "BLACKLIST_AFTER_ROTATION": True,
        "AUTH_HEADER_TYPES": ("Bearer",),
        "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken", "rest_framework_simplejwt.tokens.RefreshToken"),
    }

    LOGGING = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "verbose": {
                "format": "{levelname} {asctime} {module} {message}",
                "style": "{",
            },
            "simple": {
                "format": "{levelname} {message}",
                "style": "{",
            },
        },
        "handlers": {
            "console": {
                "level": "DEBUG",  # Configura o nível de log para este handler
                "class": "logging.StreamHandler",
                "formatter": "verbose",
            },
            "file": {
                "level": "WARNING",  # Configura o nível de log para este handler
                "class": "logging.FileHandler",
                "filename": "django_warning.log",
                "formatter": "verbose",
            },
        },
        "loggers": {
            "django": {
                "handlers": ["console", "file"],
                "level": "INFO",  # Configura o nível de log para o logger do Django
                "propagate": True,
            },
            "django.request": {
                "handlers": ["console", "file"],
                "level": "ERROR",  # Configura o nível de log para logs de requisições HTTP
                "propagate": False,
            },
            "django.db.backends": {
                "handlers": ["console", "file"],
                "level": "ERROR",  # Configura o nível de log para consultas SQL
                "propagate": False,
            },
        },
    }

    @staticmethod
    def init_app():
        print("Starting application...")
