/**
 * static/admin/js/telefono_prefijo.js
 * Ubicación: Miami305/static/admin/js/telefono_prefijo.js
 * 
 * DESCRIPCIÓN:
 * Controla el campo de teléfono para solo aceptar 8 números.
 * El +53 se muestra como etiqueta fija fuera del campo.
 */

(function() {
    'use strict';
    
    function initTelefono() {
        var telefonoField = document.getElementById('id_telefono');
        
        if (!telefonoField) {
            return;
        }
        
        console.log('📞 Inicializando campo de teléfono (solo 8 números)');
        
        // Buscar el contenedor del campo
        var fieldRow = telefonoField.closest('.form-row');
        if (fieldRow) {
            // Crear el prefijo +53 como etiqueta fija
            var label = fieldRow.querySelector('label');
            
            // Agregar el prefijo antes del input
            var prefijoSpan = document.createElement('span');
            prefijoSpan.className = 'telefono-prefijo';
            prefijoSpan.textContent = '+53 ';
            prefijoSpan.style.cssText = `
                display: inline-block;
                font-weight: bold;
                font-size: 16px;
                color: #333;
                background: #f0f0f0;
                padding: 5px 8px;
                border: 1px solid #ccc;
                border-right: none;
                border-radius: 4px 0 0 4px;
                vertical-align: middle;
                line-height: 1.5;
                height: 30px;
                box-sizing: border-box;
            `;
            
            // Estilizar el input para que se pegue al prefijo
            telefonoField.style.cssText = `
                display: inline-block;
                width: 200px;
                border-radius: 0 4px 4px 0;
                vertical-align: middle;
                height: 30px;
                box-sizing: border-box;
            `;
            
            // Insertar el prefijo antes del input
            telefonoField.parentNode.insertBefore(prefijoSpan, telefonoField);
        }
        
        // Función para limpiar el valor (solo números)
        function limpiarTelefono(value) {
            return value.replace(/[^0-9]/g, '');
        }
        
        // Evento input - solo permitir números
        telefonoField.addEventListener('input', function() {
            var value = this.value;
            var soloNumeros = limpiarTelefono(value);
            
            // Limitar a 8 dígitos
            if (soloNumeros.length > 8) {
                soloNumeros = soloNumeros.substring(0, 8);
            }
            
            if (value !== soloNumeros) {
                this.value = soloNumeros;
            }
        });
        
        // Evento keydown - prevenir caracteres no numéricos
        telefonoField.addEventListener('keydown', function(e) {
            // Permitir teclas de navegación y control
            var teclasPermitidas = [
                'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
                'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                'Home', 'End', 'PageUp', 'PageDown'
            ];
            
            if (teclasPermitidas.includes(e.key)) {
                return;
            }
            
            // Permitir Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A
            if (e.ctrlKey && ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) {
                return;
            }
            
            // Solo permitir números
            if (!/^[0-9]$/.test(e.key)) {
                e.preventDefault();
            }
        });
        
        // Evento paste - limpiar texto pegado
        telefonoField.addEventListener('paste', function(e) {
            e.preventDefault();
            var pastedText = (e.clipboardData || window.clipboardData).getData('text');
            var soloNumeros = limpiarTelefono(pastedText);
            
            // Limitar a 8 dígitos
            if (soloNumeros.length > 8) {
                soloNumeros = soloNumeros.substring(0, 8);
            }
            
            // Insertar en la posición del cursor
            var start = this.selectionStart;
            var end = this.selectionEnd;
            var currentValue = this.value;
            
            this.value = currentValue.substring(0, start) + soloNumeros + currentValue.substring(end);
            this.selectionStart = this.selectionEnd = start + soloNumeros.length;
            
            // Disparar evento input
            this.dispatchEvent(new Event('input', { bubbles: true }));
        });
        
        // Inicializar: eliminar caracteres no numéricos
        if (telefonoField.value) {
            var inicial = limpiarTelefono(telefonoField.value);
            if (inicial.length > 8) {
                inicial = inicial.substring(0, 8);
            }
            telefonoField.value = inicial;
        }
        
        console.log('✅ Campo de teléfono inicializado (solo 8 números)');
    }
    
    // Ejecutar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTelefono);
    } else {
        initTelefono();
    }
    
})();