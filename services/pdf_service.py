"""
services/pdf_service.py
Ubicación: Miami305/services/pdf_service.py

DESCRIPCIÓN:
Servicio para generar documentos PDF en el sistema.
Permite crear facturas, manifiestos de envío, etiquetas de seguimiento
y reportes personalizados. Utiliza ReportLab para la generación de PDFs.
"""
import io
import os
from decimal import Decimal
from datetime import datetime
from django.conf import settings
from django.template.loader import render_to_string
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.barcode import code128
import logging

logger = logging.getLogger(__name__)


class PDFService:
    """
    Servicio para generación de documentos PDF.
    """
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._crear_estilos_personalizados()
    
    def _crear_estilos_personalizados(self):
        """Crea estilos personalizados para los PDFs."""
        self.styles.add(ParagraphStyle(
            name='Titulo',
            parent=self.styles['Heading1'],
            fontSize=24,
            alignment=TA_CENTER,
            spaceAfter=12
        ))
        self.styles.add(ParagraphStyle(
            name='Subtitulo',
            parent=self.styles['Heading2'],
            fontSize=16,
            alignment=TA_CENTER,
            spaceAfter=10
        ))
        self.styles.add(ParagraphStyle(
            name='Derecha',
            parent=self.styles['Normal'],
            alignment=TA_RIGHT
        ))
        self.styles.add(ParagraphStyle(
            name='CeldaHeader',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.white
        ))
    
    def generar_factura(self, paquete) -> bytes:
        """
        Genera una factura en PDF para un paquete específico.
        
        Args:
            paquete: Objeto Paquete para el cual generar la factura
            
        Returns:
            bytes: Contenido del PDF en bytes
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        
        # Contenido del PDF
        story = []
        
        # Encabezado
        story.append(Paragraph("MIAMI305 ENVÍOS", self.styles['Titulo']))
        story.append(Paragraph("Factura de Envío", self.styles['Subtitulo']))
        story.append(Spacer(1, 12))
        
        # Datos de la empresa
        empresa = getattr(settings, 'EMPRESA_INFO', {})
        info_empresa = f"""
        <b>{empresa.get('nombre', 'Miami305 Envíos')}</b><br/>
        {empresa.get('direccion', '123 Main Street, Miami, FL 33101')}<br/>
        Tel: {empresa.get('telefono', '+1 (305) 555-0123')}<br/>
        Email: {empresa.get('email', 'info@miami305.com')}
        """
        story.append(Paragraph(info_empresa, self.styles['Normal']))
        story.append(Spacer(1, 12))
        
        # Número de factura y fecha
        story.append(Paragraph(
            f"Factura NÂ°: {self._generar_numero_factura(paquete)}",
            self.styles['Normal']
        ))
        story.append(Paragraph(
            f"Fecha: {datetime.now().strftime('%d/%m/%Y %H:%M')}",
            self.styles['Normal']
        ))
        story.append(Spacer(1, 12))
        
        # Datos del cliente
        story.append(Paragraph("<b>DATOS DEL CLIENTE</b>", self.styles['Heading3']))
        story.append(Paragraph(
            f"Nombre: {paquete.cliente.nombre_completo}",
            self.styles['Normal']
        ))
        if paquete.cliente.email:
            story.append(Paragraph(f"Email: {paquete.cliente.email}", self.styles['Normal']))
        if paquete.cliente.telefono:
            story.append(Paragraph(f"Teléfono: {paquete.cliente.telefono}", self.styles['Normal']))
        story.append(Spacer(1, 6))
        
        # Datos del destinatario
        story.append(Paragraph("<b>DATOS DEL DESTINATARIO</b>", self.styles['Heading3']))
        story.append(Paragraph(
            f"Nombre: {paquete.destinatario.nombre_completo}",
            self.styles['Normal']
        ))
        story.append(Paragraph(
            f"Domicilio: {paquete.destinatario.domicilio_exacto}",
            self.styles['Normal']
        ))
        story.append(Paragraph(
            f"Provincia: {paquete.destinatario.get_provincia_display()}",
            self.styles['Normal']
        ))
        story.append(Paragraph(
            f"Teléfono: {paquete.destinatario.telefono}",
            self.styles['Normal']
        ))
        story.append(Spacer(1, 12))
        
        # Detalle del paquete
        story.append(Paragraph("<b>DETALLE DEL PAQUETE</b>", self.styles['Heading3']))
        
        datos_paquete = [
            ['Concepto', 'Detalle'],
            ['Código de seguimiento', paquete.codigo_seguimiento],
            ['Descripción', paquete.descripcion[:100]],
            ['Peso', f"{paquete.peso_total_kg or 0} kg"],
        ]
        
        if paquete.alto_cm and paquete.ancho_cm and paquete.largo_cm:
            datos_paquete.append(['Dimensiones', f"{paquete.alto_cm} x {paquete.ancho_cm} x {paquete.largo_cm} cm"])
        
        tabla = Table(datos_paquete, colWidths=[150, 250])
        tabla.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(tabla)
        story.append(Spacer(1, 12))
        
        # Tarifa
        story.append(Paragraph("<b>RESUMEN DE COSTOS</b>", self.styles['Heading3']))
        
        costos = [
            ['Concepto', 'Monto (USD)'],
            ['Tarifa base', f"${paquete.tarifa_original:.2f}"],
        ]
        
        if paquete.descuento and paquete.descuento > 0:
            costos.append(['Descuento', f"-${paquete.descuento:.2f}"])
        
        costos.append(['<b>TOTAL</b>', f"<b>${paquete.tarifa:.2f}</b>"])
        
        tabla_costos = Table(costos, colWidths=[200, 200])
        tabla_costos.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(tabla_costos)
        story.append(Spacer(1, 12))
        
        # Código de barras
        story.append(Spacer(1, 12))
        try:
            codigo_barras = self._generar_codigo_barras(paquete.codigo_seguimiento)
            story.append(codigo_barras)
        except Exception as e:
            logger.error(f"Error al generar código de barras: {e}")
        
        # Pie de página
        story.append(Spacer(1, 24))
        story.append(Paragraph(
            "Gracias por confiar en Miami305 Envíos",
            ParagraphStyle(
                'Centrado',
                parent=self.styles['Normal'],
                alignment=TA_CENTER
            )
        ))
        
        # Generar PDF
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
    
    def generar_manifiesto(self, envio) -> bytes:
        """
        Genera un manifiesto de envío en PDF para paquetes consolidados.
        
        Args:
            envio: Objeto Envio para el cual generar el manifiesto
            
        Returns:
            bytes: Contenido del PDF en bytes
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        
        story = []
        
        # Encabezado
        story.append(Paragraph("MIAMI305 ENVÍOS", self.styles['Titulo']))
        story.append(Paragraph("Manifiesto de Consolidación", self.styles['Subtitulo']))
        story.append(Spacer(1, 12))
        
        # Información del envío
        story.append(Paragraph(f"<b>Código de Bulto:</b> {envio.codigo_bulto}", self.styles['Normal']))
        story.append(Paragraph(f"<b>Fecha de Creación:</b> {envio.fecha_creacion.strftime('%d/%m/%Y %H:%M')}", self.styles['Normal']))
        story.append(Paragraph(f"<b>Aerolínea:</b> {envio.aerolinea or 'No especificada'}", self.styles['Normal']))
        if envio.numero_guia_aerea:
            story.append(Paragraph(f"<b>Guía Aérea:</b> {envio.numero_guia_aerea}", self.styles['Normal']))
        if envio.numero_vuelo:
            story.append(Paragraph(f"<b>Vuelo:</b> {envio.numero_vuelo}", self.styles['Normal']))
        story.append(Spacer(1, 12))
        
        # Resumen del envío
        story.append(Paragraph("<b>RESUMEN DEL ENVÍO</b>", self.styles['Heading3']))
        story.append(Paragraph(f"Total de paquetes: {envio.cantidad_paquetes}", self.styles['Normal']))
        story.append(Paragraph(f"Peso total: {envio.peso_total:.2f} kg", self.styles['Normal']))
        story.append(Spacer(1, 12))
        
        # Lista de paquetes
        story.append(Paragraph("<b>PAQUETES CONSOLIDADOS</b>", self.styles['Heading3']))
        
        # Obtener paquetes del envío
        paquetes = envio.paquetes.all().select_related('cliente', 'destinatario')
        
        if paquetes.exists():
            datos_paquetes = [
                ['#', 'Código', 'Cliente', 'Destinatario', 'Peso (kg)', 'Provincia']
            ]
            
            for idx, paquete in enumerate(paquetes, 1):
                datos_paquetes.append([
                    str(idx),
                    paquete.codigo_seguimiento,
                    paquete.cliente.nombre_completo[:20],
                    paquete.destinatario.nombre_completo[:20],
                    f"{paquete.peso_total_kg or 0:.2f}",
                    paquete.destinatario.get_provincia_display()
                ])
            
            tabla = Table(datos_paquetes, colWidths=[30, 80, 100, 100, 60, 80])
            tabla.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
            ]))
            story.append(tabla)
        else:
            story.append(Paragraph("No hay paquetes en este envío", self.styles['Normal']))
        
        # Pie de página
        story.append(Spacer(1, 24))
        story.append(Paragraph(
            "Documento generado automáticamente por el sistema Miami305",
            ParagraphStyle(
                'Centrado',
                parent=self.styles['Normal'],
                alignment=TA_CENTER,
                fontSize=8
            )
        ))
        
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
    
    def generar_etiqueta(self, paquete) -> bytes:
        """
        Genera una etiqueta de seguimiento en PDF para un paquete.
        
        Args:
            paquete: Objeto Paquete para el cual generar la etiqueta
            
        Returns:
            bytes: Contenido del PDF en bytes
        """
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=(4 * inch, 3 * inch))
        
        # Marco de la etiqueta
        c.rect(10, 10, 4 * inch - 20, 3 * inch - 20, stroke=1, fill=0)
        
        # Logo
        c.setFont("Helvetica-Bold", 14)
        c.drawString(30, 2.5 * inch, "MIAMI305 ENVÍOS")
        
        # Código de seguimiento (grande)
        c.setFont("Helvetica-Bold", 18)
        c.drawString(30, 2 * inch, paquete.codigo_seguimiento)
        
        # Destinatario
        c.setFont("Helvetica", 10)
        c.drawString(30, 1.6 * inch, f"Para: {paquete.destinatario.nombre_completo}")
        c.drawString(30, 1.4 * inch, paquete.destinatario.domicilio_exacto)
        c.drawString(30, 1.2 * inch, paquete.destinatario.get_provincia_display())
        
        # Código de barras
        try:
            barcode = code128.Code128(paquete.codigo_seguimiento, barHeight=30, width=1.5)
            barcode.drawOn(c, 30, 0.5 * inch)
        except Exception as e:
            logger.error(f"Error al generar código de barras en etiqueta: {e}")
        
        c.showPage()
        c.save()
        buffer.seek(0)
        return buffer.getvalue()
    
    def _generar_numero_factura(self, paquete) -> str:
        """
        Genera un número de factura único.
        """
        return f"FAC-{datetime.now().year}-{paquete.id:06d}"
    
    def _generar_codigo_barras(self, codigo: str) -> Drawing:
        """
        Genera un código de barras en formato Drawing para ReportLab.
        """
        try:
            from reportlab.graphics.barcode import code128
            barcode = code128.Code128(codigo, barHeight=0.5 * inch, width=1.2)
            # Crear un Drawing para contener el código de barras
            drawing = Drawing(4 * inch, 0.7 * inch)
            drawing.add(barcode)
            return drawing
        except Exception as e:
            logger.error(f"Error al generar código de barras: {e}")
            return Spacer(1, 0.5 * inch)