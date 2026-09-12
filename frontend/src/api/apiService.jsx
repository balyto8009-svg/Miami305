/**
 * frontend/src/api/apiService.jsx
 * Ubicación: Miami305/frontend/src/api/apiService.jsx
 * 
 * DESCRIPCIÓN:
 * Configuración centralizada de Axios para TODAS las llamadas a la API.
 * Incluye interceptores para autenticación, manejo de errores,
 * y todas las funciones para interactuar con el backend.
 */

import axios from 'axios';

// ==========================================
// CONFIGURACIÓN BASE
// ==========================================
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    timeout: 30000,
});

// ==========================================
// INTERCEPTOR DE SOLICITUDES
// ==========================================
api.interceptors.request.use(
    (config) => {
        // ✅ SIEMPRE ENVIAR UN TOKEN DUMMY PARA DESARROLLO
        const token = localStorage.getItem('access_token') || 'dummy-token-dev';
        config.headers.Authorization = `Bearer ${token}`;
        
        if (import.meta.env.DEV) {
            console.log(`📤 ${config.method?.toUpperCase() || 'GET'} ${config.url}`);
        }
        
        return config;
    },
    (error) => {
        console.error('❌ Error en solicitud:', error);
        return Promise.reject(error);
    }
);

// ==========================================
// INTERCEPTOR DE RESPUESTAS
// ==========================================
api.interceptors.response.use(
    (response) => {
        if (import.meta.env.DEV) {
            console.log(`📥 ${response.status} ${response.config.url}`);
        }
        return response;
    },
    (error) => {
        if (error.response) {
            console.error('❌ Error API:', {
                status: error.response.status,
                data: error.response.data,
                url: error.config?.url
            });

            // Error 401 - No autorizado
            if (error.response.status === 401) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user');
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
            }

            // Error 403 - Prohibido
            if (error.response.status === 403) {
                console.warn('⚠️ No tienes permisos para esta acción');
            }

            // Error 500 - Servidor
            if (error.response.status >= 500) {
                console.error('🔥 Error interno del servidor:', error.response.data);
            }

        } else if (error.request) {
            console.error('❌ No se recibió respuesta del servidor');
        } else {
            console.error('❌ Error al configurar la petición:', error.message);
        }

        return Promise.reject(error);
    }
);

// ==========================================
// AUTENTICACIÓN
// ==========================================

/**
 * Inicia sesión con credenciales
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña
 * @returns {Promise<Object>} Datos del usuario y token
 */
export const login = async (username, password) => {
    try {
        console.log('🔐 Intentando login con:', { username });
        
        const response = await api.post('/login/', { username, password });
        console.log('📥 Respuesta del servidor:', response.data);
        
        if (response.data && response.data.success) {
            // ✅ Guardar token (si existe)
            if (response.data.token) {
                localStorage.setItem('access_token', response.data.token);
                console.log('✅ Token guardado:', response.data.token);
            } else {
                console.warn('⚠️ No se recibió token, usando dummy');
                // Para desarrollo, crear token dummy si no viene
                const dummyToken = 'dummy-token-' + Date.now();
                localStorage.setItem('access_token', dummyToken);
                console.log('✅ Token dummy guardado:', dummyToken);
            }
            
            // ✅ Guardar usuario
            if (response.data.user) {
                localStorage.setItem('user', JSON.stringify(response.data.user));
                console.log('✅ Usuario guardado:', response.data.user);
            }
            
            // ✅ Verificar que se guardó
            console.log('🔍 Verificando localStorage:');
            console.log('  Token:', localStorage.getItem('access_token'));
            console.log('  User:', localStorage.getItem('user'));
            
            return {
                success: true,
                ...response.data
            };
        } else {
            console.warn('⚠️ Login falló:', response.data);
            return { 
                success: false, 
                error: response.data?.error || 'Credenciales inválidas' 
            };
        }
    } catch (error) {
        console.error('❌ Error en login:', error);
        
        let errorMessage = 'Error al iniciar sesión';
        if (error.response) {
            console.error('  Status:', error.response.status);
            console.error('  Data:', error.response.data);
            errorMessage = error.response.data?.error || 
                          error.response.data?.message || 
                          `Error ${error.response.status}`;
        } else if (error.request) {
            errorMessage = 'No se pudo conectar con el servidor';
        }
        
        return { 
            success: false, 
            error: errorMessage 
        };
    }
};

