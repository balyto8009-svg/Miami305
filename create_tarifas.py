"""
create_tarifas.py
Ubicación: Miami305/create_tarifas.py

DESCRIPCIÓN:
Script para crear tarifas iniciales con costos basados en Holguín como centro de recepción.
"""

from apps.core.models import Categoria, Tarifa

# ==========================================
# CATEGORÍAS (deben existir primero)
# ==========================================
print("📦 Creando tarifas iniciales...")

# Verificar que las categorías existen
categorias_nombres = ['Paq', 'Alimentos', 'Medicamentos', 'Electrodomésticos']
categorias = {}

for nombre in categorias_nombres:
    try:
        categoria = Categoria.objects.get(nombre=nombre, activo=True)
        categorias[nombre] = categoria
        print(f"✅ Categoría encontrada: {nombre}")
    except Categoria.DoesNotExist:
        print(f"❌ Categoría no encontrada: {nombre} - Creando...")
        categoria = Categoria.objects.create(nombre=nombre, activo=True)
        categorias[nombre] = categoria
        print(f"✅ Categoría creada: {nombre}")

# ==========================================
# TARIFAS POR PROVINCIA Y CATEGORÍA
# ==========================================

# Precios por kg por categoría (base)
PRECIOS_BASE = {
    'Paq': 6.00,
    'Alimentos': 8.00,
    'Medicamentos': 10.00,
    'Electrodomésticos': 12.00,
}

# ✅ COSTOS DE ENVÍO (basados en distancia desde Holguín)
# Holguín es el centro de recepción → costo más bajo
COSTOS_ENVIO = {
    # ✅ Holguín (centro de recepción - más barato)
    'HOL': 2.00,  # Holguín - DESTINO LOCAL
    
    # Provincias cercanas a Holguín (costo bajo)
    'GRM': 2.50,  # Granma
    'LTU': 2.50,  # Las Tunas
    'SCU': 3.00,  # Santiago de Cuba
    'GTM': 3.50,  # Guantánamo
    'CMG': 3.00,  # Camagüey
    
    # Provincias del centro (costo medio)
    'CAV': 3.50,  # Ciego de Ávila
    'SSP': 4.00,  # Sancti Spíritus
    'VCL': 4.50,  # Villa Clara
    'CFG': 4.50,  # Cienfuegos
    'MTZ': 5.00,  # Matanzas
    
    # Provincias del occidente (más lejos - más caro)
    'HAB': 5.50,  # La Habana
    'MAY': 5.50,  # Mayabeque
    'ART': 5.50,  # Artemisa
    'PRI': 6.00,  # Pinar del Río
    
    # Isla de la Juventud (más caro)
    'IJV': 8.00,  # Isla de la Juventud
}

# ==========================================
# CREAR TARIFAS
# ==========================================

tarifas_creadas = 0
tarifas_existentes = 0

print("\n" + "="*60)
print("📊 Creando tarifas por provincia...")
print("="*60)

for provincia_codigo, costo_envio in COSTOS_ENVIO.items():
    for categoria_nombre, categoria_obj in categorias.items():
        precio_kg = PRECIOS_BASE[categoria_nombre]
        
        # ✅ Ajuste por categoría (sin sobrecargo adicional)
        tarifa, created = Tarifa.objects.get_or_create(
            categoria=categoria_obj,
            provincia=provincia_codigo,
            defaults={
                'precio_por_kg': round(precio_kg, 2),
                'costo_envio': round(costo_envio, 2),
                'activo': True,
            }
        )
        
        if created:
            tarifas_creadas += 1
            print(f"✅ {categoria_nombre} - {tarifa.get_provincia_display()}: ${precio_kg:.2f}/kg + ${costo_envio:.2f}")
        else:
            tarifas_existentes += 1

# ==========================================
# RESUMEN
# ==========================================
print("\n" + "="*60)
print("📊 RESUMEN DE TARIFAS CREADAS")
print("="*60)
print(f"✅ Tarifas nuevas creadas: {tarifas_creadas}")
print(f"ℹ️  Tarifas ya existentes: {tarifas_existentes}")
print(f"📦 Total de tarifas: {Tarifa.objects.count()}")
print("="*60)

# ✅ Mostrar ejemplo de tarifas para Holguín
print("\n📋 Ejemplo - Tarifas para Holguín (centro de recepción):")
tarifas_holguin = Tarifa.objects.filter(provincia='HOL').select_related('categoria')
for t in tarifas_holguin:
    print(f"  {t.categoria} → ${t.precio_por_kg}/kg + ${t.costo_envio}")

# ✅ Mostrar comparativa de costos de envío
print("\n📋 Costos de envío por provincia (Paq):")
tarifas_paq = Tarifa.objects.filter(categoria__nombre='Paq').order_by('costo_envio')
for t in tarifas_paq:
    print(f"  {t.get_provincia_display()}: ${t.costo_envio}")

print("\n🎉 ¡Tarifas iniciales creadas correctamente!")
print("📍 Centro de recepción: Holguín (costo de envío más bajo)")