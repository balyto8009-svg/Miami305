"""
apps/tracking/admin.py
Ubicación: Miami305/apps/tracking/admin.py

DESCRIPCIÓN:
Configuración del panel de administración para tracking.
"""
from django.contrib import admin
from .models import EventoTracking


@admin.register(EventoTracking)
class EventoTrackingAdmin(admin.ModelAdmin):
    list_display = ['paquete', 'tipo', 'fecha_hora', 'usuario']
    list_filter = ['tipo', 'fecha_hora']
    search_fields = ['paquete__codigo_seguimiento', 'descripcion']
    readonly_fields = ['fecha_hora']
    fieldsets = (
        ('Información del evento', {
            'fields': ('paquete', 'tipo', 'descripcion', 'ubicacion', 'latitud', 'longitud')
        }),
        ('Metadatos', {
            'fields': ('fecha_hora', 'usuario')
        }),
    )