/**
 * Cierra sesión
 */
export const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
};

/**
 * Obtiene el usuario actual
 * @returns {Object|null} Usuario o null
 */
export const getCurrentUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};

/**
 * Verifica si el usuario está autenticado
 * @returns {boolean} True si está autenticado
 */
export const isAuthenticated = () => {
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');
    return !!token && !!user;
};

// ==========================================
// PAQUETES
// ==========================================

/**
 * Obtiene estadísticas del dashboard
 * @returns {Promise<Object>} Estadísticas
 */
export const getStats = async () => {
    try {
        const response = await api.get('/paquetes/stats/');
        return response.data;
    } catch (error) {
        console.error('❌ Error al obtener estadísticas:', error);
        throw error;
    }
};

/**
 * Obtiene lista de paquetes con filtros
 * @param {Object} params - Parámetros de filtro
 * @returns {Promise<Object>} Lista de paquetes
 */
export const getPaquetes = async (params = {}) => {
    try {
        const response = await api.get('/paquetes/', { params });
        return response.data;
    } catch (error) {
        console.error('❌ Error al obtener paquetes:', error);
        throw error;
    }
};

/**
 * Obtiene un paquete por ID
 * @param {number} id - ID del paquete
 * @returns {Promise<Object>} Datos del paquete
 */
export const getPaquete = async (id) => {
    try {
        const response = await api.get(`/paquetes/${id}/`);
        return response.data;
    } catch (error) {
        console.error(`❌ Error al obtener paquete ${id}:`, error);
        throw error;
    }
};

/**
 * Crea un nuevo paquete
 * @param {Object} data - Datos del paquete
 * @returns {Promise<Object>} Paquete creado
 */
export const createPaquete = async (data) => {
    try {
        const response = await api.post('/paquetes/', data);
        return response.data;
    } catch (error) {
        console.error('❌ Error al crear paquete:', error);
        throw error;
    }
};

/**
 * Actualiza un paquete
 * @param {number} id - ID del paquete
 * @param {Object} data - Datos a actualizar
 * @returns {Promise<Object>} Paquete actualizado
 */
export const updatePaquete = async (id, data) => {
    try {
        const response = await api.put(`/paquetes/${id}/`, data);
        return response.data;
    } catch (error) {
        console.error(`❌ Error al actualizar paquete ${id}:`, error);
        throw error;
    }
};

/**
 * Elimina un paquete
 * @param {number} id - ID del paquete
 * @returns {Promise<Object>} Respuesta
 */
export const deletePaquete = async (id) => {
    try {
        const response = await api.delete(`/paquetes/${id}/`);
        return response.data;
    } catch (error) {
        console.error(`❌ Error al eliminar paquete ${id}:`, error);
        throw error;
    }
};

/**
 * Cambia el estado de un paquete
 * @param {number} id - ID del paquete
 * @param {string} estado - Nuevo estado
 * @param {string} observacion - Observación
 * @returns {Promise<Object>} Respuesta
 */
export const cambiarEstadoPaquete = async (id, estado, observacion = '') => {
    try {
        const response = await api.post(`/paquetes/${id}/cambiar-estado/`, {
            estado,
            observacion
        });
        return response.data;
    } catch (error) {
        console.error(`❌ Error al cambiar estado del paquete ${id}:`, error);
        throw error;
    }
};

/**
 * Consolida paquetes en un envío
 * @param {number[]} paqueteIds - IDs de paquetes
 * @param {Object} datosEnvio - Datos del envío
 * @returns {Promise<Object>} Envío creado
 */
export const consolidarPaquetes = async (paqueteIds, datosEnvio = {}) => {
    try {
        const response = await api.post('/paquetes/consolidar/', {
            paquete_ids: paqueteIds,
            datos_envio: datosEnvio
        });
        return response.data;
    } catch (error) {
        console.error('❌ Error al consolidar paquetes:', error);
        throw error;
    }
};

