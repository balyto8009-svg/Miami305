"""
apps/core/serializers/paquete_serializer.py
Ubicación: Miami305/apps/core/serializers/paquete_serializer.py

DESCRIPCIÓN:
Serializadores para los modelos de la aplicación core.
"""

from decimal import Decimal

from rest_framework import serializers
from apps.core.models import Paquete, Cliente, Destinatario
from services.tarifa_service import TarifaService


class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = ['id', 'nombre_completo', 'domicilio', 'telefono', 'email']


class DestinatarioSerializer(serializers.ModelSerializer):
    provincia_display = serializers.CharField(source='get_provincia_display', read_only=True)
    municipio_display = serializers.CharField(source='get_municipio_display', read_only=True)
    reparto_display = serializers.CharField(source='get_reparto_display', read_only=True)
    coordenadas = serializers.SerializerMethodField()

    class Meta:
        model = Destinatario
        fields = [
            'id', 'nombre_completo', 'ci', 'domicilio_exacto',
            'provincia', 'provincia_display',
            'municipio', 'municipio_display',
            'reparto', 'reparto_display',
            'telefono', 'telefono2', 'referencias',
            'latitud', 'longitud', 'coordenadas',
        ]

    def get_coordenadas(self, obj):
        return obj.coordenadas


class PaqueteSerializer(serializers.ModelSerializer):
    cliente = ClienteSerializer(read_only=True)
    # write_only y NO requerido: al editar un paquete no se cambia el cliente
    cliente_id = serializers.PrimaryKeyRelatedField(
        queryset=Cliente.objects.all(), source='cliente', write_only=True, required=False
    )
    destinatario = DestinatarioSerializer(read_only=True)
    destinatario_id = serializers.PrimaryKeyRelatedField(
        queryset=Destinatario.objects.all(), source='destinatario', write_only=True, required=False
    )
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    transicion_valida = serializers.BooleanField(read_only=True)
    codigo_bulto = serializers.SerializerMethodField()
    fecha_salida_vuelo = serializers.SerializerMethodField()
    foto_entrega = serializers.SerializerMethodField()
    tarifa_detalle = serializers.SerializerMethodField()
    pesos_categoria = serializers.JSONField(required=False)

    class Meta:
        model = Paquete
        fields = [
            'id', 'codigo_seguimiento', 'descripcion',
            'peso_total_kg', 'pesos_categoria',
            'valor_declarado', 'foto', 'tarifa', 'estado', 'estado_display',
            'transicion_valida', 'codigo_bulto', 'fecha_salida_vuelo',
            'fecha_recepcion', 'fecha_entrega_estimada', 'fecha_entrega_real',
            'foto_entrega',
            'cliente', 'cliente_id', 'destinatario', 'destinatario_id',
            'observaciones', 'tarifa_detalle'
        ]
        read_only_fields = ['codigo_seguimiento', 'fecha_recepcion', 'tarifa', 'peso_total_kg']

    def get_codigo_bulto(self, obj):
        b = obj.bulto_actual
        return b.codigo_bulto if b else None

    def get_fecha_salida_vuelo(self, obj):
        fh = obj.fecha_salida_vuelo
        return fh.isoformat() if fh else None

    def get_foto_entrega(self, obj):
        """URL de la constancia fotográfica estampada (si ya fue entregado)."""
        try:
            ev = obj.eventos_tracking.filter(
                tipo='entregado', foto_entrega__isnull=False
            ).order_by('-fecha_hora').first()
            if ev and ev.foto_entrega:
                return ev.foto_entrega.url
        except Exception:
            pass
        return None
    
    def get_tarifa_detalle(self, obj):
        """Obtiene desglose de la tarifa."""
        try:
            return TarifaService.calcular(obj)
        except Exception:
            return None
    
    def validate(self, data):
        """Validación personalizada."""
        destinatario = data.get('destinatario') or (
            self.instance.destinatario if self.instance else None
        )
        cliente = data.get('cliente') or (
            self.instance.cliente if self.instance else None
        )

        if destinatario and cliente:
            if destinatario.cliente_id != cliente.id:
                raise serializers.ValidationError(
                    "El destinatario no pertenece a este cliente"
                )

        # Validar que el peso total (suma de categorías) no exceda el máximo
        pesos = data.get('pesos_categoria', {}) or {}
        try:
            peso_total = sum(Decimal(str(p)) for p in pesos.values())
        except Exception:
            raise serializers.ValidationError("Los pesos por categoría deben ser numéricos")

        if peso_total > 500:
            raise serializers.ValidationError(
                "El peso total no puede exceder 500 kg"
            )

        return data
    
    def create(self, validated_data):
        """Creación de paquete con código automático, peso y tarifa calculados."""
        from services.codigo_service import CodigoService

        pesos = validated_data.pop('pesos_categoria', {}) or {}

        # Normalizar claves a string y valores a float para el JSON
        pesos_normalizados = {}
        for cat_id, peso in pesos.items():
            if peso is None:
                continue
            pesos_normalizados[str(cat_id)] = float(peso)

        validated_data['pesos_categoria'] = pesos_normalizados
        validated_data['peso_total_kg'] = sum(pesos_normalizados.values())

        # Generar código de seguimiento automático
        validated_data['codigo_seguimiento'] = CodigoService().generar_codigo_seguimiento()

        # Crear objeto temporal para calcular tarifa
        paquete_temp = Paquete(**{
            k: v for k, v in validated_data.items()
            if k not in ('codigo_seguimiento',)
        })
        resultado = TarifaService.calcular(paquete_temp)
        validated_data['tarifa'] = resultado['total']
        validated_data['tarifa_original'] = resultado['base']

        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['creado_por'] = request.user

        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Actualización recalculando peso y tarifa."""
        if 'pesos_categoria' in validated_data:
            pesos = validated_data.pop('pesos_categoria') or {}
            normalizados = {str(k): float(v) for k, v in pesos.items() if v is not None}
            instance.pesos_categoria = normalizados
            instance.peso_total_kg = sum(normalizados.values())

        # Guardar primero para que la instancia persista los cambios
        instance = super().update(instance, validated_data)

        # Recalcular tarifa si cambió el desglose de pesos
        if 'pesos_categoria' in validated_data or 'pesos_categoria' in self.initial_data:
            try:
                resultado = TarifaService.calcular(instance)
                instance.tarifa = resultado['total']
                instance.tarifa_original = resultado['base']
                instance.save(update_fields=['tarifa', 'tarifa_original'])
            except Exception:
                pass

        return instance