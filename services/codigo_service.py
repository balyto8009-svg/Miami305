from django.utils import timezone
from apps.core.models import Paquete, Envio, Factura

class CodigoService:
    """Servicio para generar códigos únicos para diferentes entidades"""
    
    def generar_codigo_seguimiento(self) -> str:
        """Genera código de seguimiento para paquete: PKG-YYYY-NNNN"""
        year = timezone.now().year
        ultimo = Paquete.objects.filter(
            codigo_seguimiento__startswith=f'PKG-{year}'
        ).order_by('codigo_seguimiento').last()
        
        if ultimo:
            numero = int(ultimo.codigo_seguimiento.split('-')[-1]) + 1
        else:
            numero = 1
        
        return f"PKG-{year}-{numero:04d}"
    
    def generar_codigo_bulto(self) -> str:
        """Genera código para bulto consolidado: BUL-YYYY-NNNN"""
        year = timezone.now().year
        ultimo = Envio.objects.filter(
            codigo_bulto__startswith=f'BUL-{year}'
        ).order_by('codigo_bulto').last()
        
        if ultimo:
            numero = int(ultimo.codigo_bulto.split('-')[-1]) + 1
        else:
            numero = 1
        
        return f"BUL-{year}-{numero:04d}"
    
    def generar_numero_factura(self) -> str:
        """Genera número de factura: FAC-YYYY-NNNN"""
        year = timezone.now().year
        ultimo = Factura.objects.filter(
            numero_factura__startswith=f'FAC-{year}'
        ).order_by('numero_factura').last()
        
        if ultimo:
            numero = int(ultimo.numero_factura.split('-')[-1]) + 1
        else:
            numero = 1
        
        return f"FAC-{year}-{numero:04d}"