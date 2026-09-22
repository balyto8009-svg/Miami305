"""
apps/tracking/urls.py
Ubicación: Miami305/apps/tracking/urls.py

DESCRIPCIÓN:
URLs para el módulo de tracking.
"""
from django.urls import path
from . import views
from .views_pdf import rastreo_pdf

app_name = 'tracking'

urlpatterns = [
    # Público (sin autenticación)
    path('publico/<str:codigo>/', views.tracking_publico, name='tracking_publico'),
    path('publico/<str:codigo>/pdf/', rastreo_pdf, name='rastreo_pdf'),

    # Privado (requiere autenticación)
    path('paquete/<int:paquete_id>/', views.tracking_detallado, name='tracking_detallado'),
    path('paquete/<int:paquete_id>/evento/', views.agregar_evento_tracking, name='agregar_evento'),
]

