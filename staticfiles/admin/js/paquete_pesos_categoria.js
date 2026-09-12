/**
 * static/admin/js/paquete_pesos_categoria.js
 * Ubicación: Miami305/static/admin/js/paquete_pesos_categoria.js
 * 
 * DESCRIPCIÓN:
 * Controla los pesos por categoría en el admin de paquetes.
 * - Checkbox activa/desactiva el campo de peso de la categoría
 * - El peso de la categoría se resta automáticamente de Paq
 */

(function($) {
    'use strict';
    
    $(document).ready(function() {
        console.log('✅ Inicializando control de pesos por categoría');
        
        // ==========================================
        // OBTENER CAMPOS
        // ==========================================
        var totalInput = $('#id_peso_total_kg');
        var paqInput = $('#id_peso_paq_kg');
        var alimentosInput = $('#id_peso_alimentos_kg');
        var medicamentosInput = $('#id_peso_medicamentos_kg');
        var electrodomesticosInput = $('#id_peso_electrodomesticos_kg');
        
        if (!totalInput.length || !paqInput.length) {
            console.log('⚠️ Campos de peso no encontrados');
            return;
        }
        
        // ==========================================
        // REORDENAR: PAQ ARRIBA DE LAS CATEGORÍAS
        // ==========================================
        var paqRow = paqInput.closest('.form-row');
        var alimentosRow = alimentosInput.closest('.form-row');
        
        if (paqRow.length && alimentosRow.length) {
            // Mover Paq antes de Alimentos
            paqRow.insertBefore(alimentosRow);
            console.log('✅ Paq movido arriba de las categorías');
        }
        
        // ==========================================
        // CREAR CHECKBOX PARA CADA CATEGORÍA
        // ==========================================
        
        function crearCheckbox(campoInput, labelText, className) {
            var row = campoInput.closest('.form-row');
            if (!row.length) return null;
            
            // Ocultar el label original de Django
            var originalLabel = row.find('label');
            if (originalLabel.length) {
                originalLabel.hide();
            }
            
            // Crear contenedor para checkbox + input
            var wrapper = $('<div>', {
                style: 'display: flex; align-items: center; gap: 10px; margin-top: 5px;'
            });
            
            // Checkbox
            var checkbox = $('<input>', {
                type: 'checkbox',
                class: 'categoria-checkbox ' + className,
                style: 'width: 18px; height: 18px; cursor: pointer;'
            });
            
            // Label del checkbox
            var label = $('<label>', {
                text: labelText,
                style: 'font-weight: bold; cursor: pointer; min-width: 120px;'
            });
            
            // Input (oculto inicialmente)
            campoInput.css({
                display: 'none',
                width: '100px',
                padding: '4px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px'
            });
            
            // Evento del checkbox
            checkbox.on('change', function() {
                if (this.checked) {
                    campoInput.show().focus();
                } else {
                    campoInput.hide().val('0');
                    calcularPaq();
                }
            });
            
            wrapper.append(checkbox);
            wrapper.append(label);
            wrapper.append(campoInput);
            
            // Insertar después del label original
            row.append(wrapper);
            
            return checkbox;
        }
        
        // Crear checkboxes
        var chkAlimentos = crearCheckbox(alimentosInput, '🍎 Alimentos', 'chk-alimentos');
        var chkMedicamentos = crearCheckbox(medicamentosInput, '💊 Medicamentos', 'chk-medicamentos');
        var chkElectrodomesticos = crearCheckbox(electrodomesticosInput, '🔌 Electrodomésticos', 'chk-electrodomesticos');
        
        // ==========================================
        // CALCULAR PAQ = TOTAL - (ALIMENTOS + MEDICAMENTOS + ELECTRODOMÉSTICOS)
        // ==========================================
        
        function calcularPaq() {
            var total = parseFloat(totalInput.val()) || 0;
            var alimentos = parseFloat(alimentosInput.val()) || 0;
            var medicamentos = parseFloat(medicamentosInput.val()) || 0;
            var electrodomesticos = parseFloat(electrodomesticosInput.val()) || 0;
            
            var sumaCategorias = alimentos + medicamentos + electrodomesticos;
            var paq = Math.max(total - sumaCategorias, 0);
            
            paqInput.val(paq.toFixed(2));
            
            console.log('📊 Pesos calculados:', {
                total: total,
                alimentos: alimentos,
                medicamentos: medicamentos,
                electrodomesticos: electrodomesticos,
                paq: paq
            });
        }
        
        // Eventos para recalcular
        totalInput.on('input', calcularPaq);
        alimentosInput.on('input', calcularPaq);
        medicamentosInput.on('input', calcularPaq);
        electrodomesticosInput.on('input', calcularPaq);
        
        // ==========================================
        // ACTIVAR CHECKBOXES INICIALES
        // ==========================================
        
        function activarCheckboxesIniciales() {
            if (parseFloat(alimentosInput.val()) > 0 && chkAlimentos) {
                chkAlimentos.prop('checked', true);
                alimentosInput.show();
            }
            if (parseFloat(medicamentosInput.val()) > 0 && chkMedicamentos) {
                chkMedicamentos.prop('checked', true);
                medicamentosInput.show();
            }
            if (parseFloat(electrodomesticosInput.val()) > 0 && chkElectrodomesticos) {
                chkElectrodomesticos.prop('checked', true);
                electrodomesticosInput.show();
            }
            calcularPaq();
        }
        
        // Calcular inicialmente después de un breve retraso
        setTimeout(activarCheckboxesIniciales, 200);
        
        console.log('✅ Control de pesos por categoría inicializado');
    });
    
})(django.jQuery);