"""
tests/test_services.py
Ubicación: Miami305/tests/test_services.py

DESCRIPCIÓN:
Pruebas unitarias de los servicios del sistema, alineadas a las firmas reales:
- TarifaService.calcular(paquete) → sum(peso × precio categoría) + costo provincia.
- CodigoService → PKG-/BUL-/FAC-YYYY-NNNN.
- ConsolidacionService.consolidar(ids, usuario, datos_envio) → Envio 'consolidado'.
"""
import re
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from apps.core.models import Envio, Factura, PaqueteEnvio
from services.codigo_service import CodigoService
from services.consolidacion_service import ConsolidacionService
from services.tarifa_service import TarifaService
from tests.factories import (
    crear_categoria,
    crear_cliente,
    crear_destinatario,
    crear_paquete,
    crear_provincia,
)

User = get_user_model()


class TarifaServiceTest(TestCase):
    """Pruebas para el cálculo de tarifas por categoría + provincia."""

    def setUp(self):
        self.categoria = crear_categoria()   # Ropa a 4,00 $/kg
        self.provincia = crear_provincia()    # HOL a 2,00 $
        self.cliente = crear_cliente()
        self.destinatario = crear_destinatario(self.cliente)

    def _paquete(self, pesos):
        return crear_paquete(
            self.cliente,
            self.destinatario,
            codigo_seguimiento='PKG-2026-0001',
            pesos_categoria=pesos,
        )

    def test_calcular_tarifa(self):
        """2,5 kg de Ropa (4 $/kg) + 2 $ de envío a Holguín = 12 $."""
        paquete = self._paquete({str(self.categoria.id): 2.5})

        resultado = TarifaService.calcular(paquete)

        self.assertEqual(resultado['base'], Decimal('10.000'))
        self.assertEqual(resultado['costo_envio'], Decimal('2.00'))
        self.assertEqual(resultado['total'], Decimal('12.000'))
        self.assertEqual(resultado['detalle']['Ropa'], 10.0)
        self.assertIn('12.00', resultado['detalles'])

    def test_calcular_varias_categorias(self):
        """La tarifa base acumula el peso de cada categoría activa."""
        medicamentos = crear_categoria(nombre='Medicamentos', precio_por_kg='10.00')
        paquete = self._paquete({
            str(self.categoria.id): 2.0,      # 2 kg × 4  = 8
            str(medicamentos.id): 1.5,         # 1,5 kg × 10 = 15
        })

        resultado = TarifaService.calcular(paquete)

        self.assertEqual(resultado['base'], Decimal('23.000'))
        self.assertEqual(resultado['total'], Decimal('25.000'))

    def test_calcular_sin_pesos_solo_cobra_envio(self):
        """Sin pesos por categoría la base es 0 pero el envío provincial se cobra."""
        paquete = self._paquete({})

        resultado = TarifaService.calcular(paquete)

        self.assertEqual(resultado['base'], Decimal('0.00'))
        self.assertEqual(resultado['total'], Decimal('2.00'))

    def test_categoria_inactiva_no_se_cobra(self):
        """Solo las categorías activas entran en el cálculo."""
        inactiva = crear_categoria(nombre='Juguetes', precio_por_kg='99.00', activo=False)
        paquete = self._paquete({str(inactiva.id): 5.0})

        resultado = TarifaService.calcular(paquete)

        self.assertEqual(resultado['base'], Decimal('0.00'))

    def test_provincia_desde_base_de_datos(self):
        self.assertEqual(
            TarifaService.obtener_costo_provincia('HOL'), Decimal('2.00')
        )

    def test_valores_por_defecto_cuando_no_hay_registro(self):
        """Sin registro en BD se usan los valores por defecto del servicio."""
        self.assertEqual(
            TarifaService.obtener_precio_categoria('CategoriaInexistente'),
            Decimal('6.00'),
        )
        self.assertEqual(
            TarifaService.obtener_costo_provincia('CODIGO_INEXISTENTE'),
            Decimal('0.00'),
        )


