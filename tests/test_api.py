"""
tests/test_api.py
Ubicación: Miami305/tests/test_api.py

DESCRIPCIÓN:
Pruebas de integración para la API REST.
Verifica el correcto funcionamiento de los endpoints de paquetes,
incluyendo creación, listado y consolidación.
"""
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from decimal import Decimal
from apps.core.models import Cliente, Destinatario, Paquete

User = get_user_model()


class PaqueteAPITest(APITestCase):
    """Pruebas para la API de paquetes"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='empleado',
            password='testpass123',
            rol='empleado'
        )
        self.client.force_authenticate(user=self.user)
        
        self.cliente = Cliente.objects.create(
            nombre_completo='Juan Pérez',
            domicilio='123 Main St',
            telefono='305-555-1234'
        )
        self.destinatario = Destinatario.objects.create(
            cliente=self.cliente,
            nombre_completo='María García',
            domicilio_exacto='Calle 123',
            municipio='HLG',
            provincia='HOL',
            telefono='7-555-6789'
        )
    
    def test_crear_paquete_api(self):
        """Prueba la creación de paquete via API"""
        url = reverse('paquete-list')
        data = {
            'cliente_id': self.cliente.id,
            'destinatario_id': self.destinatario.id,
            'descripcion': 'Ropa y zapatos',
            'peso_kg': '2.5'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verificar que se generó código y tarifa automÃ¡ticamente
        paquete = Paquete.objects.first()
        self.assertIsNotNone(paquete.codigo_seguimiento)
        self.assertGreater(paquete.tarifa, Decimal('0'))
    
    def test_listar_paquetes(self):
        """Prueba el listado de paquetes"""
        # Crear algunos paquetes
        for i in range(3):
            Paquete.objects.create(
                cliente=self.cliente,
                destinatario=self.destinatario,
                codigo_seguimiento=f'PKG-2026-00{i+1}',
                descripcion=f'Paquete {i+1}',
                peso_kg=Decimal('1.0'),
                tarifa=Decimal('15.00'),
                estado='recibido',
                creado_por=self.user
            )
        
        url = reverse('paquete-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 3)
    
    def test_consolidar_paquetes_api(self):
        """Prueba la consolidación de paquetes via API"""
        # Crear dos paquetes
        paquete1 = Paquete.objects.create(
            cliente=self.cliente,
            destinatario=self.destinatario,
            codigo_seguimiento='PKG-2026-0001',
            descripcion='Paquete 1',
            peso_kg=Decimal('1.0'),
            tarifa=Decimal('15.00'),
            estado='recibido',
            creado_por=self.user
        )
        paquete2 = Paquete.objects.create(
            cliente=self.cliente,
            destinatario=self.destinatario,
            codigo_seguimiento='PKG-2026-0002',
            descripcion='Paquete 2',
            peso_kg=Decimal('2.0'),
            tarifa=Decimal('15.00'),
            estado='recibido',
            creado_por=self.user
        )
        
        url = reverse('paquete-consolidar')
        data = {
            'paquete_ids': [paquete1.id, paquete2.id],
            'datos_envio': {
                'aerolinea': 'American Airlines',
                'observaciones': 'Envío consolidado de prueba'
            }
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verificar que los paquetes cambiaron de estado
        paquete1.refresh_from_db()
        paquete2.refresh_from_db()
        self.assertEqual(paquete1.estado, 'consolidado')
        self.assertEqual(paquete2.estado, 'consolidado')
        
        # Verificar que se creó el envío
        from apps.core.models import Envio
        envio = Envio.objects.first()
        self.assertIsNotNone(envio)
        self.assertEqual(envio.cantidad_paquetes, 2)
    
    def test_cambiar_estado_paquete(self):
        """Prueba el cambio de estado de un paquete via API"""
        paquete = Paquete.objects.create(
            cliente=self.cliente,
            destinatario=self.destinatario,
            codigo_seguimiento='PKG-2026-0003',
            descripcion='Paquete de prueba',
            peso_kg=Decimal('1.0'),
            tarifa=Decimal('15.00'),
            estado='recibido',
            creado_por=self.user
        )
        
        url = reverse('paquete-cambiar-estado', args=[paquete.id])
        data = {
            'estado': 'entregado',
            'observacion': 'Entregado al destinatario'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        paquete.refresh_from_db()
        self.assertEqual(paquete.estado, 'entregado')
        self.assertIsNotNone(paquete.fecha_entrega_real)