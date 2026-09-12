"""
apps/core/urls.py
Ubicación: Miami305/apps/core/urls.py

DESCRIPCIÓN:
Configuración de URLs para la aplicación core.
Define los endpoints de la API REST incluyendo autenticación,
dashboard, tracking, clientes y reportes.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    login_view,
    stats_view,
    envios_list_view,
    tracking_view,
    clientes_list_view,
    cliente_create_view,
    cliente_delete_view,
    reportes_generales_view,
    reportes_envios_por_estado_view,
    reportes_envios_por_mes_view,
    reportes_clientes_top_view,
    reportes_ingresos_view,
)
from .views.paquete_views import PaqueteViewSet
from .views.factura_views import descargar_factura  # ← NUEVO
from .views.cliente_views import destinatarios_por_cliente  # ← Agregar import
from .views.categoria_views import categorias_activas

# Router para ViewSets
router = DefaultRouter()
router.register(r'paquetes', PaqueteViewSet, basename='paquete')

app_name = 'core'

urlpatterns = [
    # ==========================================
    # API REST (ViewSets)
    # ==========================================
    path('', include(router.urls)),
    
    # ==========================================
    # AUTENTICACIÓN
    # ==========================================
    path('login/', login_view, name='login'),
    
    # ==========================================
    # DASHBOARD
    # ==========================================
    path('paquetes/stats/', stats_view, name='stats'),
    path('paquetes/', envios_list_view, name='envios_list'),
    
    # ==========================================
    # TRACKING (Público)
    # ==========================================
    path('tracking/<str:codigo>/', tracking_view, name='tracking'),
    
    # ==========================================
    # CLIENTES
    # ==========================================
    path('clientes/', clientes_list_view, name='clientes_list'),
    path('clientes/crear/', cliente_create_view, name='cliente_create'),
    path('clientes/<int:id>/eliminar/', cliente_delete_view, name='cliente_delete'),
    
    # ==========================================
    # REPORTES
    # ==========================================
    path('reportes/generales/', reportes_generales_view, name='reportes_generales'),
    path('reportes/envios-por-estado/', reportes_envios_por_estado_view, name='reportes_envios_por_estado'),
    path('reportes/envios-por-mes/', reportes_envios_por_mes_view, name='reportes_envios_por_mes'),
    path('reportes/clientes-top/', reportes_clientes_top_view, name='reportes_clientes_top'),
    path('reportes/ingresos/', reportes_ingresos_view, name='reportes_ingresos'),
    # Factura
    path('paquete/<int:paquete_id>/factura/', descargar_factura, name='descargar_factura'),
   
    # ==========================================
    # API PARA DESTINATARIOS POR CLIENTE
    # ==========================================
    # ✅ URL PARA FILTRO DE DESTINATARIOS
    path('destinatarios/por-cliente/<int:cliente_id>/', 
         destinatarios_por_cliente, 
         name='destinatarios_por_cliente'),
    # ✅ API para obtener categorías activas
    path('categorias/activas/', categorias_activas, name='categorias_activas'),
]
