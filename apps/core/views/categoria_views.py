"""
apps/core/views/categoria_views.py
Ubicación: Miami305/apps/core/views/categoria_views.py

DESCRIPCIÓN:
Vistas para obtener categorías vía API.
"""
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from apps.core.models import Categoria


@csrf_exempt
def categorias_activas(request):
    """
    API para obtener categorías activas.
    """
    try:
        categorias = Categoria.objects.filter(activo=True).order_by('nombre').values('id', 'nombre')
        return JsonResponse(list(categorias), safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)