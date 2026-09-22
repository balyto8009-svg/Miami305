"""
apps/core/views/holguin_views.py
Ubicación: Miami305/apps/core/views/holguin_views.py

DESCRIPCIÓN:
Vistas del flujo operativo de la Sede Holguín:
1. Confección de bultos (código imprimible, foto documental, herencia del código).
2. Recepción/desembalaje del bulto al llegar el vuelo del aeropuerto.
3. Clasificación de paquetes pendientes por reparto para agilizar entregas.
4. Registro de entrega con constancia fotográfica estampada (marca de agua).
"""
import json
import logging

from django.core.files.base import ContentFile
from django.db import transaction
from django.db.models import Count, Q
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from datetime import timedelta

from apps.core.models import Paquete, Envio, PaqueteEnvio
from apps.tracking.models import EventoTracking
from services.codigo_service import CodigoService
from services.marca_agua_service import estampar_constancia

logger = logging.getLogger(__name__)

# Peso recomendado por bulto para las frecuencias aéreas semanales
PESO_OBJETIVO_BULTO_KG = 50


def _paquete_json(paquete):
    """Serializador liviano y consistente para las pantallas operativas."""
    dest = paquete.destinatario
    return {
        'id': paquete.id,
        'codigo_seguimiento': paquete.codigo_seguimiento,
        'descripcion': paquete.descripcion,
        'peso_total_kg': float(paquete.peso_total_kg or 0),
        'estado': paquete.estado,
        'estado_display': paquete.get_estado_display(),
        'fecha_recepcion': paquete.fecha_recepcion.isoformat() if paquete.fecha_recepcion else None,
        'cliente': {
            'id': paquete.cliente_id,
            'nombre_completo': paquete.cliente.nombre_completo if paquete.cliente else None,
            'telefono': paquete.cliente.telefono if paquete.cliente else None,
        },
        'destinatario': {
            'id': dest.id,
            'nombre_completo': dest.nombre_completo,
            'ci': dest.ci,
            'domicilio_exacto': dest.domicilio_exacto,
            'referencias': dest.referencias,
            'provincia': dest.provincia,
            'provincia_display': dest.get_provincia_display(),
            'municipio': dest.municipio,
            'municipio_display': dest.get_municipio_display(),
            'reparto': dest.reparto,
            'reparto_display': dest.get_reparto_display(),
            'telefono': dest.telefono,
            'telefono2': dest.telefono2,
            'latitud': float(dest.latitud) if dest.latitud is not None else None,
            'longitud': float(dest.longitud) if dest.longitud is not None else None,
        } if dest else None,
    }


# ==========================================
# 1. CONFECCIÓN DE BULTOS (SEDE MIAMI)
# ==========================================

