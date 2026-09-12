"""
apps/reports/admin.py
Ubicación: Miami305/apps/reports/admin.py

DESCRIPCIÓN:
Configuración del panel de administración para reports.
"""
from django.contrib import admin
from .models import ReporteGenerado


@admin.register(ReporteGenerado)
class ReporteGeneradoAdmin(admin.ModelAdmin):
    list_display = ['tipo', 'formato', 'usuario', 'fecha_generacion']
    list_filter = ['tipo', 'formato', 'fecha_generacion']
    search_fields = ['usuario__username', 'descripcion']
    readonly_fields = ['fecha_generacion']

