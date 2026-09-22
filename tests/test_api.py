"""
tests/test_api.py
Ubicación: Miami305/tests/test_api.py

DESCRIPCIÓN:
Pruebas de integración de la API REST de paquetes (`/api/paquetes/`).
Verifica creación, listado, consolidación, cambio de estado, historial
y el control de acceso (autenticación + rol), con las firmas reales
del serializer (pesos_categoria) y de los endpoints (reverse con 'core:').
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.core.models import Envio, Paquete
from tests.factories import (
    crear_categoria,
    crear_cliente,
    crear_destinatario,
    crear_paquete,
    crear_provincia,
)

User = get_user_model()


class PaqueteAPITest(APITestCase):
    """Pruebas para la API de paquetes."""

    def setUp(self):
        self.categoria = crear_categoria()   # Ropa a 4,00 $/kg
        self.provincia = crear_provincia()    # HOL a 2,00 $
        self.cliente_datos = crear_cliente()
        self.destinatario = crear_destinatario(self.cliente_datos)

        self.user = User.objects.create_user(
            username='empleado',
            password='testpass123',
            rol='empleado',
        )
        self.client.force_authenticate(user=self.user)

    def _paquete(self, codigo, **kwargs):
        kwargs.setdefault('creado_por', self.user)
        return crear_paquete(
            self.cliente_datos, self.destinatario, codigo, **kwargs
        )

    def test_crear_paquete_api(self):
        """POST /api/paquetes/ crea el paquete con código y tarifa automáticos."""
        url = reverse('core:paquete-list')
        data = {
            'cliente_id': self.cliente_datos.id,
            'destinatario_id': self.destinatario.id,
            'descripcion': 'Ropa y zapatos',
            'pesos_categoria': {str(self.categoria.id): 2.5},
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        paquete = Paquete.objects.get()
        self.assertTrue(paquete.codigo_seguimiento.startswith('PKG-'))
        self.assertEqual(paquete.estado, 'recibido')
        self.assertEqual(paquete.peso_total_kg, Decimal('2.50'))
        # 2,5 kg × 4 $/kg + 2 $ de envío a Holguín
        self.assertEqual(paquete.tarifa, Decimal('12.00'))
        self.assertEqual(paquete.tarifa_original, Decimal('10.00'))
        self.assertEqual(response.data['codigo_seguimiento'],
                         paquete.codigo_seguimiento)

    def test_listar_paquetes(self):
        """GET /api/paquetes/ devuelve el listado paginado."""
        for i in range(3):
            self._paquete(f'PKG-2026-000{i + 1}')

        response = self.client.get(reverse('core:paquete-list'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 3)

    def test_filtrar_por_estado(self):
        """GET /api/paquetes/?estado= consigue solo ese estado."""
        self._paquete('PKG-2026-0001')
        self._paquete('PKG-2026-0002', estado='entregado')

        response = self.client.get(
            reverse('core:paquete-list'), {'estado': 'recibido'}
        )

        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['estado'], 'recibido')

    def test_consolidar_paquetes_api(self):
        """POST /api/paquetes/consolidar/ agrupa en un bulto 'consolidado'."""
        paquete1 = self._paquete('PKG-2026-0001', peso_total_kg='1.00')
        paquete2 = self._paquete('PKG-2026-0002', peso_total_kg='2.00')
        url = reverse('core:paquete-consolidar')

        response = self.client.post(url, {
            'paquete_ids': [paquete1.id, paquete2.id],
            'datos_envio': {
                'aerolinea': 'American Airlines',
                'observaciones': 'Envío consolidado de prueba',
            },
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            response.data['envio']['codigo_bulto'].startswith('BUL-')
        )
        self.assertEqual(response.data['envio']['cantidad_paquetes'], 2)

        paquete1.refresh_from_db()
        paquete2.refresh_from_db()
        self.assertEqual(paquete1.estado, 'consolidado')
        self.assertEqual(paquete2.estado, 'consolidado')
        self.assertEqual(Envio.objects.get().cantidad_paquetes, 2)

    def test_consolidar_sin_paquetes_da_error(self):
        """POST sin paquetes seleccionados responde 400."""
        response = self.client.post(
            reverse('core:paquete-consolidar'), {'paquete_ids': []}, format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cambiar_estado_paquete(self):
        """POST .../cambiar-estado/ marca el paquete como entregado."""
        paquete = self._paquete('PKG-2026-0001')
        url = reverse('core:paquete-cambiar-estado', args=[paquete.id])

        response = self.client.post(url, {
            'estado': 'entregado',
            'observacion': 'Entregado al destinatario',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        paquete.refresh_from_db()
        self.assertEqual(paquete.estado, 'entregado')
        self.assertIsNotNone(paquete.fecha_entrega_real)
        self.assertEqual(paquete.historial.count(), 1)

    def test_cambiar_a_consolidado_sin_bulto_da_error(self):
        """Un paquete sin bulto no puede pasar a 'consolidado' (regla #9)."""
        paquete = self._paquete('PKG-2026-0001')
        url = reverse('core:paquete-cambiar-estado', args=[paquete.id])

        response = self.client.post(
            url, {'estado': 'consolidado'}, format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        paquete.refresh_from_db()
        self.assertEqual(paquete.estado, 'recibido')

    def test_cambiar_estado_invalido_da_error(self):
        """Un estado fuera de ESTADOS responde 400."""
        paquete = self._paquete('PKG-2026-0001')
        url = reverse('core:paquete-cambiar-estado', args=[paquete.id])

        response = self.client.post(
            url, {'estado': 'volando'}, format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_historial_del_paquete(self):
        """GET .../historial/ lista los cambios de estado registrados."""
        paquete = self._paquete('PKG-2026-0001')
        self.client.post(
            reverse('core:paquete-cambiar-estado', args=[paquete.id]),
            {'estado': 'entregado', 'observacion': 'OK'},
            format='json',
        )

        response = self.client.get(
            reverse('core:paquete-historial', args=[paquete.id])
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['estado_nuevo'], 'entregado')
        self.assertEqual(response.data[0]['usuario'], 'empleado')

    def test_requiere_autenticacion(self):
        """Sin sesión la API responde 403."""
        anonimo = APIClient()

        response = anonimo.get(reverse('core:paquete-list'))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_rol_holguin_no_gestiona_paquetes(self):
        """El rol holguín (Cuba) no tiene acceso al CRUD de paquetes de Miami."""
        usuario_holguin = User.objects.create_user(
            username='holguin1', password='testpass123', rol='holguin'
        )
        self.client.force_authenticate(user=usuario_holguin)

        response = self.client.get(reverse('core:paquete-list'))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
