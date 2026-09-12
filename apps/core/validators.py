"""
apps/core/validators.py
Ubicación: Miami305/apps/core/validators.py

DESCRIPCIÓN:
Validadores reutilizables para los modelos de la aplicación core.
"""
import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


def validar_nombre_completo(value):
    """
    Valida que el nombre completo tenga al menos dos palabras (nombre + apellido).
    
    Args:
        value: El valor del campo a validar
    
    Raises:
        ValidationError: Si el nombre no cumple con los requisitos
    """
    if not value or not value.strip():
        raise ValidationError(
            _('El nombre completo es obligatorio.'),
            code='required'
        )
    
    # Eliminar espacios extra y dividir
    partes = value.strip().split()
    
    # Verificar que haya al menos 2 palabras
    if len(partes) < 3:
        raise ValidationError(
            _('Debe ingresar al menos un nombre y dos apellidos. Ejemplo: "Juan Pérez Pérez"'),
            code='min_words'
        )
    
    # Verificar que cada parte tenga al menos 2 caracteres
    for parte in partes:
        if len(parte) < 2:
            raise ValidationError(
                _('"%(parte)s" es demasiado corto. Cada nombre/apellido debe tener al menos 2 caracteres.'),
                code='min_length',
                params={'parte': parte}
            )
    
    # Verificar que solo contenga caracteres válidos
    patron = r'^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\.\-]+$'
    if not re.match(patron, value):
        raise ValidationError(
            _('El nombre solo puede contener letras, espacios, puntos y guiones.'),
            code='invalid_characters'
        )

def validar_telefono_cuba(value):
    """
    Valida que el teléfono tenga exactamente 8 dígitos numéricos.
    El +53 se agregará automáticamente en el formulario.
    """
    if not value:
        return value
    
    # Limpiar el valor (eliminar +53 si está presente)
    valor_limpio = value.replace('+53', '').strip()
    
    if not valor_limpio.isdigit():
        raise ValidationError(
            _('El teléfono solo puede contener números.'),
            code='invalid_phone'
        )
    
    if len(valor_limpio) != 8:
        raise ValidationError(
            _('El teléfono debe tener exactamente 8 dígitos (ejemplo: 53556701).'),
            code='phone_length'
        )
    
    return value

def validar_nombre_completo_opcional(value):
    """
    Validador opcional que permite valores vacíos pero valida si hay contenido.
    Útil para campos que pueden estar en blanco pero si tienen contenido deben ser válidos.
    """
    if value and value.strip():
        validar_nombre_completo(value)
    return value