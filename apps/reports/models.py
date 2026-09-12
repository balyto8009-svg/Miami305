"""
apps/reports/models.py
Ubicación: Miami305/apps/reports/models.py

DESCRIPCIÓN:
Modelos para almacenar reportes generados y configuraciones de informes.
"""
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class ReporteGenerado(models.Model):
    """
    Almacena reportes generados (PDF, Excel) para su descarga posterior.
    """
    TIPOS = [
        ('envios_mensual', 'Envíos Mensuales'),
        ('ingresos', 'Ingresos'),
        ('clientes_top', 'Top Clientes'),
        ('personalizado', 'Personalizado'),
    ]
    FORMATOS = [
        ('pdf', 'PDF'),
        ('excel', 'Excel'),
        ('csv', 'CSV'),
    ]

    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reportes')
    tipo = models.CharField(max_length=20, choices=TIPOS)
    formato = models.CharField(max_length=10, choices=FORMATOS)
    fecha_generacion = models.DateTimeField(auto_now_add=True)
    archivo = models.FileField(upload_to='reportes/%Y/%m/%d/', null=True, blank=True)
    parametros = models.JSONField(default=dict, blank=True)  # Filtros aplicados
    descripcion = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ['-fecha_generacion']

    def __str__(self):
        return f"{self.get_tipo_display()} - {self.fecha_generacion.strftime('%d/%m/%Y %H:%M')}"

