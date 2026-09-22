"""
apps/core/models/paquete.py
Ubicación: Miami305/apps/core/models/paquete.py

DESCRIPCIÓN:
Modelo principal para gestionar paquetes de envío.
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings
from .cliente import Cliente
from .destinatario import Destinatario


class Paquete(models.Model):
    """
    Modelo de paquete para envío a Cuba.
    """

    ORDEN_ESTADOS = ['recibido', 'consolidado', 'en_transito', 'en_cuba', 'entregado']

    ESTADOS = [
        ('recibido', 'Recibido en Miami'),
        ('consolidado', 'Consolidado en bulto'),
        ('en_transito', 'En tránsito aéreo'),
        ('en_cuba', 'Llegó a Cuba'),
        ('entregado', 'Entregado al destinatario'),
    ]

    # Claves del JSON pesos_categoria (misma numeración que apps.core.models.Categoria)
    CAT_ALIMENTOS = '1'
    CAT_MEDICAMENTOS = '2'
    CAT_ELECTRODOMESTICOS = '3'
    CAT_ROPA = '4'
    CAT_OTROS = '5'
    
    # ==========================================
    # RELACIONES
    # ==========================================
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.PROTECT,
        related_name='paquetes',
        verbose_name='Cliente/Remitente'
    )
    destinatario = models.ForeignKey(
        Destinatario,
        on_delete=models.PROTECT,
        related_name='paquetes',
        verbose_name='Destinatario'
    )
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='paquetes_creados',
        verbose_name='Creado por',
        null=True,
        blank=True
    )
    
    # ==========================================
    # IDENTIFICACIÓN
    # ==========================================
    codigo_seguimiento = models.CharField(
        max_length=20,
        unique=True,
        verbose_name='Código de seguimiento'
    )
    codigo_barras = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Código de barras'
    )
    
    # ==========================================
    # DATOS DEL PAQUETE
    # (5000 caracteres: una factura con decenas de artículos agrupados
    # por categoría puede necesitar ~1500; el límite anterior de 500
    # rechazaba paquetes legítimos)
    # ==========================================
    descripcion = models.TextField(
        max_length=5000,
        blank=True,
        verbose_name='Descripción'
    )
    
    # ✅ PESO TOTAL
    peso_total_kg = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(500)],
        default=0,
        verbose_name='Peso total (kg)'
    )
    
    # ✅ PESOS POR CATEGORÍA (JSON - DINÁMICO)
    pesos_categoria = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Pesos por categoría',
        help_text='Formato: {"categoria_id": peso_kg, "categoria_id2": peso_kg}'
    )
    
    # ==========================================
    # VALOR Y MONEDA
    # ==========================================
    valor_declarado = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Valor declarado'
    )
    moneda = models.CharField(
        max_length=3,
        default='USD',
        verbose_name='Moneda'
    )
    
    # ==========================================
    # TARIFA
    # ==========================================
    tarifa = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
        verbose_name='Tarifa final'
    )
    tarifa_original = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
        verbose_name='Tarifa original'
    )
    
    # ==========================================
    # ESTADO Y FECHAS
    # ==========================================
    estado = models.CharField(
        max_length=20,
        choices=ESTADOS,
        default='recibido',
        verbose_name='Estado'
    )
    fecha_recepcion = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de recepción'
    )
    fecha_entrega_estimada = models.DateField(
        null=True,
        blank=True,
        verbose_name='Fecha de entrega estimada'
    )
    fecha_entrega_real = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Fecha de entrega real'
    )
    
    # ==========================================
    # FOTO DEL PAQUETE LISTO PARA ENVIAR
    # ==========================================
    foto = models.ImageField(
        upload_to='paquetes/fotos/',
        null=True,
        blank=True,
        verbose_name='Foto del paquete'
    )

    # ==========================================
    # METADATOS
    # ==========================================
    observaciones = models.TextField(
        blank=True,
        verbose_name='Observaciones'
    )
    ultima_actualizacion = models.DateTimeField(
        auto_now=True,
        verbose_name='Última actualización'
    )
    
    class Meta:
        verbose_name = 'Paquete'
        verbose_name_plural = 'Paquetes'
        ordering = ['-fecha_recepcion']
        indexes = [
            models.Index(fields=['codigo_seguimiento']),
            models.Index(fields=['estado']),
            models.Index(fields=['fecha_recepcion']),
            models.Index(fields=['cliente', 'estado']),
        ]
    
    def __str__(self):
        return f"{self.codigo_seguimiento} - {self.cliente.nombre_completo}"
    
    def get_peso_categoria(self, categoria_nombre):
        """Obtiene el peso de una categoría específica."""
        # Buscar por nombre (para compatibilidad con código antiguo)
        for cat_id, peso in self.pesos_categoria.items():
            try:
                from .categoria import Categoria
                cat = Categoria.objects.get(id=cat_id)
                if cat.nombre == categoria_nombre:
                    return peso
            except:
                pass
        return 0
    
    def calcular_peso_total(self):
        """Calcula el peso total sumando todas las categorías."""
        total = 0
        for peso in self.pesos_categoria.values():
            total += peso
        self.peso_total_kg = total
        return total
    
    def actualizar_estado(self, nuevo_estado, usuario, observacion=''):
        from .historial import HistorialEstado
        
        estado_anterior = self.estado
        
        if estado_anterior == nuevo_estado:
            return None
        
        self.estado = nuevo_estado
        
        if nuevo_estado == 'entregado':
            from django.utils import timezone
            self.fecha_entrega_real = timezone.now()
        
        self.save()
        
        historial = HistorialEstado.objects.create(
            paquete=self,
            estado_anterior=estado_anterior,
            estado_nuevo=nuevo_estado,
            usuario=usuario,
            observacion=observacion
        )
        
        return historial
    
    def get_estado_display(self):
        return dict(self.ESTADOS).get(self.estado, self.estado)

    # ------------------------------------------------------------------
    # Ciclo de vida del estado (fuente única de verdad del flujo)
    # ------------------------------------------------------------------
    @property
    def orden_estado(self):
        try:
            return self.ORDEN_ESTADOS.index(self.estado)
        except (ValueError, TypeError):
            return -1

    @property
    def bulto_actual(self):
        """Bulto más reciente al que pertenece el paquete (si está en alguno)."""
        return self.envios.order_by('-fecha_creacion').first()

    @property
    def consolidado(self):
        """True si el paquete está dentro de algún bulto."""
        return self.envios.exists()

    @property
    def en_bulto_activo(self):
        """True si el bulto actual está consolidado o más adelante en el flujo."""
        b = self.bulto_actual
        if not b:
            return False
        return (b.estado or '') in ('consolidado', 'en_curso', 'completado', 'cancelado')

    @property
    def transicion_valida(self):
        """
        Coherencia estado del paquete ↔ bulto:
        - 'recibido'    → sin bulto activo
        - 'consolidado' → bulto consolidado
        - 'en_transito' → bulto en tránsito
        - 'en_cuba'/'entregado' → desembalado en Holguín
        """
        estado = self.estado or 'recibido'
        activo = self.en_bulto_activo
        if estado == 'recibido':
            return not activo
        if estado in ('consolidado', 'en_transito'):
            return activo
        return True

    @property
    def peso_desglosado(self):
        """Dict {nombre categoría: peso} desde el JSON pesos_categoria."""
        detalle = {}
        try:
            if not self.pesos_categoria:
                return detalle
        except Exception:
            return detalle
        try:
            from .categoria import Categoria
            for cat_id, peso in self.pesos_categoria.items():
                try:
                    cat = Categoria.objects.get(id=int(cat_id))
                    detalle[cat.nombre] = float(peso)
                except Exception:
                    detalle[f'Categoría {cat_id}'] = float(peso)
        except Exception:
            pass
        return detalle

    @property
    def fecha_salida_vuelo(self):
        """Fecha/hora programada de salida del vuelo (del bulto actual)."""
        b = self.bulto_actual
        if b and b.fecha_salida:
            return b.fecha_salida
        return None