"""
config/urls.py
Ubicación: Miami305/config/urls.py

DESCRIPCIÓN:
Configuración principal de URLs del proyecto.
Incluye el panel de administración y la API REST.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView

urlpatterns = [
    # Panel de administración
    path('admin/', admin.site.urls),
    
    # API (todas las rutas comienzan con /api/)
    path('api/', include('apps.core.urls')),
    
    # Módulo de reportes
    path('api/reports/', include('apps.reports.urls')),
    
    # Módulo de tracking
    path('api/tracking/', include('apps.tracking.urls')),
    
    # Gestión de usuarios del personal (solo admin/supervisor)
    path('api/users/', include('apps.users.urls')),
    
    # Redirección de la raíz a la API (opcional)
    path('', RedirectView.as_view(url='/api/', permanent=False)),
]

# Servir archivos estáticos y multimedia en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
