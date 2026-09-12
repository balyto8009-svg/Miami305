"""
apps/core/models/historial.py
Ubicación: Miami305/apps/core/models/historial.py

DESCRIPCIÓN:
Modelo para el historial de cambios de estado de paquetes.
Registra cada cambio de estado, quién lo realizó y observaciones,
permitiendo un seguimiento completo de la trazabilidad del paquete.
"""
from django.db import models
from django.contrib.auth import get_user_model
from .paquete import Paquete

User = get_user_model()


class HistorialEstado(models.Model):
    """
    Registro de cambios de estado de un paquete.
    """
    
    paquete = models.ForeignKey(
        Paquete,
        on_delete=models.CASCADE,
        related_name='historial',
        verbose_name='Paquete'
    )
    estado_anterior = models.CharField(
        max_length=20,
        verbose_name='Estado anterior'
    )
    estado_nuevo = models.CharField(
        max_length=20,
        verbose_name='Estado nuevo'
    )
    usuario = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='cambios_estado',
        verbose_name='Usuario'
    )
    fecha_cambio = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de cambio'
    )
    observacion = models.TextField(
        blank=True,
        verbose_name='Observación'
    )
    ip_origen = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='IP de origen'
    )
    
    class Meta:
        verbose_name = 'Historial de estado'
        verbose_name_plural = 'Historial de estados'
        ordering = ['-fecha_cambio']
        indexes = [
            models.Index(fields=['paquete', 'fecha_cambio']),
            models.Index(fields=['estado_nuevo']),
        ]
    
    def __str__(self):
        return f"{self.paquete.codigo_seguimiento}: {self.estado_anterior} â {self.estado_nuevo}"