"""
apps/core/views/paquete_views.py
Ubicación: Miami305/apps/core/views/paquete_views.py

DESCRIPCIÓN:
ViewSet para la gestión de paquetes via API REST.
Incluye endpoints para CRUD, consolidación y cambio de estado.
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from apps.core.models import Paquete
from apps.core.serializers.paquete_serializer import PaqueteSerializer
from apps.core.permissions import IsAdminOrEmployee, IsAdmin
from services.consolidacion_service import ConsolidacionService
import logging

logger = logging.getLogger(__name__)


class PaqueteViewSet(viewsets.ModelViewSet):
    """
    ViewSet para la gestión de paquetes.
    Proporciona endpoints para crear, listar, actualizar y eliminar paquetes,
    además de acciones personalizadas para consolidación y cambio de estado.
    """
    
    queryset = Paquete.objects.all()
    serializer_class = PaqueteSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrEmployee]
    
    def get_queryset(self):
        """Filtra paquetes según estado y búsqueda."""
        queryset = super().get_queryset()
        
        # Filtro por estado
        estado = self.request.query_params.get('estado')
        if estado:
            queryset = queryset.filter(estado=estado)
        
        # Búsqueda por código o cliente
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(codigo_seguimiento__icontains=search) |
                Q(cliente__nombre_completo__icontains=search) |
                Q(destinatario__nombre_completo__icontains=search)
            )
        
        # Ordenar por fecha de recepción descendente
        queryset = queryset.order_by('-fecha_recepcion')
        
        return queryset.select_related('cliente', 'destinatario')
    
    @action(detail=False, methods=['post'], url_path='consolidar')
    def consolidar(self, request):
        """
        Endpoint para consolidar múltiples paquetes en un solo envío.
        
        Request body:
        {
            "paquete_ids": [1, 2, 3],
            "datos_envio": {
                "aerolinea": "American Airlines",
                "fecha_salida": "2026-08-10",
                "observaciones": "Envío consolidado"
            }
        }
        """
        paquete_ids = request.data.get('paquete_ids', [])
        datos_envio = request.data.get('datos_envio', {})
        
        if not paquete_ids:
            return Response(
                {'error': 'Debe seleccionar al menos un paquete'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            consolidacion_service = ConsolidacionService()
            envio = consolidacion_service.consolidar(
                paquete_ids=paquete_ids,
                usuario=request.user,
                datos_envio=datos_envio
            )
            
            return Response({
                'message': 'Paquetes consolidados exitosamente',
                'envio': {
                    'id': envio.id,
                    'codigo_bulto': envio.codigo_bulto,
                    'cantidad_paquetes': envio.cantidad_paquetes,
                    'peso_total': float(envio.peso_total),
                }
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error al consolidar paquetes: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'], url_path='cambiar-estado')
    def cambiar_estado(self, request, pk=None):
        """
        Cambia el estado de un paquete individual.
        
        Request body:
        {
            "estado": "entregado",
            "observacion": "Entregado al destinatario"
        }
        """
        paquete = self.get_object()
        nuevo_estado = request.data.get('estado')
        observacion = request.data.get('observacion', '')
        
        if not nuevo_estado:
            return Response(
                {'error': 'Debe especificar el nuevo estado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar que el estado existe
        estados_validos = dict(Paquete.ESTADOS)
        if nuevo_estado not in estados_validos:
            return Response(
                {'error': f'Estado inválido. Opciones: {", ".join(estados_validos.keys())}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            historial = paquete.actualizar_estado(
                nuevo_estado, 
                request.user, 
                observacion
            )
            
            return Response({
                'message': 'Estado actualizado exitosamente',
                'estado': paquete.estado,
                'estado_display': paquete.get_estado_display(),
                'fecha_actualizacion': historial.fecha_cambio.isoformat() if historial else None
            })
            
        except Exception as e:
            logger.error(f"Error al cambiar estado del paquete {paquete.codigo_seguimiento}: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'], url_path='historial')
    def historial(self, request, pk=None):
        """
        Obtiene el historial de cambios de estado de un paquete.
        """
        paquete = self.get_object()
        historial = paquete.historial.all().select_related('usuario')
        
        data = []
        for registro in historial:
            data.append({
                'fecha': registro.fecha_cambio.isoformat(),
                'estado_anterior': registro.estado_anterior,
                'estado_nuevo': registro.estado_nuevo,
                'usuario': registro.usuario.username,
                'observacion': registro.observacion
            })
        
        return Response(data)