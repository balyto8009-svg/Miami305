"""
apps/core/serializers/__init__.py
Ubicación: Miami305/apps/core/serializers/__init__.py

DESCRIPCIÓN:
Punto de entrada para todos los serializadores de core.
"""
from .paquete_serializer import PaqueteSerializer, ClienteSerializer, DestinatarioSerializer
from .envio_serializer import EnvioSerializer
from .cliente_serializer import ClienteSerializer as ClienteSerializerSimple

__all__ = [
    'PaqueteSerializer',
    'ClienteSerializer',
    'DestinatarioSerializer',
    'EnvioSerializer',
    'ClienteSerializerSimple',
]
