/**
 * static/admin/js/destinatario_filtros.js
 * Ubicación: Miami305/static/admin/js/destinatario_filtros.js
 * 
 * DESCRIPCIÓN:
 * JavaScript para hacer dinámicos los campos de municipio y reparto en el admin.
 * Se ejecuta AL INSTANTE cuando el usuario selecciona una provincia.
 */

// Usar django.jQuery en lugar de $
(function($) {
    'use strict';
    
    // Esperar a que el DOM esté completamente cargado
    $(document).ready(function() {
        console.log('🚀 Script de filtros de destinatario cargado');
        
        // Obtener referencias a los campos
        var provinciaField = $('#id_provincia');
        var municipioField = $('#id_municipio');
        var repartoField = $('#id_reparto');
        
        // Verificar que los campos existen
        if (!provinciaField.length) {
            console.log('⚠️ Campo provincia no encontrado');
            return;
        }
        if (!municipioField.length) {
            console.log('⚠️ Campo municipio no encontrado');
            return;
        }
        if (!repartoField.length) {
            console.log('⚠️ Campo reparto no encontrado');
            return;
        }
        
        // Función para mostrar/ocultar municipio
        function toggleMunicipio() {
            var provincia = provinciaField.val();
            var municipioRow = municipioField.closest('.form-row');
            var municipioLabel = municipioRow.find('label');
            
            console.log('🔄 Provincia seleccionada:', provincia);
            
            if (provincia === 'HOL') {
                // Mostrar municipio
                municipioRow.show();
                municipioField.prop('disabled', false);
                municipioField.prop('required', true);
                municipioField.attr('placeholder', 'Seleccione un municipio');
                if (municipioLabel.length) {
                    municipioLabel.css('color', '');
                    municipioLabel.css('font-weight', 'bold');
                }
                console.log('✅ Municipio activado');
                
                // Verificar si municipio ya tiene valor para activar reparto
                toggleReparto();
            } else {
                // Ocultar municipio y limpiar valor
                municipioRow.hide();
                municipioField.prop('disabled', true);
                municipioField.prop('required', false);
                municipioField.val('');
                if (municipioLabel.length) {
                    municipioLabel.css('color', '#999');
                }
                console.log('❌ Municipio desactivado');
                
                // Ocultar reparto también
                var repartoRow = repartoField.closest('.form-row');
                repartoRow.hide();
                repartoField.prop('disabled', true);
                repartoField.prop('required', false);
                repartoField.val('');
            }
        }
        
        // Función para mostrar/ocultar reparto
        function toggleReparto() {
            var provincia = provinciaField.val();
            var municipio = municipioField.val();
            var repartoRow = repartoField.closest('.form-row');
            var repartoLabel = repartoRow.find('label');
            
            console.log('🔄 Municipio seleccionado:', municipio);
            
            // Solo si provincia es Holguín
            if (provincia !== 'HOL') {
                repartoRow.hide();
                repartoField.prop('disabled', true);
                repartoField.prop('required', false);
                repartoField.val('');
                return;
            }
            
            if (municipio === 'HLG') {
                // Mostrar reparto
                repartoRow.show();
                repartoField.prop('disabled', false);
                repartoField.prop('required', true);
                repartoField.attr('placeholder', 'Seleccione un reparto');
                if (repartoLabel.length) {
                    repartoLabel.css('color', '');
                    repartoLabel.css('font-weight', 'bold');
                }
                console.log('✅ Reparto activado');
            } else {
                // Ocultar reparto y limpiar valor
                repartoRow.hide();
                repartoField.prop('disabled', true);
                repartoField.prop('required', false);
                repartoField.val('');
                if (repartoLabel.length) {
                    repartoLabel.css('color', '#999');
                }
                console.log('❌ Reparto desactivado');
            }
        }
        
        // ==========================================
        // EVENTOS - SE EJECUTAN AL CAMBIAR EL VALOR
        // ==========================================
        
        // Evento change para provincia
        provinciaField.on('change', function() {
            console.log('🔵 Evento change: Provincia');
            toggleMunicipio();
        });
        
        // Evento change para municipio
        municipioField.on('change', function() {
            console.log('🟢 Evento change: Municipio');
            toggleReparto();
        });
        
        // ==========================================
        // INICIALIZAR AL CARGAR LA PÁGINA
        // ==========================================
        console.log('🔧 Inicializando filtros...');
        toggleMunicipio();
        
        console.log('✅ Script de filtros inicializado correctamente');
    });
    
})(django.jQuery);  // ← Usar django.jQuery en lugar de $