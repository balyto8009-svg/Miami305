"""
apps/core/models/__init__.py
Ubicación: Miami305/apps/core/models/__init__.py

DESCRIPCIÓN:
Punto de entrada para todos los modelos de la aplicación core.
Exporta todos los modelos para facilitar su importación desde otros módulos.
"""
from .cliente import Cliente
from .destinatario import Destinatario
from .paquete import Paquete
from .provincia import Provincia  # ✅ NUEVO
from .categoria import Categoria
from .envio import Envio
from .paquete_envio import PaqueteEnvio
from .factura import Factura
from .historial import HistorialEstado

__all__ = [
    'Cliente',
    'Destinatario',
    'Paquete',
    'Categoria',      # ✅ NUEVO
    'Provincia',      # ✅ NUEVO
    'Envio',
    'PaqueteEnvio',
    'Factura',
    'HistorialEstado'
]