"""
tests/test_services.py
UbicaciÃ³n: Miami305/tests/test_services.py

DESCRIPCIÃN:
Pruebas unitarias para los servicios del sistema.
Verifica el correcto funcionamiento de TarifaService, CodigoService y ConsolidacionService.
"""
from django.test import TestCase
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from services.tarifa_service import TarifaService
from services.consolidacion_service import ConsolidacionService
from services.codigo_service import CodigoService
from apps.core.models import Cliente, Destinatario, Paquete

User = get_user_model()


class TarifaServiceTest(TestCase):
    """Pruebas para el servicio de tarifas"""
    
    def setUp(self):
        self.tarifa_service = TarifaService()
    
    def test_calcular_tarifa_peso_pequeno(self):
        """Tarifa para paquete pequeÃ±o (< 2kg)"""
        resultado = self.tarifa_service.calcular(Decimal('1.5'))
        self.assertEqual(resultado['base'], Decimal('15.00'))
        self.assertEqual(resultado['total'], Decimal('15.00'))
    
    def test_calcular_tarifa_peso_mediano(self):
        """Tarifa para paquete mediano (2-5kg)"""
        resultado = self.tarifa_service.calcular(Decimal('3.0'))
        self.assertEqual(resultado['base'], Decimal('22.50'))  # 20 + (1 * 2.5)
    
    def test_calcular_tarifa_peso_grande(self):
        """Tarifa para paquete grande (5-10kg)"""
        resultado = self.tarifa_service.calcular(Decimal('7.0'))
        self.assertEqual(resultado['base'], Decimal('36.00'))  # 30 + (2 * 3)
    
    def test_calcular_tarifa_con_sobrecargo(self):
        """Tarifa con sobrecargo por provincia"""
        resultado = self.tarifa_service.calcular(
            Decimal('1.5'), 
            provincia='HOL'  # HolguÃ­n tiene sobrecargo
        )
        self.assertEqual(resultado['total'], Decimal('18.00'))  # 15 + 3
        self.assertEqual(resultado['sobrecargo'], Decimal('3.00'))
    
    def test_calcular_peso_volumetrico(self):
        """CÃ¡lculo de peso volumÃ©trico"""
        peso_vol = self.tarifa_service.calcular_volumetrico(
            alto=Decimal('30'),
            ancho=Decimal('20'),
            largo=Decimal('10')
        )
        self.assertEqual(peso_vol, Decimal('1.2'))  # 6000 / 5000
    
    def test_calcular_tarifa_peso_invalido(self):
        """Tarifa para peso fuera de rango"""
        with self.assertRaises(ValueError):
            self.tarifa_service.calcular(Decimal('100.0'))


class CodigoServiceTest(TestCase):
    """Pruebas para la generaciÃ³n de cÃ³digos"""
    
    def setUp(self):
        self.codigo_service = CodigoService()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            rol='admin'
        )
        self.cliente = Cliente.objects.create(
            nombre_completo='Juan PÃ©rez',
            domicilio='123 Main St',
            telefono='305-555-1234'
        )
        self.destinatario = Destinatario.objects.create(
            cliente=self.cliente,
            nombre_completo='MarÃ­a GarcÃ­a',
            domicilio_exacto='Calle 123',
            municipio='HLG',
            provincia='HOL',
            telefono='7-555-6789'
        )
    
    def test_generar_codigo_seguimiento(self):
        """Prueba la generaciÃ³n de cÃ³digo de seguimiento"""
        codigo = self.codigo_service.generar_codigo_seguimiento()
        
        # Verificar formato PKG-YYYY-NNNN
        import re
        pattern = r'^PKG-\d{4}-\d{4}$'
        self.assertTrue(re.match(pattern, codigo))
    
    def test_generar_codigo_bulto(self):
        """Prueba la generaciÃ³n de cÃ³digo de bulto"""
        codigo = self.codigo_service.generar_codigo_bulto()
        
        import re
        pattern = r'^BUL-\d{4}-\d{4}$'
        self.assertTrue(re.match(pattern, codigo))
    
    def test_generar_numero_factura(self):
        """Prueba la generaciÃ³n de nÃºmero de factura"""
        # Primero crear un paquete para generar factura
        paquete = Paquete.objects.create(
            cliente=self.cliente,
            destinatario=self.destinatario,
            codigo_seguimiento='PKG-2026-0001',
            descripcion='Paquete test',
            peso_kg=Decimal('1.0'),
            tarifa=Decimal('15.00'),
            estado='recibido',
            creado_por=self.user
        )
        
        # Crear factura
        from apps.core.models import Factura
        factura = Factura.objects.create(
            paquete=paquete,
            numero_factura=self.codigo_service.generar_numero_factura(),
            subtotal=Decimal('15.00'),
            impuesto=Decimal('0.00'),
            total=Decimal('15.00')
        )
        
        import re
        pattern = r'^FAC-\d{4}-\d{4}$'
        self.assertTrue(re.match(pattern, factura.numero_factura))


class ConsolidacionServiceTest(TestCase):
    """Pruebas para el servicio de consolidaciÃ³n"""
    
    def setUp(self):
        self.user = User.objects.create_user(
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
            municipio='HLG',
            provincia='HOL',
            telefono='555-5678'
        )
        self.consolidacion_service = ConsolidacionService()
    
    def test_consolidar_paquetes(self):
        """Prueba la consolidaciÃ³n de paquetes"""
        # Crear paquetes
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
        
        # Consolidar
        envio = self.consolidacion_service.consolidar(
            paquete_ids=[paquete1.id, paquete2.id],
            usuario=self.user,
            datos_envio={'aerolinea': 'Test Air'}
        )
        
        # Verificar
        self.assertIsNotNone(envio)
        self.assertEqual(envio.cantidad_paquetes, 2)
        self.assertEqual(envio.peso_total, Decimal('3.0'))
        self.assertEqual(envio.estado, 'pendiente')
        
        paquete1.refresh_from_db()
        paquete2.refresh_from_db()
        self.assertEqual(paquete1.estado, 'consolidado')
        self.assertEqual(paquete2.estado, 'consolidado')
    
    def test_consolidar_paquetes_ya_consolidados(self):
        """Prueba que no se puedan consolidar paquetes ya consolidados"""
        paquete = Paquete.objects.create(
            cliente=self.cliente,
            destinatario=self.destinatario,
            codigo_seguimiento='PKG-2026-0003',
            descripcion='Paquete 3',
            peso_kg=Decimal('1.0'),
            tarifa=Decimal('15.00'),
            estado='consolidado',  # Ya consolidado
            creado_por=self.user
        )
        
        with self.assertRaises(ValidationError):
            self.consolidacion_service.consolidar(
                paquete_ids=[paquete.id],
                usuario=self.user,
                datos_envio={}
            )