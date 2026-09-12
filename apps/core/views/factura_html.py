"""
apps/core/views/factura_html.py
Ubicación: Miami305/apps/core/views/factura_html.py

DESCRIPCIÓN:
Vista para mostrar la factura en HTML con el diseño de la guía.
"""
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.contrib.auth.decorators import login_required
from apps.core.models import Paquete
import logging

logger = logging.getLogger(__name__)


@login_required
def factura_html(request, paquete_id):
    """
    Muestra la factura en HTML con el diseño de Miami305 Travel.
    """
    try:
        paquete = get_object_or_404(Paquete, id=paquete_id)
        
        context = {
            'paquete': paquete,
            'cliente': paquete.cliente,
            'destinatario': paquete.destinatario,
            'empresa': {
                'nombre': 'MIAMI 305 TRAVEL',
                'direccion': '9160 NW 122ND ST SUITE 22, HIALEAH GARDENS FL 33018',
                'telefono': '305-440-5171',
                'email': 'miami305travel@gmail.com'
            }
        }
        
        html_content = render_to_string('factura.html', context)
        return HttpResponse(html_content)
        
    except Exception as e:
        logger.error(f"Error al generar factura HTML: {e}")
        return HttpResponse(f"Error: {e}", status=500)