"""
apps/core/views/destinatario_views.py
Ubicación: Miami305/apps/core/views/destinatario_views.py

DESCRIPCIÓN:
CRUD de destinatarios para el frontend (React) y el admin.
Los destinatarios se vinculan siempre a un cliente remitente.
"""
import json
import logging
from decimal import Decimal, InvalidOperation
from xml.sax.saxutils import escape

from django.core.exceptions import ValidationError
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from apps.core.models import Cliente, Destinatario
from ..permissions.roles import (
    requiere_rol, ROLES_ADMIN, ROLES_MIAMI, ROLES_TODOS,
)


def _rol_de(user):
    return getattr(user, 'rol', '') or ''

logger = logging.getLogger(__name__)

REPARTOS_VALIDOS = dict(Destinatario.REPARTOS_HOLGUIN)
MUNICIPIOS_VALIDOS = dict(Destinatario.MUNICIPIOS_HOLGUIN)


def _a_decimal(valor):
    """Convierte un valor numérico/str a Decimal sin artefactos de flotantes."""
    if valor in (None, ''):
        return None
    try:
        return Decimal(str(valor))
    except (InvalidOperation, ValueError, TypeError):
        return None


def _destinatario_json(d):
    return {
        'id': d.id,
        'cliente_id': d.cliente_id,
        'cliente_nombre': d.cliente.nombre_completo if d.cliente else None,
        'nombre_completo': d.nombre_completo,
        'ci': d.ci,
        'domicilio_exacto': d.domicilio_exacto,
        'referencias': d.referencias,
        'provincia': d.provincia,
        'provincia_display': d.get_provincia_display(),
        'municipio': d.municipio,
        'municipio_display': d.get_municipio_display(),
        'reparto': d.reparto,
        'reparto_display': d.get_reparto_display(),
        'telefono': d.telefono,
        'telefono2': d.telefono2,
        'latitud': float(d.latitud) if d.latitud is not None else None,
        'longitud': float(d.longitud) if d.longitud is not None else None,
        'coordenadas': d.coordenadas,
        'enlace_openstreetmap': d.enlace_openstreetmap,
        'fecha_creacion': d.fecha_creacion.isoformat() if d.fecha_creacion else None,
    }


@csrf_exempt
def destinatarios_list_create(request):
    """
    GET  /api/destinatarios/?cliente=<id>&search=<texto>
    POST /api/destinatarios/  (JSON)
    """
    if request.method == 'GET':
        qs = Destinatario.objects.select_related('cliente').all()

        cliente_id = request.GET.get('cliente')
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)

        search = request.GET.get('search')
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(nombre_completo__icontains=search) |
                Q(ci__icontains=search) |
                Q(telefono__icontains=search) |
                Q(telefono2__icontains=search) |
                Q(domicilio_exacto__icontains=search)
            )

        return JsonResponse([_destinatario_json(d) for d in qs], safe=False)

    if request.method == 'POST':
        # Bloqueo de permisos (Miami crea destinatarios; Holguín solo edita)
        user = getattr(request, 'user', None)
        if not (user and getattr(user, 'is_authenticated', False)
                and (user.is_superuser or _rol_de(user) in ROLES_MIAMI)):
            return JsonResponse({'error': 'No tienes permisos para crear destinatarios'}, status=403)

        try:
            data = json.loads(request.body or b'{}')
        except json.JSONDecodeError:
            return JsonResponse({'error': 'JSON inválido'}, status=400)

        cliente_id = data.get('cliente_id') or data.get('cliente')
        if not cliente_id:
            return JsonResponse({'error': 'Debe indicar el cliente asociado'}, status=400)

        try:
            cliente = Cliente.objects.get(id=cliente_id)
        except Cliente.DoesNotExist:
            return JsonResponse({'error': 'Cliente no encontrado'}, status=404)

        try:
            d = Destinatario(
                cliente=cliente,
                nombre_completo=data.get('nombre_completo', '').strip(),
                ci=data.get('ci') or None,
                domicilio_exacto=data.get('domicilio_exacto', '').strip(),
                referencias=data.get('referencias', ''),
                provincia=data.get('provincia', 'HOL'),
                municipio=data.get('municipio', ''),
                reparto=data.get('reparto', ''),
                telefono=data.get('telefono', ''),
                telefono2=data.get('telefono2') or None,
                latitud=_a_decimal(data.get('latitud')),
                longitud=_a_decimal(data.get('longitud')),
            )
            d.full_clean()
            d.save()
        except ValidationError as e:
            return JsonResponse({'error': 'Datos inválidos', 'detalle': e.message_dict}, status=400)
        except Exception as e:
            logger.error(f'Error al crear destinatario: {e}', exc_info=True)
            return JsonResponse({'error': str(e)}, status=500)

        return JsonResponse(_destinatario_json(d), status=201)

    return JsonResponse({'error': 'Método no permitido'}, status=405)


