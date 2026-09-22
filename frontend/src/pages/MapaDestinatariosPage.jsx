/**
 * frontend/src/pages/MapaDestinatariosPage.jsx
 * Ubicación: Miami305/frontend/src/pages/MapaDestinatariosPage.jsx
 *
 * DESCRIPCIÓN:
 * Mapa operativo de Holguín con capa offline (solicitud #2 y mejoras):
 *  - Sin lista lateral: solo el mapa a pantalla completa; la búsqueda vive
 *    en un botón que abre una capa (Drawer) encima.
 *  - Rutas por reparto: traza el recorrido optimizado (vecino más cercano)
 *    de los destinatarios de un reparto, con distancia y tiempo estimado.
 *  - GPS del usuario: botón "Mi ubicación" con seguimiento en tiempo real
 *    (posicionamiento continuo) y velocidad instantánea en km/h.
 *  - Alternador para ocultar/mostrar los puntos de los destinatarios.
 *  - Los popups y el GPX muestran los teléfonos del destinatario.
 *  - Al abrir la página se centra automáticamente en el reparto con más
 *    destinatarios para que casi siempre haya puntos a la vista.
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Button, Drawer, Input, Tag, Typography, Empty, Space, Tooltip, Switch, Select, message, Spin } from 'antd';
import {
  SearchOutlined, UserOutlined, PhoneOutlined, EnvironmentOutlined, SendOutlined,
  HomeOutlined, IdcardOutlined, GlobalOutlined, AimOutlined, NodeIndexOutlined,
  EyeInvisibleOutlined, EyeOutlined, CloseOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { getDestinatarios } from '../api/apiService';
import { EncabezadoPagina, MARCA } from '../brand/Brand';

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

// ===== utilidades de ruta =====
const distanciaMetros = (a, b) => {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/**
 * Ruta optimizada (vecino más cercano) desde un punto de partida.
 * Devuelve índices en el orden de visita.
 */
const rutaOptima = (puntos, inicio) => {
  const restantes = puntos.map((_, i) => i);
  const orden = [];
  let actual = inicio;
  while (restantes.length) {
    restantes.sort((i, j) =>
      distanciaMetros(puntos[actual], puntos[i]) - distanciaMetros(puntos[actual], puntos[j]));
    const siguiente = restantes.shift();
    orden.push(siguiente);
    actual = siguiente;
  }
  return orden;
};

