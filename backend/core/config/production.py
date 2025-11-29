import os

from .base import ConfigBase


class ProductionConfig(ConfigBase):
    DEBUG = False
    ALLOWED_HOSTS = ["*"]

    def __init__(self):
        super().__init__()
        print("Production environment.")
