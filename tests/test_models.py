"""
tests/test_models.py
Ubicación: Miami305/tests/test_models.py

DESCRIPCIÓN:
Pruebas unitarias de los modelos de apps.core: Paquete, Destinatario,
Cliente, Envio e HistorialEstado. Alineadas al modelo actual:
- Paquete: pesos por categoría en JSON (pesos_categoria + peso_total_kg).
- Destinatario: validaciones de nombre/teléfono/municipio/reparto en save().
- Envio: estados del bulto y propagación a los paquetes.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.core.models import Cliente, Envio, Paquete, PaqueteEnvio
from tests.factories import (
    crear_categoria,
    crear_cliente,
    crear_destinatario,
    crear_paquete,
    crear_provincia,
)

User = get_user_model()


class PaqueteModelTest(TestCase):
    """Pruebas para el modelo Paquete."""

    def setUp(self):
        self.usuario = User.objects.create_user(
            username='testuser',
            password='testpass123',
            rol='admin',
        )
        self.categoria = crear_categoria()   # Ropa a 4,00 $/kg
        self.provincia = crear_provincia()    # HOL a 2,00 $
        self.cliente = crear_cliente()
        self.destinatario = crear_destinatario(self.cliente)

    def _paquete(self, **kwargs):
        kwargs.setdefault('codigo_seguimiento', 'PKG-2026-0001')
        return crear_paquete(
            self.cliente, self.destinatario, creado_por=self.usuario, **kwargs
        )

    def test_crear_paquete(self):
        """La creación asigna estado inicial y conserva los datos base."""
        paquete = self._paquete(peso_total_kg='2.50')

        self.assertEqual(paquete.estado, 'recibido')
        self.assertEqual(paquete.get_estado_display(), 'Recibido en Miami')
        self.assertEqual(paquete.peso_total_kg, Decimal('2.50'))
        self.assertIsNotNone(paquete.id)
        self.assertIn(paquete.codigo_seguimiento, str(paquete))
        self.assertIsNotNone(paquete.fecha_recepcion)

    def test_calcular_peso_total(self):
        """calcular_peso_total suma todos los pesos del JSON por categoría."""
        paquete = self._paquete(
            pesos_categoria={str(self.categoria.id): 2.5, '999': 1.0},
        )

        total = paquete.calcular_peso_total()

        self.assertEqual(Decimal(str(total)), Decimal('3.5'))
        self.assertEqual(Decimal(str(paquete.peso_total_kg)), Decimal('3.5'))

    def test_peso_desglosado_usa_nombre_de_categoria(self):
        """peso_desglosado traduce el id del JSON al nombre de la categoría."""
        paquete = self._paquete(pesos_categoria={str(self.categoria.id): 2.5})

        self.assertEqual(paquete.peso_desglosado, {'Ropa': 2.5})

    def test_get_peso_categoria(self):
        """get_peso_categoria devuelve el kg de una categoría por nombre."""
        paquete = self._paquete(pesos_categoria={str(self.categoria.id): 2.5})

        self.assertEqual(paquete.get_peso_categoria('Ropa'), 2.5)
        self.assertEqual(paquete.get_peso_categoria('NoExiste'), 0)

    def test_actualizar_estado_crea_historial(self):
        """Cada cambio de estado genera un registro en HistorialEstado."""
        paquete = self._paquete()

        historial = paquete.actualizar_estado(
            'consolidado', self.usuario, 'Prueba de consolidación'
        )

        self.assertEqual(paquete.historial.count(), 1)
        self.assertIsNotNone(historial)
        self.assertEqual(historial.estado_anterior, 'recibido')
        self.assertEqual(historial.estado_nuevo, 'consolidado')
        self.assertEqual(historial.usuario, self.usuario)
        self.assertIn('consolidación', historial.observacion)

    def test_actualizar_estado_al_mismo_estado_no_duplica(self):
        """Cambiar al mismo estado no crea historial ni devuelve registro."""
        paquete = self._paquete()

        historial = paquete.actualizar_estado('recibido', self.usuario)

        self.assertIsNone(historial)
        self.assertEqual(paquete.historial.count(), 0)

    def test_entregado_registra_fecha_de_entrega(self):
        """Pasar a 'entregado' estampa fecha_entrega_real."""
        paquete = self._paquete()

        paquete.actualizar_estado('entregado', self.usuario, 'OK')

        self.assertEqual(paquete.estado, 'entregado')
        self.assertIsNotNone(paquete.fecha_entrega_real)

    def test_estado_invalido_falla_en_full_clean(self):
        """full_clean rechaza estados fuera de ESTADOS."""
        paquete = self._paquete()
        paquete.estado = 'volando'

        with self.assertRaises(ValidationError):
            paquete.full_clean()

    def test_orden_estados_y_transicion_valida(self):
        """ORDEN_ESTADOS es la fuente de verdad y 'recibido' sin bulto es válido."""
        paquete = self._paquete()

        self.assertEqual(
            Paquete.ORDEN_ESTADOS,
            ['recibido', 'consolidado', 'en_transito', 'en_cuba', 'entregado'],
        )
        self.assertEqual(paquete.orden_estado, 0)
        self.assertFalse(paquete.consolidado)
        self.assertFalse(paquete.en_bulto_activo)
        self.assertTrue(paquete.transicion_valida)

    def test_en_bulto_activo(self):
        """Un paquete dentro de un bulto consolidado está 'en bulto activo'."""
        paquete = self._paquete()
        bulto = Envio.objects.create(
            codigo_bulto='BUL-2026-0001',
            peso_total=Decimal('1.00'),
            cantidad_paquetes=1,
            estado='consolidado',
            creado_por=self.usuario,
        )
        PaqueteEnvio.objects.create(paquete=paquete, envio=bulto, numero_orden=1)

        self.assertTrue(paquete.consolidado)
        self.assertTrue(paquete.en_bulto_activo)
        self.assertEqual(paquete.bulto_actual.codigo_bulto, 'BUL-2026-0001')
        # 'recibido' + bulto activo = incoherencia (lo rechaza la API)
        paquete.estado = 'recibido'
        self.assertFalse(paquete.transicion_valida)


class DestinatarioModelTest(TestCase):
    """Pruebas de las validaciones de Destinatario (se ejecutan en save())."""

    def setUp(self):
        self.cliente = crear_cliente()

    def test_crear_destinatario_holguin(self):
        """Holguín exige municipio y reparto: HLG exige reparto."""
        destinatario = crear_destinatario(self.cliente)

        self.assertIsNotNone(destinatario.id)
        self.assertEqual(destinatario.provincia, 'HOL')
        self.assertEqual(destinatario.get_municipio_display(), 'Holguin')

    def test_destinatario_fuera_de_holguin(self):
        """Otra provincia se guarda sin municipio ni reparto."""
        destinatario = crear_destinatario(self.cliente, provincia='HAB')

        self.assertIsNotNone(destinatario.id)
        self.assertEqual(destinatario.municipio, '')
        self.assertEqual(destinatario.reparto, '')

    def test_nombre_con_dos_palabras_es_rechazado(self):
        """El nombre exige al menos 3 palabras (nombre + 2 apellidos)."""
        with self.assertRaises(ValidationError):
            crear_destinatario(self.cliente, nombre_completo='María García')

    def test_telefono_corto_es_rechazado(self):
        """El teléfono cubano debe tener exactamente 8 dígitos."""
        with self.assertRaises(ValidationError):
            crear_destinatario(self.cliente, telefono='12345')

    def test_provincia_distinta_de_holguin_no_acepta_municipio(self):
        """Fuera de Holguín no puede llevar municipio (rechaza el clean())."""
        with self.assertRaises(ValidationError):
            crear_destinatario(
                self.cliente, provincia='HAB', municipio='HLG', reparto=''
            )

    def test_holguin_sin_reparto_es_rechazado(self):
        """En Holguín/Holguín el reparto es obligatorio."""
        with self.assertRaises(ValidationError):
            crear_destinatario(
                self.cliente, provincia='HOL', municipio='HLG', reparto=''
            )


class ClienteModelTest(TestCase):
    """Pruebas de validación del Cliente (aplican en formularios/serializadores)."""

    def test_nombre_corto_no_pasa_full_clean(self):
        cliente = Cliente(nombre_completo='Ana Pérez')

        with self.assertRaises(ValidationError):
            cliente.full_clean()

    def test_nombre_valido_pasa_full_clean(self):
        cliente = crear_cliente(nombre_completo='Ana María Pérez')

        cliente.full_clean()  # no debe lanzar excepción
        self.assertIsNotNone(cliente.id)
