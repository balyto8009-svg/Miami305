/**
 * static/admin/js/destinatario_mapa.js
 * Ubicación: Miami305/static/admin/js/destinatario_mapa.js
 * 
 * DESCRIPCIÓN:
 * Agrega un mapa interactivo con OpenStreetMap (Leaflet) para seleccionar coordenadas.
 */

(function() {
    'use strict';
    
    console.log('🚀 ARCHIVO DESTINATARIO_MAPA.JS CARGADO');
    
    // ==========================================
    // COORDENADAS POR DEFECTO
    // ==========================================
    var DEFAULT_LAT = 20.88691871;
    var DEFAULT_LNG = -76.25923043;
    
    // Esperar a que el DOM esté cargado
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMapa);
    } else {
        initMapa();
    }
    
    function initMapa() {
        console.log('🗺️ Inicializando mapa OpenStreetMap...');
        
        var latInput = document.getElementById('id_latitud');
        var lngInput = document.getElementById('id_longitud');
        
        if (!latInput || !lngInput) {
            console.log('⚠️ Campos de coordenadas no encontrados');
            setTimeout(initMapa, 500);
            return;
        }
        
        var lat = parseFloat(latInput.value) || DEFAULT_LAT;
        var lng = parseFloat(lngInput.value) || DEFAULT_LNG;
        console.log('📍 Coordenadas:', lat, lng);
        
        // ==========================================
        // 1. REORGANIZAR CAMPOS EN LA MISMA LÍNEA
        // ==========================================
        var latRow = latInput.closest('.form-row');
        var lngRow = lngInput.closest('.form-row');
        
        if (latRow && lngRow && !document.querySelector('.coordenadas-row')) {
            console.log('🔧 Reorganizando campos en la misma línea...');
            
            var container = document.createElement('div');
            container.className = 'form-row coordenadas-row';
            container.style.display = 'flex';
            container.style.flexWrap = 'wrap';
            container.style.gap = '20px';
            container.style.marginBottom = '15px';
            container.style.padding = '10px 15px';
            container.style.background = '#f8f9fa';
            container.style.borderRadius = '6px';
            container.style.border = '1px solid #e9ecef';
            
            var latClone = latRow.cloneNode(true);
            var lngClone = lngRow.cloneNode(true);
            
            latClone.style.flex = '1';
            latClone.style.minWidth = '200px';
            lngClone.style.flex = '1';
            lngClone.style.minWidth = '200px';
            
            container.appendChild(latClone);
            container.appendChild(lngClone);
            
            latRow.parentNode.insertBefore(container, latRow);
            latRow.remove();
            lngRow.remove();
            
            latInput = document.getElementById('id_latitud');
            lngInput = document.getElementById('id_longitud');
            console.log('✅ Campos reorganizados');
        }
        
        // ==========================================
        // 2. CREAR CONTENEDOR DEL MAPA
        // ==========================================
        var containerRow = document.querySelector('.coordenadas-row');
        if (!containerRow) {
            console.log('⚠️ Contenedor de coordenadas no encontrado');
            var lngField = document.getElementById('id_longitud');
            if (lngField) {
                containerRow = lngField.closest('.form-row');
            }
        }
        
        if (!containerRow) {
            console.error('❌ No se encontró un contenedor para el mapa');
            return;
        }
        
        var existingMap = document.getElementById('mapa-destinatario');
        if (existingMap) {
            console.log('⚠️ El mapa ya existe, eliminando...');
            existingMap.remove();
        }
        
        var mapContainer = document.createElement('div');
        mapContainer.id = 'mapa-destinatario';
        mapContainer.style.width = '100%';
        mapContainer.style.height = '350px';
        mapContainer.style.minHeight = '300px';
        mapContainer.style.border = '2px solid #79aec8';
        mapContainer.style.borderRadius = '6px';
        mapContainer.style.backgroundColor = '#e9ecef';
        mapContainer.style.marginTop = '10px';
        mapContainer.style.marginBottom = '10px';
        mapContainer.style.position = 'relative';
        mapContainer.style.overflow = 'hidden';
        mapContainer.style.zIndex = '1';
        mapContainer.style.clear = 'both';
        
        containerRow.parentNode.insertBefore(mapContainer, containerRow.nextSibling);
        console.log('📦 Contenedor del mapa creado');
        
        // ==========================================
        // 3. CARGAR LEAFLET Y CREAR MAPA
        // ==========================================
        function cargarLeaflet() {
            if (typeof L !== 'undefined') {
                console.log('✅ Leaflet ya está cargado');
                setTimeout(crearMapa, 100);
                return;
            }
            
            console.log('📥 Cargando Leaflet desde CDN...');
            
            if (!document.querySelector('link[href*="leaflet.css"]')) {
                var cssLink = document.createElement('link');
                cssLink.rel = 'stylesheet';
                cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(cssLink);
                console.log('✅ CSS de Leaflet cargado');
            }
            
            var script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = function() {
                console.log('✅ Leaflet JS cargado correctamente');
                setTimeout(crearMapa, 100);
            };
            script.onerror = function() {
                console.error('❌ Error al cargar Leaflet');
                mapContainer.innerHTML = '<div style="padding:20px;text-align:center;color:red;">❌ Error al cargar el mapa</div>';
            };
            document.head.appendChild(script);
        }
        
        // ==========================================
        // 4. CREAR EL MAPA
        // ==========================================
        function crearMapa() {
            console.log('🗺️ Creando mapa OpenStreetMap...');
            
            var container = document.getElementById('mapa-destinatario');
            if (!container) {
                console.error('❌ Contenedor del mapa no encontrado');
                return;
            }
            
            container.style.width = '100%';
            container.style.height = '350px';
            container.style.minHeight = '300px';
            container.innerHTML = '';
            
            var lat = parseFloat(latInput.value) || DEFAULT_LAT;
            var lng = parseFloat(lngInput.value) || DEFAULT_LNG;
            console.log('📍 Ubicación del mapa:', lat, lng);
            
            try {
                var map = L.map(container, {
                    center: [lat, lng],
                    zoom: 16,
                    zoomControl: true,
                    attributionControl: true
                });
                console.log('✅ Mapa creado');
                
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: 19
                }).addTo(map);
                console.log('✅ Capa OpenStreetMap añadida');
                
                var customIcon = L.divIcon({
                    className: 'custom-marker',
                    html: '<div style="background:#1a237e;width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:18px;color:white;">📍</div>',
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -35]
                });
                
                var marker = L.marker([lat, lng], {
                    draggable: true,
                    icon: customIcon,
                    title: 'Arrastra para ajustar la ubicación',
                    zIndexOffset: 1000
                }).addTo(map);
                console.log('✅ Marcador creado en:', lat, lng);
                
                marker.bindPopup('📍 Ubicación seleccionada');
                marker.openPopup();
                
                marker.on('dragend', function(e) {
                    var pos = marker.getLatLng();
                    latInput.value = pos.lat.toFixed(8);
                    lngInput.value = pos.lng.toFixed(8);
                    var event = new Event('change', { bubbles: true });
                    latInput.dispatchEvent(event);
                    lngInput.dispatchEvent(event);
                    marker.setPopupContent('📍 ' + pos.lat.toFixed(6) + ', ' + pos.lng.toFixed(6));
                    marker.openPopup();
                    console.log('📍 Nueva ubicación:', pos.lat.toFixed(6), pos.lng.toFixed(6));
                });
                
                map.on('click', function(e) {
                    var latlng = e.latlng;
                    marker.setLatLng(latlng);
                    latInput.value = latlng.lat.toFixed(8);
                    lngInput.value = latlng.lng.toFixed(8);
                    var event = new Event('change', { bubbles: true });
                    latInput.dispatchEvent(event);
                    lngInput.dispatchEvent(event);
                    marker.setPopupContent('📍 ' + latlng.lat.toFixed(6) + ', ' + latlng.lng.toFixed(6));
                    marker.openPopup();
                    console.log('📍 Click en:', latlng.lat.toFixed(6), latlng.lng.toFixed(6));
                });
                
                var centerControl = L.control({ position: 'topright' });
                centerControl.onAdd = function(map) {
                    var div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                    div.innerHTML = '<button style="background:white;border:2px solid #ccc;border-radius:4px;padding:6px 12px;cursor:pointer;font-weight:600;color:#1a237e;">📍 Holguín</button>';
                    div.onclick = function(e) {
                        e.stopPropagation();
                        var center = [DEFAULT_LAT, DEFAULT_LNG];
                        map.setView(center, 15);
                        marker.setLatLng(center);
                        latInput.value = center[0].toFixed(8);
                        lngInput.value = center[1].toFixed(8);
                        marker.setPopupContent('📍 ' + center[0].toFixed(6) + ', ' + center[1].toFixed(6));
                        marker.openPopup();
                        console.log('📍 Centrado en Holguín');
                    };
                    return div;
                };
                centerControl.addTo(map);
                
                setTimeout(function() {
                    map.invalidateSize();
                    console.log('✅ Tamaño del mapa actualizado');
                }, 500);
                
                window.addEventListener('resize', function() {
                    map.invalidateSize();
                });
                
                console.log('✅ Mapa OpenStreetMap creado correctamente');
                
            } catch (error) {
                console.error('❌ Error al crear el mapa:', error);
                container.innerHTML = '<div style="padding:20px;text-align:center;color:red;">❌ Error al crear el mapa</div>';
            }
        }
        
        cargarLeaflet();
    }
    
})();