class CodigoServiceTest(TestCase):
    """Pruebas para la generación de códigos secuenciales."""

    def setUp(self):
        self.codigo_service = CodigoService()
        self.usuario = User.objects.create_user(
            username='coduser', password='testpass123', rol='empleado'
        )
        self.cliente = crear_cliente()
        self.destinatario = crear_destinatario(self.cliente)
        self.anio = timezone.now().year

    def test_generar_codigo_seguimiento(self):
        codigo = self.codigo_service.generar_codigo_seguimiento()

        self.assertTrue(re.match(r'^PKG-\d{4}-\d{4}$', codigo))
        self.assertEqual(codigo, f'PKG-{self.anio}-0001')

    def test_codigo_seguimiento_secuencial(self):
        crear_paquete(
            self.cliente,
            self.destinatario,
            codigo_seguimiento=f'PKG-{self.anio}-0042',
        )

        codigo = self.codigo_service.generar_codigo_seguimiento()

        self.assertEqual(codigo, f'PKG-{self.anio}-0043')

    def test_generar_codigo_bulto(self):
        codigo = self.codigo_service.generar_codigo_bulto()

        self.assertTrue(re.match(r'^BUL-\d{4}-\d{4}$', codigo))
        self.assertEqual(codigo, f'BUL-{self.anio}-0001')

    def test_codigo_bulto_secuencial(self):
        Envio.objects.create(
            codigo_bulto=f'BUL-{self.anio}-0007',
            peso_total=Decimal('1.00'),
            cantidad_paquetes=1,
            creado_por=self.usuario,
        )

        codigo = self.codigo_service.generar_codigo_bulto()

        self.assertEqual(codigo, f'BUL-{self.anio}-0008')

    def test_generar_numero_factura(self):
        codigo = self.codigo_service.generar_numero_factura()

        self.assertTrue(re.match(r'^FAC-\d{4}-\d{4}$', codigo))
        self.assertEqual(codigo, f'FAC-{self.anio}-0001')

    def test_numero_factura_secuencial(self):
        paquete = crear_paquete(
            self.cliente,
            self.destinatario,
            codigo_seguimiento=f'PKG-{self.anio}-0001',
        )
        Factura.objects.create(
            paquete=paquete,
            numero_factura=f'FAC-{self.anio}-0009',
            subtotal=Decimal('10.00'),
            total=Decimal('10.00'),
        )

        codigo = self.codigo_service.generar_numero_factura()

        self.assertEqual(codigo, f'FAC-{self.anio}-0010')


class ConsolidacionServiceTest(TestCase):
    """Pruebas para la consolidación de paquetes en un bulto."""

    def setUp(self):
        self.usuario = User.objects.create_user(
            username='admin', password='admin123', rol='admin'
        )
        self.cliente = crear_cliente()
        self.destinatario = crear_destinatario(self.cliente)
        self.service = ConsolidacionService()

    def _paquete(self, codigo, peso='1.00', **kwargs):
        return crear_paquete(
            self.cliente,
            self.destinatario,
            codigo_seguimiento=codigo,
            peso_total_kg=peso,
            creado_por=self.usuario,
            **kwargs,
        )

    def test_consolidar_paquetes(self):
        """Consolida dos paquetes recibidos en un bulto 'consolidado'."""
        paquete1 = self._paquete('PKG-2026-0001', peso='1.00')
        paquete2 = self._paquete('PKG-2026-0002', peso='2.00')

        envio = self.service.consolidar(
            paquete_ids=[paquete1.id, paquete2.id],
            usuario=self.usuario,
            datos_envio={'aerolinea': 'American Airlines', 'observaciones': 'Prueba'},
        )

        self.assertEqual(envio.estado, 'consolidado')
        self.assertEqual(envio.cantidad_paquetes, 2)
        self.assertEqual(envio.peso_total, Decimal('3.00'))
        self.assertEqual(envio.aerolinea, 'American Airlines')
        self.assertEqual(envio.creado_por, self.usuario)
        self.assertTrue(re.match(r'^BUL-\d{4}-\d{4}$', envio.codigo_bulto))

        paquete1.refresh_from_db()
        paquete2.refresh_from_db()
        self.assertEqual(paquete1.estado, 'consolidado')
        self.assertEqual(paquete2.estado, 'consolidado')
        self.assertEqual(paquete1.historial.count(), 1)

        relaciones = PaqueteEnvio.objects.filter(envio=envio)
        self.assertEqual(relaciones.count(), 2)
        self.assertEqual(
            sorted(relaciones.values_list('numero_orden', flat=True)), [1, 2]
        )

    def test_rechaza_paquetes_no_recibidos(self):
        """Solo se consolidan paquetes en estado 'recibido'."""
        paquete_ok = self._paquete('PKG-2026-0001')
        paquete_entregado = self._paquete(
            'PKG-2026-0002', estado='entregado'
        )

        with self.assertRaises(ValidationError):
            self.service.consolidar(
                paquete_ids=[paquete_ok.id, paquete_entregado.id],
                usuario=self.usuario,
                datos_envio={},
            )

    def test_rechaza_paquete_en_envio_activo(self):
        """Un paquete pendiente de salida no puede entrar en otro bulto."""
        paquete = self._paquete('PKG-2026-0001')
        bulto_previo = Envio.objects.create(
            codigo_bulto='BUL-2026-0001',
            peso_total=Decimal('1.00'),
            cantidad_paquetes=1,
            estado='pendiente',
            creado_por=self.usuario,
        )
        PaqueteEnvio.objects.create(paquete=paquete, envio=bulto_previo)

        with self.assertRaises(ValidationError):
            self.service.consolidar(
                paquete_ids=[paquete.id],
                usuario=self.usuario,
                datos_envio={},
            )
