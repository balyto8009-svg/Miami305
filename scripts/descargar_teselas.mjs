/**
 * scripts/descargar_teselas.mjs
 * Ubicación: Miami305/scripts/descargar_teselas.mjs
 *
 * DESCRIPCIÓN:
 * Descarga las teselas de OpenStreetMap de la zona de Holguín (y su
 * alrededor) a frontend/public/tiles/{z}/{x}/{y}.png para que el mapa
 * de la aplicación funcione SIN INTERNET (APK Android / entregas en
 * la calle).
 *
 * USO (desde la raíz del proyecto):
 *   node scripts/descargar_teselas.mjs
 *   node scripts/descargar_teselas.mjs 20.8869 -76.2592 12 16
 *
 *   args: lat centro, lng centro, zoom mínimo, zoom máximo
 *
 * NOTAS:
 * - Sin dependencias externas (usa fetch nativo de Node 18+).
 * - Respeta el límite de OSM (máx. 1 petición/segundo, con pausa).
 * - Política de uso de OSM: descargas puntuales de una ciudad está bien;
 *   no descargar países enteros.
 * - Las teselas quedan dentro de frontend/public, por lo que Vite las
 *   copia al build y Capacitor las empaqueta dentro de la APK.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = path.join(RAIZ, 'frontend', 'public', 'tiles');

// Zona por defecto: ciudad de Holguín con margen (repartos + alrededores)
const LAT = parseFloat(process.argv[2] || '20.8869');
const LNG = parseFloat(process.argv[3] || '-76.2592');
const ZMIN = parseInt(process.argv[4] || '12', 10);
const ZMAX = parseInt(process.argv[5] || '16', 10);

// Margen en grados por nivel de zoom (aprox. área urbana + repartos)
const MARGEN_POR_ZOOM = {
  12: 0.35,
  13: 0.18,
  14: 0.09,
  15: 0.05,
  16: 0.03,
};

const lng2tile = (lng, z) => Math.floor(((lng + 180) / 360) * 2 ** z);
const lat2tile = (lat, z) => {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z);
};

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// Detección de bloqueo: si N respuestas consecutivas miden exactamente lo
// mismo, el proveedor está devolviendo su imagen de "Access blocked".
let ULTIMO_TAMANO = -1;
let repetidos = 0;

async function descargar(x, y, z) {
  const dir = path.join(SALIDA, String(z), String(x));
  const archivo = path.join(dir, `${y}.png`);
  if (fs.existsSync(archivo) && fs.statSync(archivo).size > 0) {
    return 'cache';
  }
  const url = `https://tile.openstreetmap.de/${z}/${x}/${y}.png`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Miami305-OfflineTiles/1.0 (agencia de envios; uso puntual)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // OSM/CARTO devuelven el aviso de bloqueo con HTTP 200: detectar réplicas
  // idénticas consecutivas (el aviso pesa siempre lo mismo) y abortar.
  if (buf.length === ULTIMO_TAMANO) {
    repetidos += 1;
    if (repetidos >= 5) {
      throw new Error('BLOQUEO: el proveedor está devolviendo la misma imagen repetida (aviso de uso). Aborta, espera unas horas y re-intenta.');
    }
  } else {
    repetidos = 0;
    ULTIMO_TAMANO = buf.length;
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(archivo, buf);
  return 'ok';
}

let total = 0;
let descargadas = 0;
let enCache = 0;
let errores = 0;

console.log(`Zona: Holguín (${LAT}, ${LNG})  zooms ${ZMIN}-${ZMAX}`);
console.log(`Salida: ${SALIDA}\n`);

for (let z = ZMIN; z <= ZMAX; z++) {
  const margen = MARGEN_POR_ZOOM[z] ?? 0.1;
  const x0 = lng2tile(LNG - margen, z), x1 = lng2tile(LNG + margen, z);
  const y0 = lat2tile(LAT + margen, z), y1 = lat2tile(LAT - margen, z);
  const filas = y1 - y0 + 1;
  const cols = x1 - x0 + 1;
  console.log(`Zoom ${z}: ${cols}x${filas} teselas`);
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      total++;
      try {
        const r = await descargar(x, y, z);
        if (r === 'ok') { descargadas++; process.stdout.write('.'); await dormir(1100); } // política OSM: solo tras descarga real
        else { enCache++; process.stdout.write('c'); } // en caché: sin espera
      } catch (e) {
        errores++;
        process.stdout.write('X');
        await dormir(1100);
      }
    }
  }
  console.log('');
}

console.log(`\nListo: ${descargadas} descargadas, ${enCache} ya existían, ${errores} errores, ${total} en total.`);
if (errores > 0) console.log('Re-ejecuta el script para reintentar las teselas fallidas (X).');
console.log('Las teselas se empaquetan solas en la APK (frontend/public -> build -> Capacitor).');
