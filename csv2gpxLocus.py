import xml.etree.ElementTree as ET
from datetime import datetime, timezone
import re

# Diccionario de repartos de Holguín
REPARTOS_HOLGUIN = {
    'VAL': 'Vista Alegre',
    'PBL': 'Piedra Blanca',
    'HAR': 'Harlem',
    'LEN': 'Lenin',
    'PAR': 'Parera',
    'CJA': 'Ciudad Jardin',
    'ELL': 'El Llano',
    'NLL': 'Nuevo Llano',
    'API': 'Alcides Pino',
    'LGU': 'Los Guillenes',
    'LLI': 'Los Lirios',
    'ZAY': 'Zayas',
    'LQU': 'La Quinta',
    'SNF': 'Dagoberto Sanfield',
    'PER': 'Peralta',
    'LIB': 'Libertad',
    'PNU': 'Pueblo Nuevo',
    'VN1': 'Villa Nueva',
    'VN2': 'Villa Nueva 2',
    'HTO': 'Hilda Torres',
    '26J': '26 de Julio',
    'RQU': 'Ramon Quintana',
    'EBA': 'Emilio Barsenas',
    'SAN': 'Santiesteban',
    'LAD': 'La Aduana',
    'NHO': 'Nuevo Holguin',
    'PDC': 'Pedro Diaz Coello',
    'HAG': 'Hermanos Aguilera',
    'PIT': 'Pitaluga',
    'MAB': 'Mayabe',
    'CMA': 'El Cayo de Mayabe',
    'SRA': 'San Rafael',
    'LBI': 'Las Biajacas',
    'SAR': 'Sao Arriba',
    'ACL': 'Aguas Claras',
    'EPA': 'El Paraiso',
    'SAD': 'San Andres',
    'LUZ': 'Luz',
    'CC': 'Centro Ciudad',
    'JD': 'Jose Diaz',
    'SSA': 'Salida San Andres',
    'EP': 'Edecio Perez',
    'YAR': 'Yareyal',
    'ELC': 'El Coco',
    'GUI': 'Guirabo',
    '18S': '18 de Septiembre',
    'AU': 'Alex Urquiola',
    'IBE': 'Iberoamericano'
}

def convertir_reparto(codigo):
    """Convierte el código de reparto a su nombre completo"""
    if not codigo or codigo == '\\N' or codigo == '':
        return ''
    codigo_limpio = codigo.strip().upper()
    return REPARTOS_HOLGUIN.get(codigo_limpio, codigo_limpio)

def obtener_datos_del_paquete(wpt):
    """Extrae los datos del waypoint"""
    datos = {
        'nombre': '',
        'domicilio': '',
        'reparto_codigo': '',
        'telefono': '',
        'referencias': '',
        'id': ''
    }
    
    # Intentar obtener el nombre
    name_elem = wpt.find('.//{http://www.topografix.com/GPX/1/1}name')
    if name_elem is not None and name_elem.text:
        nombre = name_elem.text
        # Limpiar el nombre (quitar el ID si está presente)
        if ' - ' in nombre:
            datos['nombre'] = nombre.split(' - ', 1)[1] if len(nombre.split(' - ', 1)) > 1 else nombre
        else:
            datos['nombre'] = nombre
    
    # Intentar obtener el comentario (tiene toda la info)
    cmt_elem = wpt.find('.//{http://www.topografix.com/GPX/1/1}cmt')
    if cmt_elem is not None and cmt_elem.text:
        cmt_text = cmt_elem.text
        # Extraer partes del comentario
        # Formato: "ID: 359 | Jose Castells Romero | Agramonte... | Reparto: VAL | Tel: 53865334"
        parts = cmt_text.split('|')
        for part in parts:
            part = part.strip()
            if 'ID:' in part:
                datos['id'] = part.replace('ID:', '').strip()
            elif 'Reparto:' in part:
                datos['reparto_codigo'] = part.replace('Reparto:', '').strip()
            elif 'Tel:' in part:
                datos['telefono'] = part.replace('Tel:', '').strip()
            elif 'Ref:' in part:
                datos['referencias'] = part.replace('Ref:', '').strip()
            elif not any(key in part for key in ['ID:', 'Reparto:', 'Tel:', 'Ref:', 'Nombre:']):
                # Si no es una etiqueta, podría ser el nombre o domicilio
                if not datos['nombre'] or datos['nombre'] in part:
                    # Si ya tenemos nombre y este part es diferente, es el domicilio
                    if datos['nombre'] and datos['nombre'] not in part:
                        datos['domicilio'] = part
                elif not datos['domicilio']:
                    datos['domicilio'] = part
    
    # Intentar obtener la descripción si no se encontró el domicilio
    if not datos['domicilio']:
        desc_elem = wpt.find('.//{http://www.topografix.com/GPX/1/1}desc')
        if desc_elem is not None and desc_elem.text:
            desc_text = desc_elem.text
            lines = desc_text.split('\n')
            for line in lines:
                if '📍' in line:
                    datos['domicilio'] = line.replace('📍', '').strip()
                elif '🏘️ Reparto:' in line:
                    datos['reparto_codigo'] = line.replace('🏘️ Reparto:', '').strip()
                elif '📞 Tel:' in line:
                    datos['telefono'] = line.replace('📞 Tel:', '').strip()
                elif '📝 Ref:' in line:
                    datos['referencias'] = line.replace('📝 Ref:', '').strip()
    
    return datos

