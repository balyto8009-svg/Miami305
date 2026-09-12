/**
 * static/admin/js/paquete_filtro_destinatarios.js
 * Ubicación: Miami305/static/admin/js/paquete_filtro_destinatarios.js
 * 
 * DESCRIPCIÓN:
 * Filtra dinámicamente los destinatarios según el cliente seleccionado en el admin.
 * VERSIÓN: Vanilla JavaScript (sin jQuery)
 */

(function() {
    'use strict';
    
    console.log('🚀 Script vanilla de filtro de destinatarios cargado');
    
    // Esperar a que el DOM esté listo
    function init() {
        var clienteField = document.getElementById('id_cliente');
        var destinatarioField = document.getElementById('id_destinatario');
        
        if (!clienteField || !destinatarioField) {
            console.log('⚠️ Campos no encontrados, reintentando...');
            // Reintentar después de 500ms
            setTimeout(init, 500);
            return;
        }
        
        console.log('✅ Campos encontrados:', {
            cliente: clienteField.id,
            destinatario: destinatarioField.id
        });
        
        var initialDestinatario = destinatarioField.value;
        
        function cargarDestinatarios(clienteId, selectedId) {
            console.log('📡 Cargando destinatarios para cliente:', clienteId);
            
            if (!clienteId) {
                destinatarioField.innerHTML = '<option value="">Seleccione un cliente primero</option>';
                destinatarioField.disabled = true;
                return;
            }
            
            destinatarioField.innerHTML = '<option value="">Cargando destinatarios...</option>';
            destinatarioField.disabled = true;
            
            var url = '/api/destinatarios/por-cliente/' + clienteId + '/';
            
            fetch(url, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                credentials: 'same-origin'
            })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Error HTTP: ' + response.status + ' ' + response.statusText);
                }
                return response.json();
            })
            .then(function(data) {
                console.log('✅ Destinatarios recibidos:', data);
                
                // Limpiar el select
                destinatarioField.innerHTML = '';
                
                // Opción por defecto
                var defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = '---------';
                destinatarioField.appendChild(defaultOption);
                
                if (data && Array.isArray(data) && data.length > 0) {
                    data.forEach(function(destinatario) {
                        var option = document.createElement('option');
                        option.value = destinatario.id;
                        var texto = destinatario.nombre_completo;
                        if (destinatario.telefono) {
                            texto += ' (' + destinatario.telefono + ')';
                        }
                        option.textContent = texto;
                        if (selectedId && selectedId == destinatario.id) {
                            option.selected = true;
                        }
                        destinatarioField.appendChild(option);
                    });
                    console.log('✅ ' + data.length + ' destinatarios cargados');
                } else {
                    var emptyOption = document.createElement('option');
                    emptyOption.value = '';
                    emptyOption.textContent = 'No hay destinatarios para este cliente';
                    destinatarioField.appendChild(emptyOption);
                }
                
                destinatarioField.disabled = false;
            })
            .catch(function(error) {
                console.error('❌ Error al cargar destinatarios:', error);
                destinatarioField.innerHTML = '<option value="">❌ Error al cargar destinatarios</option>';
                destinatarioField.disabled = false;
            });
        }
        
        // Evento: cuando cambia el cliente
        clienteField.addEventListener('change', function() {
            var clienteId = this.value;
            console.log('🔄 Cliente cambiado a:', clienteId);
            cargarDestinatarios(clienteId, null);
        });
        
        // Si ya hay un cliente seleccionado al cargar la página
        var initialCliente = clienteField.value;
        if (initialCliente) {
            console.log('🔧 Cargando destinatarios iniciales para cliente:', initialCliente);
            cargarDestinatarios(initialCliente, initialDestinatario);
        }
        
        console.log('✅ Filtro de destinatarios inicializado correctamente');
    }
    
    // Iniciar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();