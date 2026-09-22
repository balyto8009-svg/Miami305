"""
services/marca_agua_service.py
Ubicación: Miami305/services/marca_agua_service.py

DESCRIPCIÓN:
Servicio para estampar la marca de agua de constancia de entrega sobre las
fotografías tomadas por el personal de Holguín. La evidencia queda grabada
con el texto "ENTREGADO", el día de la semana, la fecha y la hora de la toma,
lo que impide manipular la constancia posteriormente.
"""
import logging
from io import BytesIO

from django.utils import timezone
from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger(__name__)

DIAS_SEMANA = {
    0: 'Lunes',
    1: 'Martes',
    2: 'Miércoles',
    3: 'Jueves',
    4: 'Viernes',
    5: 'Sábado',
    6: 'Domingo',
}

MESES = {
    1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
    5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
    9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre',
}

ALTURA_BANDA_REL = 0.16   # La banda ocupa ~16% de la altura de la foto
MARGEN_REL = 0.03


def _cargar_fuente(tamano):
    """Intenta cargar una fuente TTF del sistema; usa la default si falla."""
    candidatos = [
        'C:/Windows/Fonts/arialbd.ttf',
        'C:/Windows/Fonts/arial.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
    ]
    for ruta in candidatos:
        try:
            return ImageFont.truetype(ruta, tamano)
        except Exception:
            continue
    try:
        return ImageFont.load_default(size=tamano)
    except TypeError:
        return ImageFont.load_default()


def _texto_constancia(momento=None):
    """
    Genera el texto humanizado de la constancia:
    ENTREGADO - Miércoles, 16 de Septiembre de 2026 - 02:15 PM
    """
    if momento is None:
        momento = timezone.localtime()
    dia = DIAS_SEMANA.get(momento.weekday(), '')
    mes = MESES.get(momento.month, '')
    fecha = f"{dia}, {momento.day} de {mes} de {momento.year}"
    hora = momento.strftime('%I:%M:%S %p').lstrip('0')
    return f"ENTREGADO - {fecha} - {hora}"


def estampar_constancia(imagen_bytes, momento=None, codigo_paquete=''):
    """
    Recibe los bytes de una foto de entrega y devuelve los bytes de la imagen
    con la banda de constancia estampada en la base.

    Args:
        imagen_bytes: contenido binario de la imagen original
        momento: datetime con la fecha/hora de la entrega (por defecto, ahora)
        codigo_paquete: opcional, se imprime bajo el texto principal

    Returns:
        bytes de la imagen JPEG con la constancia estampada
    """
    try:
        img = Image.open(BytesIO(imagen_bytes))
        img = img.convert('RGB')
    except Exception as e:
        logger.error(f"No se pudo abrir la imagen de entrega: {e}")
        raise

    ancho, alto = img.size

    texto = _texto_constancia(momento)
    texto_secundario = f"Paquete: {codigo_paquete}" if codigo_paquete else ''

    # Dimensiones responsivas de la banda
    altura_banda = max(60, int(alto * ALTURA_BANDA_REL))
    margen = max(8, int(ancho * MARGEN_REL))
    tam_fuente = max(14, int(altura_banda * 0.28))
    tam_fuente_sec = max(10, int(altura_banda * 0.18))

    fuente = _cargar_fuente(tam_fuente)
    fuente_sec = _cargar_fuente(tam_fuente_sec)

    y_banda = alto - altura_banda

    # Banda oscura semitransparente para legibilidad
    overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    overlay_draw.rectangle(
        [0, y_banda, ancho, alto],
        fill=(0, 21, 41, 210)  # Azul oscuro institucional, ~82% opaco
    )
    img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')
    draw = ImageDraw.Draw(img)

    # Texto principal centrado
    bbox = draw.textbbox((0, 0), texto, font=fuente)
    ancho_texto = bbox[2] - bbox[0]
    x_texto = max(margen, (ancho - ancho_texto) // 2)
    y_texto = y_banda + (altura_banda // 4)

    draw.text((x_texto + 2, y_texto + 2), texto, font=fuente, fill=(0, 0, 0))
    draw.text((x_texto, y_texto), texto, font=fuente, fill=(82, 196, 26))  # Verde entrega

    # Texto secundario (código de paquete) debajo
    if texto_secundario:
        bbox2 = draw.textbbox((0, 0), texto_secundario, font=fuente_sec)
        ancho_texto2 = bbox2[2] - bbox2[0]
        x_texto2 = max(margen, (ancho - ancho_texto2) // 2)
        y_texto2 = y_texto + tam_fuente + 4
        draw.text((x_texto2, y_texto2), texto_secundario, font=fuente_sec, fill=(255, 255, 255))

    buffer = BytesIO()
    img.save(buffer, format='JPEG', quality=88, optimize=True)
    buffer.seek(0)
    return buffer.getvalue()
