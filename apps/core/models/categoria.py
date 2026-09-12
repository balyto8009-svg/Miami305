"""
apps/core/models/categoria.py
Ubicación: Miami305/apps/core/models/categoria.py

DESCRIPCIÓN:
Modelo para gestionar las categorías de productos y sus precios por kg.
"""
from django.db import models
from django.core.validators import MinValueValidator


class Categoria(models.Model):
    """
    Categoría de producto con su precio por kg.
    El nombre es libre (no está limitado a opciones predefinidas).
    """
    
    nombre = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='Nombre de la categoría',
        help_text='Ej: Ropa, Juguetes, Electrónica, etc.'
    )
    precio_por_kg = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        default=0,
        verbose_name='Precio por kg ($)'
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
        verbose_name = 'Categoría'
        verbose_name_plural = 'Categorías'
        ordering = ['nombre']
    
    def __str__(self):
        return f"{self.nombre} - ${self.precio_por_kg}/kg"