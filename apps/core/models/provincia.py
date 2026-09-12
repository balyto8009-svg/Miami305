"""
apps/core/models/provincia.py
Ubicación: Miami305/apps/core/models/provincia.py

DESCRIPCIÓN:
Modelo para gestionar las provincias y sus costos de envío.
"""
from django.db import models
from django.core.validators import MinValueValidator


class Provincia(models.Model):
    """
    Provincia con su costo de envío fijo.
    """
    
    PROVINCIAS_CUBA = [
        ('PRI', 'Pinar del Río'),
        ('ART', 'Artemisa'),
        ('MAY', 'Mayabeque'),
        ('HAB', 'La Habana'),
        ('MTZ', 'Matanzas'),
        ('CFG', 'Cienfuegos'),
        ('VCL', 'Villa Clara'),
        ('SSP', 'Sancti Spíritus'),
        ('CAV', 'Ciego de Ávila'),
        ('CMG', 'Camagüey'),
        ('LTU', 'Las Tunas'),
        ('HOL', 'Holguín'),
        ('GRM', 'Granma'),
        ('SCU', 'Santiago de Cuba'),
        ('GTM', 'Guantánamo'),
        ('IJV', 'Isla de la Juventud'),
    ]
    
    codigo = models.CharField(
        max_length=3,
        choices=PROVINCIAS_CUBA,
        unique=True,
        verbose_name='Provincia'
    )
    costo_envio = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        default=0,
        verbose_name='Costo de envío ($)',
        help_text='Costo fijo para esta provincia'
    )
    activo = models.BooleanField(
        default=True,
        verbose_name='Activo'
    )
    fecha_actualizacion = models.DateTimeField(
        auto_now=True,
        verbose_name='Última actualización'
    )
    
    class Meta:
        verbose_name = 'Provincia'
        verbose_name_plural = 'Provincias'
        ordering = ['codigo']
    
    def __str__(self):
        return f"{self.get_codigo_display()} - ${self.costo_envio}"
    
    def get_codigo_display(self):
        return dict(self.PROVINCIAS_CUBA).get(self.codigo, self.codigo)