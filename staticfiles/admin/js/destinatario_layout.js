/**
 * static/admin/js/destinatario_layout.js
 * Ubicación: Miami305/static/admin/js/destinatario_layout.js
 * 
 * DESCRIPCIÓN:
 * Reorganiza el layout de destinatarios: dirección (izquierda) + referencias (derecha)
 */

(function() {
    'use strict';
    
    function reorganizarDireccion() {
        console.log('🔄 Reorganizando dirección + referencias');
        
        // Buscar el campo referencias
        var referenciasField = document.getElementById('id_referencias');
        if (!referenciasField) {
            console.log('⚠️ Campo referencias no encontrado');
            return;
        }
        
        var referenciasRow = referenciasField.closest('.form-row');
        if (!referenciasRow) {
            console.log('⚠️ Fila de referencias no encontrada');
            return;
        }
        
        // Buscar el fieldset de Dirección
        var direccionFieldset = referenciasRow.closest('.fieldset');
        if (!direccionFieldset) {
            console.log('⚠️ Fieldset de dirección no encontrado');
            return;
        }
        
        // Si ya está reorganizado, salir
        if (document.querySelector('.direccion-container')) {
            console.log('✅ Ya reorganizado');
            return;
        }
        
        // Buscar la fila de domicilio exacto
        var domicilioField = document.getElementById('id_domicilio_exacto');
        if (!domicilioField) {
            console.log('⚠️ Campo domicilio no encontrado');
            return;
        }
        var domicilioRow = domicilioField.closest('.form-row');
        
        // Buscar la fila de provincia
        var provinciaField = document.getElementById('id_provincia');
        var provinciaRow = provinciaField ? provinciaField.closest('.form-row') : null;
        
        // Buscar la fila de municipio
        var municipioField = document.getElementById('id_municipio');
        var municipioRow = municipioField ? municipioField.closest('.form-row') : null;
        
        // Buscar la fila de reparto
        var repartoField = document.getElementById('id_reparto');
        var repartoRow = repartoField ? repartoField.closest('.form-row') : null;
        
        // Buscar las filas de latitud y longitud
        var latField = document.getElementById('id_latitud');
        var latRow = latField ? latField.closest('.form-row') : null;
        var lngField = document.getElementById('id_longitud');
        var lngRow = lngField ? lngField.closest('.form-row') : null;
        
        // Crear contenedor principal
        var container = document.createElement('div');
        container.className = 'direccion-container';
        container.style.cssText = 'display: flex !important; flex-wrap: wrap !important; gap: 20px !important; width: 100% !important;';
        
        // Columna izquierda (50%)
        var colIzquierda = document.createElement('div');
        colIzquierda.className = 'direccion-col-izquierda';
        colIzquierda.style.cssText = 'flex: 0 0 48% !important; min-width: 280px !important;';
        
        // Columna derecha (50%)
        var colDerecha = document.createElement('div');
        colDerecha.className = 'direccion-col-derecha';
        colDerecha.style.cssText = 'flex: 0 0 48% !important; min-width: 280px !important;';
        
        // Mover campos a la columna izquierda
        var camposIzquierda = [domicilioRow, provinciaRow, municipioRow, repartoRow, latRow, lngRow];
        camposIzquierda.forEach(function(row) {
            if (row) {
                colIzquierda.appendChild(row.cloneNode(true));
                row.remove();
            }
        });
        
        // Mover referencias a la columna derecha
        colDerecha.appendChild(referenciasRow.cloneNode(true));
        referenciasRow.remove();
        
        // Agregar columnas al contenedor
        container.appendChild(colIzquierda);
        container.appendChild(colDerecha);
        
        // Insertar el contenedor después del título del fieldset
        var titulo = direccionFieldset.querySelector('.fieldset-title') || 
                     direccionFieldset.querySelector('h2') ||
                     direccionFieldset.querySelector('.module h2');
        
        if (titulo) {
            titulo.parentNode.insertBefore(container, titulo.nextSibling);
        } else {
            direccionFieldset.appendChild(container);
        }
        
        // Aplicar estilos adicionales a los campos de coordenadas para que estén en la misma línea
        var latRowClone = colIzquierda.querySelector('#id_latitud')?.closest('.form-row');
        var lngRowClone = colIzquierda.querySelector('#id_longitud')?.closest('.form-row');
        if (latRowClone && lngRowClone) {
            latRowClone.style.display = 'inline-block';
            latRowClone.style.width = '48%';
            lngRowClone.style.display = 'inline-block';
            lngRowClone.style.width = '48%';
            lngRowClone.style.marginLeft = '4%';
        }
        
        console.log('✅ Dirección + Referencias reorganizadas');
    }
    
    // Ejecutar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            // Esperar a que el mapa y otros scripts se carguen
            setTimeout(reorganizarDireccion, 500);
            setTimeout(reorganizarDireccion, 1000);
        });
    } else {
        setTimeout(reorganizarDireccion, 500);
        setTimeout(reorganizarDireccion, 1000);
    }
    
})();