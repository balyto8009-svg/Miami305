"""
services/tarifa_service.py
Ubicación: Miami305/services/tarifa_service.py

DESCRIPCIÓN:
Servicio para calcular tarifas de envío usando Categorías y Provincias.
"""
from decimal import Decimal
from typing import Dict
from apps.core.models import Categoria, Provincia


class TarifaService:
    """
    Servicio para calcular tarifas de envío usando valores de la base de datos.
    """
    
    # Valores por defecto (se usan si no hay configuraciones en BD)
    CATEGORIAS_DEFAULT = {
        'paq': Decimal('6.00'),
        'alimentos': Decimal('8.00'),
        'medicamentos': Decimal('10.00'),
        'electrodomesticos': Decimal('12.00'),
    }
    
    PROVINCIAS_DEFAULT = {
        'HOL': Decimal('2.00'),
        'GRM': Decimal('2.50'),
        'LTU': Decimal('2.50'),
        'SCU': Decimal('3.00'),
        'CMG': Decimal('3.00'),
        'GTM': Decimal('3.50'),
        'CAV': Decimal('3.50'),
        'SSP': Decimal('4.00'),
        'VCL': Decimal('4.50'),
        'CFG': Decimal('4.50'),
        'MTZ': Decimal('5.00'),
        'HAB': Decimal('5.50'),
        'MAY': Decimal('5.50'),
        'ART': Decimal('5.50'),
        'PRI': Decimal('6.00'),
        'IJV': Decimal('8.00'),
    }
    
    @classmethod
    def obtener_precio_categoria(cls, categoria_nombre: str) -> Decimal:
        """
        Obtiene el precio por kg de una categoría desde la BD.
        Si no existe, usa valor por defecto.
        """
        try:
            categoria = Categoria.objects.get(nombre=categoria_nombre, activo=True)
            return categoria.precio_por_kg
        except Categoria.DoesNotExist:
            return cls.CATEGORIAS_DEFAULT.get(categoria_nombre, Decimal('6.00'))
    
    @classmethod
    def obtener_costo_provincia(cls, provincia_codigo: str) -> Decimal:
        """
        Obtiene el costo de envío de una provincia desde la BD.
        Si no existe, usa valor por defecto.
        """
        try:
            provincia = Provincia.objects.get(codigo=provincia_codigo, activo=True)
            return provincia.costo_envio
        except Provincia.DoesNotExist:
            return cls.PROVINCIAS_DEFAULT.get(provincia_codigo, Decimal('0.00'))
    
    @classmethod
    def calcular(cls, paquete) -> Dict:
        """
        Calcula la tarifa total para un paquete.
        Tarifa = sum(peso_categoria × precio_categoria) + costo_envio_provincia
        """
        provincia = paquete.destinatario.provincia if paquete.destinatario else 'HOL'
        
        # Obtener todas las categorías activas
        categorias = Categoria.objects.filter(activo=True)
        
        # Calcular tarifa por categoría
        tarifa_base = Decimal('0.00')
        detalle = {}
        
        for categoria in categorias:
            # Obtener el peso de esta categoría desde el JSON
            peso = paquete.pesos_categoria.get(str(categoria.id), 0)
            if peso > 0:
                precio = categoria.precio_por_kg
                total_categoria = Decimal(str(peso)) * precio
                tarifa_base += total_categoria
                detalle[categoria.nombre] = float(total_categoria)
        
        # Obtener costo de envío por provincia
        costo_envio = cls.obtener_costo_provincia(provincia)
        total = tarifa_base + costo_envio
        
        return {
            'base': tarifa_base,
            'costo_envio': costo_envio,
            'total': total,
            'detalle': detalle,
            'detalles': f"Tarifa base: ${tarifa_base:.2f} + Envío a {provincia}: ${costo_envio:.2f} = Total: ${total:.2f}"
        }