"""
apps/core/views/factura_views.py
Ubicación: Miami305/apps/core/views/factura_views.py

DESCRIPCIÓN:
Vista para descargar factura en PDF.
"""
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from apps.core.models import Paquete
from services.factura_service import FacturaService
import logging
import re

logger = logging.getLogger(__name__)


# ✅ QUITAR @login_required temporalmente para desarrollo
# @login_required
@csrf_exempt
def descargar_factura(request, paquete_id):
    """
    Descarga la factura de un paquete en PDF.
    El nombre del archivo es: codigo_seguimiento_nombre_destinatario.pdf
    """
    try:
        paquete = get_object_or_404(Paquete, id=paquete_id)
        
        factura_service = FacturaService()
        pdf_bytes = factura_service.generar_factura(paquete)
        
        # ==========================================
        # ✅ GENERAR NOMBRE DEL ARCHIVO
        # ==========================================
        codigo = paquete.codigo_seguimiento or 'sin-codigo'
        destinatario = ''
        
        if paquete.destinatario and paquete.destinatario.nombre_completo:
            # Limpiar nombre del destinatario (eliminar caracteres especiales)
            destinatario = paquete.destinatario.nombre_completo
            # Eliminar caracteres que no sean letras, números, espacios, guiones o puntos
            destinatario = re.sub(r'[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-\.]', '', destinatario)
            # Reemplazar espacios por guiones bajos
            destinatario = destinatario.replace(' ', '_')
            # Limitar longitud
            if len(destinatario) > 50:
                destinatario = destinatario[:50]
        
        # Si no hay destinatario, usar 'sin_destinatario'
        if not destinatario:
            destinatario = 'sin_destinatario'
        
        # Construir nombre del archivo
        nombre_archivo = f"{codigo}_{destinatario}.pdf"
        
        # ==========================================
        # CREAR RESPUESTA
        # ==========================================
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{nombre_archivo}"'
        return response
        
    except Exception as e:
        logger.error(f"Error al generar factura: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return HttpResponse(f"Error: {e}", status=500)