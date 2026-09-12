"""
apps/core/models/destinatario.py
Ubicación: Miami305/apps/core/models/destinatario.py

DESCRIPCIÓN:
Modelo de Destinatario para envíos a Cuba.
"""
from django.db import models
from django.core.exceptions import ValidationError
from ..validators import validar_nombre_completo, validar_telefono_cuba
from .cliente import Cliente


class Destinatario(models.Model):
    """
    Modelo de destinatario en Cuba.
    """
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
    ]

    # ==========================================
    # RELACIONES
    # ==========================================
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name='destinatarios',
        verbose_name='Cliente'
    )

    # ==========================================
    # DATOS PERSONALES
    # ==========================================
    nombre_completo = models.CharField(
        max_length=100,
        verbose_name='Nombre completo',
        validators=[validar_nombre_completo],
        help_text='Debe incluir al menos un nombre y dos apellidos. Ejemplo: "María García García"'
    )
    
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

    # ==========================================
    # UBICACIÓN
    # ==========================================
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

    # ==========================================
    # COORDENADAS
    # ==========================================
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

    # ==========================================
    # CONTACTO
    # ==========================================
    telefono = models.CharField(
        max_length=12,
        verbose_name='Teléfono',
        validators=[validar_telefono_cuba],
        help_text='Ingrese 8 dígitos (ejemplo: 53556701). El +53 se agregará automáticamente.'
    )
    
    telefono2 = models.CharField(
        max_length=12,
        blank=True,
        null=True,
        verbose_name='Teléfono 2',
        validators=[validar_telefono_cuba],
        help_text='Teléfono secundario (opcional)'
    )

    referencias = models.TextField(
        blank=True,
        verbose_name='Referencias',
        help_text='Puntos de referencia para la entrega'
    )

    # ==========================================
    # METADATOS (conservados para futuro)
    # ==========================================
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
        indexes = [
            models.Index(fields=['provincia', 'municipio']),
            models.Index(fields=['telefono']),
        ]

    def __str__(self):
        return f"{self.nombre_completo} - {self.get_provincia_display()}"

    def clean(self):
        super().clean()
        
        if self.provincia != 'HOL' and self.municipio:
            raise ValidationError({
                'municipio': 'El municipio solo puede seleccionarse cuando la provincia es Holguín.'
            })
        
        if self.provincia == 'HOL' and not self.municipio:
            raise ValidationError({
                'municipio': 'Debe seleccionar un municipio cuando la provincia es Holguín.'
            })
        
        if self.municipio and self.municipio != 'HLG' and self.reparto:
            raise ValidationError({
                'reparto': 'El reparto solo puede seleccionarse cuando el municipio es Holguín.'
            })
        
        if self.municipio == 'HLG' and not self.reparto:
            raise ValidationError({
                'reparto': 'Debe seleccionar un reparto cuando el municipio es Holguín.'
            })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def get_provincia_display(self):
        return dict(self.PROVINCIAS_CUBA).get(self.provincia, self.provincia)

    def get_municipio_display(self):
        return dict(self.MUNICIPIOS_HOLGUIN).get(self.municipio, self.municipio)

    def get_reparto_display(self):
        return dict(self.REPARTOS_HOLGUIN).get(self.reparto, self.reparto)

    @property
    def coordenadas(self):
        if self.latitud and self.longitud:
            return {
                'lat': float(self.latitud),
                'lng': float(self.longitud)
            }
        return None

    @property
    def enlace_openstreetmap(self):
        if self.latitud and self.longitud:
            return f"https://www.openstreetmap.org/?mlat={self.latitud}&mlon={self.longitud}&zoom=17"
        return None