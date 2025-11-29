from django.contrib import admin
from django.contrib.auth.models import Group

# Remover a visualização de Grupos do Django Admin
admin.site.unregister(Group)
