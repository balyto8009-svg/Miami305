"""
services/rastreo_pdf_service.py
Ubicación: Miami305/services/rastreo_pdf_service.py

DESCRIPCIÓN:
Genera la CONSTANCIA DE RASTREO en PDF de un paquete: línea de tiempo
del historial real de estados, datos del envío y (si existe) la constancia
fotográfica de la entrega. La descarga el cliente desde el rastreador
público sin iniciar sesión.
"""
import io
import os
from datetime import datetime

from django.conf import settings
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable,
)

AZUL = colors.HexColor('#003366')
GRIS = colors.HexColor('#666666')

# Etiquetas legibles de los estados (mismo orden que Paquete.ESTADOS)
ESTADOS = dict([
    ('recibido', 'Recibido en Miami'),
    ('consolidado', 'Consolidado en bulto'),
    ('en_transito', 'En tránsito aéreo'),
    ('en_cuba', 'En Cuba (Holguín)'),
    ('entregado', 'Entregado'),
])


class RastreoPdfService:
    """Genera la constancia de rastreo de un paquete en PDF."""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._estilos()

    # ------------------------------------------------------------------
    def _estilos(self):
        self.st_titulo = ParagraphStyle(
            'RasTitulo', parent=self.styles['Normal'], fontSize=16,
            textColor=AZUL, fontName='Helvetica-Bold')
        self.st_normal = ParagraphStyle(
            'RasNormal', parent=self.styles['Normal'], fontSize=10, leading=14)
        self.st_peque = ParagraphStyle(
            'RasPeque', parent=self.styles['Normal'], fontSize=9, leading=12,
            textColor=colors.HexColor('#333333'))
        self.st_centro = ParagraphStyle(
            'RasCentro', parent=self.styles['Normal'], fontSize=9,
            alignment=TA_CENTER, textColor=GRIS)

    @staticmethod
    def _esc(texto):
        """Escape XML mínimo para Paragraphs de reportlab."""
        if texto is None:
            return ''
        return (str(texto)
                .replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'))

    @staticmethod
    def _fecha(dt, con_hora=True):
        if not dt:
            return '—'
        try:
            dt = timezone.localtime(dt)
        except (ValueError, TypeError):
            pass
        return dt.strftime('%d/%m/%Y %H:%M' if con_hora else '%d/%m/%Y')

    # ------------------------------------------------------------------
    def generar(self, paquete) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=letter,
            rightMargin=0.7 * inch, leftMargin=0.7 * inch,
            topMargin=0.6 * inch, bottomMargin=0.6 * inch,
            title=f"Constancia de Rastreo {paquete.codigo_seguimiento}",
        )
        story = []

        # ---------- Encabezado: empresa + título ----------
        empresa = getattr(settings, 'EMPRESA_INFO', {})
        datos_empresa = (
            f"<b>{self._esc(empresa.get('nombre', 'MIAMI 305 TRAVEL'))}</b><br/>"
            f"{self._esc(empresa.get('direccion', '9160 NW 122ND ST, HIALEAH GARDENS FL 33018'))}<br/>"
            f"Ph.: {self._esc(empresa.get('telefono', '305-440-5171'))} · "
            f"{self._esc(empresa.get('email', 'miami305travel@gmail.com'))}"
        )
        logo_path = os.path.join(settings.BASE_DIR, 'static', 'img', 'logo.png')
        logo = None
        if os.path.exists(logo_path):
            try:
                logo = Image(logo_path, width=0.9 * inch, height=0.9 * inch)
            except Exception:
                logo = None

        enc = [
            [logo or '',
             Paragraph(datos_empresa, self.st_normal),
             Paragraph(
                 f"<font size='13' color='#003366'><b>CONSTANCIA DE RASTREO</b></font><br/>"
                 f"<font size='11'><b>{self._esc(paquete.codigo_seguimiento)}</b></font><br/>"
                 f"<font size='9' color='#666666'>Generada: "
                 f"{self._fecha(timezone.now())}</font>",
                 ParagraphStyle('RasEncDer', parent=self.st_normal, alignment=TA_RIGHT))],
        ]
        tabla_enc = Table(enc, colWidths=[1.0 * inch, 3.2 * inch, 2.4 * inch])
        tabla_enc.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('PADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(tabla_enc)
        story.append(HRFlowable(width='100%', thickness=2, color=AZUL, spaceAfter=10))

        # ---------- Estado actual ----------
        dest = paquete.destinatario
        color_estado = {
            'recibido': '#1890ff', 'consolidado': '#722ed1',
            'en_transito': '#fa8c16', 'en_cuba': '#13c2c2',
            'entregado': '#52c41a',
        }.get(paquete.estado, '#666666')
        story.append(Paragraph(
            f"Estado actual: <font color='{color_estado}'><b>"
            f"{self._esc(paquete.get_estado_display())}</b></font>",
            self.st_normal))
        story.append(Spacer(1, 0.12 * inch))

        # ---------- Datos del envío ----------
        destino_txt = ', '.join(filter(None, [
            dest.get_reparto_display() if dest else '',
            dest.get_municipio_display() if dest else '',
            dest.get_provincia_display() if dest else '',
        ])) or '—'
        datos = [
            ['Destinatario', self._esc(dest.nombre_completo if dest else '—')],
            ['Destino', self._esc(destino_txt)],
            ['Peso total', f"{paquete.peso_total_kg or 0} kg"],
            ['Recepción en Miami', self._fecha(paquete.fecha_recepcion)],
            ['Entrega estimada', self._esc(
                paquete.fecha_entrega_estimada.strftime('%d/%m/%Y')
                if paquete.fecha_entrega_estimada else 'A coordinar')],
            ['Entrega real', self._fecha(paquete.fecha_entrega_real)
             if paquete.fecha_entrega_real else '—'],
        ]
        tabla_datos = Table(
            [[Paragraph(f'<b>{k}</b>', self.st_peque),
              Paragraph(v, self.st_peque)] for k, v in datos],
            colWidths=[1.7 * inch, 4.9 * inch])
        tabla_datos.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0f5ff')),
            ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#cccccc')),
            ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#dddddd')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('PADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(tabla_datos)
        story.append(Spacer(1, 0.18 * inch))

        # ---------- Línea de tiempo (historial real) ----------
        story.append(Paragraph('<b>Línea de tiempo del envío</b>', self.st_normal))
        story.append(Spacer(1, 0.06 * inch))

        filas = [[Paragraph('<b>Fecha y hora</b>', self.st_peque),
                  Paragraph('<b>Estado</b>', self.st_peque),
                  Paragraph('<b>Ubicación</b>', self.st_peque),
                  Paragraph('<b>Detalle</b>', self.st_peque)]]
        estados_fila = []
        try:
            from apps.core.models.historial import HistorialEstado
            historial = HistorialEstado.objects.filter(
                paquete=paquete).order_by('fecha_cambio')
            for h in historial:
                filas.append([
                    Paragraph(self._fecha(h.fecha_cambio), self.st_peque),
                    Paragraph(self._esc(ESTADOS.get(h.estado_nuevo, h.estado_nuevo)),
                              self.st_peque),
                    Paragraph(self._esc(
                        'Miami, FL' if h.estado_nuevo in ('recibido', 'consolidado', 'en_transito')
                        else 'Holguín, Cuba'), self.st_peque),
                    Paragraph(self._esc(h.observacion or '—'), self.st_peque),
                ])
                estados_fila.append(h.estado_nuevo)
        except Exception:
            pass

        if len(filas) == 1:
            filas.append([
                Paragraph(self._fecha(paquete.fecha_recepcion), self.st_peque),
                Paragraph(self._esc(paquete.get_estado_display()), self.st_peque),
                Paragraph('Miami, FL', self.st_peque),
                Paragraph('Registro inicial del paquete', self.st_peque),
            ])
            estados_fila.append(paquete.estado)

        estilo_tl = [
            ('BACKGROUND', (0, 0), (-1, 0), AZUL),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#cccccc')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('PADDING', (0, 0), (-1, -1), 4),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1),
             [colors.white, colors.HexColor('#fafafa')]),
        ]
        # Resaltar la última fila (estado más reciente)
        if len(filas) > 1:
            estilo_tl.append(('BACKGROUND', (0, len(filas) - 1), (-1, len(filas) - 1),
                              colors.HexColor('#e6f7ff')))
        tabla_tl = Table(filas, colWidths=[1.25 * inch, 1.45 * inch, 1.05 * inch, 2.85 * inch],
                         repeatRows=1)
        tabla_tl.setStyle(TableStyle(estilo_tl))
        story.append(tabla_tl)

        # ---------- Constancia fotográfica (si ya fue entregado) ----------
        try:
            ev = paquete.eventos_tracking.filter(
                tipo='entregado', foto_entrega__isnull=False
            ).order_by('-fecha_hora').first()
            if ev and ev.foto_entrega and os.path.exists(ev.foto_entrega.path):
                story.append(Spacer(1, 0.18 * inch))
                story.append(Paragraph(
                    '<b>Constancia fotográfica de la entrega</b> '
                    '<font size="8" color="#666666">(imagen estampada con fecha y hora)</font>',
                    self.st_normal))
                story.append(Spacer(1, 0.06 * inch))
                try:
                    foto = Image(ev.foto_entrega.path, width=2.8 * inch, height=2.1 * inch)
                    story.append(foto)
                except Exception:
                    story.append(Paragraph('(No se pudo incrustar la imagen)',
                                           self.st_centro))
        except Exception:
            pass

        # ---------- Pie ----------
        story.append(Spacer(1, 0.25 * inch))
        story.append(HRFlowable(width='100%', thickness=1,
                                color=colors.HexColor('#cccccc'), spaceAfter=6))
        story.append(Paragraph(
            '¡Gracias por elegirnos! — Miami 305 Travel · '
            'Consulte en línea: rastreo por código de seguimiento',
            self.st_centro))

        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
