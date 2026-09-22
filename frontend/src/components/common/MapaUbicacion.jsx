/**
 * frontend/src/components/common/MapaUbicacion.jsx
 *
 * DESCRIPCIÓN:
 * Mapa interactivo para marcar la ubicación exacta del destinatario.
 * El operador hace clic sobre el mapa y las coordenadas (lat/lng) se
 * propagan al formulario. Usa Leaflet desde CDN; si no hay conexión,
 * degrada elegantemente a un aviso para ingreso manual de coordenadas.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Space, Spin } from 'antd';
import { AimOutlined, EnvironmentOutlined } from '@ant-design/icons';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

// Centro por defecto: ciudad de Holguín, Cuba
const CENTRO_DEFAULT = [20.88691871, -76.25923043];

const MapaUbicacion = ({ latitud, longitud, onChange, altura = 320 }) => {
    const mapRef = useRef(null);
    const containerRef = useRef(null);
    const markerRef = useRef(null);
    const [listo, setListo] = useState(false);
    const [errorCarga, setErrorCarga] = useState(false);

    // Cargar Leaflet dinámicamente una sola vez
    useEffect(() => {
        if (window.L) {
            setListo(true);
            return;
        }
        if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = LEAFLET_CSS;
            document.head.appendChild(link);
        }
        const script = document.createElement('script');
        script.src = LEAFLET_JS;
        script.async = true;
        script.onload = () => setListo(true);
        script.onerror = () => setErrorCarga(true);
        document.head.appendChild(script);
    }, []);

    // Inicializar el mapa cuando Leaflet esté disponible
    useEffect(() => {
        if (!listo || !containerRef.current || mapRef.current) return;

        const L = window.L;
        const centroInicial = [
            latitud ? parseFloat(latitud) : CENTRO_DEFAULT[0],
            longitud ? parseFloat(longitud) : CENTRO_DEFAULT[1],
        ];

        const map = L.map(containerRef.current).setView(centroInicial, 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap',
        }).addTo(map);

        const marker = L.marker(centroInicial, { draggable: true }).addTo(map);
        marker.on('dragend', () => {
            const pos = marker.getLatLng();
            onChange && onChange(pos.lat.toFixed(8), pos.lng.toFixed(8));
        });

        map.on('click', (e) => {
            marker.setLatLng(e.latlng);
            onChange && onChange(e.latlng.lat.toFixed(8), e.latlng.lng.toFixed(8));
        });

        mapRef.current = map;
        markerRef.current = marker;

        return () => {
            map.remove();
            mapRef.current = null;
            markerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listo]);

    // Sincronizar cuando cambian las coordenadas desde fuera del mapa
    useEffect(() => {
        if (!mapRef.current || !markerRef.current) return;
        const lat = parseFloat(latitud);
        const lng = parseFloat(longitud);
        if (!isNaN(lat) && !isNaN(lng)) {
            markerRef.current.setLatLng([lat, lng]);
            mapRef.current.panTo([lat, lng]);
        }
    }, [latitud, longitud]);

    const usarMiUbicacion = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => onChange && onChange(pos.coords.latitude.toFixed(8), pos.coords.longitude.toFixed(8)),
            () => {}
        );
    };

    if (errorCarga) {
        return (
            <Alert
                type="warning"
                showIcon
                message="Mapa no disponible sin conexión"
                description="Ingrese las coordenadas manualmente o use la app de mapas del teléfono para obtenerlas."
            />
        );
    }

    return (
        <div>
            <Space style={{ marginBottom: 8 }}>
                <Button size="small" icon={<AimOutlined />} onClick={usarMiUbicacion}>
                    Usar mi ubicación GPS
                </Button>
                <span style={{ fontSize: 12, color: '#888' }}>
                    <EnvironmentOutlined /> Haga clic en el mapa para marcar la ubicación exacta
                </span>
            </Space>
            <div style={{ position: 'relative' }}>
                <div
                    ref={containerRef}
                    style={{ height: altura, width: '100%', borderRadius: 8, border: '1px solid #d9d9d9', zIndex: 0 }}
                />
                {!listo && (
                    <div style={{
                        position: 'absolute', inset: 0, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: '#fafafa', borderRadius: 8,
                    }}>
                        <Spin tip="Cargando mapa..." />
                    </div>
                )}
            </div>
        </div>
    );
};

export default MapaUbicacion;
