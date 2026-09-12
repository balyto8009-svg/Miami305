"""
apps/reports/urls.py
Ubicación: Miami305/apps/reports/urls.py

DESCRIPCIÓN:
URLs para los endpoints de reportes.
"""
from django.urls import path
from . import views

app_name = 'reports'

urlpatterns = [
    path('envios-mensual/', views.reporte_envios_mensual, name='envios_mensual'),
    path('ingresos-detalle/', views.reporte_ingresos_detalle, name='ingresos_detalle'),
    path('clientes-top/', views.reporte_clientes_top, name='clientes_top'),
    path('estados/', views.reporte_estados, name='estados'),
    path('resumen/', views.reporte_general_resumen, name='resumen'),
]

