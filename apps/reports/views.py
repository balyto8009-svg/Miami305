"""
apps/reports/views.py
Ubicación: Miami305/apps/reports/views.py

DESCRIPCIÓN:
Vistas para generar y descargar reportes del sistema.
"""
import json
import io
from datetime import datetime, timedelta
from decimal import Decimal

from django.db.models import Count, Sum, Q
from django.http import JsonResponse, HttpResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.models import Cliente, Paquete, Envio
from apps.reports.models import ReporteGenerado
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reporte_envios_mensual(request):
    """
    Reporte de envíos agrupados por mes (últimos 12 meses).
    """
    try:
        hoy = timezone.now().date()
        inicio = hoy - timedelta(days=365)

        datos = (
            Paquete.objects
            .filter(fecha_recepcion__date__gte=inicio)
            .extra(select={'mes': "DATE_TRUNC('month', fecha_recepcion)"})
            .values('mes')
            .annotate(
                total=Count('id'),
                ingresos=Sum('tarifa')
            )
            .order_by('mes')
        )

        resultado = []
        for item in datos:
            resultado.append({
                'mes': item['mes'].strftime('%Y-%m') if item['mes'] else None,
                'total_envios': item['total'],
                'ingresos': float(item['ingresos'] or 0)
            })

        return Response(resultado)
    except Exception as e:
        logger.error(f"Error en reporte_envios_mensual: {e}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reporte_ingresos_detalle(request):
    """
    Reporte detallado de ingresos con filtros por fecha.
    """
    try:
        fecha_inicio = request.GET.get('fecha_inicio')
        fecha_fin = request.GET.get('fecha_fin')

        queryset = Paquete.objects.all()

        if fecha_inicio:
            queryset = queryset.filter(fecha_recepcion__date__gte=fecha_inicio)
        if fecha_fin:
            queryset = queryset.filter(fecha_recepcion__date__lte=fecha_fin)

        # Agrupar por día
        ingresos = (
            queryset
            .extra(select={'dia': "DATE(fecha_recepcion)"})
            .values('dia')
            .annotate(
                total=Sum('tarifa'),
                cantidad=Count('id')
            )
            .order_by('dia')
        )

        resultado = []
        for item in ingresos:
            resultado.append({
                'fecha': item['dia'].isoformat() if item['dia'] else None,
                'total': float(item['total'] or 0),
                'cantidad': item['cantidad']
            })

        return Response(resultado)
    except Exception as e:
        logger.error(f"Error en reporte_ingresos_detalle: {e}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reporte_clientes_top(request):
    """
    Top clientes por cantidad de envíos e ingresos generados.
    """
    try:
        limit = int(request.GET.get('limit', 10))

        clientes = (
            Cliente.objects
            .annotate(
                total_envios=Count('paquetes'),
                total_ingresos=Sum('paquetes__tarifa')
            )
            .filter(total_envios__gt=0)
            .order_by('-total_envios')[:limit]
        )

        resultado = []
        for cliente in clientes:
            resultado.append({
                'id': cliente.id,
                'nombre': cliente.nombre_completo,
                'total_envios': cliente.total_envios,
                'total_ingresos': float(cliente.total_ingresos or 0)
            })

        return Response(resultado)
    except Exception as e:
        logger.error(f"Error en reporte_clientes_top: {e}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reporte_estados(request):
    """
    Distribución de paquetes por estado.
    """
    try:
        estados = (
            Paquete.objects
            .values('estado')
            .annotate(cantidad=Count('id'))
            .order_by('estado')
        )

        mapa_estados = dict(Paquete.ESTADOS)
        resultado = []
        for item in estados:
            resultado.append({
                'estado': item['estado'],
                'nombre': mapa_estados.get(item['estado'], item['estado']),
                'cantidad': item['cantidad']
            })

        return Response(resultado)
    except Exception as e:
        logger.error(f"Error en reporte_estados: {e}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reporte_general_resumen(request):
    """
    Resumen general de métricas clave.
    """
    try:
        total_envios = Paquete.objects.count()
        total_clientes = Cliente.objects.count()
        ingresos_totales = Paquete.objects.aggregate(total=Sum('tarifa'))['total'] or 0

        # Ãltimos 30 días
        hace_30_dias = timezone.now() - timedelta(days=30)
        envios_30d = Paquete.objects.filter(fecha_recepcion__gte=hace_30_dias).count()
        ingresos_30d = Paquete.objects.filter(fecha_recepcion__gte=hace_30_dias).aggregate(
            total=Sum('tarifa')
        )['total'] or 0

        # Envíos por estado
        estados = Paquete.objects.values('estado').annotate(count=Count('id'))
        estado_dict = {item['estado']: item['count'] for item in estados}

        return Response({
            'total_envios': total_envios,
            'total_clientes': total_clientes,
            'ingresos_totales': float(ingresos_totales),
            'envios_ultimos_30_dias': envios_30d,
            'ingresos_ultimos_30_dias': float(ingresos_30d),
            'distribucion_estados': estado_dict
        })
    except Exception as e:
        logger.error(f"Error en reporte_general_resumen: {e}")
        return Response({'error': str(e)}, status=500)

