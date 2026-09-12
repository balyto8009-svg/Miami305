"""
services/notificacion_service.py
Ubicación: Miami305/services/notificacion_service.py

DESCRIPCIÓN:
Servicio encargado de gestionar todas las notificaciones del sistema.
Incluye envío de emails, notificaciones push y mensajes internos.
Soporta notificaciones para consolidación de paquetes, cambios de estado,
actualizaciones de tracking y eventos importantes del sistema.
"""
import logging
from typing import List, Optional, Dict
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()


class NotificacionService:
    """
    Servicio centralizado para todas las notificaciones del sistema.
    """
    
    def __init__(self):
        self.default_from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@miami305.com')
    
    def notificar_consolidacion(self, paquetes, codigo_bulto: str) -> bool:
        """
        Notifica a los clientes cuando sus paquetes han sido consolidados.
        
        Args:
            paquetes: Lista de objetos Paquete consolidados
            codigo_bulto: Código del bulto consolidado
            
        Returns:
            bool: True si todas las notificaciones se enviaron correctamente
        """
        if not paquetes:
            logger.warning("No hay paquetes para notificar consolidación")
            return False
        
        exito = True
        for paquete in paquetes:
            cliente = paquete.cliente
            if cliente and cliente.email:
                try:
                    self._enviar_email_consolidacion(cliente, paquete, codigo_bulto)
                    logger.info(f"Notificación enviada a {cliente.email} para paquete {paquete.codigo_seguimiento}")
                except Exception as e:
                    logger.error(f"Error al enviar notificación a {cliente.email}: {e}")
                    exito = False
            else:
                logger.warning(f"Cliente sin email para paquete {paquete.codigo_seguimiento}")
        
        return exito
    
    def _enviar_email_consolidacion(self, cliente, paquete, codigo_bulto: str):
        """
        Envía email de consolidación a un cliente específico.
        """
        asunto = f"ð¦ Tu paquete {paquete.codigo_seguimiento} ha sido consolidado"
        
        # Contexto para la plantilla
        contexto = {
            'cliente': cliente,
            'paquete': paquete,
            'codigo_bulto': codigo_bulto,
            'url_tracking': f"{settings.SITE_URL}/seguimiento/{paquete.codigo_seguimiento}",
            'empresa': getattr(settings, 'EMPRESA_INFO', {}).get('nombre', 'Miami305 Envíos')
        }
        
        # Renderizar plantilla
        mensaje_html = render_to_string('emails/consolidacion.html', contexto)
        mensaje_texto = f"""
        Hola {cliente.nombre_completo},
        
        Tu paquete {paquete.codigo_seguimiento} ha sido consolidado en el bulto {codigo_bulto}.
        
        Puedes hacer seguimiento en: {settings.SITE_URL}/seguimiento/{paquete.codigo_seguimiento}
        
        Gracias por confiar en {getattr(settings, 'EMPRESA_INFO', {}).get('nombre', 'Miami305 Envíos')}.
        """
        
        send_mail(
            subject=asunto,
            message=mensaje_texto,
            from_email=self.default_from_email,
            recipient_list=[cliente.email],
            fail_silently=False,
            html_message=mensaje_html
        )
    
    def notificar_entrega(self, paquete) -> bool:
        """
        Notifica al cliente cuando su paquete ha sido entregado.
        """
        if not paquete or not paquete.cliente or not paquete.cliente.email:
            return False
        
        try:
            asunto = f"â Tu paquete {paquete.codigo_seguimiento} ha sido entregado"
            mensaje = f"""
            Hola {paquete.cliente.nombre_completo},
            
            Tu paquete {paquete.codigo_seguimiento} ha sido entregado exitosamente a {paquete.destinatario.nombre_completo}.
            
            Fecha de entrega: {paquete.fecha_entrega_real.strftime('%d/%m/%Y %H:%M') if paquete.fecha_entrega_real else 'Recientemente'}
            
            Gracias por confiar en Miami305 Envíos.
            """
            
            send_mail(
                subject=asunto,
                message=mensaje,
                from_email=self.default_from_email,
                recipient_list=[paquete.cliente.email],
                fail_silently=False
            )
            return True
        except Exception as e:
            logger.error(f"Error al notificar entrega de {paquete.codigo_seguimiento}: {e}")
            return False
    
    def notificar_cambio_estado(self, paquete, estado_anterior: str) -> bool:
        """
        Notifica al cliente cuando el estado de su paquete cambia.
        """
        if not paquete or not paquete.cliente or not paquete.cliente.email:
            return False
        
        estados_legibles = {
            'recibido': 'Recibido en Miami',
            'consolidado': 'Consolidado en bulto',
            'en_transito': 'En trÃ¡nsito aéreo',
            'en_cuba': 'Llegó a Cuba',
            'entregado': 'Entregado al destinatario'
        }
        
        try:
            asunto = f"ð¬ Actualización de tu paquete {paquete.codigo_seguimiento}"
            mensaje = f"""
            Hola {paquete.cliente.nombre_completo},
            
            El estado de tu paquete {paquete.codigo_seguimiento} ha cambiado:
            
            Estado anterior: {estados_legibles.get(estado_anterior, estado_anterior)}
            Nuevo estado: {estados_legibles.get(paquete.estado, paquete.estado)}
            
            Puedes hacer seguimiento en tiempo real en: {settings.SITE_URL}/seguimiento/{paquete.codigo_seguimiento}
            
            Â¡Gracias por confiar en Miami305 Envíos!
            """
            
            send_mail(
                subject=asunto,
                message=mensaje,
                from_email=self.default_from_email,
                recipient_list=[paquete.cliente.email],
                fail_silently=False
            )
            return True
        except Exception as e:
            logger.error(f"Error al notificar cambio de estado: {e}")
            return False
    
    def notificar_a_administradores(self, mensaje: str, nivel: str = 'info') -> bool:
        """
        Envía notificaciones a los administradores del sistema.
        """
        try:
            admin_emails = User.objects.filter(
                rol__in=['admin', 'supervisor'],
                activo=True
            ).values_list('email', flat=True)
            
            if not admin_emails:
                logger.warning("No hay administradores configurados para notificar")
                return False
            
            asunto = f"[{nivel.upper()}] Alerta del sistema Miami305"
            
            send_mail(
                subject=asunto,
                message=mensaje,
                from_email=self.default_from_email,
                recipient_list=list(admin_emails),
                fail_silently=False
            )
            return True
        except Exception as e:
            logger.error(f"Error al notificar a administradores: {e}")
            return False