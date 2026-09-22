"""
tests/test_integration.py
Ubicación: Miami305/tests/test_integration.py

DESCRIPCIÓN:
Pruebas de integración del flujo completo del negocio:
recibir → consolidar (bulto) → salida del vuelo → llegada a Cuba →
entrega en Holguín, verificando que el estado del paquete siempre
sigue Paquete.ORDEN_ESTADOS y que el historial queda trazado.
"""
import re
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.core.models import Envio, Paquete
from services.consolidacion_service import ConsolidacionService
from tests.factories import (
    crear_categoria,
    crear_cliente,
    crear_destinatario,
    crear_paquete,
    crear_provincia,
)

User = get_user_model()


class FlujoCompletoTest(TestCase):
    """Pruebas de integración del flujo completo."""

    def setUp(self):
        self.usuario = User.objects.create_user(
            username='admin',
            password='admin123',
            rol='admin',
        )
        self.categoria = crear_categoria()   # Ropa a 4,00 $/kg
        self.provincia = crear_provincia()    # HOL a 2,00 $
        self.cliente = crear_cliente()
        self.destinatario = crear_destinatario(self.cliente)
        self.paquete = crear_paquete(
            self.cliente,
            self.destinatario,
            codigo_seguimiento='PKG-2026-0001',
            peso_total_kg='2.50',
            pesos_categoria={str(self.categoria.id): 2.5},
            creado_por=self.usuario,
        )
        self.service = ConsolidacionService()

    def _consolidar(self, paquete_ids, datos_envio=None):
        return self.service.consolidar(
            paquete_ids=paquete_ids,
            usuario=self.usuario,
            datos_envio=datos_envio or {'observaciones': 'Vuelo de prueba'},
        )

    def test_flujo_completo(self):
        """Crear → consolidar → volar → llegar a Cuba → entregar."""
        # 1. Creación: queda esperando consolidación
        self.assertEqual(self.paquete.estado, 'recibido')

        # 2. Consolidación en un bulto
        envio = self._consolidar([self.paquete.id])
        self.paquete.refresh_from_db()
        self.assertEqual(envio.estado, 'consolidado')
        self.assertTrue(re.match(r'^BUL-\d{4}-\d{4}$', envio.codigo_bulto))
        self.assertEqual(envio.peso_total, Decimal('2.50'))
        self.assertEqual(self.paquete.estado, 'consolidado')
        self.assertEqual(self.paquete.bulto_actual, envio)

        # 3. Salida del vuelo: el bulto y el paquete pasan a en tránsito
        self.assertTrue(envio.marcar_en_transito(self.usuario))
        envio.refresh_from_db()
        self.paquete.refresh_from_db()
        self.assertEqual(envio.estado, 'en_curso')
        self.assertEqual(self.paquete.estado, 'en_transito')
        self.assertIsNotNone(envio.fecha_hora_salida)

        # 4. Recepción en la sede de Holguín
        envio.estado = 'completado'
        envio.save(update_fields=['estado'])
        envio.propagar_estado_paquetes(usuario=self.usuario)
        self.paquete.refresh_from_db()
        self.assertEqual(self.paquete.estado, 'en_cuba')

        # 5. Entrega al destinatario
        self.paquete.actualizar_estado(
            'entregado', self.usuario, 'Entregado en Holguín'
        )
        self.paquete.refresh_from_db()
        self.assertEqual(self.paquete.estado, 'entregado')
        self.assertIsNotNone(self.paquete.fecha_entrega_real)

        # El historial recorre el ORDEN_ESTADOS completo (sin 'recibido')
        estados = list(
            self.paquete.historial.order_by('id')
            .values_list('estado_nuevo', flat=True)
        )
        self.assertEqual(estados, Paquete.ORDEN_ESTADOS[1:])
        self.assertEqual(self.paquete.historial.count(), 4)

    def test_cancelar_bulto_libera_paquetes(self):
        """Cancelar un bulto devuelve los paquetes a 'recibido'."""
        envio = self._consolidar([self.paquete.id])

        liberados = envio.cancelar()

        envio.refresh_from_db()
        self.paquete.refresh_from_db()
        self.assertEqual(liberados, 1)
        self.assertEqual(envio.estado, 'cancelado')
        self.assertEqual(self.paquete.estado, 'recibido')
        # El bulto sigue siendo el último al que perteneció (ahora cancelado)
        self.assertEqual(self.paquete.bulto_actual, envio)
        self.assertEqual(self.paquete.bulto_actual.estado, 'cancelado')

    def test_reconsolidar_tras_cancelacion(self):
        """Tras cancelar se puede consolidar en un bulto nuevo."""
        envio1 = self._consolidar([self.paquete.id])
        envio1.cancelar()

        envio2 = self._consolidar([self.paquete.id])
        self.paquete.refresh_from_db()

        self.assertNotEqual(envio1.codigo_bulto, envio2.codigo_bulto)
        self.assertEqual(envio2.estado, 'consolidado')
        self.assertEqual(self.paquete.estado, 'consolidado')

    def test_entregado_no_se_sobreescribe_al_propagar(self):
        """Un paquete ya entregado no retrocede cuando cambia su bulto."""
        envio = self._consolidar([self.paquete.id])
        self.paquete.actualizar_estado(
            'entregado', self.usuario, 'Entregado antes de llegar'
        )

        envio.estado = 'completado'
        envio.save(update_fields=['estado'])
        envio.propagar_estado_paquetes(usuario=self.usuario)
        self.paquete.refresh_from_db()

        self.assertEqual(self.paquete.estado, 'entregado')
