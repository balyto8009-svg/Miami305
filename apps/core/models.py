"""
Modelos principales del sistema Miami305
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings
from decimal import Decimal


class Cliente(models.Model):
    """Modelo de cliente/remitente"""
    
    nombre_completo = models.CharField(
        max_length=100,
        verbose_name='Nombre Completo'
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


class Destinatario(models.Model):
    """Modelo de destinatario en Cuba"""
    
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
    
    MUNICIPIOS_HOLGUIN = [
        ('MAR', 'Mayari'),
        ('HLG', 'Holguin'),
        ('CUT', 'Cueto'),
        ('BAN', 'Banes'),
        ('ANT', 'Antilla'),
        ('CGA', 'Calixto Garcia'),
        ('CAC', 'Cacocum'),
        ('GIB', 'Gibara'),
        ('BAG', 'Baguano'),
        ('MOA', 'Moa'),
        ('STA', 'Sagua de Tánamo'),
        ('UNO', 'Urbano Noris'),
        ('FPA', 'Frank Pais'),
    ]
    
    REPARTOS_HOLGUIN = [
        ('VAL', 'Vista Alegre'),
        ('PBL', 'Piedra Blanca'),
        ('HAR', 'Harlem'),
        ('LEN', 'Lenin'),
        ('PAR', 'Parera'),
        ('CJA', 'Ciudad Jardin'),
        ('ELL', 'El Llano'),
        ('NLL', 'Nuevo Llano'),
        ('API', 'Alcides Pino'),
        ('LGU', 'Los Guillenes'),
        ('LLI', 'Los Lirios'),
        ('ZAY', 'Zayas'),
        ('LQU', 'La Quinta'),
        ('SNF', 'Dagoberto Sanfield'),
        ('PER', 'Peralta'),
        ('LIB', 'Libertad'),
        ('PNU', 'Pueblo Nuevo'),
        ('VN1', 'Villa Nueva'),
        ('VN2', 'Villa Nueva 2'),
        ('HTO', 'Hilda Torres'),
        ('26J', '26 de Julio'),
        ('RQU', 'Ramon Quintana'),
        ('EBA', 'Emilio Barsenas'),
        ('SAN', 'Santiesteban'),
        ('LAD', 'La Aduana'),
        ('NHO', 'Nuevo Holguin'),
        ('PDC', 'Pedro Diaz Coello'),
        ('HAG', 'Hermanos Aguilera'),
        ('PIT', 'Pitaluga'),
        ('MAB', 'Mayabe'),
        ('CMA', 'El Cayo de Mayabe'),
        ('SRA', 'San Rafael'),
        ('LBI', 'Las Biajacas'),
        ('SAR', 'Sao Arriba'),
        ('ACL', 'Aguas Claras'),
        ('EPA', 'El Paraiso'),
        ('SAD', 'San Andres'),
        ('LUZ', 'Luz'),
        ('CC', 'Centro Ciudad'),
        ('JD', 'Jose Diaz'),
        ('SSA', 'Salida San Andres'),
        ('EP', 'Edecio Perez'),
        ('YAR', 'Yareyal'),
        ('ELC', 'El Coco'),
        ('GUI', 'Guirabo'),
        ('18S', '18 de Septiembre'),
        ('AU', 'Alex Urquiola'),
        ('IBE', 'Iberoamericano'),
    ]
    
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name='destinatarios',
        verbose_name='Cliente'
    )
    nombre_completo = models.CharField(
        max_length=100,
        verbose_name='Nombre completo'
    )
    
    # ✅ Carnet de Identidad
    ci = models.CharField(
        max_length=11,
        blank=True,
        null=True,
        verbose_name='Carnet de Identidad',
        help_text='CI del destinatario (ej: 77041919291)'
    )
    
    domicilio_exacto = models.CharField(
        max_length=200,
        verbose_name='Domicilio exacto',
        help_text='Calle, número, entre calles'
    )
    provincia = models.CharField(
        max_length=3,
        choices=PROVINCIAS_CUBA,
        default='HOL',
        verbose_name='Provincia'
    )
    municipio = models.CharField(
        max_length=3,
        choices=MUNICIPIOS_HOLGUIN,
        default='HLG',
        blank=True,
        verbose_name='Municipio'
    )
    reparto = models.CharField(
        max_length=3,
        choices=REPARTOS_HOLGUIN,
        blank=True,
        verbose_name='Reparto'
    )
    
    # ✅ Coordenadas (campos separados)
    latitud = models.DecimalField(
        max_digits=10,
        decimal_places=8,
        null=True,
        blank=True,
        default=20.88691871,
        verbose_name='Latitud'
    )
    longitud = models.DecimalField(
        max_digits=11,
        decimal_places=8,
        null=True,
        blank=True,
        default=-76.25923043,
        verbose_name='Longitud'
    )
    
    # ✅ Teléfonos
    telefono = models.CharField(
        max_length=8,
        verbose_name='Teléfono'
    )
    telefono2 = models.CharField(
        max_length=8,
        blank=True,
        null=True,
        verbose_name='Teléfono 2',
        help_text='Teléfono secundario (opcional)'
    )
    
    referencias = models.TextField(
        blank=True,
        verbose_name='Referencias',
        help_text='Puntos de referencia para la entrega'
    )
    
    # ✅ Metadatos
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        null=True,
        blank=True,
        verbose_name='Fecha de creación'
    )
    ultima_actualizacion = models.DateTimeField(
        auto_now=True,
        null=True,
        blank=True,
        verbose_name='Última actualización'
    )
    
    class Meta:
        verbose_name = 'Destinatario'
        verbose_name_plural = 'Destinatarios'
        ordering = ['nombre_completo']
    
    def __str__(self):
        return f"{self.nombre_completo} - {self.get_provincia_display()}"


class Paquete(models.Model):
    """Modelo de paquete para envío"""

    ORDEN_ESTADOS = ['recibido', 'consolidado', 'en_transito', 'en_cuba', 'entregado']

    ESTADOS = [
        ('recibido', 'Recibido en Miami'),
        ('consolidado', 'Consolidado en bulto'),
        ('en_transito', 'En tránsito aéreo'),
        ('en_cuba', 'Llegó a Cuba'),
        ('entregado', 'Entregado al destinatario'),
    ]

    # Categorías de peso (en pesos_categoria JSON): 1=Alimentos, 2=Medicamentos,
    # 3=Electrodomésticos, 4=Ropa, 5=Otros (misma numeración que apps.core.models.Categoria)
    CAT_ALIMENTOS = '1'
    CAT_MEDICAMENTOS = '2'
    CAT_ELECTRODOMESTICOS = '3'
    CAT_ROPA = '4'
    CAT_OTROS = '5'
    
    # Relaciones
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.PROTECT,
        related_name='paquetes',
        verbose_name='Cliente'
    )
    destinatario = models.ForeignKey(
        Destinatario,
        on_delete=models.PROTECT,
        related_name='paquetes',
        verbose_name='Destinatario'
    )
    
    # ✅ Corrección: usar settings.AUTH_USER_MODEL
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='paquetes_creados',
        verbose_name='Creado por',
        null=True,
        blank=True
    )
    
    # Identificación
    codigo_seguimiento = models.CharField(
        max_length=20,
        unique=True,
        verbose_name='Código de seguimiento'
    )
    
    # Datos del paquete
    descripcion = models.TextField(
        max_length=5000,
        verbose_name='Descripción'
    )
    
    # ✅ Peso total y por categorías
    peso_total_kg = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(500)],
        verbose_name='Peso total (kg)'
    )
    
    peso_alimentos_kg = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Alimentos (kg)'
    )
    peso_medicamentos_kg = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Medicamentos (kg)'
    )
    peso_electrodomesticos_kg = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Electrodomésticos (kg)'
    )
    peso_paq_kg = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Paq (kg)'
    )
    
    # Valor declarado
    valor_declarado = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Valor declarado'
    )
    
    # Tarifa
    tarifa = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
        verbose_name='Tarifa'
    )
    tarifa_original = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
        verbose_name='Tarifa original'
    )
    
    # Estado y fechas
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
    ultima_actualizacion = models.DateTimeField(
        auto_now=True,
        verbose_name='Última actualización'
    )
    
    # Metadatos
    observaciones = models.TextField(
        blank=True,
        verbose_name='Observaciones'
    )
    
    class Meta:
        verbose_name = 'Paquete'
        verbose_name_plural = 'Paquetes'
        ordering = ['-fecha_recepcion']
        indexes = [
            models.Index(fields=['codigo_seguimiento']),
            models.Index(fields=['estado']),
        ]
    
    def __str__(self):
        return f"{self.codigo_seguimiento} - {self.cliente.nombre_completo}"
    
    def calcular_paq(self):
        """Calcula Paq = Total - (Alimentos + Medicamentos + Electrodomésticos)"""
        suma_categorias = (
            self.peso_alimentos_kg +
            self.peso_medicamentos_kg +
            self.peso_electrodomesticos_kg
        )
        self.peso_paq_kg = max(self.peso_total_kg - suma_categorias, 0)
        return self.peso_paq_kg

    # ------------------------------------------------------------------
    # Ciclo de vida del estado
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
        """True si el bulto actual está consolidado o ya en tránsito."""
        b = self.bulto_actual
        if not b:
            return False
        return (b.estado or '') in ('consolidado', 'en_transito', 'en_cuba', 'entregado')

    @property
    def transicion_valida(self):
        """
        True si el estado actual es coherente con su bulto:
        - 'recibido'      → sin bulto activo
        - 'consolidado'   → bulto consolidado
        - 'en_transito'   → bulto en tránsito
        - 'en_cuba'/'entregado' → desembalado en Holguín
        """
        estado = self.estado or 'recibido'
        activo = self.en_bulto_activo
        if estado in ('recibido', 'consolidado', 'en_transito'):
            return activo if estado != 'recibido' else not activo
        return True  # en_cuba / entregado

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
            from apps.core.models.categoria import Categoria
            for cat_id, peso in self.pesos_categoria.items():
                try:
                    cat = Categoria.objects.get(id=int(cat_id))
                    detalle[cat.nombre] = float(peso)
                except Exception:
                    detalle[f'Categoría {cat_id}'] = float(peso)
        except Exception:
            pass
        return detalle