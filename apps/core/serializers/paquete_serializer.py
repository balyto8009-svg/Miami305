"""
apps/core/serializers/paquete_serializer.py
Ubicación: Miami305/apps/core/serializers/paquete_serializer.py

DESCRIPCIÓN:
Serializadores para los modelos de la aplicación core.
"""

from rest_framework import serializers
from apps.core.models import Paquete, Cliente, Destinatario
from services.tarifa_service import TarifaService


class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = ['id', 'nombre_completo', 'domicilio', 'telefono', 'email']


class DestinatarioSerializer(serializers.ModelSerializer):
    provincia_display = serializers.CharField(source='get_provincia_display', read_only=True)
    
    class Meta:
        model = Destinatario
        fields = ['id', 'nombre_completo', 'ci', 'domicilio_exacto', 'municipio', 
                  'provincia', 'provincia_display', 'telefono', 'telefono2', 'referencias']


class PaqueteSerializer(serializers.ModelSerializer):
    cliente = ClienteSerializer(read_only=True)
    cliente_id = serializers.PrimaryKeyRelatedField(
        queryset=Cliente.objects.all(), source='cliente', write_only=True
    )
    destinatario = DestinatarioSerializer(read_only=True)
    destinatario_id = serializers.PrimaryKeyRelatedField(
        queryset=Destinatario.objects.all(), source='destinatario', write_only=True
    )
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    tarifa_detalle = serializers.SerializerMethodField()
    
    class Meta:
        model = Paquete
        fields = [
            'id', 'codigo_seguimiento', 'descripcion',
            'peso_total_kg', 'peso_alimentos_kg', 'peso_medicamentos_kg',
            'peso_electrodomesticos_kg', 'peso_otros_kg',
            'valor_declarado', 'foto', 'tarifa', 'estado', 'estado_display',
            'fecha_recepcion', 'fecha_entrega_estimada',
            'cliente', 'cliente_id', 'destinatario', 'destinatario_id',
            'observaciones', 'tarifa_detalle'
        ]
        read_only_fields = ['codigo_seguimiento', 'fecha_recepcion', 'tarifa', 'peso_total_kg']
    
    def get_tarifa_detalle(self, obj):
        """Obtiene desglose de la tarifa."""
        return TarifaService.calcular(obj)
    
    def validate(self, data):
        """Validación personalizada."""
        # Verificar que el destinatario pertenece al cliente
        if data.get('destinatario') and data.get('cliente'):
            if data['destinatario'].cliente_id != data['cliente'].id:
                raise serializers.ValidationError(
                    "El destinatario no pertenece a este cliente"
                )
        
        # ✅ Validar que el peso total no exceda el máximo
        peso_total = (
            data.get('peso_alimentos_kg', 0) +
            data.get('peso_medicamentos_kg', 0) +
            data.get('peso_electrodomesticos_kg', 0) +
            data.get('peso_otros_kg', 0)
        )
        
        if peso_total > 500:
            raise serializers.ValidationError(
                "El peso total no puede exceder 500 kg"
            )
        
        return data
    
    def create(self, validated_data):
        """Creación de paquete con cálculo automático."""
        from services.codigo_service import CodigoService
        from services.tarifa_service import TarifaService
        
        # Calcular peso total
        peso_total = (
            validated_data.get('peso_alimentos_kg', 0) +
            validated_data.get('peso_medicamentos_kg', 0) +
            validated_data.get('peso_electrodomesticos_kg', 0) +
            validated_data.get('peso_otros_kg', 0)
        )
        validated_data['peso_total_kg'] = peso_total
        
        # Generar código de seguimiento
        codigo_service = CodigoService()
        validated_data['codigo_seguimiento'] = codigo_service.generar_codigo_seguimiento()
        
        # Crear objeto temporal para calcular tarifa
        paquete_temp = Paquete(**validated_data)
        resultado = TarifaService.calcular(paquete_temp)
        validated_data['tarifa'] = resultado['total']
        validated_data['tarifa_original'] = resultado['base']
        
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['creado_por'] = request.user
        
        return super().create(validated_data)