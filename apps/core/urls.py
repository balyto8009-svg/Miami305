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
from .views.paquete_views import PaqueteViewSet
from .views.factura_views import descargar_factura
from .views.cliente_views import destinatarios_por_cliente
from .views.categoria_views import (
    categorias_activas,
    categorias_list_create,
    categoria_detail,
    provincias_list,
    provincia_detail,
    sembrar_provincias,
)
from .views.holguin_views import (
    crear_bulto,
    paquetes_para_bulto,
    etiqueta_bulto,
    salir_vuelo,
    cancelar_bulto,
    recibir_bulto,
    paquetes_por_reparto,
    registrar_entrega,
    resumen_holguin,
    bultos_list,
    registros_view,
    registros_entregas_view,
    cambiar_estado_bulto,
)
from .views.destinatario_views import (
    destinatarios_list_create,
    destinatario_detail,
    destinatarios_gpx,
)

# Router para ViewSets
router = DefaultRouter()
router.register(r'paquetes', PaqueteViewSet, basename='paquete')

app_name = 'core'

urlpatterns = [
    # ==========================================
    # DASHBOARD (debe ir ANTES del router: si no, 'stats' es capturado
    # por la ruta de detalle del ViewSet /paquetes/<pk>/ y devuelve 404)
    # ==========================================
    path('paquetes/stats/', stats_view, name='stats'),

    # ==========================================
    # API REST (ViewSets)
    # ==========================================
    path('', include(router.urls)),

    # ==========================================
    # AUTENTICACIÓN
    # ==========================================
    path('login/', login_view, name='login'),
    # Emite la cookie csrftoken (auto-sanación de sesiones antiguas sin reloguear)
    path('csrf/', csrf_view, name='csrf'),
    
    # ==========================================
    # TRACKING (Público)
    # ==========================================
    path('tracking/<str:codigo>/', tracking_view, name='tracking'),
    
    # ==========================================
    # CLIENTES
    # ==========================================
    path('clientes/', clientes_list_view, name='clientes_list'),
    path('clientes/crear/', cliente_create_view, name='cliente_create'),
    path('clientes/<int:id>/editar/', cliente_update_view, name='cliente_update'),
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

    # ==========================================
    # CONFIGURACIÓN: CATEGORÍAS Y TARIFAS (escritura: solo admin/supervisor)
    # ==========================================
    path('categorias/', categorias_list_create, name='categorias_list_create'),
    path('categorias/<int:categoria_id>/', categoria_detail, name='categoria_detail'),
    path('provincias/sembrar/', sembrar_provincias, name='sembrar_provincias'),
    path('provincias/', provincias_list, name='provincias_list'),
    path('provincias/<int:provincia_id>/', provincia_detail, name='provincia_detail'),

    # ==========================================
    # BULTOS / OPERACIONES HOLGUÍN
    # ==========================================
    path('bultos/crear/', crear_bulto, name='crear_bulto'),
    path('bultos/para-bulto/', paquetes_para_bulto, name='paquetes_para_bulto'),
    path('bultos/', bultos_list, name='bultos_list'),
    path('bultos/<int:envio_id>/', etiqueta_bulto, name='bulto_detail'),
    path('bultos/<int:envio_id>/etiqueta/', etiqueta_bulto, name='etiqueta_bulto'),
    path('bultos/<int:envio_id>/salir/', salir_vuelo, name='salir_vuelo'),
    path('bultos/<int:envio_id>/cancelar/', cancelar_bulto, name='cancelar_bulto'),
    path('bultos/recibir/', recibir_bulto, name='recibir_bulto'),
    path('bultos/<int:envio_id>/cambiar-estado/', cambiar_estado_bulto, name='cambiar_estado_bulto'),
    path('holguin/paquetes-por-reparto/', paquetes_por_reparto, name='paquetes_por_reparto'),
    path('holguin/resumen/', resumen_holguin, name='resumen_holguin'),
    path('paquetes/<int:paquete_id>/entrega/', registrar_entrega, name='registrar_entrega'),

    # ==========================================
    # REGISTROS (bitácora de estados y entregas)
    # ==========================================
    path('registros/', registros_view, name='registros'),
    path('registros/entregas/', registros_entregas_view, name='registros_entregas'),

    # ==========================================
    # DESTINATARIOS (CRUD para el frontend)
    # ==========================================
    path('destinatarios/', destinatarios_list_create, name='destinatarios_list_create'),
    path('destinatarios/gpx/', destinatarios_gpx, name='destinatarios_gpx'),
    path('destinatarios/<int:destinatario_id>/', destinatario_detail, name='destinatario_detail'),
]
