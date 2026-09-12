from typing import List, Dict, Optional
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from apps.core.models import Paquete, Envio, PaqueteEnvio
from services.codigo_service import CodigoService
from services.notificacion_service import NotificacionService
from services.pdf_service import PDFService

class ConsolidacionService:
    """Servicio para consolidar paquetes en un único bulto de envío"""
    
    def __init__(self):
        self.codigo_service = CodigoService()
        self.notificacion_service = NotificacionService()
        self.pdf_service = PDFService()
    
    @transaction.atomic
    def consolidar(self, paquete_ids: List[int], usuario, datos_envio: Dict) -> Envio:
        """
        Consolida una lista de paquetes en un solo envío
        
        Args:
            paquete_ids: Lista de IDs de paquetes a consolidar
            usuario: Usuario que realiza la operación
            datos_envio: Diccionario con datos adicionales del envío
        
        Returns:
            Envio: El objeto envío consolidado creado
        
        Raises:
            ValidationError: Si algún paquete no es válido para consolidar
        """
        # 1. Validar que todos los paquetes existen y están en estado 'recibido'
        paquetes = Paquete.objects.select_for_update().filter(
            id__in=paquete_ids,
            estado='recibido'
        )
        
        if paquetes.count() != len(paquete_ids):
            invalidos = set(paquete_ids) - set(paquetes.values_list('id', flat=True))
            raise ValidationError(
                f"Los siguientes paquetes no están disponibles: {invalidos}"
            )
        
        # 2. Verificar que no haya paquetes duplicados en otros envíos pendientes
        paquetes_consolidados = Paquete.objects.filter(
            id__in=paquete_ids,
            envios__estado__in=['pendiente', 'en_curso']
        ).exists()
        
        if paquetes_consolidados:
            raise ValidationError(
                "Algunos paquetes ya están en envíos pendientes o en curso"
            )
        
        # 3. Calcular peso total y cantidad
        peso_total = sum(p.peso_kg for p in paquetes)
        cantidad = paquetes.count()
        
        # 4. Generar código de bulto único
        codigo_bulto = self.codigo_service.generar_codigo_bulto()
        
        # 5. Crear el envío
        envio = Envio.objects.create(
            codigo_bulto=codigo_bulto,
            fecha_creacion=timezone.now(),
            fecha_salida=datos_envio.get('fecha_salida'),
            aerolinea=datos_envio.get('aerolinea', ''),
            numero_guia_aerea=datos_envio.get('numero_guia_aerea', ''),
            peso_total=peso_total,
            cantidad_paquetes=cantidad,
            estado='pendiente',
            creado_por=usuario,
            observaciones=datos_envio.get('observaciones', '')
        )
        
        # 6. Asignar paquetes al envío (a través de la tabla intermedia)
        for idx, paquete in enumerate(paquetes, 1):
            # Cambiar estado del paquete a 'consolidado'
            paquete.actualizar_estado('consolidado', usuario, 
                                     f"Consolidado en bulto {codigo_bulto}")
            
            # Crear relación en tabla intermedia
            PaqueteEnvio.objects.create(
                paquete=paquete,
                envio=envio,
                posicion_en_bulto=datos_envio.get('posiciones', {}).get(str(paquete.id), ''),
                numero_orden=idx
            )
        
        # 7. Generar manifiesto PDF
        self.pdf_service.generar_manifiesto(envio)
        
        # 8. Notificar a los clientes (tarea asíncrona)
        self.notificacion_service.notificar_consolidacion(paquetes, codigo_bulto)
        
        return envio
    
    def sugerir_consolidacion(self, paquetes: List[Paquete]) -> Dict:
        """
        Sugiere la mejor forma de consolidar paquetes basado en destino y peso
        
        Returns:
            Dict con sugerencias de agrupamiento
        """
        from collections import defaultdict
        
        # Agrupar por provincia
        agrupados = defaultdict(list)
        for paquete in paquetes:
            provincia = paquete.destinatario.provincia
            agrupados[provincia].append(paquete)
        
        sugerencias = {}
        for provincia, lista in agrupados.items():
            peso_total = sum(p.peso_kg for p in lista)
            sugerencias[provincia] = {
                'cantidad': len(lista),
                'peso_total': peso_total,
                'paquetes': [p.id for p in lista],
                'estimado_costo': self._estimar_costo_envio(peso_total, provincia)
            }
        
        return sugerencias
    
    def _estimar_costo_envio(self, peso_total: Decimal, provincia: str) -> Decimal:
        """Estima el costo de envío para un grupo de paquetes"""
        # Implementar lógica de estimación
        return peso_total * Decimal('2.50')  # Ejemplo simplificado