/**
 * Obtiene historial de estados de un paquete
 * @param {number} id - ID del paquete
 * @returns {Promise<Object>} Historial
 */
export const getHistorialPaquete = async (id) => {
    try {
        const response = await api.get(`/paquetes/${id}/historial/`);
        return response.data;
    } catch (error) {
        console.error(`❌ Error al obtener historial del paquete ${id}:`, error);
        throw error;
    }
};

// ==========================================
// CLIENTES
// ==========================================

/**
 * Obtiene lista de clientes
 * @param {string} search - Término de búsqueda
 * @returns {Promise<Object>} Lista de clientes
 */
export const getClientes = async (search = '') => {
    try {
        const response = await api.get('/clientes/', { params: { search } });
        return response.data;
    } catch (error) {
        console.error('❌ Error al obtener clientes:', error);
        throw error;
    }
};

/**
 * Crea un nuevo cliente
 * @param {Object} data - Datos del cliente
 * @returns {Promise<Object>} Cliente creado
 */
export const createCliente = async (data) => {
    try {
        const response = await api.post('/clientes/crear/', data);
        return response.data;
    } catch (error) {
        console.error('❌ Error al crear cliente:', error);
        throw error;
    }
};

/**
 * Elimina un cliente
 * @param {number} id - ID del cliente
 * @returns {Promise<Object>} Respuesta
 */
export const deleteCliente = async (id) => {
    try {
        const response = await api.delete(`/clientes/${id}/eliminar/`);
        return response.data;
    } catch (error) {
        console.error(`❌ Error al eliminar cliente ${id}:`, error);
        throw error;
    }
};

// ==========================================
// DESTINATARIOS
// ==========================================

/**
 * Obtiene destinatarios por cliente
 * @param {number} clienteId - ID del cliente
 * @returns {Promise<Object>} Lista de destinatarios
 */
export const getDestinatariosPorCliente = async (clienteId) => {
    try {
        const response = await api.get(`/destinatarios/por-cliente/${clienteId}/`);
        return response.data;
    } catch (error) {
        console.error(`❌ Error al obtener destinatarios del cliente ${clienteId}:`, error);
        throw error;
    }
};

// ==========================================
// TRACKING
// ==========================================

/**
 * Obtiene tracking público por código
 * @param {string} codigo - Código de seguimiento
 * @returns {Promise<Object>} Datos de tracking
 */
export const getTrackingPublico = async (codigo) => {
    try {
        const response = await api.get(`/tracking/publico/${codigo}/`);
        return response.data;
    } catch (error) {
        console.error(`❌ Error al obtener tracking de ${codigo}:`, error);
        throw error;
    }
};

// ==========================================
// REPORTES
// ==========================================

/**
 * Obtiene resumen general de reportes
 * @returns {Promise<Object>} Resumen
 */
export const getReporteResumen = async () => {
    try {
        const response = await api.get('/reports/resumen/');
        return response.data;
    } catch (error) {
        console.error('❌ Error al obtener resumen de reportes:', error);
        throw error;
    }
};

/**
 * Obtiene reporte de envíos por mes
 * @returns {Promise<Object>} Datos mensuales
 */
export const getReporteEnviosMensual = async () => {
    try {
        const response = await api.get('/reports/envios-mensual/');
        return response.data;
    } catch (error) {
        console.error('❌ Error al obtener envíos mensuales:', error);
        throw error;
    }
};

/**
 * Obtiene reporte de ingresos detallado
 * @param {string} fechaInicio - Fecha inicio (YYYY-MM-DD)
 * @param {string} fechaFin - Fecha fin (YYYY-MM-DD)
 * @returns {Promise<Object>} Datos de ingresos
 */
export const getReporteIngresos = async (fechaInicio, fechaFin) => {
    try {
        const params = {};
        if (fechaInicio) params.fecha_inicio = fechaInicio;
        if (fechaFin) params.fecha_fin = fechaFin;
        const response = await api.get('/reports/ingresos-detalle/', { params });
        return response.data;
    } catch (error) {
        console.error('❌ Error al obtener ingresos:', error);
        throw error;
    }
};

// ==========================================
// EXPORTAR INSTANCIA Y FUNCIONES
// ==========================================

export default api;