def crear_descripcion_locus(datos):
    """Crea la descripción en formato HTML de Locus"""
    reparto_nombre = convertir_reparto(datos.get('reparto_codigo', ''))
    telefono = datos.get('telefono', '').strip()
    domicilio = datos.get('domicilio', '').strip()
    
    # Construir el texto de la descripción del usuario
    desc_parts = []
    if domicilio:
        desc_parts.append(domicilio)
    if reparto_nombre:
        desc_parts.append(f"Reparto: {reparto_nombre}")
    if telefono and telefono != '0':
        desc_parts.append(f"Tel: {telefono}")
    
    desc_text = " | ".join(desc_parts) if desc_parts else "Sin información adicional"
    
    # Crear el HTML en el formato exacto de Locus
    html_desc = f'''<![CDATA[<!-- desc_gen:start -->
<font color="#ff000000"><table width="100%"><tr><td width="100%" align="center">
<!-- desc_user:start -->
{desc_text}
<!-- desc_user:end -->
</td></tr><tr><td><table width="100%"><tr><td align="left" valign="center"><small><b>Calle</b></small></td><td align="center" valign="center">{domicilio if domicilio else 'No especificada'}</td></tr>
<tr><td align="left" valign="center"><small><b>Ciudad</b></small></td><td align="center" valign="center">Holguín</td></tr>
<tr><td align="left" valign="center"><small><b>Región</b></small></td><td align="center" valign="center">Holguín</td></tr>
<tr><td align="left" valign="center"><small><b>País</b></small></td><td align="center" valign="center">Cuba</td></tr>
<tr><td colspan="2"><hr></td></tr></table></td></tr></table></font>
<!-- desc_gen:end -->]]>'''
    
    return html_desc

