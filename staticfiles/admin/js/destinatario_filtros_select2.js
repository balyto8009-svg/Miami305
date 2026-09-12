/**
 * static/admin/js/destinatario_filtros_select2.js
 * Ubicación: Miami305/static/admin/js/destinatario_filtros_select2.js
 * 
 * DESCRIPCIÓN:
 * Versión con Select2 para mejor experiencia de usuario.
 */

(function($) {
    'use strict';
    
    $(document).ready(function() {
        console.log('🚀 Script Select2 cargado');
        
        var provinciaField = $('#id_provincia');
        var municipioField = $('#id_municipio');
        var repartoField = $('#id_reparto');
        
        if (!provinciaField.length) return;
        
        // ==========================================
        // FUNCIONES DE VISIBILIDAD
        // ==========================================
        
        function toggleMunicipio() {
            var provincia = provinciaField.val();
            var municipioRow = municipioField.closest('.form-row');
            
            if (provincia === 'HOL') {
                municipioRow.show();
                municipioField.prop('disabled', false);
                municipioField.prop('required', true);
                // Actualizar Select2 si existe
                if (municipioField.hasClass('select2-hidden-accessible')) {
                    municipioField.select2('enable', true);
                }
            } else {
                municipioRow.hide();
                municipioField.prop('disabled', true);
                municipioField.prop('required', false);
                municipioField.val('');
                // Actualizar Select2 si existe
                if (municipioField.hasClass('select2-hidden-accessible')) {
                    municipioField.select2('enable', false);
                    municipioField.select2('val', '');
                }
                // Ocultar reparto también
                var repartoRow = repartoField.closest('.form-row');
                repartoRow.hide();
                repartoField.prop('disabled', true);
                repartoField.prop('required', false);
                repartoField.val('');
                if (repartoField.hasClass('select2-hidden-accessible')) {
                    repartoField.select2('enable', false);
                    repartoField.select2('val', '');
                }
            }
        }
        
        function toggleReparto() {
            var provincia = provinciaField.val();
            var municipio = municipioField.val();
            var repartoRow = repartoField.closest('.form-row');
            
            if (provincia !== 'HOL') {
                repartoRow.hide();
                repartoField.prop('disabled', true);
                repartoField.prop('required', false);
                repartoField.val('');
                if (repartoField.hasClass('select2-hidden-accessible')) {
                    repartoField.select2('enable', false);
                    repartoField.select2('val', '');
                }
                return;
            }
            
            if (municipio === 'HLG') {
                repartoRow.show();
                repartoField.prop('disabled', false);
                repartoField.prop('required', true);
                if (repartoField.hasClass('select2-hidden-accessible')) {
                    repartoField.select2('enable', true);
                }
            } else {
                repartoRow.hide();
                repartoField.prop('disabled', true);
                repartoField.prop('required', false);
                repartoField.val('');
                if (repartoField.hasClass('select2-hidden-accessible')) {
                    repartoField.select2('enable', false);
                    repartoField.select2('val', '');
                }
            }
        }
        
        // ==========================================
        // EVENTOS
        // ==========================================
        
        // Evento change en provincia
        provinciaField.on('change', function() {
            console.log('🔄 Provincia cambiada a:', provinciaField.val());
            toggleMunicipio();
        });
        
        // Evento change en municipio
        municipioField.on('change', function() {
            console.log('🔄 Municipio cambiado a:', municipioField.val());
            toggleReparto();
        });
        
        // ==========================================
        // INICIALIZAR
        // ==========================================
        toggleMunicipio();
        console.log('✅ Script inicializado');
    });
    
})(django.jQuery);