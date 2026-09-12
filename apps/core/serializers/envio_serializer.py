"""
apps/core/serializers/envio_serializer.py
Ubicación: Miami305/apps/core/serializers/envio_serializer.py

DESCRIPCIÓN:
Serializador para el modelo Envio (consolidaciÃ³n de paquetes).
"""
from rest_framework import serializers
from apps.core.models import Envio, Paquete, PaqueteEnvio
from .paquete_serializer import PaqueteSerializer


class EnvioSerializer(serializers.ModelSerializer):
    paquetes = PaqueteSerializer(many=True, read_only=True)
    paquete_ids = serializers.PrimaryKeyRelatedField(
        queryset=Paquete.objects.all(),
        source='paquetes',
        write_only=True,
        many=True
    )
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    creado_por_nombre = serializers.CharField(source='creado_por.username', read_only=True)

    class Meta:
        model = Envio
        fields = [
            'id', 'codigo_bulto', 'codigo_barras', 'fecha_creacion',
            'fecha_salida', 'fecha_llegada_cuba', 'fecha_entrega_completa',
            'aerolinea', 'numero_guia_aerea', 'numero_vuelo',
            'peso_total', 'peso_volumetrico', 'cantidad_paquetes',
            'costo_envio', 'margen', 'estado', 'estado_display',
            'observaciones', 'creado_por', 'creado_por_nombre',
            'paquetes', 'paquete_ids'
        ]
        read_only_fields = ['codigo_bulto', 'fecha_creacion', 'cantidad_paquetes', 'peso_total']

