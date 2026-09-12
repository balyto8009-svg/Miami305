"""
apps/tracking/models.py
Ubicación: Miami305/apps/tracking/models.py

DESCRIPCIÓN:
Modelos para el seguimiento de paquetes en tiempo real.
Incluye eventos de tracking y notificaciones.
"""
from django.db import models
from django.contrib.auth import get_user_model
from apps.core.models import Paquete

User = get_user_model()


class EventoTracking(models.Model):
    """
    Evento de seguimiento de un paquete (historial detallado).
    """
    TIPOS = [
        ('creacion', 'Paquete creado'),
        ('recibido', 'Recibido en Miami'),
        ('consolidado', 'Consolidado en bulto'),
        ('en_transito', 'En tránsito aéreo'),
        ('llegada_cuba', 'Llegó a Cuba'),
        ('en_reparto', 'En reparto local'),
        ('entregado', 'Entregado'),
        ('incidencia', 'Incidencia'),
    ]

    paquete = models.ForeignKey(Paquete, on_delete=models.CASCADE, related_name='eventos_tracking')
    tipo = models.CharField(max_length=20, choices=TIPOS)
    descripcion = models.TextField(blank=True)
    ubicacion = models.CharField(max_length=200, blank=True, help_text="Ciudad o lugar donde ocurrió el evento")
    fecha_hora = models.DateTimeField(auto_now_add=True)
    usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    
    # Campos de coordenadas (reemplaza el uso de 'datos_extra' para ubicación)
    latitud = models.DecimalField(
        max_digits=10, 
        decimal_places=8, 
        null=True, 
        blank=True,
        verbose_name="Latitud (WGS84)"
    )
    longitud = models.DecimalField(
        max_digits=11, 
        decimal_places=8, 
        null=True, 
        blank=True,
        verbose_name="Longitud (WGS84)"
    )
    

    class Meta:
        ordering = ['-fecha_hora']
        indexes = [
            models.Index(fields=['paquete', 'fecha_hora']),
            models.Index(fields=['tipo']),
        ]

    def __str__(self):
        return f"{self.paquete.codigo_seguimiento} - {self.get_tipo_display()} - {self.fecha_hora.strftime('%d/%m/%Y %H:%M')}"

