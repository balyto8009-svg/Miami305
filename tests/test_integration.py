# manage.py test --verbosity=2 --keepdb

# manage.py test --verbosity=2 --keepdb

# tests/test_integration.py
from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.core.models import Cliente, Destinatario, Paquete, Envio
from services.consolidacion_service import ConsolidacionService

User = get_user_model()

class IntegrationTest(TestCase):
    """Pruebas de integraciÃ³n del flujo completo"""
    
    def setUp(self):
        self.usuario = User.objects.create_user(
            username='admin',
            password='admin123',
            rol='admin'
        )
        self.cliente = Cliente.objects.create(
            nombre_completo='Test Cliente',
            domicilio='123 Test St',
            telefono='555-1234'
        )
        self.destinatario = Destinatario.objects.create(
            cliente=self.cliente,
            nombre_completo='Test Destinatario',
            domicilio_exacto='Calle Test',
            municipio='Test',
            provincia='HAB',
            telefono='555-5678'
        )
    
    def test_flujo_completo(self):
        """Prueba el flujo completo: crear paquete â consolidar â entregar"""
        
        # 1. Crear paquete
        paquete = Paquete.objects.create(
            cliente=self.cliente,
            destinatario=self.destinatario,
            codigo_seguimiento='PKG-2026-0001',
            descripcion='Test package',
            peso_kg=2.5,
            tarifa=22.50,
            estado='recibido',
            creado_por=self.usuario
        )
        self.assertEqual(paquete.estado, 'recibido')
        
        # 2. Consolidar paquete
        consolidacion_service = ConsolidacionService()
        envio = consolidacion_service.consolidar(
            paquete_ids=[paquete.id],
            usuario=self.usuario,
            datos_envio={'observaciones': 'Test consolidation'}
        )
        paquete.refresh_from_db()
        self.assertEqual(paquete.estado, 'consolidado')
        self.assertIsNotNone(envio.codigo_bulto)
        
        # 3. Marcar como entregado
        paquete.actualizar_estado('entregado', self.usuario, 'Entregado exitosamente')
        paquete.refresh_from_db()
        self.assertEqual(paquete.estado, 'entregado')
        self.assertIsNotNone(paquete.fecha_entrega_real)