@csrf_exempt
def crear_bulto(request):
    """
    Consolida paquetes 'recibidos' en un bulto con código único e imprimible.

    multipart/form-data:
        paquete_ids[]: ids de paquetes
        aerolinea, numero_vuelo, observaciones, fecha_salida (opcionales)
        foto_bulto: imagen documental del maletín (opcional)
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)

    paquete_ids = request.POST.getlist('paquete_ids') or request.POST.getlist('paquete_ids[]')
    if not paquete_ids:
        return JsonResponse({'error': 'Debe seleccionar al menos un paquete'}, status=400)

    try:
        paquete_ids = [int(pid) for pid in paquete_ids]
    except (TypeError, ValueError):
        return JsonResponse({'error': 'IDs de paquetes inválidos'}, status=400)

    try:
        with transaction.atomic():
            # Bloquear los paquetes recibidos solicitados
            paquetes = list(
                Paquete.objects.select_for_update().filter(
                    id__in=paquete_ids, estado='recibido'
                )
            )
            if len(paquetes) != len(set(paquete_ids)):
                faltantes = set(paquete_ids) - {p.id for p in paquetes}
                return JsonResponse({
                    'error': f'Paquetes no disponibles o ya consolidados: {sorted(faltantes)}'
                }, status=400)

            peso_total = sum(p.peso_total_kg or 0 for p in paquetes)

            # Fecha + hora de salida programada del vuelo (para el paso
            # automático a En tránsito, corrección #10)
            fecha_salida = request.POST.get('fecha_salida') or None
            hora_salida = request.POST.get('hora_salida') or None
            fecha_hora_salida = None
            if fecha_salida:
                try:
                    hh, mm = (hora_salida.split(':')[:2] if hora_salida else ('00', '00'))
                    from datetime import datetime as _dt
                    from datetime import date as _date
                    fecha_salida = _dt.strptime(fecha_salida, '%Y-%m-%d').date()
                    fecha_hora_salida = timezone.make_aware(
                        _dt.strptime(f'{fecha_salida} {hh}:{mm}', '%Y-%m-%d %H:%M')
                    )
                except (ValueError, TypeError):
                    fecha_salida = None
                    fecha_hora_salida = None

            codigo_service = CodigoService()
            envio = Envio.objects.create(
                codigo_bulto=codigo_service.generar_codigo_bulto(),
                aerolinea=request.POST.get('aerolinea', ''),
                numero_vuelo=request.POST.get('numero_vuelo', ''),
                numero_guia_aerea=request.POST.get('numero_guia_aerea', ''),
                fecha_salida=fecha_salida,
                fecha_hora_salida=fecha_hora_salida,
                peso_total=peso_total,
                cantidad_paquetes=len(paquetes),
                estado='consolidado',
                creado_por=request.user if request.user.is_authenticated else None,
                observaciones=request.POST.get('observaciones', ''),
            )

            if request.FILES.get('foto_bulto'):
                envio.foto_bulto = request.FILES['foto_bulto']
                envio.save(update_fields=['foto_bulto'])

            for idx, paquete in enumerate(paquetes, 1):
                # Cada paquete hereda el código del bulto en su observación
                # y queda registrado en la tabla intermedia (auditoría).
                PaqueteEnvio.objects.create(
                    paquete=paquete,
                    envio=envio,
                    numero_orden=idx,
                )
                paquete.actualizar_estado(
                    'consolidado', request.user,
                    f'Consolidado en bulto {envio.codigo_bulto} '
                    f'(peso bulto: {peso_total:.2f} kg)'
                )
                EventoTracking.objects.create(
                    paquete=paquete,
                    tipo='consolidado',
                    descripcion=f'Consolidado en bulto {envio.codigo_bulto}',
                    ubicacion='Sede Miami',
                    usuario=request.user if request.user.is_authenticated else None,
                )

        return JsonResponse({
            'id': envio.id,
            'codigo_bulto': envio.codigo_bulto,
            'cantidad_paquetes': envio.cantidad_paquetes,
            'peso_total': float(envio.peso_total),
            'aerolinea': envio.aerolinea,
            'numero_vuelo': envio.numero_vuelo,
            'fecha_salida': envio.fecha_salida.isoformat() if envio.fecha_salida else None,
            'fecha_hora_salida': envio.fecha_hora_salida.isoformat() if envio.fecha_hora_salida else None,
            'estado': envio.estado,
            'estado_display': envio.get_estado_display(),
            'foto_bulto': envio.foto_bulto.url if envio.foto_bulto else None,
            'paquetes': [_paquete_json(p) for p in paquetes],
        }, status=201)

    except Exception as e:
        logger.error(f'Error al crear bulto: {e}', exc_info=True)
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def paquetes_para_bulto(request):
    """Paquetes 'recibidos' listos para consolidar (Sede Miami)."""
    paquetes = (
        Paquete.objects
        .filter(estado='recibido')
        .select_related('cliente', 'destinatario')
        .order_by('fecha_recepcion')
    )
    return Response([_paquete_json(p) for p in paquetes])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def etiqueta_bulto(request, envio_id):
    """
    Devuelve el detalle imprimible de la etiqueta del bulto, incluida la
    lista de paquetes que heredan su código.
    """
    try:
        envio = Envio.objects.prefetch_related('paquetes__cliente', 'paquetes__destinatario').get(id=envio_id)
    except Envio.DoesNotExist:
        return Response({'error': 'Bulto no encontrado'}, status=404)

    return Response({
        'id': envio.id,
        'codigo_bulto': envio.codigo_bulto,
        'aerolinea': envio.aerolinea,
        'numero_vuelo': envio.numero_vuelo,
        'fecha_creacion': envio.fecha_creacion.isoformat(),
        'fecha_salida': envio.fecha_salida.isoformat() if envio.fecha_salida else None,
        'cantidad_paquetes': envio.cantidad_paquetes,
        'peso_total': float(envio.peso_total),
        'estado': envio.estado,
        'estado_display': envio.get_estado_display(),
        'foto_bulto': envio.foto_bulto.url if envio.foto_bulto else None,
        'paquetes': [_paquete_json(p) for p in envio.paquetes.all()],
    })


# ==========================================
# 2. RECEPCIÓN DEL VUELO (SEDE HOLGUÍN)
# ==========================================

@csrf_exempt
def recibir_bulto(request):
    """
    Lee el código del bulto llegado del aeropuerto, marca su recepción en la
    sede de Holguín y desembala los paquetes (estado 'en_cuba').

    POST JSON o form-data: { codigo_bulto: 'BUL-2026-0001', hora_llegada?: ISO }
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)

    codigo = request.POST.get('codigo_bulto')
    if not codigo and request.body:
        try:
            codigo = json.loads(request.body).get('codigo_bulto')
        except (json.JSONDecodeError, AttributeError):
            codigo = None
    if not codigo:
        return JsonResponse({'error': 'Debe escanear o escribir el código del bulto'}, status=400)

    try:
        envio = Envio.objects.get(codigo_bulto=codigo.strip())
    except Envio.DoesNotExist:
        return JsonResponse({'error': f'No existe un bulto con código {codigo}'}, status=404)

    usuario = request.user if request.user.is_authenticated else None

    with transaction.atomic():
        envio.estado = 'completado'
        envio.fecha_llegada_cuba = timezone.now().date()
        envio.fecha_hora_llegada = timezone.now()
        # Corrección #13: al llegar a Holguín se programa la entrega dentro
        # de los próximos 3 días para todos los paquetes del bulto.
        fecha_entrega_estimada = timezone.localdate() + timedelta(days=3)
        envio.save()

        for paquete in envio.paquetes.all():
            if paquete.estado in ('consolidado', 'en_transito'):
                paquete.fecha_entrega_estimada = fecha_entrega_estimada
                paquete.save(update_fields=['fecha_entrega_estimada'])
                paquete.actualizar_estado('en_cuba', usuario, f'Recibido en sede Holguín (bulto {envio.codigo_bulto}). Entrega estimada: {fecha_entrega_estimada.strftime("%d/%m/%Y")}')
                EventoTracking.objects.create(
                    paquete=paquete,
                    tipo='llegada_cuba',
                    descripcion=f'Bulto {envio.codigo_bulto} recibido en sede Holguín',
                    ubicacion='Holguín, Cuba',
                    usuario=usuario,
                )

    return JsonResponse({
        'message': f'Bulto {envio.codigo_bulto} recibido y desembalado: {envio.cantidad_paquetes} paquetes listos para reparto',
        'codigo_bulto': envio.codigo_bulto,
        'fecha_hora_llegada': envio.fecha_hora_llegada.isoformat(),
        'fecha_entrega_estimada': fecha_entrega_estimada.isoformat(),
        'cantidad_paquetes': envio.cantidad_paquetes,
    })


