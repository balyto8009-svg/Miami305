"""
apps/core/views/cliente_views.py
Ubicación: Miami305/apps/core/views/cliente_views.py

DESCRIPCIÓN:
Vistas para operaciones relacionadas con clientes y destinatarios.
"""
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from apps.core.models import Destinatario
from .destinatario_views import _destinatario_json
import logging

logger = logging.getLogger(__name__)


@login_required
def destinatarios_por_cliente(request, cliente_id):
    """
    API para obtener los destinatarios de un cliente específico.
    Usado por el filtro dinámico en el admin.
    """
    try:
        destinatarios = Destinatario.objects.filter(
            cliente_id=cliente_id
        ).order_by('nombre_completo')
        
        data = [_destinatario_json(d) for d in destinatarios]
        
        return JsonResponse(data, safe=False)
        
    except Exception as e:
        logger.error(f"Error al obtener destinatarios: {e}")
        return JsonResponse({'error': str(e)}, status=500)