"""
apps/core/admin.py
Ubicación: Miami305/apps/core/admin.py

DESCRIPCIÓN:
Configuración del panel de administración para core.
"""
from django.contrib import admin
from django import forms
from django.core.exceptions import ValidationError
from django.urls import reverse
from django.utils.html import format_html
from .models import Cliente, Destinatario, Paquete, Categoria, Provincia  # ✅ IMPORTADO
import re
import json


# ==========================================
# COORDENADAS POR DEFECTO
# ==========================================
DEFAULT_LAT = 20.88691871
DEFAULT_LNG = -76.25923043


# ==========================================
# ADMIN - DESTINATARIO
# ==========================================

class DestinatarioAdminForm(forms.ModelForm):
    class Meta:
        model = Destinatario
        fields = '__all__'
        widgets = {
            'cliente': forms.Select(),
            'telefono': forms.TextInput(attrs={
                'class': 'form-control telefono-input',
                'placeholder': '53556701',
                'maxlength': '8',
                'style': 'width: 200px; display: inline-block;',
                'autocomplete': 'off',
            }),
            'telefono2': forms.TextInput(attrs={
                'class': 'form-control telefono-input',
                'placeholder': '53556701',
                'maxlength': '8',
                'style': 'width: 200px; display: inline-block;',
                'autocomplete': 'off',
            }),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        self.fields['cliente'].queryset = Cliente.objects.all().order_by('nombre_completo')
        self.fields['cliente'].empty_label = 'Seleccione un cliente'
        self.fields['cliente'].required = True
        
        self.fields['telefono2'].required = False
        
        if not self.instance.pk:
            if not self.initial.get('provincia'):
                self.initial['provincia'] = 'HOL'
            if not self.initial.get('municipio'):
                self.initial['municipio'] = 'HLG'
            if not self.initial.get('latitud'):
                self.initial['latitud'] = DEFAULT_LAT
            if not self.initial.get('longitud'):
                self.initial['longitud'] = DEFAULT_LNG
        
        provincia = self.initial.get('provincia') or self.data.get('provincia') or 'HOL'
        municipio = self.initial.get('municipio') or self.data.get('municipio') or 'HLG'
        
        if provincia == 'HOL':
            self.fields['municipio'].widget.attrs.update({
                'class': 'form-control',
                'style': 'display: block;',
                'required': 'required'
            })
            self.fields['municipio'].empty_label = 'Seleccione un municipio'
            if not self.instance.pk and not self.data.get('municipio'):
                self.initial['municipio'] = 'HLG'
        else:
            self.fields['municipio'].widget.attrs.update({
                'class': 'form-control',
                'style': 'display: none;',
                'disabled': 'disabled'
            })
            self.fields['municipio'].empty_label = 'Solo disponible para Holguín'
            if self.instance and self.instance.pk and self.instance.provincia != 'HOL':
                self.instance.municipio = ''
        
        if municipio == 'HLG':
            self.fields['reparto'].widget.attrs.update({
                'class': 'form-control',
                'style': 'display: block;',
                'required': 'required'
            })
            self.fields['reparto'].empty_label = 'Seleccione un reparto'
        else:
            self.fields['reparto'].widget.attrs.update({
                'class': 'form-control',
                'style': 'display: none;',
                'disabled': 'disabled'
            })
            self.fields['reparto'].empty_label = 'Solo disponible para municipio Holguín'
            if self.instance and self.instance.pk and self.instance.municipio != 'HLG':
                self.instance.reparto = ''
    
    def clean_telefono(self):
        value = self.cleaned_data.get('telefono')
        if not value:
            return ''
        valor_limpio = ''.join(filter(str.isdigit, value))
        if len(valor_limpio) != 8:
            raise ValidationError('El teléfono debe tener exactamente 8 dígitos (ejemplo: 53556701).')
        return valor_limpio
    
    def clean_telefono2(self):
        value = self.cleaned_data.get('telefono2')
        if not value:
            return ''
        valor_limpio = ''.join(filter(str.isdigit, value))
        if len(valor_limpio) != 8:
            raise ValidationError('El teléfono 2 debe tener exactamente 8 dígitos (ejemplo: 53556701).')
        return valor_limpio
    
    def clean(self):
        cleaned_data = super().clean()
        provincia = cleaned_data.get('provincia')
        municipio = cleaned_data.get('municipio')
        reparto = cleaned_data.get('reparto')
        
        if provincia != 'HOL' and municipio:
            self.add_error('municipio', 'El municipio solo puede seleccionarse cuando la provincia es Holguín.')
        if provincia == 'HOL' and not municipio:
            self.add_error('municipio', 'Debe seleccionar un municipio cuando la provincia es Holguín.')
        if municipio and municipio != 'HLG' and reparto:
            self.add_error('reparto', 'El reparto solo puede seleccionarse cuando el municipio es Holguín.')
        if municipio == 'HLG' and not reparto:
            self.add_error('reparto', 'Debe seleccionar un reparto cuando el municipio es Holguín.')
        return cleaned_data


@admin.register(Destinatario)
class DestinatarioAdmin(admin.ModelAdmin):
    form = DestinatarioAdminForm
    list_display = [
        'nombre_completo', 'ci', 'provincia', 'municipio', 'reparto', 'telefono', 'telefono2', 'ver_enlace_mapa'
    ]
    search_fields = ['nombre_completo', 'ci', 'telefono', 'telefono2', 'municipio', 'reparto']
    list_filter = ['provincia', 'municipio', 'reparto']
    
    fieldsets = (
        ('Datos Personales', {
            'fields': ('cliente', 'nombre_completo', 'ci')
        }),
        ('Contacto', {
            'fields': (('telefono', 'telefono2'),),
            'description': 'El teléfono 2 es opcional.'
        }),
        ('Dirección', {
            'fields': ('domicilio_exacto', 'provincia', 'municipio', 'reparto', 'referencias', 'latitud', 'longitud'),
            'description': 'Municipio solo disponible para Holguín. Reparto solo para municipio Holguín.'
        }),
    )
    
    def ver_enlace_mapa(self, obj):
        if obj.latitud and obj.longitud:
            url = f"https://www.openstreetmap.org/?mlat={obj.latitud}&mlon={obj.longitud}&zoom=17"
            return format_html(
                '<a href="{}" target="_blank" style="color: #1a237e; text-decoration: none; font-weight: bold;">📍 Ver en mapa</a>',
                url
            )
        return "No disponible"
    ver_enlace_mapa.short_description = 'Mapa'
    ver_enlace_mapa.allow_tags = True
    
    class Media:
        js = (
            'admin/js/destinatario_filtros_vanilla.js',
            'admin/js/destinatario_mapa.js',
            'admin/js/telefono_prefijo.js',
            'admin/js/destinatario_layout.js',
        )
        css = {
            'all': (
                'admin/css/destinatario_mapa.css',
                'admin/css/destinatario_admin.css',
            )
        }


# ==========================================
# ADMIN - CLIENTE
# ==========================================

class ClienteAdminForm(forms.ModelForm):
    class Meta:
        model = Cliente
        fields = '__all__'
    
    def clean_nombre_completo(self):
        value = self.cleaned_data.get('nombre_completo')
        if not value or not value.strip():
            raise ValidationError('El nombre completo es obligatorio.')
        partes = value.strip().split()
        if len(partes) < 2:
            raise ValidationError('Debe ingresar al menos un nombre y dos apellidos. Ejemplo: "Juan Pérez Pérez"')
        return value


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    form = ClienteAdminForm
    list_display = ['nombre_completo', 'telefono', 'email', 'fecha_registro', 'activo']
    search_fields = ['nombre_completo', 'telefono', 'email']
    list_filter = ['activo']
    list_editable = ['activo']
    readonly_fields = ['fecha_registro']


# ==========================================
# ADMIN - PAQUETE (CON CATEGORÍAS DINÁMICAS - VERSIÓN CORREGIDA)
# ==========================================

class PaqueteAdminForm(forms.ModelForm):
    """Formulario personalizado para Paquete con categorías dinámicas."""
    
    class Meta:
        model = Paquete
        fields = '__all__'
        widgets = {
            'cliente': forms.Select(attrs={'class': 'form-control'}),
            'destinatario': forms.Select(attrs={'class': 'form-control'}),
            'peso_total_kg': forms.NumberInput(attrs={
                'step': '0.01', 
                'min': '0', 
                'class': 'peso-total',
                'readonly': 'readonly'
            }),
            'pesos_categoria': forms.HiddenInput(),  # Oculto, lo manejamos con JS
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        self.fields['cliente'].queryset = Cliente.objects.all().order_by('nombre_completo')
        self.fields['cliente'].empty_label = 'Seleccione un cliente'
        self.fields['cliente'].required = True
        
        self.fields['destinatario'].queryset = Destinatario.objects.all().order_by('nombre_completo')
        self.fields['destinatario'].empty_label = 'Seleccione un destinatario'
        self.fields['destinatario'].required = True
        
        if self.instance and self.instance.pk and self.instance.cliente_id:
            self.fields['destinatario'].queryset = Destinatario.objects.filter(
                cliente_id=self.instance.cliente_id
            )
        
        # Campos automáticos
        self.fields['codigo_seguimiento'].required = False
        self.fields['codigo_seguimiento'].widget.attrs['readonly'] = True
        self.fields['codigo_seguimiento'].help_text = 'Se generará automáticamente al guardar'
        
        self.fields['tarifa'].required = False
        self.fields['tarifa'].help_text = 'Se calculará automáticamente al guardar'
        
        self.fields['tarifa_original'].required = False
        self.fields['creado_por'].required = False
        self.fields['peso_total_kg'].help_text = 'Se calcula automáticamente al guardar'
        
        # ✅ Ocultar el campo pesos_categoria (lo manejamos con JS)
        self.fields['pesos_categoria'].widget = forms.HiddenInput()
        self.fields['pesos_categoria'].required = False
    
    def clean(self):
        cleaned_data = super().clean()
        cliente = cleaned_data.get('cliente')
        destinatario = cleaned_data.get('destinatario')
        
        if cliente and destinatario and destinatario.cliente_id != cliente.id:
            self.add_error('destinatario', 'El destinatario seleccionado no pertenece a este cliente.')
        
        return cleaned_data


@admin.register(Paquete)
class PaqueteAdmin(admin.ModelAdmin):
    form = PaqueteAdminForm
    list_display = [
        'codigo_seguimiento', 'cliente', 'destinatario', 
        'peso_total_kg', 'tarifa', 'estado', 'ver_factura'
    ]
    search_fields = ['codigo_seguimiento', 'cliente__nombre_completo', 'destinatario__nombre_completo']
    list_filter = ['estado', 'fecha_recepcion']
    readonly_fields = ['fecha_recepcion', 'ultima_actualizacion']
    
    fieldsets = (
        ('Identificación', {
            'fields': ('codigo_seguimiento', 'cliente', 'destinatario')
        }),
        ('Datos del Paquete', {
            'fields': ('descripcion', 'valor_declarado')
        }),
        ('Pesos por Categoría', {
            'fields': ('pesos_categoria', 'peso_total_kg'),
            'description': 'Las categorías se mostrarán dinámicamente con JavaScript.'
        }),
        ('Tarifa', {
            'fields': ('tarifa', 'tarifa_original')
        }),
        ('Estado y Fechas', {
            'fields': ('estado', 'fecha_recepcion', 'fecha_entrega_estimada', 'fecha_entrega_real')
        }),
        ('Metadatos', {
            'fields': ('observaciones', 'creado_por', 'ultima_actualizacion'),
            'classes': ('collapse',)
        }),
    )
    
    class Media:
        js = (
            'admin/js/paquete_filtro_destinatarios.js',
            'admin/js/paquete_pesos_dinamicos.js',
        )
        css = {
            'all': ('admin/css/paquete_pesos.css',)
        }
    
    # ✅ AGREGAR ESTE MÉTODO
    def changeform_view(self, request, object_id=None, form_url='', extra_context=None):
        extra_context = extra_context or {}
        # Obtener categorías activas
        categorias = list(Categoria.objects.filter(activo=True).order_by('nombre').values('id', 'nombre'))
        import json
        extra_context['categorias_json'] = json.dumps(list(categorias))
        print(f"📋 Categorías enviadas al template: {extra_context['categorias_json']}")  # Debug
        return super().changeform_view(request, object_id, form_url, extra_context)
    
    def save_model(self, request, obj, form, change):
        from services.codigo_service import CodigoService
        from services.tarifa_service import TarifaService
        
        if not change and not obj.codigo_seguimiento:
            obj.codigo_seguimiento = CodigoService().generar_codigo_seguimiento()
            print(f"✅ Código generado: {obj.codigo_seguimiento}")
        
        obj.calcular_peso_total()
        print(f"✅ Peso total calculado: {obj.peso_total_kg}")
        
        resultado = TarifaService.calcular(obj)
        obj.tarifa = resultado['total']
        obj.tarifa_original = resultado['base']
        print(f"✅ Tarifa calculada: {obj.tarifa}")
        
        if not change and not obj.creado_por:
            obj.creado_por = request.user
            print(f"✅ Creado por: {obj.creado_por}")
        
        super().save_model(request, obj, form, change)
    
    def ver_factura(self, obj):
        try:
            if not obj or not obj.id:
                return "No disponible"
            url = reverse('core:descargar_factura', args=[obj.id])
            return format_html(
                '<a href="{}" target="_blank" style="background: #1a237e; color: white; padding: 6px 12px; border-radius: 4px; text-decoration: none; display: inline-block; font-weight: bold;">📄 Factura</a>',
                url
            )
        except Exception:
            return "No disponible"
    ver_factura.short_description = 'Factura'
    ver_factura.allow_tags = True

# ==========================================
# ✅ ADMIN - CATEGORÍAS (CON NOMBRE LIBRE)
# ==========================================

@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    """
    Administración de Categorías con nombre libre y precio por kg.
    """
    list_display = ['nombre', 'precio_por_kg', 'activo', 'fecha_actualizacion']
    list_filter = ['activo']
    search_fields = ['nombre']
    list_editable = ['precio_por_kg', 'activo']
    ordering = ['nombre']
    readonly_fields = ['fecha_actualizacion']
    
    fieldsets = (
        ('Datos de la Categoría', {
            'fields': ('nombre', 'precio_por_kg', 'activo')
        }),
        ('Metadatos', {
            'fields': ('fecha_actualizacion',),
            'classes': ('collapse',)
        }),
    )
    
    # ✅ PERMITIR AÑADIR NUEVAS CATEGORÍAS
    def has_add_permission(self, request):
        return True
# ==========================================
# ADMIN - PROVINCIAS (SIN BOTÓN DE AÑADIR)
# ==========================================

@admin.register(Provincia)
class ProvinciaAdmin(admin.ModelAdmin):
    """
    Administración de Provincias (solo visualización y edición).
    NO se pueden añadir nuevas provincias.
    """
    list_display = ['get_codigo_display', 'costo_envio', 'activo', 'fecha_actualizacion']
    list_filter = ['activo']
    search_fields = ['codigo']
    list_editable = ['costo_envio', 'activo']
    ordering = ['codigo']
    readonly_fields = ['fecha_actualizacion']
    
    # ✅ QUITAR BOTÓN DE AÑADIR
    def has_add_permission(self, request):
        return False
    
    fieldsets = (
        ('Configuración de Provincia', {
            'fields': ('codigo', 'costo_envio', 'activo')
        }),
        ('Metadatos', {
            'fields': ('fecha_actualizacion',),
            'classes': ('collapse',)
        }),
    )
    
    def get_codigo_display(self, obj):
        return obj.get_codigo_display()
    get_codigo_display.short_description = 'Provincia'
    
