"""
apps/core/views/__init__.py
Ubicación: Miami305/apps/core/views/__init__.py

DESCRIPCIÓN:
Punto de entrada para todas las vistas de la aplicación core.
Exporta las vistas principales para su uso en urls.py y otros módulos.
"""
# Importar desde views.py (archivo principal)
from .views import (
    login_view,
    csrf_view,
    stats_view,
    envios_list_view,
    tracking_view,
    clientes_list_view,
    cliente_create_view,
    cliente_update_view,
    cliente_delete_view,
    reportes_generales_view,
    reportes_envios_por_estado_view,
    reportes_envios_por_mes_view,
    reportes_clientes_top_view,
    reportes_ingresos_view,
)

# Importar desde paquete_views.py
from .paquete_views import PaqueteViewSet

__all__ = [
    'login_view',
    'csrf_view',
    'stats_view',
    'envios_list_view',
    'tracking_view',
    'clientes_list_view',
    'cliente_create_view',
    'cliente_update_view',
    'cliente_delete_view',
    'reportes_generales_view',
    'reportes_envios_por_estado_view',
    'reportes_envios_por_mes_view',
    'reportes_clientes_top_view',
    'reportes_ingresos_view',
    'PaqueteViewSet',
]