# ==========================================
# 2.b SALIDA AUTOMÁTICA Y CANCELACIÓN DEL BULTO
# ==========================================

@csrf_exempt
def salir_vuelo(request, envio_id):
    """
    Pone el bulto En tránsito manualmente (p. ej. el vuelo despegó antes
    de la hora programada). Propaga 'en_transito' a todos sus paquetes.
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    try:
        envio = Envio.objects.get(id=envio_id)
    except Envio.DoesNotExist:
        return JsonResponse({'error': 'Bulto no encontrado'}, status=404)

    usuario = request.user if request.user.is_authenticated else None
    actualizados = envio.marcar_en_transito(usuario=usuario, automatico=False)
    return JsonResponse({
        'message': f'Bulto {envio.codigo_bulto} En tránsito: {actualizados} paquetes actualizados',
        'estado': envio.estado,
        'paquetes_actualizados': actualizados,
    })


@csrf_exempt
def cancelar_bulto(request, envio_id):
    """
    Cancela manualmente el envío de un bulto antes de la salida: los paquetes
    vuelven a 'recibido' para poder reconsolidarlos en otro vuelo.
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    try:
        envio = Envio.objects.get(id=envio_id)
    except Envio.DoesNotExist:
        return JsonResponse({'error': 'Bulto no encontrado'}, status=404)

    if envio.estado in ('en_curso', 'completado'):
        return JsonResponse({
            'error': f'No se puede cancelar: el bulto ya está {envio.get_estado_display()}'
        }, status=400)

    liberados = envio.cancelar()
    return JsonResponse({
        'message': f'Bulto {envio.codigo_bulto} cancelado: {liberados} paquetes devueltos a Recibido',
        'estado': envio.estado,
        'paquetes_liberados': liberados,
    })


