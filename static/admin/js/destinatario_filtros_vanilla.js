/**
 * static/admin/js/destinatario_filtros_vanilla.js
 * Ubicación: Miami305/static/admin/js/destinatario_filtros_vanilla.js
 * 
 * DESCRIPCIÓN:
 * Versión mejorada para mostrar correctamente los selects.
 */

(function() {
    'use strict';
    
    console.log('🚀 Script vanilla de filtros cargado');
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    function init() {
        console.log('🔧 Inicializando filtros (vanilla JS)...');
        
        var provinciaField = document.getElementById('id_provincia');
        var municipioField = document.getElementById('id_municipio');
        var repartoField = document.getElementById('id_reparto');
        
        if (!provinciaField) {
            console.log('⚠️ Campo provincia no encontrado');
            return;
        }
        if (!municipioField) {
            console.log('⚠️ Campo municipio no encontrado');
            return;
        }
        if (!repartoField) {
            console.log('⚠️ Campo reparto no encontrado');
            return;
        }
        
        // ==========================================
        // FUNCIÓN PARA OBTENER EL CONTENEDOR
        // ==========================================
        function getRow(element) {
            var parent = element.parentElement;
            // Buscar el contenedor .form-row o .field-box
            while (parent && !parent.classList.contains('form-row') && !parent.classList.contains('field-box')) {
                parent = parent.parentElement;
            }
            return parent;
        }
        
        // ==========================================
        // FUNCIÓN PARA MOSTRAR/OCULTAR MUNICIPIO
        // ==========================================
        function toggleMunicipio() {
            var provincia = provinciaField.value;
            var municipioRow = getRow(municipioField);
            
            console.log('🔄 Provincia seleccionada:', provincia);
            console.log('🔍 Municipio row:', municipioRow);
            
            if (provincia === 'HOL') {
                // Mostrar municipio - ¡FORZAR display: block!
                municipioRow.style.display = 'block';
                municipioRow.style.visibility = 'visible';
                municipioRow.style.opacity = '1';
                municipioField.disabled = false;
                municipioField.required = true;
                
                // Forzar que el select sea visible
                municipioField.style.display = 'block';
                municipioField.style.visibility = 'visible';
                
                // Si es un select2, habilitarlo
                if (municipioField.classList.contains('select2-hidden-accessible')) {
                    console.log('🔧 Select2 detectado en municipio');
                    municipioField.style.position = 'relative';
                    // Buscar el contenedor select2
                    var select2Container = municipioField.nextElementSibling;
                    if (select2Container && select2Container.classList.contains('select2-container')) {
                        select2Container.style.display = 'block';
                        select2Container.style.visibility = 'visible';
                    }
                }
                
                console.log('✅ Municipio activado');
                toggleReparto();
            } else {
                // Ocultar municipio
                municipioRow.style.display = 'none';
                municipioField.disabled = true;
                municipioField.required = false;
                municipioField.value = '';
                
                // Ocultar select2 si existe
                if (municipioField.classList.contains('select2-hidden-accessible')) {
                    var select2Container = municipioField.nextElementSibling;
                    if (select2Container && select2Container.classList.contains('select2-container')) {
                        select2Container.style.display = 'none';
                    }
                }
                
                console.log('❌ Municipio desactivado');
                
                // Ocultar reparto también
                var repartoRow = getRow(repartoField);
                repartoRow.style.display = 'none';
                repartoField.disabled = true;
                repartoField.required = false;
                repartoField.value = '';
            }
        }
        
        // ==========================================
        // FUNCIÓN PARA MOSTRAR/OCULTAR REPARTO
        // ==========================================
        function toggleReparto() {
            var provincia = provinciaField.value;
            var municipio = municipioField.value;
            var repartoRow = getRow(repartoField);
            
            console.log('🔄 Municipio seleccionado:', municipio);
            
            if (provincia !== 'HOL') {
                repartoRow.style.display = 'none';
                repartoField.disabled = true;
                repartoField.required = false;
                repartoField.value = '';
                return;
            }
            
            if (municipio === 'HLG') {
                // Mostrar reparto
                repartoRow.style.display = 'block';
                repartoRow.style.visibility = 'visible';
                repartoRow.style.opacity = '1';
                repartoField.disabled = false;
                repartoField.required = true;
                repartoField.style.display = 'block';
                repartoField.style.visibility = 'visible';
                
                // Si es select2, habilitarlo
                if (repartoField.classList.contains('select2-hidden-accessible')) {
                    console.log('🔧 Select2 detectado en reparto');
                    repartoField.style.position = 'relative';
                    var select2Container = repartoField.nextElementSibling;
                    if (select2Container && select2Container.classList.contains('select2-container')) {
                        select2Container.style.display = 'block';
                        select2Container.style.visibility = 'visible';
                    }
                }
                
                console.log('✅ Reparto activado');
            } else {
                // Ocultar reparto
                repartoRow.style.display = 'none';
                repartoField.disabled = true;
                repartoField.required = false;
                repartoField.value = '';
                
                // Ocultar select2 si existe
                if (repartoField.classList.contains('select2-hidden-accessible')) {
                    var select2Container = repartoField.nextElementSibling;
                    if (select2Container && select2Container.classList.contains('select2-container')) {
                        select2Container.style.display = 'none';
                    }
                }
                
                console.log('❌ Reparto desactivado');
            }
        }
        
        // ==========================================
        // EVENTOS
        // ==========================================
        
        provinciaField.addEventListener('change', function() {
            console.log('🔵 Evento change: Provincia (vanilla)');
            toggleMunicipio();
        });
        
        // También escuchar el evento click para asegurar
        provinciaField.addEventListener('click', function() {
            // No hacer nada, solo asegurar que el change se dispare
        });
        
        municipioField.addEventListener('change', function() {
            console.log('🟢 Evento change: Municipio (vanilla)');
            toggleReparto();
        });
        
        // ==========================================
        // INICIALIZAR
        // ==========================================
        console.log('🔧 Aplicando estado inicial...');
        toggleMunicipio();
        
        console.log('✅ Script vanilla inicializado correctamente');
    }
    
})();