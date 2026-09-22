"""
services/factura_service.py
Ubicación: Miami305/services/factura_service.py

DESCRIPCIÓN:
Servicio para generar facturas con el diseño Miami305 Travel.
"""
import io
import os
import json
from datetime import datetime
from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image, HRFlowable
)
from reportlab.pdfgen import canvas
import logging
import re

logger = logging.getLogger(__name__)


class FacturaService:
    """
    Servicio para generar facturas con formato de guía Miami305 Travel.
    """

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._crear_estilos_personalizados()

    def _crear_estilos_personalizados(self):
        """Crea estilos personalizados para el PDF."""
        
        self.styles.add(ParagraphStyle(
            name='EmpresaNombre',
            parent=self.styles['Normal'],
            fontSize=18,
            alignment=TA_LEFT,
            textColor=colors.HexColor('#003366'),
            fontName='Helvetica-Bold',
            spaceAfter=2
        ))
        
        self.styles.add(ParagraphStyle(
            name='DatosEmpresa',
            parent=self.styles['Normal'],
            fontSize=9,
            alignment=TA_LEFT,
            textColor=colors.HexColor('#555555'),
            leading=12,
            spaceAfter=1
        ))
        
        self.styles.add(ParagraphStyle(
            name='MetadatosPaquete',
            parent=self.styles['Normal'],
            fontSize=9,
            alignment=TA_RIGHT,
            textColor=colors.HexColor('#333333'),
            leading=14
        ))
        
        self.styles.add(ParagraphStyle(
            name='TituloSeccion',
            parent=self.styles['Normal'],
            fontSize=11,
            alignment=TA_LEFT,
            textColor=colors.HexColor('#003366'),
            spaceAfter=4,
            fontName='Helvetica-Bold'
        ))
        
        self.styles.add(ParagraphStyle(
            name='DatosPersona',
            parent=self.styles['Normal'],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#222222'),
            wordWrap='CJK'
        ))
        
        self.styles.add(ParagraphStyle(
            name='DescTitulo',
            parent=self.styles['Normal'],
            fontSize=11,
            textColor=colors.white,
            fontName='Helvetica-Bold',
            alignment=TA_LEFT,
            backColor=colors.HexColor('#003366'),
            leftIndent=10,
            rightIndent=10,
            spaceAfter=0,
            leading=18
        ))
        
        self.styles.add(ParagraphStyle(
            name='DescContenido',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#333333'),
            leftIndent=10,
            rightIndent=10,
            borderColor=colors.HexColor('#cccccc'),
            borderWidth=1,
            borderPadding=12,
            leading=16,
            backColor=colors.HexColor('#fafafa'),
            wordWrap='CJK'
        ))
        
        self.styles.add(ParagraphStyle(
            name='CodigoSeguimiento',
            parent=self.styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#003366'),
            fontName='Helvetica-Bold',
            alignment=TA_RIGHT
        ))
        
        self.styles.add(ParagraphStyle(
            name='EnlaceMapa',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#003366'),
            alignment=TA_LEFT
        ))

    def _sanitizar_texto(self, texto):
        if not texto:
            return ''
        texto = str(texto)
        texto = texto.replace('&', '&amp;')
        texto = texto.replace('<', '&lt;')
        texto = texto.replace('>', '&gt;')
        texto = texto.replace('"', '&quot;')
        texto = texto.replace("'", '&#39;')
        texto = texto.replace('ñ', '&ntilde;')
        texto = texto.replace('Ñ', '&Ntilde;')
        texto = texto.replace('á', '&aacute;')
        texto = texto.replace('é', '&eacute;')
        texto = texto.replace('í', '&iacute;')
        texto = texto.replace('ó', '&oacute;')
        texto = texto.replace('ú', '&uacute;')
        texto = texto.replace('Á', '&Aacute;')
        texto = texto.replace('É', '&Eacute;')
        texto = texto.replace('Í', '&Iacute;')
        texto = texto.replace('Ó', '&Oacute;')
        texto = texto.replace('Ú', '&Uacute;')
        return texto.strip()

    def _formatear_telefono(self, telefono):
        if not telefono:
            return ''
        return re.sub(r'[^0-9+]', '', str(telefono))

    def _cargar_logo(self):
        logo_path = os.path.join(settings.BASE_DIR, 'static', 'img', 'logo.png')
        if os.path.exists(logo_path):
            try:
                return Image(logo_path, width=1.2*inch, height=1.2*inch)
            except Exception as e:
                logger.warning(f"No se pudo cargar el logo: {e}")
                return None
        return None

    def _obtener_detalle_pesos(self, paquete):
        """
        Obtiene el detalle de pesos por categoría desde el JSON.
        """
        detalles = {}
        try:
            if paquete.pesos_categoria:
                from apps.core.models import Categoria
                for cat_id, peso in paquete.pesos_categoria.items():
                    try:
                        categoria = Categoria.objects.get(id=int(cat_id), activo=True)
                        detalles[categoria.nombre] = float(peso)
                    except:
                        detalles[f"Categoría {cat_id}"] = float(peso)
        except Exception as e:
            logger.warning(f"Error al obtener detalle de pesos: {e}")
        
        return detalles

    def generar_factura(self, paquete) -> bytes:
        buffer = io.BytesIO()
        
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.7*inch,
            leftMargin=0.7*inch,
            topMargin=0.5*inch,
            bottomMargin=0.5*inch
        )
        
        story = []
        
        try:
            story.extend(self._crear_encabezado(paquete))
            story.extend(self._crear_seccion_direcciones(paquete))
            story.extend(self._crear_seccion_descripcion(paquete))
            story.extend(self._crear_pie_pagina(paquete))
            
            doc.build(story)
            
        except Exception as e:
            logger.error(f"Error al generar factura: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return self._generar_factura_respaldo(paquete)
        
        buffer.seek(0)
        return buffer.getvalue()

    def _generar_factura_respaldo(self, paquete) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        story = []
        styles = getSampleStyleSheet()
        
        story.append(Paragraph("MIAMI 305 TRAVEL - FACTURA", styles['Title']))
        story.append(Paragraph(f"Código: {paquete.codigo_seguimiento or 'N/A'}", styles['Normal']))
        story.append(Paragraph(f"Cliente: {paquete.cliente.nombre_completo if paquete.cliente else 'N/A'}", styles['Normal']))
        story.append(Paragraph(f"Destinatario: {paquete.destinatario.nombre_completo if paquete.destinatario else 'N/A'}", styles['Normal']))
        story.append(Paragraph(f"Peso total: {paquete.peso_total_kg or 0} kg", styles['Normal']))
        
        # Mostrar detalle de pesos
        detalle = self._obtener_detalle_pesos(paquete)
        if detalle:
            for nombre, peso in detalle.items():
                story.append(Paragraph(f"  {nombre}: {peso} kg", styles['Normal']))
        
        story.append(Paragraph(f"Tarifa: ${paquete.tarifa or 0}", styles['Normal']))
        story.append(Paragraph(f"Descripción: {paquete.descripcion or 'Sin descripción'}", styles['Normal']))
        
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()

    def _crear_encabezado(self, paquete):
        story = []
        
        empresa = getattr(settings, 'EMPRESA_INFO', {})
        nombre_empresa = empresa.get('nombre', 'MIAMI 305 TRAVEL')
        direccion = empresa.get('direccion', '9160 NW 122ND ST SUITE 22, HIALEAH GARDENS FL 33018')
        telefono = empresa.get('telefono', '305-440-5171')
        email = empresa.get('email', 'miami305travel@gmail.com')
        
        logo = self._cargar_logo()
        
        datos_empresa = f"""
        <font size="18" color="#003366"><b>{self._sanitizar_texto(nombre_empresa)}</b></font><br/>
        <font size="9" color="#555555">{self._sanitizar_texto(direccion)}<br/>
        Ph.: {self._sanitizar_texto(telefono)}<br/>
        Email: {self._sanitizar_texto(email)}</font>
        """
        
        # ✅ METADATOS DEL PAQUETE CON PESO DESGLOSADO
        fecha_str = paquete.fecha_recepcion.strftime("%d/%m/%Y %H:%M") if paquete.fecha_recepcion else "N/A"
        
        # Fechas de envío y entrega estimada (del envío/bulto si existe)
        fecha_envio_str = 'Próxima frecuencia aérea'
        bulto = None
        try:
            bulto = paquete.envios.order_by('-fecha_creacion').first()
        except Exception:
            bulto = None
        
        if bulto and bulto.fecha_salida:
            fecha_envio_str = bulto.fecha_salida.strftime("%d/%m/%Y")
        
        fecha_entrega_str = 'A coordinar'
        if paquete.fecha_entrega_estimada:
            fecha_entrega_str = paquete.fecha_entrega_estimada.strftime("%d/%m/%Y")
        
        # Peso total
        peso_total = paquete.peso_total_kg or 0
        
        # ✅ Detalle de pesos por categoría (corrección #14: agrupados y
        # separados por coma; el TOTAL va DEBAJO del desglose)
        detalle_pesos = self._obtener_detalle_pesos(paquete)

        desglose = ", ".join(
            f"{self._sanitizar_texto(nombre)} {peso:.2f} kg"
            for nombre, peso in detalle_pesos.items() if peso > 0
        )
        if len(detalle_pesos) > 3:
            nombres = list(detalle_pesos.keys())
            desglose = (
                ", ".join(
                    f"{self._sanitizar_texto(n)} {float(detalle_pesos[n]):.2f} kg" for n in nombres[:2] if detalle_pesos[n] > 0
                )
                + "<br/>"
                + ", ".join(
                    f"{self._sanitizar_texto(n)} {float(detalle_pesos[n]):.2f} kg" for n in nombres[2:] if detalle_pesos[n] > 0
                )
            )
        peso_texto = ""
        if desglose:
            peso_texto += f"<font size=\"8\" color=\"#555555\">{desglose}</font><br/>"
        peso_texto += f"<b>Peso total:</b> {peso_total:.2f} kg"
        
        metadatos = f"""
        <b>Paquete No:</b> {paquete.id or 'N/A'}<br/>
        <b>Código:</b> {self._sanitizar_texto(paquete.codigo_seguimiento) or 'N/A'}<br/>
        <b>Recepción:</b> {fecha_str}<br/>
        <b>Envío aéreo:</b> {fecha_envio_str}<br/>
        <b>Entrega aprox.:</b> {fecha_entrega_str}<br/>
        {peso_texto}<br/>
        <b>Tarifa:</b> ${paquete.tarifa or 0:.2f}
        """
        
        if logo:
            data = [
                [
                    logo,
                    Paragraph(datos_empresa, self.styles['Normal']),
                    Paragraph(metadatos, self.styles['MetadatosPaquete'])
                ]
            ]
            tabla = Table(data, colWidths=[1.2*inch, 3*inch, 2.3*inch])
            tabla.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN', (0, 0), (0, 0), 'CENTER'),
                ('ALIGN', (1, 0), (1, 0), 'LEFT'),
                ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
                ('PADDING', (0, 0), (-1, -1), 4),
            ]))
        else:
            data = [
                [
                    Paragraph(datos_empresa, self.styles['Normal']),
                    Paragraph(metadatos, self.styles['MetadatosPaquete'])
                ]
            ]
            tabla = Table(data, colWidths=[4*inch, 2.5*inch])
            tabla.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN', (0, 0), (0, 0), 'LEFT'),
                ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
                ('PADDING', (0, 0), (-1, -1), 4),
            ]))
        
        story.append(tabla)
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#003366'), spaceAfter=8))
        story.append(Spacer(1, 0.1*inch))
        
        return story

    def _crear_seccion_direcciones(self, paquete):
        story = []
        dest = paquete.destinatario
        cliente = paquete.cliente
        
        if dest:
            dest_lineas = []
            nombre = self._sanitizar_texto(dest.nombre_completo)
            dest_lineas.append(f"<b>{nombre.upper() if nombre else 'N/A'}</b>")
            
            if dest.ci:
                dest_lineas.append(f"<b>CI:</b> {self._sanitizar_texto(dest.ci)}")
            
            # Domicilio + reparto + municipio + provincia en UNA línea,
            # separados por comas. El párrafo corta a la línea siguiente
            # únicamente cuando el texto no cabe en el ancho de la columna.
            partes_direccion = []
            if dest.domicilio_exacto:
                partes_direccion.append(self._sanitizar_texto(dest.domicilio_exacto))
            if dest.reparto:
                partes_direccion.append(self._sanitizar_texto(dest.get_reparto_display()))
            if dest.municipio:
                partes_direccion.append(self._sanitizar_texto(dest.get_municipio_display()))
            if dest.provincia:
                partes_direccion.append(self._sanitizar_texto(dest.get_provincia_display()))
            if partes_direccion:
                dest_lineas.append(", ".join(partes_direccion))
            
            dest_texto = "<br/>".join(dest_lineas)
            
            if dest.telefono:
                tel = self._formatear_telefono(dest.telefono)
                dest_texto += f'<br/><font color="#d4a000" size="12"><b><a href="tel:{tel}">{self._sanitizar_texto(dest.telefono)}</a></b></font>'
            
            if dest.telefono2:
                tel2 = self._formatear_telefono(dest.telefono2)
                dest_texto += f'<br/><font color="#d4a000" size="10"><b><a href="tel:{tel2}">{self._sanitizar_texto(dest.telefono2)}</a></b> (2)</font>'
        else:
            dest_texto = "No especificado"
        
        if cliente:
            cli_lineas = []
            nombre = self._sanitizar_texto(cliente.nombre_completo)
            cli_lineas.append(f"<b>{nombre.upper() if nombre else 'N/A'}</b>")
            
            if cliente.domicilio:
                cli_lineas.append(self._sanitizar_texto(cliente.domicilio))
            
            cli_texto = "<br/>".join(cli_lineas)
            
            if cliente.telefono:
                tel = self._formatear_telefono(cliente.telefono)
                cli_texto += f'<br/><font color="#d4a000" size="12"><b><a href="tel:{tel}">{self._sanitizar_texto(cliente.telefono)}</a></b></font>'
            
            if cliente.email:
                cli_texto += f'<br/><font size="9" color="#555555">{self._sanitizar_texto(cliente.email)}</font>'
        else:
            cli_texto = "No especificado"
        
        data = [
            [
                Paragraph('<b>DESTINATARIO</b>', self.styles['TituloSeccion']),
                Paragraph('<b>CLIENTE / REMITENTE</b>', self.styles['TituloSeccion'])
            ],
            [
                Paragraph(dest_texto, self.styles['DatosPersona']),
                Paragraph(cli_texto, self.styles['DatosPersona'])
            ]
        ]
        
        tabla = Table(data, colWidths=[3.2*inch, 3.3*inch])
        tabla.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (1, 0), colors.HexColor('#f9f9f9')),
            ('BORDER', (0, 0), (1, 0), 0.5, colors.HexColor('#003366')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('PADDING', (0, 0), (-1, -1), 6),
            ('FONTNAME', (0, 0), (1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (1, 0), 10),
            ('BORDER', (0, 1), (0, 1), 4, colors.HexColor('#003366')),
            ('BORDER', (1, 1), (1, 1), 4, colors.HexColor('#003366')),
            ('VALIGN', (0, 1), (-1, -1), 'TOP'),
            ('PADDING', (0, 1), (-1, -1), 8),
        ]))
        
        story.append(tabla)
        story.append(Spacer(1, 0.2*inch))
        
        return story

    def _crear_seccion_descripcion(self, paquete):
        """
        RELACIÓN DE ARTÍCULOS: título general de la sección y, debajo,
        los artículos agrupados en su categoría (contenedor azul por
        categoría, artículos en dos columnas para ahorrar espacio).
        """
        story = []

        descripcion = paquete.descripcion or 'Sin descripción'
        lineas = [l.strip() for l in descripcion.split('\n') if l.strip()]

        # Agrupar líneas por categoría: "[Nombre - X kg]: artículos".
        # Los artículos pueden ir separados por COMA o por ENTER: toda línea
        # posterior a una categoría que no sea otra categoría se considera
        # un artículo adicional de esa categoría.
        import re as _re
        grupos = {}   # nombre -> (kg, [artículos])
        orden = []
        sueltas = []
        ultima_cat = None
        patron = _re.compile(r'^\[(.+?)\s*-\s*([\d.,]+)\s*kg\]\s*:?\s*(.*)$')
        for linea in lineas:
            m = patron.match(linea)
            if m:
                nombre_cat = m.group(1).strip()
                kg = m.group(2).strip()
                resto = m.group(3) or ''
                articulos = [a.strip() for a in resto.split(',') if a.strip()]
                if nombre_cat not in grupos:
                    grupos[nombre_cat] = (kg, [])
                    orden.append(nombre_cat)
                elif kg and not grupos[nombre_cat][0]:
                    grupos[nombre_cat] = (kg, grupos[nombre_cat][1])
                grupos[nombre_cat][1].extend(articulos)
                ultima_cat = nombre_cat
            else:
                # Línea suelta: si sigue a una categoría es un artículo
                # adicional de esa categoría (escrito con Enter); si aparece
                # antes de cualquier categoría va al bloque de sueltas.
                destino = grupos[ultima_cat][1] if ultima_cat else sueltas
                for parte in linea.strip().lstrip('•·-–— ').split(','):
                    p = parte.strip()
                    if p:
                        destino.append(p)

        def _art_par(texto, sufijo):
            return Paragraph(
                f"• {self._sanitizar_texto(texto)}" if texto else '',
                ParagraphStyle(f'Art{sufijo}', parent=self.styles['Normal'],
                               fontSize=9, leading=13,
                               textColor=colors.HexColor('#333333'))
            )

        # Fila 0: título general de la sección (siempre visible)
        data = [[Paragraph(
            'RELACIÓN DE ARTÍCULOS',
            ParagraphStyle('TituloSeccionArt', parent=self.styles['Normal'],
                           fontSize=11, textColor=colors.white,
                           fontName='Helvetica-Bold', leftIndent=10, leading=18)
        ), '']]

        encabezados_cat = []   # filas de encabezado de cada categoría
        fila_body = None       # fila del cuerpo cuando no hay categorías

        if grupos:
            fila = 1
            for nombre_cat in orden:
                kg, articulos = grupos[nombre_cat]
                encabezado = f"{nombre_cat}" + (f" — {kg} kg" if kg else "")
                data.append([
                    Paragraph(self._sanitizar_texto(encabezado),
                              ParagraphStyle(f'TitCat{fila}', parent=self.styles['Normal'],
                                             fontSize=10, textColor=colors.white,
                                             fontName='Helvetica-Bold', leftIndent=8,
                                             leading=15)),
                    ''
                ])
                encabezados_cat.append(fila)
                fila += 1

                mitad = (len(articulos) + 1) // 2
                col1, col2 = articulos[:mitad], articulos[mitad:]
                if not col1 and not col2:
                    col1 = ['']
                for i in range(max(len(col1), len(col2))):
                    data.append([
                        _art_par(col1[i] if i < len(col1) else '', f'A{fila}i{i}'),
                        _art_par(col2[i] if i < len(col2) else '', f'B{fila}i{i}'),
                    ])
                    fila += 1
        else:
            texto = "<br/>".join(
                f"• {self._sanitizar_texto(l)}" for l in (sueltas or lineas)
            )
            data.append([Paragraph(texto, ParagraphStyle(
                'DescContenidoTabla', parent=self.styles['Normal'],
                fontSize=10, textColor=colors.HexColor('#333333'),
                leading=16, wordWrap='CJK')), ''])
            fila_body = 1

        tabla = Table(data, colWidths=[3.25 * inch, 3.25 * inch])
        estilo_base = [
            ('SPAN', (0, 0), (1, 0)),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#002244')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('TOPPADDING', (0, 0), (-1, 0), 5),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 5),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#fafafa')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cccccc')),
            ('INNERGRID', (0, 1), (-1, -1), 0.25, colors.HexColor('#eeeeee')),
            ('VALIGN', (0, 1), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('LEFTPADDING', (0, 1), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 3),
        ]
        estilo_cats = [c
                       for fila in encabezados_cat
                       for c in (
                           ('SPAN', (0, fila), (1, fila)),
                           ('BACKGROUND', (0, fila), (-1, fila), colors.HexColor('#003366')),
                       )]
        estilo_body = [('SPAN', (0, fila_body), (1, fila_body))] if fila_body else []

        tabla.setStyle(TableStyle(estilo_base + estilo_cats + estilo_body))

        story.append(tabla)
        story.append(Spacer(1, 0.2 * inch))
        return story

    def _crear_pie_pagina(self, paquete):
        story = []
        dest = paquete.destinatario
        
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cccccc'), spaceAfter=6))
        
        if dest and dest.latitud and dest.longitud:
            url_geo = f"geo:{dest.latitud},{dest.longitud}"
            url_osm = f"https://www.openstreetmap.org/?mlat={dest.latitud}&mlon={dest.longitud}&zoom=17"
            
            mapa_texto = f"""
            <link href="{url_osm}"><font color="#003366" size="9"><u>📍 Ver ubicación en mapa</u></font></link>
            <br/>
            <link href="{url_geo}"><font color="#003366" size="8"><u>📱 Abrir en app de mapas</u></font></link>
            """
            mapa_texto += f'<br/><font size="7" color="#888888">Coordenadas: {dest.latitud:.6f}, {dest.longitud:.6f}</font>'
        else:
            mapa_texto = '<font color="#888888" size="9">📍 Ubicación no disponible</font>'
        
        codigo_texto = f'<b>Código de seguimiento:</b> {self._sanitizar_texto(paquete.codigo_seguimiento) or "N/A"}'
        try:
            bulto_pie = paquete.envios.order_by('-fecha_creacion').first()
        except Exception:
            bulto_pie = None
        if bulto_pie:
            codigo_texto += f'<br/><font size="9" color="#555555">Bulto: {self._sanitizar_texto(bulto_pie.codigo_bulto)}</font>'
        
        pie_data = [
            [
                Paragraph(mapa_texto, self.styles['EnlaceMapa']),
                Paragraph(codigo_texto, self.styles['CodigoSeguimiento'])
            ]
        ]
        
        tabla_pie = Table(pie_data, colWidths=[4*inch, 2.5*inch])
        tabla_pie.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('PADDING', (0, 0), (-1, -1), 4),
        ]))
        
        story.append(tabla_pie)
        
        # ✅ Mensaje de agradecimiento al pie (corrección #14: frase corta)
        story.append(Spacer(1, 0.15*inch))
        story.append(Paragraph(
            '¡Gracias por elegirnos! ',
            ParagraphStyle(
                'Agradecimiento',
                parent=self.styles['Normal'],
                fontSize=10,
                textColor=colors.HexColor('#003366'),
                fontName='Helvetica-BoldOblique',
                alignment=TA_CENTER,
                leading=14
            )
        ))
        
        return story