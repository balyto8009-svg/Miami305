"""
apps/core/models/envio.py
Ubicación: Miami305/apps/core/models/envio.py

DESCRIPCIÓN:
Modelo para gestionar envíos consolidados (bultos).
Agrupa múltiples paquetes en un solo envío para su transporte a Cuba.
"""
from django.db import models
from django.conf import settings
from django.utils import timezone

from .paquete import Paquete


class Envio(models.Model):
    """
    Envío consolidado que agrupa múltiples paquetes.
    """
    
    ESTADOS = [
        ('pendiente', 'Pendiente de salida'),
        ('consolidado', 'Consolidado'),
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
    fecha_hora_salida = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Fecha y hora de salida del vuelo',
        help_text='Momento en que el vuelo despega; al alcanzarlo el bulto y sus paquetes pasan a En tránsito automáticamente'
    )
    fecha_llegada_cuba = models.DateField(
        null=True,
        blank=True,
        verbose_name='Fecha de llegada a Cuba'
    )
    fecha_hora_llegada = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Fecha y hora de llegada del vuelo',
        help_text='Momento exacto en que se recibió el bulto en la sede de Holguín'
    )
    foto_bulto = models.ImageField(
        upload_to='bultos/fotos/',
        null=True,
        blank=True,
        verbose_name='Foto documental del bulto',
        help_text='Fotografía del maletín cerrado antes del despacho'
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
            self.peso_total = sum(p.peso_total_kg or 0 for p in paquetes)
        else:
            self.peso_total = 0
        self.save()
    
    def get_estado_display(self):
        """Retorna el nombre legible del estado."""
        return dict(self.ESTADOS).get(self.estado, self.estado)

    @property
    def en_curso_o_posterior(self):
        """True si el bulto ya salió (en tránsito o completado)."""
        return (self.estado or '') in ('en_curso', 'completado')

    @property
    def nombre_salida(self):
        """Texto legible de la salida del vuelo (para etiquetas y facturas)."""
        fh = self.fecha_hora_salida or (
            timezone.make_aware(timezone.datetime.combine(self.fecha_salida, timezone.datetime.min.time()))
            if self.fecha_salida else None
        )
        if not fh:
            return None
        return timezone.localtime(fh).strftime('%d/%m/%Y %H:%M')

    def marcar_en_transito(self, usuario=None, automatico=True):
        """
        Pone el bulto En tránsito y propaga el estado a todos sus paquetes.
        """
        if self.estado in ('en_curso', 'completado'):
            return False
        self.estado = 'en_curso'
        if not self.fecha_salida:
            self.fecha_salida = timezone.localdate()
        if not self.fecha_hora_salida:
            self.fecha_hora_salida = timezone.now()
        self.save(update_fields=['estado', 'fecha_salida', 'fecha_hora_salida'])
        self.propagar_estado_paquetes(usuario=usuario, automatico=automatico)
        return True

    def propagar_estado_paquetes(self, usuario=None, automatico=True):
        """
        Sincroniza el estado de cada paquete con el estado del bulto:
        consolidado → 'consolidado', en_curso → 'en_transito',
        completado (recibido en Holguín) → 'en_cuba'.
        Nunca retrocede ni sobrescribe 'entregado'.
        """
        estado_map = {
            'consolidado': 'consolidado',
            'en_curso': 'en_transito',
            'completado': 'en_cuba',
        }
        nuevo = estado_map.get(self.estado)
        if not nuevo:
            return 0
        actualizados = 0
        for p in self.paquetes.all():
            if p.estado == 'entregado':
                continue
            if p.estado != nuevo and p.orden_estado <= p.ORDEN_ESTADOS.index(nuevo):
                p.actualizar_estado(nuevo, usuario, observacion=(
                    'Salida del vuelo (automático)' if self.estado == 'en_curso' and automatico
                    else f'Bulto {self.codigo_bulto}: {self.get_estado_display()}'
                ))
                actualizados += 1
        return actualizados

    def cancelar(self):
        """
        Cancela el bulto: los paquetes vuelven a 'recibido' (sin bulto activo)
        para poder reconsolidarlos en otro vuelo.
        """
        if self.estado == 'cancelado':
            return 0
        self.estado = 'cancelado'
        self.save(update_fields=['estado'])
        liberados = 0
        for p in self.paquetes.all():
            if p.estado in ('consolidado', 'en_transito'):
                p.actualizar_estado('recibido', None,
                                    observacion=f'Bulto {self.codigo_bulto} cancelado: paquete liberado')
                liberados += 1
        return liberados