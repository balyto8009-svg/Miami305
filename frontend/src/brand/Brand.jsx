/**
 * frontend/src/brand/Brand.jsx
 * Ubicación: Miami305/frontend/src/brand/Brand.jsx
 *
 * DESCRIPCIÓN:
 * Identidad visual ORIGINAL de Miami 305 (solicitud #5):
 *  - Paleta propia "Muelle del Caribe": azul puerto profundo + coral del
 *    atardecer de Miami + turquesa del estrecho + ámbar de la carga.
 *  - Logotipo vectorial original: avión alzando el vuelo sobre las olas
 *    que unen Miami con Holguín, con el sol del estrecho detrás.
 *  - Gradientes y tarjetas de encabezado reutilizables en todas las páginas.
 * Todo dibujado a mano en SVG: sin imágenes externas ni plantillas.
 */
import React from 'react';
import { Typography } from 'antd';

const { Title, Text } = Typography;

// ==========================================
// PALETA "MUELLE DEL CARIBE" (única del sistema)
// ==========================================
export const MARCA = {
  azulNoche: '#0B2239',      // azul puerto profundo (base del sidebar)
  azulPuerto: '#123B5C',     // variante media
  azulStereo: '#1E6E8C',     // azul estrecho de Florida
  turquesa: '#19B3A6',       // agua del Caribe
  coral: '#FF6B57',          // atardecer de Miami (acento 1)
  ambar: '#F2A649',          // carga / bultos (acento 2)
  arena: '#F7F3EC',          // fondos claros
  tinta: '#12293E',          // texto fuerte
};

export const GRADIENTE_MARCA = `linear-gradient(135deg, ${MARCA.azulNoche} 0%, ${MARCA.azulPuerto} 55%, ${MARCA.azulStereo} 100%)`;
export const GRADIENTE_ATARDECER = `linear-gradient(135deg, ${MARCA.coral} 0%, ${MARCA.ambar} 100%)`;
export const GRADIENTE_AGUA = `linear-gradient(135deg, ${MARCA.turquesa} 0%, ${MARCA.azulStereo} 100%)`;

// ==========================================
// LOGOTIPO ORIGINAL (SVG vectorial dibujado a medida)
// Avión ascendente + sol del estrecho + olas Miami→Holguín
// ==========================================
export const LogoMiami305 = ({ tamano = 44, conSol = true }) => (
  <svg
    width={tamano}
    height={tamano}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Logotipo Miami 305"
  >
    <defs>
      <linearGradient id="m305-cielo" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={MARCA.azulNoche} />
        <stop offset="100%" stopColor={MARCA.azulStereo} />
      </linearGradient>
      <linearGradient id="m305-sol" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={MARCA.ambar} />
        <stop offset="100%" stopColor={MARCA.coral} />
      </linearGradient>
    </defs>

    {/* Fondo redondeado: cielo del estrecho */}
    <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#m305-cielo)" />

    {/* Sol del atardecer asomando tras las olas */}
    {conSol && (
      <circle cx="45" cy="24" r="9" fill="url(#m305-sol)" />
    )}
    {conSol && (
      <circle cx="45" cy="24" r="12.5" stroke={MARCA.ambar} strokeOpacity="0.35" strokeWidth="1.5" fill="none" />
    )}

    {/* Estela del avión: une Miami con Holguín */}
    <path
      d="M10 44 C 22 40, 34 40, 46 44"
      stroke={MARCA.turquesa}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeDasharray="1 5"
      fill="none"
    />

    {/* Avión ascendente (silueta original) */}
    <path
      d="M14 34 L34 22 L52 26 L40 30 L44 40 L37 36 L28 41 L29 33 Z"
      fill="#FFFFFF"
      fillOpacity="0.96"
      stroke={MARCA.azulNoche}
      strokeWidth="1"
      strokeLinejoin="round"
    />

    {/* Olas del Caribe (dos crestas) */}
    <path
      d="M8 51 C 15 47, 22 47, 29 51 C 36 55, 43 55, 50 51"
      stroke={MARCA.turquesa}
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M11 57 C 17 54, 23 54, 29 57 C 35 60, 41 60, 47 57"
      stroke={MARCA.turquesa}
      strokeOpacity="0.5"
      strokeWidth="2.2"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

// ==========================================
// ENCABEZADO DE PÁGINA con la identidad (título + subtítulo)
// ==========================================
export const EncabezadoPagina = ({ icono, titulo, subtitulo }) => (
  <div
    style={{
      marginBottom: 20,
      borderRadius: 14,
      padding: '18px 22px',
      background: GRADIENTE_MARCA,
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 6px 18px rgba(11,34,57,0.25)',
    }}
  >
    {/* Ola decorativa de fondo */}
    <svg
      viewBox="0 0 600 80"
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        height: '100%',
        width: '45%',
        opacity: 0.18,
      }}
    >
      <path
        d="M0 60 C 80 20, 160 20, 240 60 C 320 100, 420 100, 600 40 L600 0 L0 0 Z"
        fill="#fff"
      />
    </svg>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
      <span style={{ fontSize: 26, display: 'flex' }}>{icono}</span>
      <div>
        <Title level={4} style={{ margin: 0, color: '#fff', fontWeight: 700 }}>
          {titulo}
        </Title>
        {subtitulo && (
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{subtitulo}</Text>
        )}
      </div>
    </div>
  </div>
);

export default { MARCA, GRADIENTE_MARCA, GRADIENTE_ATARDECER, GRADIENTE_AGUA, LogoMiami305, EncabezadoPagina };
