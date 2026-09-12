import csv
import xml.etree.ElementTree as ET
from datetime import datetime

def csv_to_gpx(csv_file, gpx_file):
    # Crear la raíz del GPX
    root = ET.Element("gpx", version="1.1", creator="Python - Envíos Cuba",
                      xmlns="http://www.topografix.com/GPX/1/1")
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        contador = 0
        
        for row in reader:
            # Obtener coordenadas
            lat = row.get('latitud', '').strip()
            lon = row.get('longitud', '').strip()
            
            # Saltar registros sin coordenadas válidas
            if not lat or not lon or lat == '' or lon == '':
                continue
            try:
                lat_float = float(lat)
                lon_float = float(lon)
                if lat_float == 0 and lon_float == 0:
                    continue
            except ValueError:
                continue
            
            # Crear punto (waypoint)
            wpt = ET.SubElement(root, "wpt", lat=lat, lon=lon)
            
            # Nombre: nombre completo + ID
            nombre = row.get('nombre_completo', 'Sin nombre').strip()
            id_dest = row.get('id', '')
            name = ET.SubElement(wpt, "name")
            name.text = f"{id_dest} - {nombre}" if id_dest else nombre
            
            # Descripción: domicilio + reparto + teléfono
            domicilio = row.get('domicilio_exacto', '').strip()
            reparto = row.get('reparto', '').strip()
            telefono = row.get('telefono', '').strip()
            referencias = row.get('referencias', '').strip()
            
            # Construir la descripción
            desc_parts = []
            if domicilio:
                desc_parts.append(f"📍 {domicilio}")
            if reparto and reparto != '\\N':
                desc_parts.append(f"🏘️ Reparto: {reparto}")
            if telefono and telefono != '0':
                desc_parts.append(f"📞 Tel: {telefono}")
            if referencias and referencias != '\\N':
                desc_parts.append(f"📝 Ref: {referencias}")
            
            desc_text = "\n".join(desc_parts) if desc_parts else "Sin información adicional"
            
            desc = ET.SubElement(wpt, "desc")
            desc.text = desc_text
            
            # Añadir comentario con todos los datos (opcional)
            # Útil para tener toda la información en el mapa
            cmt = ET.SubElement(wpt, "cmt")
            cmt.text = f"ID: {id_dest} | {nombre} | {domicilio} | Reparto: {reparto} | Tel: {telefono}"
            
            contador += 1
    
    # Guardar el archivo GPX
    tree = ET.ElementTree(root)
    tree.write(gpx_file, encoding='utf-8', xml_declaration=True)
    
    print(f"✅ GPX generado con {contador} puntos")
    print(f"📁 Archivo: {gpx_file}")

if __name__ == "__main__":
    # Cambia estos nombres de archivo según necesites
    csv_to_gpx('destinatarios.csv', 'destinatarios.gpx')