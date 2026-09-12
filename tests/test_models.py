"""
tests/test_models.py
UbicaciÃ³n: Miami305/tests/test_models.py

DESCRIPCIÃN:
Pruebas unitarias para los modelos de la aplicaciÃ³n core.
Verifica la creaciÃ³n, actualizaciÃ³n y comportamiento de Cliente, Destinatario y Paquete.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from decimal import Decimal
from apps.core.models import Cliente, Destinatario, Paquete
from services.codigo_service import CodigoService

User = get_user_model()


class PaqueteModelTest(TestCase):
    """Pruebas para el modelo Paquete"""
    
    def setUp(self):
        self.usuario = User.objects.create_user(
            username='testuser',
            password='testpass123',
            rol='admin'
        )
        self.cliente = Cliente.objects.create(
            nombre_completo='Juan PÃ©rez',
            domicilio='123 Main St, Miami',
            telefono='305-555-1234',
            email='juan@test.com'
        )
        self.destinatario = Destinatario.objects.create(
            cliente=self.cliente,
            nombre_completo='MarÃ­a GarcÃ­a',
            domicilio_exacto='Calle 123 #45, entre A y B',
            municipio='HLG',
            provincia='HOL',
            telefono='7-555-6789'
        )
    
    def test_crear_paquete(self):
        """Prueba la creaciÃ³n de un paquete"""
        paquete = Paquete.objects.create(
            cliente=self.cliente,
            destinatario=self.destinatario,
            codigo_seguimiento='PKG-2026-0001',
            descripcion='Ropa y zapatos',
            peso_kg=Decimal('2.5'),
            tarifa=Decimal('22.50'),
            estado='recibido',
            creado_por=self.usuario
        )
        
        self.assertEqual(paquete.cliente.nombre_completo, 'Juan PÃ©rez')
        self.assertEqual(paquete.peso_kg, Decimal('2.5'))
        self.assertEqual(paquete.estado, 'recibido')
        self.assertEqual(str(paquete), 'PKG-2026-0001 - Juan PÃ©rez')
    
    def test_actualizar_estado_con_historial(self):
        """Prueba que cambiar estado registre en historial"""
        paquete = Paquete.objects.create(
            cliente=self.cliente,
            destinatario=self.destinatario,
            codigo_seguimiento='PKG-2026-0002',
            descripcion='Medicinas',
            peso_kg=Decimal('1.0'),
            tarifa=Decimal('15.00'),
            estado='recibido',
            creado_por=self.usuario
        )
        
        # Cambiar estado
        historial = paquete.actualizar_estado('consolidado', self.usuario, 'Prueba de consolidaciÃ³n')
        
        # Verificar que el historial se creÃ³
        self.assertEqual(paquete.historial.count(), 1)
        self.assertIsNotNone(historial)
        self.assertEqual(historial.estado_anterior, 'recibido')
        self.assertEqual(historial.estado_nuevo, 'consolidado')
        self.assertEqual(historial.usuario, self.usuario)
    
    def test_calcular_volumen(self):
        """Prueba el cÃ¡lculo de volumen del paquete"""
        paquete = Paquete.objects.create(
            cliente=self.cliente,
            destinatario=self.destinatario,
            codigo_seguimiento='PKG-2026-0003',
            descripcion='Caja de libros',
            peso_kg=Decimal('3.0'),
            tarifa=Decimal('25.00'),
            alto_cm=Decimal('20'),
            ancho_cm=Decimal('15'),
            largo_cm=Decimal('10'),
            estado='recibido',
            creado_por=self.usuario
        )
        
        volumen = paquete.calcular_volumen()
        self.assertEqual(volumen, Decimal('3000'))  # 20 * 15 * 10
    
    def test_estado_no_valido(self):
        """Prueba que no se pueda asignar un estado invÃ¡lido"""
        paquete = Paquete.objects.create(
            cliente=self.cliente,
            destinatario=self.destinatario,
            codigo_seguimiento='PKG-2026-0004',
            descripcion='ElectrÃ³nicos',
            peso_kg=Decimal('1.5'),
            tarifa=Decimal('15.00'),
            estado='recibido',
            creado_por=self.usuario
        )
        
        # Intentar cambiar a un estado invÃ¡lido (deberÃ­a fallar)
        with self.assertRaises(ValidationError):
            paquete.estado = 'estado_invalido'
            paquete.full_clean()