# ==========================================
# 2.c LISTA DE BULTOS (SEGUIMIENTO #15)
# ==========================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def bultos_list(request):
    """
    Lista de bultos para la página Seguimiento de Bultos.
    Filtros opcionales: ?estado=consolidado|en_curso|completado|cancelado
    """
    qs = Envio.objects.order_by('-fecha_creacion')
    estado = request.GET.get('estado')
    if estado:
        qs = qs.filter(estado=estado)
    return Response([{
        'id': e.id,
        'codigo_bulto': e.codigo_bulto,
        'estado': e.estado,
        'estado_display': e.get_estado_display(),
        'aerolinea': e.aerolinea,
        'numero_vuelo': e.numero_vuelo,
        'numero_guia_aerea': e.numero_guia_aerea,
        'fecha_creacion': e.fecha_creacion.isoformat(),
        'fecha_salida': e.fecha_salida.isoformat() if e.fecha_salida else None,
        'fecha_hora_salida': e.fecha_hora_salida.isoformat() if e.fecha_hora_salida else None,
        'fecha_llegada_cuba': e.fecha_llegada_cuba.isoformat() if e.fecha_llegada_cuba else None,
        'cantidad_paquetes': e.cantidad_paquetes,
        'peso_total': float(e.peso_total or 0),
    } for e in qs])


# ==========================================
# 3. CLASIFICACIÓN POR REPARTO (SEDE HOLGUÍN)
# ==========================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def paquetes_por_reparto(request):
    """
    Agrupa los paquetes recibidos en Cuba (pendientes de entrega) por reparto
    para planificar rutas de entrega más rápidas.
    """
    qs = (
        Paquete.objects
        .filter(estado='en_cuba')
        .select_related('cliente', 'destinatario')
        .order_by('destinatario__reparto', 'fecha_recepcion')
    )

    # Filtros opcionales por fecha y reparto (para el mapa Android/GPX)
    fecha = request.GET.get('fecha')
    if fecha:
        qs = qs.filter(fecha_recepcion__date=fecha)
    reparto = request.GET.get('reparto')
    if reparto:
        qs = qs.filter(destinatario__reparto=reparto)

    grupos = {}
    for paquete in qs:
        dest = paquete.destinatario
        codigo_reparto = dest.reparto if dest and dest.reparto else 'SIN_REPARTO'
        nombre_reparto = dest.get_reparto_display() if dest and dest.reparto else 'Sin reparto asignado'
        grupos.setdefault(
            codigo_reparto,
            {'codigo_reparto': codigo_reparto, 'nombre_reparto': nombre_reparto, 'paquetes': []}
        )['paquetes'].append(_paquete_json(paquete))

    resultado = []
    for grupo in grupos.values():
        grupo['total_paquetes'] = len(grupo['paquetes'])
        grupo['peso_total_kg'] = sum(p['peso_total_kg'] for p in grupo['paquetes'])
        resultado.append(grupo)

    resultado.sort(key=lambda g: -g['total_paquetes'])
    return Response(resultado)


# ==========================================
# 4. ENTREGA CON CONSTANCIA FOTOGRÁFICA
# ==========================================

