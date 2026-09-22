"""
Prueba de humo del flujo completo Miami -> Holguín.
Ejecutar: venv/Scripts/python.exe smoke_test.py

Verifica: cliente, destinatario, paquete (tarifa), bulto, recepción,
clasificación por reparto y entrega con foto estampada.
"""
import io
import os

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
# El cliente de pruebas usa el host 'testserver'
os.environ.setdefault('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1,testserver')
django.setup()

from django.test import Client
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from apps.core.models import Cliente, Destinatario, Paquete, Envio, Categoria, Provincia
from apps.users.models import Usuario

LIMPIEZA = os.getenv('SMOKE_LIMPIAR', '1') == '1'


def foto_test(nombre='foto.jpg'):
    """Genera una imagen JPEG pequeña en memoria."""
    img = Image.new('RGB', (320, 240), color=(90, 140, 200))
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    buffer.seek(0)
    return SimpleUploadedFile(nombre, buffer.read(), content_type='image/jpeg')


def main():
    print('=' * 60)
    print('PRUEBA DE HUMO - FLUJO MIAMI -> HOLGUIN')
    print('=' * 60)

    # Datos base: categorías y provincia deben existir para tarifas
    cat, _ = Categoria.objects.get_or_create(
        nombre='Alimentos', defaults={'precio_por_kg': 8}
    )
    Provincia.objects.get_or_create(codigo='HOL', defaults={'costo_envio': 2})

    usuario, _ = Usuario.objects.get_or_create(
        username='smoke_tester',
        defaults={'rol': 'admin', 'is_staff': True, 'is_superuser': True},
    )
    usuario.set_password('smoke123')
    usuario.save()

    client = Client()

    # 1. LOGIN
    print('\n[1] Login...')
    resp = client.post(
        '/api/login/',
        data={'username': 'smoke_tester', 'password': 'smoke123'},
        content_type='application/json',
    )
    assert resp.status_code == 200, f'login fallo: {resp.content}'
    print('    OK - sesion iniciada')

    # 2. CREAR CLIENTE (Miami)
    print('[2] Crear cliente...')
    resp = client.post(
        '/api/clientes/crear/',
        data={
            'nombre_completo': 'Ernesto Prueba Valdes',
            'telefono': '3055550199',
            'domicilio': '800 SW 8th St, Miami, FL 33130',
            'email': 'ernesto.prueba@test.com',
        },
        content_type='application/json',
    )
    assert resp.status_code == 201, f'crear cliente fallo: {resp.content}'
    cliente_id = resp.json()['id']
    print(f'    OK - cliente id={cliente_id}')

    # 3. CREAR DESTINATARIO (Holguín) con coordenadas
    print('[3] Crear destinatario...')
    resp = client.post(
        '/api/destinatarios/',
        data={
            'cliente_id': cliente_id,
            'nombre_completo': 'Marta Prueba Rodriguez',
            'ci': '85041278654',
            'domicilio_exacto': 'Calle 21 #12 e/ 4 y 5',
            'referencias': 'Casa azul con porton gris',
            'provincia': 'HOL',
            'municipio': 'HLG',
            'reparto': 'VAL',
            'telefono': '53556701',
            'latitud': 20.8831,
            'longitud': -76.2564,
        },
        content_type='application/json',
    )
    assert resp.status_code == 201, f'crear destinatario fallo: {resp.content}'
    destinatario_id = resp.json()['id']
    print(f'    OK - destinatario id={destinatario_id}')

    # 4. CREAR PAQUETE (multipart, con pesos por categoría y foto)
    print('[4] Crear paquete con pesos por categoria...')
    resp = client.post('/api/paquetes/', data={
        'cliente_id': cliente_id,
        'destinatario_id': destinatario_id,
        'descripcion': '[Alimentos - 5 kg]: 2 latas de atun, 1 paquete de arroz',
        'observaciones': 'Prueba de humo',
        'pesos_categoria': f'{{"{cat.id}": 5}}',
        'foto': foto_test('paquete.jpg'),
    })
    assert resp.status_code == 201, f'crear paquete fallo: {resp.content}'
    paquete = resp.json()
    paquete_id = paquete['id']
    assert paquete['codigo_seguimiento'].startswith('PKG-'), paquete
    assert float(paquete['peso_total_kg']) == 5.0, paquete
    assert float(paquete['tarifa']) > 0, paquete
    print(f"    OK - {paquete['codigo_seguimiento']} | peso={paquete['peso_total_kg']}kg | tarifa=${paquete['tarifa']}")

    # 5. FACTURA PDF
    print('[5] Descargar factura PDF...')
    resp = client.get(f'/api/paquete/{paquete_id}/factura/')
    assert resp.status_code == 200, f'factura fallo: {resp.content}'
    assert resp['Content-Type'] == 'application/pdf'
    assert resp.content[:4] == b'%PDF', 'no es un PDF valido'
    print(f'    OK - PDF de {len(resp.content)} bytes')

    # 6. CREAR BULTO (herencia de código)
    print('[6] Confeccionar bulto...')
    resp = client.post('/api/bultos/crear/', data={
        'paquete_ids': [paquete_id],
        'aerolinea': 'American Airlines',
        'numero_vuelo': 'AA1234',
        'observaciones': 'Prueba de humo',
        'foto_bulto': foto_test('bulto.jpg'),
    })
    assert resp.status_code == 201, f'crear bulto fallo: {resp.content}'
    bulto = resp.json()
    assert bulto['codigo_bulto'].startswith('BUL-'), bulto
    assert abs(bulto['peso_total'] - 5.0) < 0.01, bulto
    print(f"    OK - {bulto['codigo_bulto']} | {bulto['cantidad_paquetes']} paquete(s) heredan el codigo")

    # 7. PAQUETES PARA BULTO (ya no debe incluir el paquete consolidado)
    resp = client.get('/api/bultos/para-bulto/')
    ids = [p['id'] for p in resp.json()]
    assert paquete_id not in ids, 'el paquete consolidado sigue apareciendo como recibido'
    print('    OK - paquete consolidado excluido de la lista para bulto')

    # 8. RECEPCIÓN DEL BULTO EN HOLGUÍN
    print('[8] Recibir bulto en sede Holguin...')
    resp = client.post(
        '/api/bultos/recibir/',
        data={'codigo_bulto': bulto['codigo_bulto']},
        content_type='application/json',
    )
    assert resp.status_code == 200, f'recibir bulto fallo: {resp.content}'
    print(f"    OK - {resp.json()['message']}")

    # 9. CLASIFICACIÓN POR REPARTO
    print('[9] Clasificacion por reparto...')
    resp = client.get('/api/holguin/paquetes-por-reparto/')
    assert resp.status_code == 200, resp.content
    grupos = resp.json()
    grupo_val = next((g for g in grupos if g['codigo_reparto'] == 'VAL'), None)
    assert grupo_val, f'no aparece el reparto VAL: {grupos}'
    codigos = [p['codigo_seguimiento'] for p in grupo_val['paquetes']]
    assert paquete['codigo_seguimiento'] in codigos, codigos
    print(f"    OK - reparto '{grupo_val['nombre_reparto']}' con {grupo_val['total_paquetes']} paquete(s)")

    # 10. ENTREGA CON FOTO ESTAMPADA
    print('[10] Registrar entrega con foto estampada...')
    resp = client.post(f'/api/paquetes/{paquete_id}/entrega/', data={
        'foto_entrega': foto_test('entrega.jpg'),
        'observacion': 'Entregado a la propia destinataria',
        'latitud': '20.88315',
        'longitud': '-76.25648',
    })
    assert resp.status_code == 200, f'entrega fallo: {resp.content}'
    data = resp.json()
    assert data['paquete']['estado'] == 'entregado', data
    assert data['foto_entrega'], data
    print(f"    OK - {data['message']}")
    print(f"    Evidencia: {data['foto_entrega']}")

    # Verificar que la evidencia existe en disco
    from django.conf import settings
    ruta_relativa = data['foto_entrega'].split('/media/')[-1]
    ruta = os.path.join(settings.MEDIA_ROOT, ruta_relativa.replace('/', os.sep))
    assert os.path.exists(ruta), f'no existe la evidencia: {ruta}'
    print(f'    OK - evidencia en disco ({os.path.getsize(ruta)} bytes)')

    # 11. EXPORT GPX
    print('[11] Export GPX para Locus Map...')
    resp = client.get('/api/destinatarios/gpx/')
    assert resp.status_code == 200, resp.content
    contenido = resp.content.decode('utf-8')
    assert '<wpt lat="20.88310000" lon="-76.25640000">' in contenido, contenido[:500]
    print(f"    OK - GPX generado ({len(contenido)} bytes)")

    print('\n' + '=' * 60)
    print('RESULTADO: 11/11 VERIFICACIONES OK - FLUJO COMPLETO FUNCIONAL')
    print('=' * 60)


if __name__ == '__main__':
    main()
