"""
apps/core/models/envio.py
Ubicación: Miami305/apps/core/models/envio.py

DESCRIPCIÓN:
Modelo para gestionar envíos consolidados (bultos).
Agrupa múltiples paquetes en un solo envío para su transporte a Cuba.
"""
from django.db import models
from django.conf import settings
from .paquete import Paquete


class Envio(models.Model):
    """
    Envío consolidado que agrupa múltiples paquetes.
    """
    
    ESTADOS = [
        ('pendiente', 'Pendiente de salida'),
        ('en_curso', 'En tránsito'),
        ('completado', 'Completado'),
        ('cancelado', 'Cancelado'),
    ]
    
    # ==========================================
    # IDENTIFICACIÓN
    # ==========================================
    codigo_bulto = models.CharField(
        max_length=20,
        unique=True,
        verbose_name='Código de bulto'
    )
    codigo_barras = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Código de barras'
    )
    
    # ==========================================
    # RELACIONES
    # ==========================================
    paquetes = models.ManyToManyField(
        Paquete,
        through='PaqueteEnvio',
        related_name='envios',
        verbose_name='Paquetes'
    )
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='envios_creados',
        verbose_name='Creado por'
    )
    autorizado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='envios_autorizados',
        verbose_name='Autorizado por'
    )
    
    # ==========================================
    # FECHAS
    # ==========================================
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de creación'
    )
    fecha_salida = models.DateField(
        null=True,
        blank=True,
        verbose_name='Fecha de salida'
    )
    fecha_llegada_cuba = models.DateField(
        null=True,
        blank=True,
        verbose_name='Fecha de llegada a Cuba'
    )
    fecha_entrega_completa = models.DateField(
        null=True,
        blank=True,
        verbose_name='Fecha de entrega completa'
    )
    
    # ==========================================
    # TRANSPORTE
    # ==========================================
    aerolinea = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Aerolínea'
    )
    numero_guia_aerea = models.CharField(
        max_length=30,
        blank=True,
        verbose_name='Número de guía aérea'
    )
    numero_vuelo = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='Número de vuelo'
    )
    
    # ==========================================
    # PESOS Y MEDIDAS
    # ==========================================
    peso_total = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        verbose_name='Peso total (kg)'
    )
    peso_volumetrico = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Peso volumétrico (kg)'
    )
    cantidad_paquetes = models.IntegerField(
        verbose_name='Cantidad de paquetes'
    )
    
    # ==========================================
    # COSTOS
    # ==========================================
    costo_envio = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Costo de envío'
    )
    margen = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Margen'
    )
    
    # ==========================================
    # ESTADO Y METADATOS
    # ==========================================
    estado = models.CharField(
        max_length=20,
        choices=ESTADOS,
        default='pendiente',
        verbose_name='Estado'
    )
    observaciones = models.TextField(
        blank=True,
        verbose_name='Observaciones'
    )
    
    class Meta:
        verbose_name = 'Envío'
        verbose_name_plural = 'Envíos'
        ordering = ['-fecha_creacion']
        indexes = [
            models.Index(fields=['codigo_bulto']),
            models.Index(fields=['estado']),
            models.Index(fields=['fecha_creacion']),
        ]
    
    def __str__(self):
        return f"{self.codigo_bulto} - {self.cantidad_paquetes} paquetes"
    
    def calcular_totales(self):
        """
        Actualiza el peso total y cantidad de paquetes automáticamente.
        """
        paquetes = self.paquetes.all()
        self.cantidad_paquetes = paquetes.count()
        if paquetes.exists():
            self.peso_total = sum(p.peso_kg for p in paquetes)
        else:
            self.peso_total = 0
        self.save()
    
    def get_estado_display(self):
        """Retorna el nombre legible del estado."""
        return dict(self.ESTADOS).get(self.estado, self.estado)