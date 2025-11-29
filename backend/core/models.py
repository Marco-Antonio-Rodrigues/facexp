from django.db import models
from django.utils.translation import gettext_lazy as _


class STATES(models.TextChoices):
    ACRE = "AC", "AC"
    ALAGOAS = "AL", "AL"
    AMAPA = "AP", "AP"
    AMAZONAS = "AM", "AM"
    BAHIA = "BA", "BA"
    CEARA = "CE", "CE"
    DISTRITO_FEDERAL = "DF", "DF"
    ESPIRITO_SANTO = "ES", "ES"
    GOIAS = "GO", "GO"
    MARANHAO = "MA", "MA"
    MATO_GROSSO = "MT", "MT"
    MATO_GROSSO_DO_SUL = "MS", "MS"
    MINAS_GERAIS = "MG", "MG"
    PARA = "PA", "PA"
    PARAIBA = "PB", "PB"
    PARANA = "PR", "PR"
    PERNAMBUCO = "PE", "PE"
    PIAUI = "PI", "PI"
    RIO_DE_JANEIRO = "RJ", "RJ"
    RIO_GRANDE_DO_NORTE = "RN", "RN"
    RIO_GRANDE_DO_SUL = "RS", "RS"
    RONDONIA = "RO", "RO"
    RORAIMA = "RR", "RR"
    SANTA_CATARINA = "SC", "SC"
    SAO_PAULO = "SP", "SP"
    SERGIPE = "SE", "SE"
    TOCANTINS = "TO", "TO"

class Address(models.Model):
    state = models.CharField(_("state"), max_length=2, choices=STATES.choices)
    city = models.CharField(_("cidade"), max_length=30)
    zip_code = models.CharField(_("zip code"), max_length=10)
    neighborhood = models.CharField(_("neighborhood"), max_length=30)
    street = models.CharField(_("street"), max_length=50)
    number = models.CharField(_("number"), max_length=10)
    complement = models.CharField(_("complement"), max_length=25, blank=True, null=True)

    class Meta:
        abstract = True
