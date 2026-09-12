# apps/core/tasks.py
from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string
from services.pdf_service import PDFService

@shared_task
def generar_factura_pdf_task(paquete_id):
    """Genera factura en PDF asíncronamente"""
    from apps.core.models import Paquete
    try:
        paquete = Paquete.objects.get(id=paquete_id)
        pdf_service = PDFService()
        return pdf_service.generar_factura(paquete)
    except Paquete.DoesNotExist:
        return {'error': 'Paquete no encontrado'}

@shared_task
def enviar_notificacion_email_task(destinatario_email, asunto, mensaje):
    """Envía email de notificación"""
    send_mail(
        asunto,
        mensaje,
        'no-reply@tuempresa.com',
        [destinatario_email],
        fail_silently=False,
    )

@shared_task
def notificar_consolidacion_task(paquete_ids, codigo_bulto):
    """Notifica a todos los clientes de paquetes consolidados"""
    from apps.core.models import Paquete
    paquetes = Paquete.objects.filter(id__in=paquete_ids).select_related('cliente')
    
    for paquete in paquetes:
        cliente = paquete.cliente
        if cliente.email:
            asunto = f"Tu paquete {paquete.codigo_seguimiento} ha sido consolidado"
            mensaje = f"""
            Hola {cliente.nombre_completo},
            
            Tu paquete {paquete.codigo_seguimiento} ha sido consolidado en el bulto {codigo_bulto}.
            Puedes hacer seguimiento en: https://tuempresa.com/seguimiento/{paquete.codigo_seguimiento}
            
            Gracias por confiar en nosotros.
            """
            enviar_notificacion_email_task.delay(cliente.email, asunto, mensaje)