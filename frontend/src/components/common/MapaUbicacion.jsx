/**
 * frontend/src/components/common/MapaUbicacion.jsx
 *
 * DESCRIPCIÓN:
 * Mapa interactivo para marcar la ubicación exacta del destinatario.
 * OFFLINE-FIRST (preparado para la APK de Android):
 *  - Leaflet se importa localmente (node_modules -> bundle), sin CDN.
 *  - Las teselas se buscan primero en /tiles/{z}/{x}/{y}.png (carpeta
 *    public/tiles, descargable con scripts/descargar_teselas.mjs) y si
 *    no existe esa tesela se intenta en línea con OpenStreetMap.
 *  - Resultado: en Holguín el mapa funciona SIN INTERNET; con internet
 *    se completa con OSM fuera del área descargada.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Button, Space, Spin } from 'antd';
import { AimOutlined, EnvironmentOutlined, WifiOutlined } from '@ant-design/icons';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Corrige las rutas de los iconos al empaquetar con Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// Centro por defecto: ciudad de Holguín, Cuba
const CENTRO_DEFAULT = [20.88691871, -76.25923043];

const TILES_LOCALES = 'tiles/{z}/{x}/{y}.png';
const TILES_ONLINE = 'https://tile.openstreetmap.de/{z}/{x}/{y}.png';

// Capa de teselas locales con respaldo online tesela a tesela:
// usa fetch para conocer el código HTTP; si OSM bloquea (403) corta el
// respaldo automáticamente y deja la tesela vacía (modo 100% offline).
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

const MapaUbicacion = ({ latitud, longitud, onChange, altura = 320 }) => {
    const mapRef = useRef(null);
    const containerRef = useRef(null);
    const markerRef = useRef(null);
    const [listo, setListo] = useState(false);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const centroInicial = [
            latitud ? parseFloat(latitud) : CENTRO_DEFAULT[0],
            longitud ? parseFloat(longitud) : CENTRO_DEFAULT[1],
        ];

        const map = L.map(containerRef.current).setView(centroInicial, 15);

        // Teselas locales primero (offline), online como respaldo
        const capa = new CapaOfflinePrimero(TILES_LOCALES, TILES_ONLINE, {
            maxZoom: 19,
            attribution: 'Teselas locales Miami305 &copy; OpenStreetMap',
        });
        capa.addTo(map);

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
        setListo(true);

        return () => {
            map.remove();
            mapRef.current = null;
            markerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    return (
        <div>
            <Space style={{ marginBottom: 8 }} wrap>
                <Button size="small" icon={<AimOutlined />} onClick={usarMiUbicacion}>
                    Usar mi ubicación GPS
                </Button>
                <span style={{ fontSize: 12, color: '#888' }}>
                    <EnvironmentOutlined /> Haga clic en el mapa para marcar la ubicación exacta
                </span>
                <span style={{ fontSize: 12, color: '#52c41a' }}>
                    <WifiOutlined /> Funciona sin internet en Holguín (teselas locales)
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
