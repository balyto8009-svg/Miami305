"""
apps/tracking/views_pdf.py
Ubicación: Miami305/apps/tracking/views_pdf.py

DESCRIPCIÓN:
Descarga pública (sin iniciar sesión) de la constancia de rastreo en PDF
de un paquete, a partir de su código de seguimiento.
"""
import logging

from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

from apps.core.models import Paquete
from services.rastreo_pdf_service import RastreoPdfService

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])
def rastreo_pdf(request, codigo):
    """Descarga la constancia de rastreo en PDF (público, por código)."""
    try:
        paquete = Paquete.objects.select_related(
            'cliente', 'destinatario').get(codigo_seguimiento=codigo)
    except Paquete.DoesNotExist:
        return HttpResponse(
            'No existe un paquete con ese código de seguimiento.',
            status=404, content_type='text/plain; charset=utf-8')

    try:
        pdf_bytes = RastreoPdfService().generar(paquete)
    except Exception as e:
        logger.error(f'Error al generar PDF de rastreo de {codigo}: {e}', exc_info=True)
        return HttpResponse(
            'No se pudo generar la constancia. Intente más tarde.',
            status=500, content_type='text/plain; charset=utf-8')

    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = (
        f'inline; filename="rastreo_{paquete.codigo_seguimiento}.pdf"'
    )
    return response