@csrf_exempt
def registrar_entrega(request, paquete_id):
    """
    Registra la entrega de un paquete en la puerta del destinatario.
    La foto obligatoria se estampa con "ENTREGADO + día + fecha + hora" y se
    almacena como evidencia inalterable (constancia de entrega).

    multipart/form-data: { foto_entrega: File, observacion?: str,
                           latitud?: float, longitud?: float }
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)

    try:
        paquete = Paquete.objects.select_related('cliente', 'destinatario').get(id=paquete_id)
    except Paquete.DoesNotExist:
        return JsonResponse({'error': 'Paquete no encontrado'}, status=404)

    foto = request.FILES.get('foto_entrega')
    if not foto:
        return JsonResponse({'error': 'La foto de constancia de entrega es obligatoria'}, status=400)

    usuario = request.user if request.user.is_authenticated else None

    try:
        # 1. Estampar la constancia con la fecha/hora exacta de la entrega
        momento_entrega = timezone.now()
        imagen_bytes = foto.read()
        imagen_estampada = estampar_constancia(
            imagen_bytes,
            momento=momento_entrega,
            codigo_paquete=paquete.codigo_seguimiento,
        )

        # 2. Cambiar estado del paquete (registra historial + fecha_entrega_real)
        paquete.actualizar_estado(
            'entregado', usuario,
            request.POST.get('observacion', 'Entregado al destinatario con constancia fotográfica')
        )

        # 3. Guardar la evidencia en el evento de tracking
        evento = EventoTracking.objects.create(
            paquete=paquete,
            tipo='entregado',
            descripcion=request.POST.get('observacion', 'Entrega realizada y verificada con foto estampada'),
            ubicacion=f"{paquete.destinatario.get_reparto_display()}, {paquete.destinatario.get_municipio_display()}",
            usuario=usuario,
            latitud=request.POST.get('latitud') or None,
            longitud=request.POST.get('longitud') or None,
        )
        evento.foto_entrega.save(
            f"entrega_{paquete.codigo_seguimiento}_{momento_entrega.strftime('%Y%m%d_%H%M%S')}.jpg",
            ContentFile(imagen_estampada),
            save=True,
        )

        return JsonResponse({
            'message': f'Paquete {paquete.codigo_seguimiento} entregado. Constancia fotográfica estampada y almacenada.',
            'paquete': _paquete_json(paquete),
            'evento_id': evento.id,
            'foto_entrega': evento.foto_entrega.url if evento.foto_entrega else None,
        })

    except Exception as e:
        logger.error(f'Error al registrar entrega del paquete {paquete_id}: {e}', exc_info=True)
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def resumen_holguin(request):
    """Panel resumen de la operación en Holguín (entregas del día, pendientes)."""
    hoy = timezone.now().date()
    entregados_hoy = Paquete.objects.filter(estado='entregado', fecha_entrega_real__date=hoy).count()
    pendientes = Paquete.objects.filter(estado='en_cuba').count()
    bultos_recientes = Envio.objects.order_by('-fecha_creacion')[:5].values(
        'id', 'codigo_bulto', 'estado', 'cantidad_paquetes', 'peso_total', 'fecha_hora_llegada'
    )
    return Response({
        'entregados_hoy': entregados_hoy,
        'pendientes_entrega': pendientes,
        'bultos_recientes': list(bultos_recientes),
    })


# ==========================================
# 5. REGISTROS (BITÁCORA #15)
# ==========================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def registros_view(request):
    """
    Bitácora de cambios de estado de los paquetes (HistorialEstado).
    Filtros: ?fecha=YYYY-MM-DD&estado=<clave>
    """
    from apps.core.models.historial import HistorialEstado

    qs = HistorialEstado.objects.select_related('paquete', 'usuario').order_by('-fecha_cambio')
    fecha = request.GET.get('fecha')
    if fecha:
        qs = qs.filter(fecha_cambio__date=fecha)
    estado = request.GET.get('estado')
    if estado:
        qs = qs.filter(estado_nuevo=estado)

    return Response([{
        'id': h.id,
        'fecha': h.fecha_cambio.isoformat(),
        'paquete': {
            'id': h.paquete_id,
            'codigo_seguimiento': h.paquete.codigo_seguimiento,
        },
        'estado_anterior': h.estado_anterior,
        'estado_nuevo': h.estado_nuevo,
        'usuario': {'username': h.usuario.username} if h.usuario else None,
        'observacion': h.observacion,
    } for h in qs[:500]])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def registros_entregas_view(request):
    """
    Entregas realizadas (eventos de tracking tipo 'entregado').
    Filtro: ?fecha=YYYY-MM-DD
    """
    qs = EventoTracking.objects.filter(
        tipo='entregado'
    ).select_related('paquete__destinatario', 'usuario').order_by('-fecha_hora')

    fecha = request.GET.get('fecha')
    if fecha:
        qs = qs.filter(fecha_hora__date=fecha)

    return Response([{
        'id': ev.id,
        'fecha': ev.fecha_hora.isoformat(),
        'paquete': {
            'id': ev.paquete_id,
            'codigo_seguimiento': ev.paquete.codigo_seguimiento,
        },
        'destinatario': {
            'nombre_completo': ev.paquete.destinatario.nombre_completo,
            'reparto_display': ev.paquete.destinatario.get_reparto_display(),
        } if ev.paquete.destinatario else None,
        'usuario': {'username': ev.usuario.username} if ev.usuario else None,
        'foto_entrega': ev.foto_entrega.url if ev.foto_entrega else None,
    } for ev in qs[:500]])
