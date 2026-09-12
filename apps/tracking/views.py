"""
apps/tracking/views.py
Ubicación: Miami305/apps/tracking/views.py

DESCRIPCIÓN:
Vistas para el seguimiento público y privado de envíos.
"""
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from apps.core.models import Paquete
from apps.tracking.models import EventoTracking
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])  # Público
def tracking_publico(request, codigo):
    """
    Endpoint público para que cualquier persona consulte el estado de un paquete.
    """
    try:
        paquete = get_object_or_404(Paquete, codigo_seguimiento=codigo)
        eventos = paquete.eventos_tracking.all().order_by('fecha_hora')

        data = {
            'codigo_seguimiento': paquete.codigo_seguimiento,
            'estado_actual': paquete.get_estado_display(),
            'fecha_actualizacion': paquete.ultima_actualizacion.isoformat(),
            'destinatario': paquete.destinatario.nombre_completo,
            'provincia': paquete.destinatario.get_provincia_display(),
            'eventos': [
                {
                    'fecha': e.fecha_hora.isoformat(),
                    'tipo': e.get_tipo_display(),
                    'descripcion': e.descripcion,
                    'ubicacion': e.ubicacion,
                }
                for e in eventos
            ]
        }
        return Response(data)
    except Exception as e:
        logger.error(f"Error en tracking_publico: {e}")
        return Response({'error': str(e)}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tracking_detallado(request, paquete_id):
    """
    Endpoint privado con información completa de tracking (solo para empleados).
    """
    try:
        paquete = get_object_or_404(Paquete, id=paquete_id)
        eventos = paquete.eventos_tracking.all().order_by('fecha_hora')

        data = {
            'paquete': {
                'id': paquete.id,
                'codigo_seguimiento': paquete.codigo_seguimiento,
                'descripcion': paquete.descripcion,
                'peso': float(paquete.peso_kg),
                'estado': paquete.estado,
                'estado_nombre': paquete.get_estado_display(),
                'fecha_recepcion': paquete.fecha_recepcion.isoformat(),
                'fecha_entrega_real': paquete.fecha_entrega_real.isoformat() if paquete.fecha_entrega_real else None,
            },
            'cliente': {
                'nombre': paquete.cliente.nombre_completo,
                'telefono': paquete.cliente.telefono,
                'email': paquete.cliente.email,
            },
            'destinatario': {
                'nombre': paquete.destinatario.nombre_completo,
                'direccion': paquete.destinatario.domicilio_exacto,
                'telefono': paquete.destinatario.telefono,
            },
            'eventos': [
                {
                    'id': e.id,
                    'fecha': e.fecha_hora.isoformat(),
                    'tipo': e.tipo,
                    'tipo_nombre': e.get_tipo_display(),
                    'descripcion': e.descripcion,
                    'ubicacion': e.ubicacion,
                    'usuario': e.usuario.username if e.usuario else None,
                    'latitud': e.latitud, 
                    'longitud': e.longitud,
                    #'datos_extra': e.datos_extra,
                }
                for e in eventos
            ]
        }
        return Response(data)
    except Exception as e:
        logger.error(f"Error en tracking_detallado: {e}")
        return Response({'error': str(e)}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def agregar_evento_tracking(request, paquete_id):
    """
    Agrega un nuevo evento de tracking a un paquete.
    """
    try:
        paquete = get_object_or_404(Paquete, id=paquete_id)
        tipo = request.data.get('tipo')
        descripcion = request.data.get('descripcion', '')
        ubicacion = request.data.get('ubicacion', '')

        if not tipo or tipo not in dict(EventoTracking.TIPOS):
            return Response({'error': 'Tipo de evento inválido'}, status=400)

        evento = EventoTracking.objects.create(
            paquete=paquete,
            tipo=tipo,
            descripcion=descripcion,
            ubicacion=ubicacion,
            usuario=request.user,
            latitud=request.data.get('latitud'),
            longitud=request.data.get('longitud'),
        )

        # Si el evento es 'entregado', actualizar el estado del paquete
        if tipo == 'entregado':
            paquete.estado = 'entregado'
            paquete.fecha_entrega_real = evento.fecha_hora
            paquete.save()

        return Response({
            'id': evento.id,
            'mensaje': 'Evento agregado correctamente'
        }, status=201)
    except Exception as e:
        logger.error(f"Error en agregar_evento_tracking: {e}")
        return Response({'error': str(e)}, status=500)