@csrf_exempt
def destinatarios_gpx(request):
    """
    GET /api/destinatarios/gpx/?reparto=<codigo>&fecha=YYYY-MM-DD

    Exporta todos los destinatarios (con su domicilio, reparto, teléfonos y
    referencias) como archivo GPX 1.1 compatible con Locus Map / OsmAnd para
    mapeo offline en Android.
    """
    if request.method != 'GET':
        return JsonResponse({'error': 'Método no permitido'}, status=405)

    qs = Destinatario.objects.select_related('cliente').filter(
        latitud__isnull=False, longitud__isnull=False
    )

    reparto = request.GET.get('reparto')
    if reparto:
        qs = qs.filter(reparto=reparto)

    fecha = request.GET.get('fecha')
    if fecha:
        # Solo destinatarios con paquetes recibidos en esa fecha
        qs = qs.filter(
            paquetes__fecha_recepcion__date=fecha,
            paquetes__estado__in=['en_cuba', 'entregado'],
        ).distinct()

    waypoints = []
    for d in qs:
        nombre = f"{d.get_reparto_display()} - {d.nombre_completo}"
        cmt = (
            f"ID: {d.id} | {d.nombre_completo} | {d.domicilio_exacto} | "
            f"Reparto: {d.get_reparto_display()} | Tel: {d.telefono}"
        )
        if d.telefono2:
            cmt += f" / {d.telefono2}"
        if d.referencias:
            cmt += f" | Ref: {d.referencias}"
        if d.ci:
            cmt += f" | CI: {d.ci}"

        desc = (
            f"📍 {d.domicilio_exacto}\n"
            f"🏘️ Reparto: {d.get_reparto_display()}, {d.get_municipio_display()}\n"
            f"📞 Tel: {d.telefono}"
        )
        if d.telefono2:
            desc += f" / {d.telefono2}"
        if d.referencias:
            desc += f"\n📝 Ref: {d.referencias}"

        waypoints.append(
            f'  <wpt lat="{d.latitud}" lon="{d.longitud}">\n'
            f'    <name>{escape(nombre)}</name>\n'
            f'    <cmt>{escape(cmt)}</cmt>\n'
            f'    <desc>{escape(desc)}</desc>\n'
            f'  </wpt>'
        )

    ahora = timezone.now().strftime('%Y-%m-%dT%H:%M:%SZ')
    gpx = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<gpx version="1.1" creator="Miami305 Travel" '
        'xmlns="http://www.topografix.com/GPX/1/1">\n'
        f'  <metadata><name>Destinatarios Miami305</name>'
        f'<time>{ahora}</time></metadata>\n'
        + '\n'.join(waypoints) +
        '\n</gpx>'
    )

    respuesta = HttpResponse(gpx, content_type='application/gpx+xml')
    respuesta['Content-Disposition'] = 'attachment; filename="destinatarios_miami305.gpx"'
    return respuesta


@csrf_exempt
def destinatario_detail(request, destinatario_id):
    """
    GET    /api/destinatarios/<id>/
    PUT    /api/destinatarios/<id>/  (JSON)
    DELETE /api/destinatarios/<id>/
    """
    try:
        d = Destinatario.objects.select_related('cliente').get(id=destinatario_id)
    except Destinatario.DoesNotExist:
        return JsonResponse({'error': 'Destinatario no encontrado'}, status=404)

    # Permisos de mutación: editar = todo el personal; eliminar = solo admin
    user = getattr(request, 'user', None)
    if request.method in ('PUT', 'PATCH'):
        if not (user and getattr(user, 'is_authenticated', False)
                and (user.is_superuser or _rol_de(user) in ROLES_TODOS)):
            return JsonResponse({'error': 'Debes iniciar sesión para editar'}, status=403)
    elif request.method == 'DELETE':
        if not (user and getattr(user, 'is_authenticated', False)
                and (user.is_superuser or _rol_de(user) in ROLES_ADMIN)):
            return JsonResponse(
                {'error': 'Solo un administrador puede eliminar destinatarios'},
                status=403,
            )

    if request.method == 'GET':
        return JsonResponse(_destinatario_json(d))

    if request.method in ('PUT', 'PATCH'):
        try:
            data = json.loads(request.body or b'{}')
        except json.JSONDecodeError:
            return JsonResponse({'error': 'JSON inválido'}, status=400)

        campos_simples = [
            'nombre_completo', 'ci', 'domicilio_exacto', 'referencias',
            'provincia', 'municipio', 'reparto', 'telefono', 'telefono2',
        ]
        for campo in campos_simples:
            if campo in data:
                setattr(d, campo, data[campo] or None if campo in ('ci', 'telefono2') else data[campo])

        if 'latitud' in data:
            d.latitud = _a_decimal(data['latitud'])
        if 'longitud' in data:
            d.longitud = _a_decimal(data['longitud'])

        try:
            d.full_clean()
            d.save()
        except ValidationError as e:
            return JsonResponse({'error': 'Datos inválidos', 'detalle': e.message_dict}, status=400)
        except Exception as e:
            logger.error(f'Error al actualizar destinatario: {e}', exc_info=True)
            return JsonResponse({'error': str(e)}, status=500)

        return JsonResponse(_destinatario_json(d))

    if request.method == 'DELETE':
        # Un destinatario con paquetes no debe borrarse (PROTECT)
        if d.paquetes.exists():
            return JsonResponse(
                {'error': 'No se puede eliminar: el destinatario tiene paquetes asociados'},
                status=400
            )
        d.delete()
        return JsonResponse({'success': True})

    return JsonResponse({'error': 'Método no permitido'}, status=405)
