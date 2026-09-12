"""
apps/tracking/urls.py
Ubicación: Miami305/apps/tracking/urls.py

DESCRIPCIÓN:
URLs para el módulo de tracking.
"""
from django.urls import path
from . import views

app_name = 'tracking'

urlpatterns = [
    # Público (sin autenticación)
    path('publico/<str:codigo>/', views.tracking_publico, name='tracking_publico'),

    # Privado (requiere autenticación)
    path('paquete/<int:paquete_id>/', views.tracking_detallado, name='tracking_detallado'),
    path('paquete/<int:paquete_id>/evento/', views.agregar_evento_tracking, name='agregar_evento'),
]