def convertir_gpx_a_locus(input_file, output_file):
    # Leer el archivo GPX original
    tree = ET.parse(input_file)
    root = tree.getroot()
    
    # Crear un nuevo documento GPX con los namespaces de Locus
    ns = {
        '': 'http://www.topografix.com/GPX/1/1',
        'xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'gpxx': 'http://www.garmin.com/xmlschemas/GpxExtensions/v3',
        'gpxtrkx': 'http://www.garmin.com/xmlschemas/TrackStatsExtension/v1',
        'gpxtpx': 'http://www.garmin.com/xmlschemas/TrackPointExtension/v2',
        'locus': 'https://www.locusmap.app'
    }
    
    # Crear el elemento raíz con todos los namespaces
    new_root = ET.Element("gpx", 
                          version="1.1",
                          creator="Locus Map, Android",
                          xmlns="http://www.topografix.com/GPX/1/1",
                          xmlns_xsi="http://www.w3.org/2001/XMLSchema-instance",
                          xsi_schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd",
                          xmlns_gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3",
                          xmlns_gpxtrkx="http://www.garmin.com/xmlschemas/TrackStatsExtension/v1",
                          xmlns_gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v2",
                          xmlns_locus="https://www.locusmap.app")
    
    # Crear metadata
    metadata = ET.SubElement(new_root, "metadata")
    desc_meta = ET.SubElement(metadata, "desc")
    desc_meta.text = "Destinatarios de Envíos Cuba - Locus Map"
    time_meta = ET.SubElement(metadata, "time")
    time_meta.text = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    
    # Procesar cada waypoint
    contador = 0
    for wpt in root.findall('.//{http://www.topografix.com/GPX/1/1}wpt'):
        # Obtener coordenadas
        lat = wpt.get('lat')
        lon = wpt.get('lon')
        
        # Extraer datos del waypoint
        datos = obtener_datos_del_paquete(wpt)
        nombre = datos.get('nombre', 'Destinatario')
        domicilio = datos.get('domicilio', '')
        reparto_codigo = datos.get('reparto_codigo', '')
        telefono = datos.get('telefono', '')
        reparto_nombre = convertir_reparto(reparto_codigo)
        
        # Crear el waypoint
        wpt_new = ET.SubElement(new_root, "wpt", lat=lat, lon=lon)
        
        # Time
        time_elem = ET.SubElement(wpt_new, "time")
        time_elem.text = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
        
        # Name
        name_elem = ET.SubElement(wpt_new, "name")
        name_elem.text = nombre
        
        # Comment (con toda la información)
        cmt_elem = ET.SubElement(wpt_new, "cmt")
        cmt_text = f"ID: {datos.get('id', '')} | {nombre} | {domicilio} | Reparto: {reparto_nombre} | Tel: {telefono}"
        if datos.get('referencias') and datos.get('referencias') != '\\N':
            cmt_text += f" | Ref: {datos.get('referencias')}"
        cmt_elem.text = cmt_text
        
        # Description (HTML de Locus)
        desc_elem = ET.SubElement(wpt_new, "desc")
        desc_elem.text = crear_descripcion_locus(datos)
        
        # Extensions (Garmin)
        extensions = ET.SubElement(wpt_new, "extensions")
        
        # Garmin Waypoint Extension
        gpxx_waypoint = ET.SubElement(extensions, "{http://www.garmin.com/xmlschemas/GpxExtensions/v3}WaypointExtension")
        
        # Address
        address = ET.SubElement(gpxx_waypoint, "{http://www.garmin.com/xmlschemas/GpxExtensions/v3}Address")
        
        street = ET.SubElement(address, "{http://www.garmin.com/xmlschemas/GpxExtensions/v3}StreetAddress")
        street.text = domicilio if domicilio else "No especificada"
        
        city = ET.SubElement(address, "{http://www.garmin.com/xmlschemas/GpxExtensions/v3}City")
        city.text = "Holguín"
        
        state = ET.SubElement(address, "{http://www.garmin.com/xmlschemas/GpxExtensions/v3}State")
        state.text = "Holguín"
        
        country = ET.SubElement(address, "{http://www.garmin.com/xmlschemas/GpxExtensions/v3}Country")
        country.text = "Cuba"
        
        # Phone Number
        if telefono and telefono != '0':
            phone = ET.SubElement(gpxx_waypoint, "{http://www.garmin.com/xmlschemas/GpxExtensions/v3}PhoneNumber")
            phone.text = telefono
        
        contador += 1
    
    # Guardar el archivo GPX
    tree_new = ET.ElementTree(new_root)
    tree_new.write(output_file, encoding='utf-8', xml_declaration=True)
    
    print(f"✅ Conversión a Locus completada")
    print(f"📊 Puntos procesados: {contador}")
    print(f"📁 Archivo generado: {output_file}")

if __name__ == "__main__":
    # Convertir el GPX al formato de Locus
    convertir_gpx_a_locus('destinatarios.gpx', 'dest.gpx')