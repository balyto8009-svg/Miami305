"""
apps/core/views/categoria_views.py
Ubicación: Miami305/apps/core/views/categoria_views.py

DESCRIPCIÓN:
Vistas para la gestión de Categorías (precio por kg) y Provincias
(costo de envío fijo). La lectura es para todo el personal; la escritura
es exclusiva de administradores y supervisores.

NOTA: los montos definidos aquí son los que usa services/tarifa_service.py
para calcular la tarifa de cada paquete.
"""
import json
import logging

from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from apps.core.models import Categoria, Provincia

logger = logging.getLogger(__name__)


def _categoria_json(c):
    return {
        'id': c.id,
        'nombre': c.nombre,
        'precio_por_kg': str(c.precio_por_kg),
        'activo': c.activo,
    }


def _provincia_json(p):
    return {
        'id': p.id,
        'codigo': p.codigo,
        'nombre': p.get_codigo_display(),
        'costo_envio': str(p.costo_envio),
        'activo': p.activo,
    }


@csrf_exempt
def categorias_activas(request):
    """
    API para obtener categorías activas (usada por el modal de nuevo paquete).
    """
    try:
        categorias = Categoria.objects.filter(activo=True).order_by('nombre')
        return JsonResponse([_categoria_json(c) for c in categorias], safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ==========================================
# CATEGORÍAS (escritura: solo admin/supervisor)
# ==========================================

@csrf_exempt
def categorias_list_create(request):
    """
    GET  /api/categorias/   → lista completa (activas e inactivas)
    POST /api/categorias/   → crear (solo admin/supervisor)
    """
    if request.method == 'GET':
        categorias = Categoria.objects.all().order_by('nombre')
        return JsonResponse([_categoria_json(c) for c in categorias], safe=False)

    user = getattr(request, 'user', None)
    if request.method == 'POST':
        if not (user and getattr(user, 'is_authenticated', False)
                and (user.is_superuser or user.rol in ('admin', 'supervisor'))):
            return JsonResponse({'error': 'Solo un administrador puede crear categorías'}, status=403)

        try:
            data = json.loads(request.body or b'{}')
        except json.JSONDecodeError:
            return JsonResponse({'error': 'JSON inválido'}, status=400)

        nombre = (data.get('nombre') or '').strip()
        if not nombre:
            return JsonResponse({'error': 'El nombre es obligatorio'}, status=400)

        try:
            precio = round(float(data.get('precio_por_kg') or 0), 2)
        except (TypeError, ValueError):
            return JsonResponse({'error': 'precio_por_kg inválido'}, status=400)
        if precio < 0:
            return JsonResponse({'error': 'El precio no puede ser negativo'}, status=400)

        if Categoria.objects.filter(nombre__iexact=nombre).exists():
            return JsonResponse({'error': 'Ya existe una categoría con ese nombre'}, status=400)

        categoria = Categoria.objects.create(nombre=nombre, precio_por_kg=precio)
        return JsonResponse(_categoria_json(categoria), status=201)

    return JsonResponse({'error': 'Método no permitido'}, status=405)


@csrf_exempt
def categoria_detail(request, categoria_id):
    """
    PUT/PATCH /api/categorias/<id>/  → editar (solo admin/supervisor)
    DELETE    /api/categorias/<id>/  → desactivar (solo admin/supervisor)
    """
    try:
        categoria = Categoria.objects.get(id=categoria_id)
    except Categoria.DoesNotExist:
        return JsonResponse({'error': 'Categoría no encontrada'}, status=404)

    user = getattr(request, 'user', None)
    if request.method in ('PUT', 'PATCH', 'DELETE'):
        if not (user and getattr(user, 'is_authenticated', False)
                and (user.is_superuser or user.rol in ('admin', 'supervisor'))):
            return JsonResponse({'error': 'Solo un administrador puede modificar categorías'}, status=403)

    if request.method in ('PUT', 'PATCH'):
        try:
            data = json.loads(request.body or b'{}')
        except json.JSONDecodeError:
            return JsonResponse({'error': 'JSON inválido'}, status=400)

        if 'nombre' in data:
            nombre = (data['nombre'] or '').strip()
            if not nombre:
                return JsonResponse({'error': 'El nombre es obligatorio'}, status=400)
            if (Categoria.objects.exclude(id=categoria.id)
                    .filter(nombre__iexact=nombre).exists()):
                return JsonResponse({'error': 'Ya existe una categoría con ese nombre'}, status=400)
            categoria.nombre = nombre

        if 'precio_por_kg' in data:
            try:
                precio = round(float(data['precio_por_kg']), 2)
            except (TypeError, ValueError):
                return JsonResponse({'error': 'precio_por_kg inválido'}, status=400)
            if precio < 0:
                return JsonResponse({'error': 'El precio no puede ser negativo'}, status=400)
            categoria.precio_por_kg = precio

        if 'activo' in data:
            categoria.activo = bool(data['activo'])

        try:
            categoria.full_clean()
            categoria.save()
        except ValidationError as e:
            return JsonResponse({'error': 'Datos inválidos', 'detalle': e.message_dict}, status=400)

        return JsonResponse(_categoria_json(categoria))

    if request.method == 'DELETE':
        # Desactivación suave: las categorías con historial no deben perderse
        if categoria.paquetes.exists():
            categoria.activo = False
            categoria.save()
            return JsonResponse({'success': True, 'desactivada': True,
                                 'detalle': 'Categoría con paquetes asociados: desactivada en lugar de eliminada'})
        categoria.delete()
        return JsonResponse({'success': True})

    return JsonResponse({'error': 'Método no permitido'}, status=405)


# ==========================================
# PROVINCIAS / TARIFAS DE ENVÍO (escritura: solo admin/supervisor)
# ==========================================

@csrf_exempt
def provincias_list(request):
    """
    GET  /api/provincias/   → lista de provincias con su costo de envío
    POST /api/provincias/   → crear (solo admin/supervisor)
    """
    if request.method == 'GET':
        provincias = Provincia.objects.all().order_by('codigo')
        return JsonResponse([_provincia_json(p) for p in provincias], safe=False)

    user = getattr(request, 'user', None)
    if request.method == 'POST':
        if not (user and getattr(user, 'is_authenticated', False)
                and (user.is_superuser or user.rol in ('admin', 'supervisor'))):
            return JsonResponse({'error': 'Solo un administrador puede crear provincias'}, status=403)

        try:
            data = json.loads(request.body or b'{}')
        except json.JSONDecodeError:
            return JsonResponse({'error': 'JSON inválido'}, status=400)

        codigo = (data.get('codigo') or '').strip().upper()
        codigos_validos = {c for c, _ in Provincia.PROVINCIAS_CUBA}
        if codigo not in codigos_validos:
            return JsonResponse({'error': f'Código de provincia inválido: {codigo}'}, status=400)

        if Provincia.objects.filter(codigo=codigo).exists():
            return JsonResponse({'error': 'Ya existe esa provincia'}, status=400)

        try:
            costo = round(float(data.get('costo_envio') or 0), 2)
        except (TypeError, ValueError):
            return JsonResponse({'error': 'costo_envio inválido'}, status=400)
        if costo < 0:
            return JsonResponse({'error': 'El costo no puede ser negativo'}, status=400)

        provincia = Provincia.objects.create(codigo=codigo, costo_envio=costo)
        return JsonResponse(_provincia_json(provincia), status=201)

    return JsonResponse({'error': 'Método no permitido'}, status=405)


@csrf_exempt
def provincia_detail(request, provincia_id):
    """
    PUT/PATCH /api/provincias/<id>/  → editar costo de envío (solo admin/supervisor)
    DELETE    /api/provincias/<id>/  → desactivar (solo admin/supervisor)
    """
    try:
        provincia = Provincia.objects.get(id=provincia_id)
    except Provincia.DoesNotExist:
        return JsonResponse({'error': 'Provincia no encontrada'}, status=404)

    user = getattr(request, 'user', None)
    if request.method in ('PUT', 'PATCH', 'DELETE'):
        if not (user and getattr(user, 'is_authenticated', False)
                and (user.is_superuser or user.rol in ('admin', 'supervisor'))):
            return JsonResponse({'error': 'Solo un administrador puede modificar tarifas'}, status=403)

    if request.method in ('PUT', 'PATCH'):
        try:
            data = json.loads(request.body or b'{}')
        except json.JSONDecodeError:
            return JsonResponse({'error': 'JSON inválido'}, status=400)

        if 'costo_envio' in data:
            try:
                costo = round(float(data['costo_envio']), 2)
            except (TypeError, ValueError):
                return JsonResponse({'error': 'costo_envio inválido'}, status=400)
            if costo < 0:
                return JsonResponse({'error': 'El costo no puede ser negativo'}, status=400)
            provincia.costo_envio = costo

        if 'activo' in data:
            provincia.activo = bool(data['activo'])

        provincia.save()
        return JsonResponse(_provincia_json(provincia))

    if request.method == 'DELETE':
        provincia.activo = False
        provincia.save()
        return JsonResponse({'success': True, 'desactivada': True})

    return JsonResponse({'error': 'Método no permitido'}, status=405)


@csrf_exempt
def sembrar_provincias(request):
    """
    POST /api/provincias/sembrar/
    Crea las 16 provincias de Cuba si no existen (solo admin/supervisor).
    """
    user = getattr(request, 'user', None)
    if not (user and getattr(user, 'is_authenticated', False)
            and (user.is_superuser or user.rol in ('admin', 'supervisor'))):
        return JsonResponse({'error': 'Solo un administrador puede sembrar provincias'}, status=403)

    creadas = 0
    for codigo, _nombre in Provincia.PROVINCIAS_CUBA:
        _, created = Provincia.objects.get_or_create(codigo=codigo)
        if created:
            creadas += 1
    return JsonResponse({'success': True, 'creadas': creadas})