/**
 * frontend/src/components/common/MapaDestinatario.jsx
 * Ubicación: Miami305/frontend/src/components/common/MapaDestinatario.jsx
 *
 * DESCRIPCIÓN:
 * Mapa de SOLO LECTURA que muestra la ubicación de un destinatario.
 * Solicitud #3: sustituye los enlaces que abrían OpenStreetMap en el
 * navegador — ahora la ubicación se ve dentro de la aplicación con la
 * misma capa offline-first de MapaUbicacion (teselas locales de Holguín
 * + respaldo online tesela a tesela).
 */
import React, { useEffect, useRef } from 'react';
import { Typography } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const { Text } = Typography;

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

const CENTRO_DEFAULT = [20.88691871, -76.25923043];
const TILES_LOCALES = 'tiles/{z}/{x}/{y}.png';
const TILES_ONLINE = 'https://tile.openstreetmap.de/{z}/{x}/{y}.png';

let fallosOnline = 0;
const CapaOfflinePrimero = L.TileLayer.extend({
    initialize(urlLocal, urlOnline, opciones) {
        L.TileLayer.prototype.initialize.call(this, urlLocal, opciones);
        this._urlOnline = urlOnline;
    },
    createTile(coords, done) {
        const tile = document.createElement('img');
        tile.alt = '';
        const cargar = (url, esOnline) => fetch(url)
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.blob();
            })
            .then((blob) => {
                tile.src = URL.createObjectURL(blob);
                done();
            })
            .catch(() => {
                if (esOnline) {
                    fallosOnline += 1;
                    if (fallosOnline > 8) CapaOfflinePrimero._respaldoActivo = false;
                    tile.style.visibility = 'hidden';
                    done();
                } else if (CapaOfflinePrimero._respaldoActivo !== false
                    && navigator.onLine !== false) {
                    cargar(L.Util.template(this._urlOnline, coords), true);
                } else {
                    tile.style.visibility = 'hidden';
                    done();
                }
            });
        cargar(L.Util.template(this._url, coords), false);
        return tile;
    },
});

/**
 * Props:
 *  - latitud / longitud : coordenadas del destinatario (string o number)
 *  - nombre             : etiqueta del marcador (popup)
 *  - altura             : alto del mapa en px (default 380)
 *  - zoom               : zoom inicial (default 16)
 */
const MapaDestinatario = ({ latitud, longitud, nombre, altura = 380, zoom = 16 }) => {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const lat = parseFloat(latitud);
        const lng = parseFloat(longitud);
        const tieneCoords = !isNaN(lat) && !isNaN(lng);
        const centro = tieneCoords ? [lat, lng] : CENTRO_DEFAULT;

        const map = L.map(containerRef.current).setView(centro, zoom);
        new CapaOfflinePrimero(TILES_LOCALES, TILES_ONLINE, {
            maxZoom: 19,
            attribution: 'Teselas locales Miami305 &copy; OpenStreetMap',
        }).addTo(map);

        if (tieneCoords) {
            markerRef.current = L.marker(centro).addTo(map)
                .bindPopup(`<b>${nombre || 'Destinatario'}</b>`);
            setTimeout(() => markerRef.current?.openPopup(), 250);
        }

        mapRef.current = map;
        // Ajuste tras montar dentro de un Modal (el contenedor ya tiene tamaño)
        setTimeout(() => map.invalidateSize(), 150);

        return () => {
            map.remove();
            mapRef.current = null;
            markerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Si cambian las coordenadas (otro destinatario en el mismo modal),
    // se mueve el marcador y se recentra — sin esto el punto quedaba en la
    // posición anterior y parecía "no mostrarse"
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        const lat = parseFloat(latitud);
        const lng = parseFloat(longitud);
        if (!isNaN(lat) && !isNaN(lng)) {
            if (!markerRef.current) {
                markerRef.current = L.marker([lat, lng]).addTo(map)
                    .bindPopup(`<b>${nombre || 'Destinatario'}</b>`);
            } else {
                markerRef.current.setLatLng([lat, lng]);
                markerRef.current.setPopupContent(`<b>${nombre || 'Destinatario'}</b>`);
            }
            map.setView([lat, lng], Math.max(map.getZoom(), zoom));
            setTimeout(() => markerRef.current?.openPopup(), 200);
        }
    }, [latitud, longitud, nombre, zoom]);

    return (
        <div>
            <div
                ref={containerRef}
                style={{ height: altura, width: '100%', borderRadius: 8, border: '1px solid #d9d9d9', zIndex: 0 }}
            />
            <div style={{ marginTop: 6, textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    <EnvironmentOutlined /> Coordenadas: {latitud ?? '—'}, {longitud ?? '—'} · Teselas locales (funciona sin internet)
                </Text>
            </div>
        </div>
    );
};

export default MapaDestinatario;
