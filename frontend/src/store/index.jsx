/**
 * frontend/src/store/index.jsx
 * Ubicación: Miami305/frontend/src/store/index.jsx
 * 
 * DESCRIPCIÓN:
 * Configuración central de Redux store.
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import clientesReducer from './slices/clientesSlice';
import enviosReducer from './slices/enviosSlice';
import paqueteReducer from './slices/paqueteSlice';
import reportesReducer from './slices/reportesSlice';
import trackingReducer from './slices/trackingSlice';
import uiReducer from './slices/uiSlice';
import usuariosReducer from './slices/usuariosSlice';

// ==========================================
// CONFIGURACIÓN DEL STORE
// ==========================================
const store = configureStore({
    reducer: {
        auth: authReducer,
        clientes: clientesReducer,
        envios: enviosReducer,
        paquetes: paqueteReducer,
        reportes: reportesReducer,
        tracking: trackingReducer,
        ui: uiReducer,
        usuarios: usuariosReducer,
    },
    devTools: process.env.NODE_ENV !== 'production',
});

// ==========================================
// EXPORTAR
// ==========================================
export default store;