"""
apps/core/models/cliente.py
Ubicación: Miami305/apps/core/models/cliente.py

DESCRIPCIÓN:
Modelo de Cliente/Remitente para el sistema de envíos Miami305.
"""
from django.db import models
from ..validators import validar_nombre_completo

class Cliente(models.Model):
    """
    Modelo de cliente/remitente para envíos a Cuba.
    """
    nombre_completo = models.CharField(
        max_length=100,
        verbose_name='Nombre completo',
        validators=[validar_nombre_completo],  # â Agregar validador
        help_text='Debe incluir al menos un nombre y dos apellidos. Ejemplo: "Juan Pérez Pérez"'
    )
    domicilio = models.CharField(
        max_length=200,
        blank=True,
        verbose_name='Domicilio'
    )
    telefono = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='Teléfono'
    )
    email = models.EmailField(
        max_length=100,
        blank=True,
        verbose_name='Correo electrónico'
    )
    fecha_registro = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de registro'
    )
    activo = models.BooleanField(
        default=True,
        verbose_name='Activo'
    )
    
    class Meta:
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
        ordering = ['-fecha_registro']
    
    def __str__(self):
        return self.nombre_completo