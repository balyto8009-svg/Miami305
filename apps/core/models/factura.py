"""
apps/core/models/factura.py
Ubicación: Miami305/apps/core/models/factura.py

DESCRIPCIÓN:
Modelo para gestionar facturas de envíos.
Almacena información de facturación para cada paquete,
incluyendo montos, fechas y estado de pago.
"""
from django.db import models
from django.core.validators import MinValueValidator
from .paquete import Paquete


class Factura(models.Model):
    """
    Factura asociada a un paquete de envío.
    """
    
    ESTADOS = [
        ('pendiente', 'Pendiente de pago'),
        ('pagada', 'Pagada'),
        ('cancelada', 'Cancelada'),
        ('anulada', 'Anulada'),
    ]
    
    # Relación con paquete
    paquete = models.ForeignKey(
        Paquete,
        on_delete=models.PROTECT,
        related_name='facturas',
        verbose_name='Paquete'
    )
    
    # Identificación
    numero_factura = models.CharField(
        max_length=20,
        unique=True,
        verbose_name='Número de factura'
    )
    
    # Montos
    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name='Subtotal'
    )
    impuesto = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name='Impuesto'
    )
    descuento = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name='Descuento'
    )
    total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name='Total'
    )
    
    # Fechas
    fecha_emision = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de emisión'
    )
    fecha_vencimiento = models.DateField(
        null=True,
        blank=True,
        verbose_name='Fecha de vencimiento'
    )
    fecha_pago = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Fecha de pago'
    )
    
    # Estado y metadatos
    estado = models.CharField(
        max_length=20,
        choices=ESTADOS,
        default='pendiente',
        verbose_name='Estado'
    )
    metodo_pago = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Método de pago'
    )
    referencia_pago = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Referencia de pago'
    )
    observaciones = models.TextField(
        blank=True,
        verbose_name='Observaciones'
    )
    
    class Meta:
        verbose_name = 'Factura'
        verbose_name_plural = 'Facturas'
        ordering = ['-fecha_emision']
        indexes = [
            models.Index(fields=['numero_factura']),
            models.Index(fields=['estado']),
            models.Index(fields=['fecha_emision']),
        ]
    
    def __str__(self):
        return f"{self.numero_factura} - {self.paquete.codigo_seguimiento}"
    
    def marcar_como_pagada(self):
        """Marca la factura como pagada y registra la fecha."""
        from django.utils import timezone
        self.estado = 'pagada'
        self.fecha_pago = timezone.now()
        self.save()
    
    def get_monto_pendiente(self):
        """Calcula el monto pendiente de pago."""
        if self.estado == 'pagada':
            return 0
        return self.total