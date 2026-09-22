"""
tests/factories.py
Ubicación: Miami305/tests/factories.py

DESCRIPCIÓN:
Datos base compartidos por toda la suite de tests.

Ojo con las validaciones REALES de los modelos:
- Cliente/Destinatario exigen nombre con al menos 3 palabras
  (apps.core.validators.validar_nombre_completo).
- Destinatario.save() ejecuta full_clean():
  * provincia HOL exige municipio; municipio HLG exige reparto;
  * fuera de Holguín NO puede llevar municipio ni reparto;
  * teléfono cubano: exactamente 8 dígitos (validar_telefono_cuba).
- Paquete ya no tiene peso_kg/alto_cm: el peso vive en peso_total_kg y
  el desglose en el JSON pesos_categoria {id_categoria: kg}.
"""
from decimal import Decimal

from apps.core.models import Categoria, Cliente, Destinatario, Paquete, Provincia


def crear_cliente(**kwargs):
    """Cliente válido (nombre de 3 palabras)."""
    datos = {
        'nombre_completo': 'Juan Carlos Pérez',
        'domicilio': '123 Main St, Miami',
        'telefono': '305-555-1234',
        'email': 'juan.carlos@test.com',
    }
    datos.update(kwargs)
    return Cliente.objects.create(**datos)


def crear_destinatario(cliente, provincia='HOL', **kwargs):
    """
    Destinatario válido según Destinatario.clean():
    - HOL: municipio + reparto obligatorios (por defecto HLG/VAL).
    - resto de provincias: municipio y reparto en blanco.
    """
    datos = {
        'cliente': cliente,
        'nombre_completo': 'María Elena García',
        'domicilio_exacto': 'Calle 12 #34, entre Sol y Luna',
        'provincia': provincia,
        'telefono': '75556789',
        # Coordenadas explícitas: los defaults float del modelo
        # (longitud=-76.25923043) no pasan full_clean() porque
        # DecimalField redondea el float a 9 decimales con max_digits=11.
        'latitud': '20.88691871',
        'longitud': '-76.25923043',
    }
    if provincia == 'HOL':
        datos['municipio'] = kwargs.pop('municipio', 'HLG')
        datos['reparto'] = kwargs.pop('reparto', 'VAL')
    else:
        datos['municipio'] = kwargs.pop('municipio', '')
        datos['reparto'] = kwargs.pop('reparto', '')
    datos.update(kwargs)
    return Destinatario.objects.create(**datos)


def crear_categoria(nombre='Ropa', precio_por_kg='4.00', activo=True):
    """Categoría con precio por kg fijo (por defecto Ropa a 4,00 $/kg)."""
    return Categoria.objects.create(
        nombre=nombre,
        precio_por_kg=Decimal(str(precio_por_kg)),
        activo=activo,
    )


def crear_provincia(codigo='HOL', costo_envio='2.00', activo=True):
    """Provincia con costo de envío fijo (por defecto Holguín a 2,00 $)."""
    return Provincia.objects.create(
        codigo=codigo,
        costo_envio=Decimal(str(costo_envio)),
        activo=activo,
    )


def crear_paquete(cliente, destinatario, codigo_seguimiento,
                  peso_total_kg='1.00', pesos_categoria=None, **kwargs):
    """Paquete en estado 'recibido' (el punto de partida del flujo)."""
    datos = {
        'cliente': cliente,
        'destinatario': destinatario,
        'codigo_seguimiento': codigo_seguimiento,
        'descripcion': 'Paquete de prueba',
        'peso_total_kg': Decimal(str(peso_total_kg)),
        'pesos_categoria': pesos_categoria if pesos_categoria is not None else {},
        'tarifa': Decimal('10.00'),
        'estado': 'recibido',
    }
    datos.update(kwargs)
    return Paquete.objects.create(**datos)