const MapaDestinatariosPage = () => {
  const [destinatarios, setDestinatarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const [puntosVisibles, setPuntosVisibles] = useState(true);
  const [repartos, setRepartos] = useState([]);
  const [repartoRuta, setRepartoRuta] = useState(null);
  const [infoRuta, setInfoRuta] = useState(null);   // { distanciaKm, minutos }
  const [gpsActivo, setGpsActivo] = useState(false);
  const [velocidad, setVelocidad] = useState(null); // km/h

  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const capaPuntosRef = useRef(null);
  const capaRutaRef = useRef(null);
  const marcadoresRef = useRef([]);
  const marcadorGPXRef = useRef(null);
  const watchIdRef = useRef(null);
  const lineaGPXRef = useRef(null);

  // ================= datos =================
  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        const res = await getDestinatarios({ con_coordenadas: '1' });
        setDestinatarios(res || []);
        // Repartos disponibles (con conteo) para el selector de rutas
        const conteo = {};
        (res || []).forEach((d) => {
          const clave = d.reparto || d.reparto_display || 'SIN_REPARTO';
          conteo[clave] = (conteo[clave] || 0) + 1;
        });
        setRepartos(Object.entries(conteo)
          .map(([codigo, n]) => ({ codigo, nombre: codigo === 'SIN_REPARTO' ? 'Sin reparto' : codigo, n }))
          .sort((a, b) => b.n - a.n));
      } catch (err) {
        console.error('Error al cargar destinatarios:', err);
        message.error('No se pudieron cargar los destinatarios');
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return destinatarios;
    return destinatarios.filter((d) =>
      (d.nombre_completo || '').toLowerCase().includes(q)
      || (d.cliente_nombre || '').toLowerCase().includes(q)
      || (d.ci || '').toLowerCase().includes(q)
      || (d.telefono || '').includes(q)
      || (d.telefono2 || '').includes(q)
      || (d.domicilio_exacto || '').toLowerCase().includes(q)
      || (d.reparto_display || d.reparto || '').toLowerCase().includes(q)
    );
  }, [destinatarios, busqueda]);

  // ================= mapa =================
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true }).setView(CENTRO_DEFAULT, 14);
    new CapaOfflinePrimero(TILES_LOCALES, TILES_ONLINE, {
      maxZoom: 19,
      attribution: 'Teselas locales Miami305 &copy; OpenStreetMap',
    }).addTo(map);

    capaPuntosRef.current = L.layerGroup().addTo(map);
    capaRutaRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ================= marcadores =================
  useEffect(() => {
    const map = mapRef.current;
    const capa = capaPuntosRef.current;
    if (!map || !capa) return;
    capa.clearLayers();
    marcadoresRef.current = [];

    if (!puntosVisibles) return;

    filtrados.forEach((d) => {
      const lat = parseFloat(d.latitud);
      const lng = parseFloat(d.longitud);
      if (isNaN(lat) || isNaN(lng)) return;

      const telefonos = [d.telefono, d.telefono2].filter(Boolean).join(' / ') || 'sin teléfono';
      const m = L.marker([lat, lng]).addTo(capa).bindPopup(
        `<b>${d.nombre_completo}</b><br/>` +
        `📞 <a href="tel:${(d.telefono || '').replace(/\s/g, '')}">${d.telefono || '—'}</a>` +
        (d.telefono2 ? ` · <a href="tel:${d.telefono2.replace(/\s/g, '')}">${d.telefono2}</a>` : '') + '<br/>' +
        `${d.domicilio_exacto || ''}<br/>` +
        `${d.reparto_display || d.reparto || ''} · ${d.municipio_display || d.municipio || ''}<br/>` +
        `<i>Cliente: ${d.cliente_nombre || '—'}</i>`
      );
      m.on('click', () => setSeleccionado(d));
      marcadoresRef.current.push(m);
    });

    // Centrado inicial: enfocar el reparto con más destinatarios
    if (filtrados.length > 0) {
      const conteo = {};
      filtrados.forEach((d) => {
        const clave = d.reparto || 'SIN';
        (conteo[clave] = conteo[clave] || []).push(d);
      });
      const grupoMayor = Object.values(conteo).sort((a, b) => b.length - a.length)[0];
      const bounds = L.latLngBounds(grupoMayor.map((d) => [parseFloat(d.latitud), parseFloat(d.longitud)]));
      map.fitBounds(bounds.pad(0.25), { maxZoom: 16 });
    }
  }, [filtrados, puntosVisibles]);

  // Al seleccionar (desde el buscador): centrar y abrir popup
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !seleccionado) return;
    const lat = parseFloat(seleccionado.latitud);
    const lng = parseFloat(seleccionado.longitud);
    if (isNaN(lat) || isNaN(lng)) return;

    if (!puntosVisibles) setPuntosVisibles(true);
    map.setView([lat, lng], 17);
    const mk = marcadoresRef.current.find((m) => {
      const p = m.getLatLng();
      return Math.abs(p.lat - lat) < 1e-6 && Math.abs(p.lng - lng) < 1e-6;
    });
    if (mk) mk.openPopup();
  }, [seleccionado]); // eslint-disable-line react-hooks/exhaustive-deps

  // ================= rutas por reparto =================
  const trazarRuta = useCallback(async (codigoReparto) => {
    const map = mapRef.current;
    const capa = capaRutaRef.current;
    if (!map || !capa) return;
    capa.clearLayers();
    setInfoRuta(null);
    setRepartoRuta(codigoReparto || null);

    if (!codigoReparto) return;

    // punto de partida: GPS del usuario si está activo, si no el centro del reparto
    let inicio = null;
    if (marcadorGPXRef.current) inicio = marcadorGPXRef.current.getLatLng();

    const grupo = (puntosVisibles ? filtrados : destinatarios).filter(
      (d) => (d.reparto || 'SIN_REPARTO') === codigoReparto
        || (d.reparto_display || '') === codigoReparto
    );
    const puntos = grupo.map((d) => [parseFloat(d.latitud), parseFloat(d.longitud)]);
    if (puntos.length === 0) {
      message.info('Ese reparto no tiene destinatarios con ubicación');
      return;
    }

    const puntoInicio = inicio ? [inicio.lat, inicio.lng] : puntos[0];
    const orden = rutaOptima(puntos, puntos.indexOf(puntoInicio) >= 0 ? puntos.indexOf(puntoInicio) : 0);
    const linea = [puntoInicio, ...orden.map((i) => puntos[i])];

    let total = 0;
    for (let i = 0; i < linea.length - 1; i++) total += distanciaMetros(linea[i], linea[i + 1]);
    const distanciaKm = total / 1000;
    // a pie: ~4.5 km/h + 2 min por parada; en moto ~25 km/h
    const minutos = Math.round((distanciaKm / 4.5) * 60 + orden.length * 2);
    setInfoRuta({ distanciaKm: distanciaKm.toFixed(2), minutos, paradas: orden.length });

    L.polyline(linea, {
      color: MARCA.coral, weight: 4, opacity: 0.85, dashArray: '8 6',
    }).addTo(capa);
    // círculos numerados en cada parada
    orden.forEach((idx, posicion) => {
      L.circleMarker(puntos[idx], {
        radius: 9, color: '#fff', weight: 2, fillColor: MARCA.azulStereo, fillOpacity: 1,
      }).addTo(capa).bindTooltip(`${posicion + 1}`, { permanent: true, direction: 'center' });
    });

    map.fitBounds(L.latLngBounds(linea).pad(0.2));
  }, [filtrados, destinatarios, puntosVisibles]);

  // ================= GPS en tiempo real =================
  const alternarGPS = () => {
    const map = mapRef.current;
    if (!map) return;
    if (gpsActivo) {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      if (marcadorGPXRef.current) { map.removeLayer(marcadorGPXRef.current); marcadorGPXRef.current = null; }
      if (lineaGPXRef.current) { map.removeLayer(lineaGPXRef.current); lineaGPXRef.current = null; }
      setGpsActivo(false);
      setVelocidad(null);
      return;
    }
    if (!navigator.geolocation) {
      message.error('Este dispositivo no soporta geolocalización');
      return;
    }
    setGpsActivo(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed } = pos.coords;
        const latlng = [latitude, longitude];
        if (!marcadorGPXRef.current) {
          marcadorGPXRef.current = L.circleMarker(latlng, {
            radius: 10, color: '#fff', weight: 3,
            fillColor: MARCA.turquesa, fillOpacity: 1,
          }).addTo(map).bindTooltip('Tú', { permanent: true, direction: 'center' });
          map.setView(latlng, 16);
        } else {
          marcadorGPXRef.current.setLatLng(latlng);
          // estela del recorrido recorrido en vivo
          if (!lineaGPXRef.current) {
            lineaGPXRef.current = L.polyline([latlng], {
              color: MARCA.turquesa, weight: 3, opacity: 0.7,
            }).addTo(map);
          } else {
            lineaGPXRef.current.addLatLng(latlng);
          }
        }
        // velocidad en km/h (speed viene en m/s)
        setVelocidad(speed != null ? Math.max(0, speed * 3.6) : 0);
      },
      (err) => {
        message.error(`GPS: ${err.message}`);
        setGpsActivo(false);
      },
      { enableHighAccuracy: true, maximumAge: 1000 }
    );
  };

  const irAMiUbicacion = () => {
    if (!marcadorGPXRef.current) {
      alternarGPS();
      setTimeout(() => {
        if (marcadorGPXRef.current) mapRef.current?.setView(marcadorGPXRef.current.getLatLng(), 17);
      }, 2500);
    } else {
      mapRef.current.setView(marcadorGPXRef.current.getLatLng(), 17);
    }
  };

  const telefonosSel = seleccionado
    ? [seleccionado.telefono, seleccionado.telefono2].filter(Boolean)
    : [];

  return (
    <div style={{ padding: 24, minHeight: '100vh' }}>
      <EncabezadoPagina
        icono="🗺️"
        titulo="Mapa de Destinatarios"
        subtitulo="Capa offline de Holguín · rutas por reparto · GPS en tiempo real · funciona sin internet"
      />

      {/* BARRA DE HERRAMIENTAS flotante sobre el mapa */}
      <div style={{
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid #d9d9d9',
        boxShadow: '0 4px 14px rgba(11,34,57,0.12)',
      }}>
        <div ref={containerRef} style={{ height: 'calc(100vh - 235px)', minHeight: 480, width: '100%', zIndex: 0 }} />

        {/* Barra superior: buscador + controles */}
        <div style={{
          position: 'absolute', top: 10, left: 60, right: 10, zIndex: 500,
          display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={() => setBuscadorAbierto(true)}
            style={{ boxShadow: '0 3px 10px rgba(11,34,57,0.3)' }}
          >
            Buscar destinatario o cliente
          </Button>

          <Tooltip title={puntosVisibles ? 'Ocultar los puntos de los destinatarios' : 'Mostrar los puntos de los destinatarios'}>
            <Button
              icon={puntosVisibles ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              onClick={() => setPuntosVisibles(v => !v)}
            >
              {puntosVisibles ? 'Ocultar puntos' : 'Mostrar puntos'}
            </Button>
          </Tooltip>

          <Tooltip title="Posición GPS en tiempo real (con velocidad)">
            <Button
              icon={<AimOutlined />}
              type={gpsActivo ? 'primary' : 'default'}
              onClick={irAMiUbicacion}
              style={gpsActivo ? { backgroundColor: MARCA.turquesa, borderColor: MARCA.turquesa } : undefined}
            >
              Mi ubicación
            </Button>
          </Tooltip>

          <Button
            icon={<NodeIndexOutlined />}
            danger={!!repartoRuta}
            onClick={() => trazarRuta(repartoRuta ? null : (repartos[0]?.codigo || null))}
          >
            {repartoRuta ? 'Quitar ruta' : 'Trazar ruta'}
          </Button>

          <Select
            placeholder="Ruta por reparto…"
            style={{ minWidth: 190 }}
            allowClear
            value={repartoRuta}
            onChange={(v) => trazarRuta(v || null)}
            options={repartos.map(r => ({ value: r.codigo, label: `${r.nombre} (${r.n})` }))}
          />

          {gpsActivo && velocidad != null && (
            <Tag icon={<ThunderboltOutlined />} color="processing" style={{ fontSize: 13, padding: '4px 10px' }}>
              {velocidad.toFixed(1)} km/h
            </Tag>
          )}
          {infoRuta && (
            <Tag color="volcano" style={{ fontSize: 13, padding: '4px 10px' }}>
              🛣 {infoRuta.distanciaKm} km · ⏱ ~{infoRuta.minutos} min · 📦 {infoRuta.paradas} paradas
            </Tag>
          )}
          {cargando && <Spin size="small" />}
        </div>
      </div>

      {/* FICHA COMPACTA del destinatario (bajo el mapa) */}
      {seleccionado && (
        <div style={{
          marginTop: 12,
          background: '#fff',
          borderRadius: 12,
          padding: '12px 18px',
          border: `1px solid ${MARCA.turquesa}`,
          boxShadow: '0 3px 12px rgba(11,34,57,0.10)',
          display: 'flex',
          gap: 18,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          <UserOutlined style={{ fontSize: 26, color: MARCA.azulStereo }} />
          <div style={{ minWidth: 200 }}>
            <strong style={{ fontSize: 15 }}>{seleccionado.nombre_completo}</strong>
            <div><Text type="secondary" style={{ fontSize: 12 }}>
              <HomeOutlined /> {seleccionado.domicilio_exacto || '—'}
            </Text></div>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}><PhoneOutlined /> Teléfonos</Text>
            <div>
              {telefonosSel.length
                ? telefonosSel.map(t => (
                  <a key={t} href={`tel:${t.replace(/\s/g, '')}`} style={{ marginRight: 14, fontWeight: 600 }}>
                    <PhoneOutlined /> {t}
                  </a>
                ))
                : <Text type="secondary">sin teléfono</Text>}
            </div>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}><IdcardOutlined /> CI</Text>
            <div>{seleccionado.ci || '—'}</div>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}><GlobalOutlined /> Reparto</Text>
            <div>{seleccionado.reparto_display || seleccionado.reparto || '—'}</div>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}><UserOutlined /> Cliente</Text>
            <div>{seleccionado.cliente_nombre || '—'}</div>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}><EnvironmentOutlined /> Coordenadas</Text>
            <div>{seleccionado.latitud}, {seleccionado.longitud}</div>
          </div>
          <Space style={{ marginLeft: 'auto' }}>
            {seleccionado.latitud && (
              <Button
                size="small"
                icon={<SendOutlined />}
                onClick={() => window.open(`geo:${seleccionado.latitud},${seleccionado.longitud}`, '_blank')}
              >
                GPS del móvil
              </Button>
            )}
            <Button size="small" icon={<CloseOutlined />} onClick={() => setSeleccionado(null)} />
          </Space>
        </div>
      )}

      {/* CAPA DE BÚSQUEDA (Drawer) */}
      <Drawer
        title={
          <Input
            autoFocus
            placeholder="Buscar por destinatario, cliente, CI, teléfono o dirección…"
            prefix={<SearchOutlined style={{ color: '#999' }} />}
            allowClear
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            size="large"
          />
        }
        placement="right"
        width={420}
        open={buscadorAbierto}
        onClose={() => setBuscadorAbierto(false)}
        styles={{ body: { padding: '8px 0' } }}
      >
        {filtrados.length === 0 ? (
          <Empty
            description={destinatarios.length === 0 ? 'No hay destinatarios con ubicación' : 'Sin resultados'}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ marginTop: 60 }}
          />
        ) : (
          <div style={{ maxHeight: '100%', overflowY: 'auto' }}>
            {filtrados.map((d) => (
              <div
                key={d.id}
                onClick={() => { setSeleccionado(d); setBuscadorAbierto(false); }}
                style={{
                  padding: '10px 18px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f0f0f0',
                  background: seleccionado?.id === d.id ? '#e6fffb' : 'transparent',
                }}
                onMouseEnter={(e) => { if (seleccionado?.id !== d.id) e.currentTarget.style.background = '#fafafa'; }}
                onMouseLeave={(e) => { if (seleccionado?.id !== d.id) e.currentTarget.style.background = 'transparent'; }}
              >
                <strong style={{ fontSize: 13 }}>{d.nombre_completo}</strong>
                <div style={{ fontSize: 12, color: '#888' }}>
                  <EnvironmentOutlined /> {d.domicilio_exacto}
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  <PhoneOutlined /> {[d.telefono, d.telefono2].filter(Boolean).join(' / ') || 'sin teléfono'}
                  {' · '}<UserOutlined /> {d.cliente_nombre || '—'}
                </div>
                {d.reparto_display && <Tag color="geekblue" style={{ marginTop: 4 }}>{d.reparto_display}</Tag>}
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default MapaDestinatariosPage;
