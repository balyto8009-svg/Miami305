"""
apps/core/models/tarifa.py
Ubicación: Miami305/apps/core/models/tarifa.py

DESCRIPCIÓN:
Modelo unificado para gestionar tarifas por categoría y provincia.
"""
from django.db import models
from django.core.validators import MinValueValidator


class Categoria(models.Model):
    """
    Modelo para gestionar categorías (se pueden agregar desde el admin).
    """
    nombre = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='Nombre de la categoría'
    )
    activo = models.BooleanField(
        default=True,
        verbose_name='Activo'
    )
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de creación'
    )
    
    class Meta:
        verbose_name = 'Categoría'
        verbose_name_plural = 'Categorías'
        ordering = ['nombre']
    
    def __str__(self):
        return f"{self.icono} {self.nombre}"
    
    def get_nombre_display(self):
        return f"{self.icono} {self.nombre}"


class Tarifa(models.Model):
    """
    Tarifa de envío por categoría y provincia.
    """
    
    # ==========================================
    # PROVINCIAS DE CUBA (FIJAS)
    # ==========================================
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
    
    # ==========================================
    # CAMPOS
    # ==========================================
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.PROTECT,
        related_name='tarifas',
        verbose_name='Categoría'
    )
    provincia = models.CharField(
        max_length=3,
        choices=PROVINCIAS_CUBA,
        verbose_name='Provincia'
    )
    precio_por_kg = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        default=0,
        verbose_name='Precio por kg ($)'
    )
    costo_envio = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        default=0,
        verbose_name='Costo de envío ($)',
        help_text='Costo fijo de envío para esta provincia'
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
        verbose_name = 'Tarifa'
        verbose_name_plural = 'Tarifas'
        ordering = ['categoria__nombre', 'provincia']
        unique_together = ['categoria', 'provincia']
    
    def __str__(self):
        return f"{self.categoria} | {self.get_provincia_display()} → ${self.precio_por_kg}/kg + ${self.costo_envio}"
    
    def get_provincia_display(self):
        return dict(self.PROVINCIAS_CUBA).get(self.provincia, self.provincia)