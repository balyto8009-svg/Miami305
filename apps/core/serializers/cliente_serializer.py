"""
apps/core/serializers/cliente_serializer.py
UbicaciÃ³n: Miami305/apps/core/serializers/cliente_serializer.py

DESCRIPCIÓN:
Serializador específico para el modelo Cliente (sin anidamientos).
"""
from rest_framework import serializers
from apps.core.models import Cliente


class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = ['id', 'nombre_completo', 'domicilio', 'telefono', 'email', 'fecha_registro', 'activo']
        read_only_fields = ['fecha_registro']

