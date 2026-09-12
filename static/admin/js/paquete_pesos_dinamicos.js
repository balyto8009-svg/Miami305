/**
 * static/admin/js/paquete_pesos_dinamicos.js
 * Ubicación: Miami305/static/admin/js/paquete_pesos_dinamicos.js
 * 
 * DESCRIPCIÓN:
 * Agrega campos dinámicos para cada categoría y calcula el peso total.
 */

(function() {
    'use strict';
    
    function initPesosDinamicos() {
        console.log('✅ Inicializando pesos dinámicos por categoría');
        
        var categoriaField = document.getElementById('id_pesos_categoria');
        var totalField = document.getElementById('id_peso_total_kg');
        
        if (!totalField) {
            console.log('⚠️ Campo de peso total no encontrado');
            return;
        }
        
        if (!categoriaField) {
            console.log('⚠️ Campo pesos_categoria no encontrado');
            return;
        }
        
        // ✅ OBTENER CATEGORÍAS - Múltiples formas de obtenerlas
        var categorias = [];
        
        // Forma 1: Desde la variable que pasamos en el template
        if (window.categorias_json) {
            try {
                categorias = JSON.parse(window.categorias_json);
                console.log('📋 Categorías desde window.categorias_json:', categorias);
            } catch(e) {
                console.warn('⚠️ Error al parsear window.categorias_json:', e);
            }
        }
        
        // Forma 2: Desde la variable CATEGORIAS (fallback)
        if (!categorias || categorias.length === 0) {
            if (window.CATEGORIAS) {
                try {
                    categorias = window.CATEGORIAS;
                    console.log('📋 Categorías desde window.CATEGORIAS:', categorias);
                } catch(e) {
                    console.warn('⚠️ Error al leer window.CATEGORIAS:', e);
                }
            }
        }
        
        // Forma 3: Hacer una petición AJAX para obtener las categorías
        if (!categorias || categorias.length === 0) {
            console.log('📡 No hay categorías en memoria, haciendo petición AJAX...');
            
            fetch('/api/categorias/activas/')
                .then(function(response) {
                    if (!response.ok) {
                        throw new Error('Error HTTP: ' + response.status);
                    }
                    return response.json();
                })
                .then(function(data) {
                    console.log('📋 Categorías desde API:', data);
                    if (data && data.length > 0) {
                        window.categorias_json = JSON.stringify(data);
                        crearCamposCategorias(data);
                    }
                })
                .catch(function(error) {
                    console.error('❌ Error al obtener categorías:', error);
                    mostrarMensajeNoCategorias();
                });
            
            return; // Salir, la función continuará después de la petición AJAX
        }
        
        // Si tenemos categorías, crear los campos
        if (categorias && categorias.length > 0) {
            crearCamposCategorias(categorias);
        } else {
            mostrarMensajeNoCategorias();
        }
        
        function crearCamposCategorias(categorias) {
            console.log('📋 Creando campos para categorías:', categorias);
            
            // Buscar el fieldset
            var fieldset = totalField.closest('.fieldset');
            if (!fieldset) {
                var formRow = totalField.closest('.form-row');
                if (formRow) {
                    fieldset = formRow.closest('.module');
                }
            }
            
            if (!fieldset) {
                var allModules = document.querySelectorAll('.module');
                for (var i = 0; i < allModules.length; i++) {
                    var module = allModules[i];
                    var title = module.querySelector('h2');
                    if (title && title.textContent.trim() === 'Pesos por Categoría') {
                        fieldset = module;
                        break;
                    }
                }
            }
            
            if (!fieldset) {
                console.error('❌ No se encontró un contenedor para las categorías');
                return;
            }
            
            // Eliminar contenedor existente si hay
            var existingContainer = document.getElementById('categorias-container');
            if (existingContainer) {
                existingContainer.remove();
            }
            
            // Crear contenedor para los campos dinámicos
            var container = document.createElement('div');
            container.id = 'categorias-container';
            container.style.cssText = 'margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; border: 1px solid #e9ecef;';
            
            // Obtener pesos actuales
            var pesosActuales = {};
            try {
                if (categoriaField.value) {
                    pesosActuales = JSON.parse(categoriaField.value);
                    console.log('📊 Pesos actuales desde campo:', pesosActuales);
                }
            } catch(e) {
                pesosActuales = {};
            }
            
            // Ordenar categorías por nombre
            categorias.sort(function(a, b) {
                return a.nombre.localeCompare(b.nombre);
            });
            
            categorias.forEach(function(cat) {
                var peso = pesosActuales[cat.id] || 0;
                var div = document.createElement('div');
                div.className = 'categoria-peso-row';
                div.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 6px;';
                
                var label = document.createElement('label');
                label.textContent = cat.nombre + ' (kg):';
                label.style.cssText = 'min-width: 150px; font-weight: 600;';
                label.htmlFor = 'peso_cat_' + cat.id;
                
                var input = document.createElement('input');
                input.type = 'number';
                input.step = '0.01';
                input.min = '0';
                input.value = peso;
                input.className = 'peso-categoria-dinamico';
                input.id = 'peso_cat_' + cat.id;
                input.dataset.categoriaId = cat.id;
                input.style.cssText = 'width: 150px; padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;';
                
                div.appendChild(label);
                div.appendChild(input);
                container.appendChild(div);
                
                // Agregar evento para calcular total
                input.addEventListener('input', calcularTotal);
                input.addEventListener('change', calcularTotal);
            });
            
            // Botón para limpiar todos los pesos
            var clearBtn = document.createElement('button');
            clearBtn.textContent = '🗑️ Limpiar todos los pesos';
            clearBtn.type = 'button';
            clearBtn.style.cssText = 'margin-top: 8px; padding: 4px 12px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 13px;';
            clearBtn.onclick = function() {
                container.querySelectorAll('.peso-categoria-dinamico').forEach(function(inp) {
                    inp.value = '0';
                });
                calcularTotal();
            };
            container.appendChild(clearBtn);
            
            // Insertar el contenedor en el fieldset
            var title = fieldset.querySelector('h2');
            if (title) {
                fieldset.insertBefore(container, title.nextSibling);
            } else {
                fieldset.insertBefore(container, fieldset.firstChild);
            }
            
            console.log('✅ Contenedor de categorías insertado');
            
            // Calcular total inicial
            calcularTotal();
            
            console.log('✅ Pesos dinámicos inicializados correctamente');
        }
        
        function mostrarMensajeNoCategorias() {
            var container = document.createElement('div');
            container.id = 'categorias-container';
            container.style.cssText = 'margin: 10px 0; padding: 10px; background: #fff3cd; border-radius: 4px; border: 1px solid #ffc107;';
            container.innerHTML = '<p style="color: #856404; margin: 0;">⚠️ No hay categorías activas. <a href="/admin/core/categoria/add/">Crea una categoría</a> primero.</p>';
            
            var fieldset = totalField.closest('.fieldset');
            if (!fieldset) {
                fieldset = totalField.closest('.module');
            }
            if (fieldset) {
                var title = fieldset.querySelector('h2');
                if (title) {
                    fieldset.insertBefore(container, title.nextSibling);
                } else {
                    fieldset.insertBefore(container, fieldset.firstChild);
                }
            }
        }
        
        function calcularTotal() {
            var total = 0;
            var pesos = {};
            var container = document.getElementById('categorias-container');
            
            if (!container) return;
            
            container.querySelectorAll('.peso-categoria-dinamico').forEach(function(input) {
                var valor = parseFloat(input.value) || 0;
                total += valor;
                var catId = input.dataset.categoriaId;
                if (valor > 0) {
                    pesos[catId] = valor;
                }
            });
            
            totalField.value = total.toFixed(2);
            categoriaField.value = JSON.stringify(pesos);
            console.log('📊 Pesos actualizados:', pesos);
        }
    }
    
    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initPesosDinamicos, 500);
        });
    } else {
        setTimeout(initPesosDinamicos, 500);
    }
    
})();