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

// Obtiene el CSRF token de las cookies (lo emite Django al hacer login)
const getCookie = (name) => {
    const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
    return match ? decodeURIComponent(match[3]) : null;
};

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
        
        // ✅ CSRF token para peticiones que mutan datos (Django lo exige)
        const metodo = (config.method || '').toLowerCase();
        if (['post', 'put', 'patch', 'delete'].includes(metodo)) {
            const csrf = getCookie('csrftoken');
            if (csrf) {
                config.headers['X-CSRFToken'] = csrf;
            }
        }
        
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

            // ✅ 403 por CSRF caducado/ausente: renovar cookie y reintentar UNA vez
            // (Django responde texto plano "CSRF verification failed" y DRF responde
            // JSON "CSRF Failed: ..."; ambos contienen 'CSRF')
            if (error.response.status === 403 && !error.config?._reintentoCSRF && !error.config?._sinReintento) {
                const cuerpo = typeof error.response.data === 'string'
                    ? error.response.data
                    : JSON.stringify(error.response.data || {});
                if (cuerpo.includes('CSRF')) {
                    error.config._reintentoCSRF = true;
                    return api
                        .get('/csrf/', { _sinReintento: true })
                        .then(() => api.request(error.config));
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
        
        // ✅ Garantiza la cookie csrftoken ANTES de mutar datos
        // (evita el 403 de CSRF en el POST de login y en las mutaciones posteriores)
        await api.get('/csrf/', { _sinReintento: true }).catch(() => {});
        
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
        // Si recibimos FormData, dejamos que el navegador ponga el content-type multipart
        const esFormData = typeof FormData !== 'undefined' && data instanceof FormData;
        const response = await api.post('/paquetes/', data, esFormData ? {
            headers: { 'Content-Type': 'multipart/form-data' }
        } : undefined);
        return response.data;
    } catch (error) {
        console.error('❌ Error al crear paquete:', error);
        throw error;
    }
};

// Alias en español mantenido por compatibilidad con NuevoPaqueteModal
export const crearPaquete = createPaquete;

/**
 * Actualiza un paquete (multipart si se envía FormData, JSON en otro caso).
 */
export const actualizarPaquete = async (id, data) => {
    try {
        const esFormData = typeof FormData !== 'undefined' && data instanceof FormData;
        const response = await api.put(`/paquetes/${id}/`, data, esFormData ? {
            headers: { 'Content-Type': 'multipart/form-data' }
        } : undefined);
        return response.data;
    } catch (error) {
        console.error(`❌ Error al actualizar paquete ${id}:`, error);
        throw error;
    }
};

// Alias en inglés mantenido por compatibilidad
export const updatePaquete = actualizarPaquete;

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
 * Elimina un cliente (solo admin/supervisor)
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

/**
 * Actualiza un cliente (Miami: admin/supervisor/empleado)
 * @param {number} id - ID del cliente
 * @param {Object} data - Datos a actualizar
 * @returns {Promise<Object>} Cliente actualizado
 */
export const updateCliente = async (id, data) => {
    try {
        const response = await api.put(`/clientes/${id}/editar/`, data);
        return response.data;
    } catch (error) {
        console.error(`❌ Error al actualizar cliente ${id}:`, error);
        throw error;
    }
};

// ==========================================
// CONFIGURACIÓN: CATEGORÍAS Y TARIFAS (solo admin/supervisor)
// ==========================================

/**
 * Lista completa de categorías (activas e inactivas) con su precio por kg.
 */
export const getCategoriasConfig = async () => {
    try {
        const response = await api.get('/categorias/');
        return response.data;
    } catch (error) {
        console.error('❌ Error al obtener categorías (config):', error);
        throw error;
    }
};

/**
 * Crea una categoría con su precio por kg (solo admin/supervisor).
 */
export const createCategoria = async (data) => {
    try {
        const response = await api.post('/categorias/', data);
        return response.data;
    } catch (error) {
        console.error('❌ Error al crear categoría:', error);
        throw error;
    }
};

/**
 * Actualiza una categoría (solo admin/supervisor).
 */
export const updateCategoria = async (id, data) => {
    try {
        const response = await api.put(`/categorias/${id}/`, data);
        return response.data;
    } catch (error) {
        console.error(`❌ Error al actualizar categoría ${id}:`, error);
        throw error;
    }
};

/**
 * Elimina/desactiva una categoría (solo admin/supervisor).
 */
export const deleteCategoria = async (id) => {
    try {
        const response = await api.delete(`/categorias/${id}/`);
        return response.data;
    } catch (error) {
        console.error(`❌ Error al eliminar categoría ${id}:`, error);
        throw error;
    }
};

/**
 * Lista de provincias con su costo de envío.
 */
export const getProvincias = async () => {
    try {
        const response = await api.get('/provincias/');
        return response.data;
    } catch (error) {
        console.error('❌ Error al obtener provincias:', error);
        throw error;
    }
};

/**
 * Actualiza el costo de envío de una provincia (solo admin/supervisor).
 */
export const updateProvincia = async (id, data) => {
    try {
        const response = await api.put(`/provincias/${id}/`, data);
        return response.data;
    } catch (error) {
        console.error(`❌ Error al actualizar provincia ${id}:`, error);
        throw error;
    }
};

/**
 * Crea las 16 provincias de Cuba si no existen (solo admin/supervisor).
 */
export const sembrarProvincias = async () => {
    try {
        const response = await api.post('/provincias/sembrar/');
        return response.data;
    } catch (error) {
        console.error('❌ Error al sembrar provincias:', error);
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

/**
 * Obtiene la URL para descargar la factura PDF de un paquete
 * (link directo: el navegador lo abre/descarga con la sesión de cookies).
 */
export const getFacturaUrl = (paqueteId) => `${API_URL}paquete/${paqueteId}/factura/`;

/**
 * Obtiene las categorías activas con su precio por kg.
 */
export const getCategoriasActivas = async () => {
    try {
        const response = await api.get('/categorias/activas/');
        return response.data;
    } catch (error) {
        console.error('❌ Error al obtener categorías:', error);
        throw error;
    }
};

// ==========================================
// BULTOS / MALETINES (SEDE MIAMI)
// ==========================================

/**
 * Obtiene los paquetes 'recibidos' listos para consolidar en bultos.
 */
export const getPaquetesParaBulto = async () => {
    try {
        const response = await api.get('/bultos/para-bulto/');
        return response.data || response;
    } catch (error) {
        console.error('❌ Error al obtener paquetes para bulto:', error);
        throw error;
    }
};

/**
 * Crea un bulto/maletín con los paquetes seleccionados, foto documental y
 * genera su código imprimible (los paquetes heredan el código).
 */
export const crearBulto = async (formData) => {
    try {
        const response = await api.post('/bultos/crear/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error('❌ Error al crear bulto:', error);
        throw error;
    }
};

/**
 * Obtiene el detalle imprimible de la etiqueta de un bulto.
 */
export const getEtiquetaBulto = async (envioId) => {
    try {
        const response = await api.get(`/bultos/${envioId}/etiqueta/`);
        return response.data;
    } catch (error) {
        console.error(`❌ Error al obtener etiqueta del bulto ${envioId}:`, error);
        throw error;
    }
};

/**
 * Cambia manualmente el estado de un bulto desde Operaciones Destino,
 * antes de escanearlo: 'en_curso' (salida confirmada) o 'completado'
 * (recibido en Holguín sin escaneo).
 */
export const cambiarEstadoBulto = async (envioId, estado) => {
    try {
        const response = await api.post(`/bultos/${envioId}/cambiar-estado/`, { estado });
        return response.data;
    } catch (error) {
        console.error(`❌ Error al cambiar estado del bulto ${envioId}:`, error);
        throw error;
    }
};

/**
 * Corrección #15: lista TODOS los bultos (seguimiento).
 * Filtro opcional: { estado: 'consolidado' | 'en_curso' | ... }
 */
export const getBultos = async (filtros = {}) => {
    try {
        const response = await api.get('/bultos/', { params: filtros });
        return response.data;
    } catch (error) {
        console.error('❌ Error al obtener bultos:', error);
        throw error;
    }
};

/**
 * Corrección #15: detalle completo de un bulto (con paquetes y foto).
 */
export const getBulto = async (envioId) => {
    try {
        const response = await api.get(`/bultos/${envioId}/`);
        return response.data;
    } catch (error) {
        console.error(`❌ Error al obtener bulto ${envioId}:`, error);
        throw error;
    }
};

/**
 * Corrección #10: marca manualmente la salida del vuelo (En tránsito).
 */
export const salirVuelo = async (envioId) => {
    try {
        const response = await api.post(`/bultos/${envioId}/salir/`);
        return response.data;
    } catch (error) {
        console.error(`❌ Error al marcar salida del bulto ${envioId}:`, error);
        throw error;
    }
};

/**
 * Corrección #10: cancela el envío de un bulto (los paquetes vuelven a Recibido).
 */
export const cancelarBulto = async (envioId) => {
    try {
        const response = await api.post(`/bultos/${envioId}/cancelar/`);
        return response.data;
    } catch (error) {
        console.error(`❌ Error al cancelar bulto ${envioId}:`, error);
        throw error;
    }
};

// ==========================================
// REGISTROS (BITÁCORA #15)
// ==========================================

/**
 * Corrección #15: historial de cambios de estado de los paquetes.
 * Filtros: { fecha: 'YYYY-MM-DD', estado: 'en_transito' }
 */
export const getRegistros = async (filtros = {}) => {
    try {
        const response = await api.get('/registros/', { params: filtros });
        return response.data;
    } catch (error) {
        console.error('❌ Error al obtener registros:', error);
        throw error;
    }
};

/**
 * Corrección #15: entregas realizadas (con constancia fotográfica).
 * Filtro: { fecha: 'YYYY-MM-DD' }
 */
export const getRegistrosEntregas = async (filtros = {}) => {
    try {
        const response = await api.get('/registros/entregas/', { params: filtros });
        return response.data;
    } catch (error) {
        console.error('❌ Error al obtener entregas:', error);
        throw error;
    }
};

// ==========================================
// OPERACIONES HOLGUÍN
// ==========================================

/**
 * Recepciona el bulto llegado del aeropuerto y desembala sus paquetes
 * (pasan a estado 'en_cuba', listos para reparto).
 */
export const recibirYDesembalarBulto = async (codigoBulto, horaLlegada = null) => {
    try {
        const response = await api.post('/bultos/recibir/', {
            codigo_bulto: codigoBulto,
            hora_llegada: horaLlegada,
        });
        return response.data;
    } catch (error) {
        console.error('❌ Error al recibir bulto:', error);
        throw error;
    }
};

/**
 * Paquetes pendientes de entrega agrupados por reparto.
 * Filtros opcionales: { fecha: 'YYYY-MM-DD', reparto: 'COD' }
 */
export const getPaquetesPorReparto = async (filtros = {}) => {
    try {
        const response = await api.get('/holguin/paquetes-por-reparto/', { params: filtros });
        return response.data;
    } catch (error) {
        console.error('❌ Error al obtener paquetes por reparto:', error);
        throw error;
    }
};

/**
 * Registra la entrega de un paquete con foto de constancia.
 * El backend estampa la marca de agua "ENTREGADO + fecha + hora".
 */
export const registrarEntregaConFoto = async (paqueteId, formData) => {
    try {
        const response = await api.post(`/paquetes/${paqueteId}/entrega/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error(`❌ Error al registrar entrega del paquete ${paqueteId}:`, error);
        throw error;
    }
};

// ==========================================
// DESTINATARIOS (CRUD + GPX)
// ==========================================

/**
 * Lista destinatarios, opcionalmente filtrados por cliente o búsqueda.
 */
export const getDestinatarios = async (params = {}) => {
    try {
        const response = await api.get('/destinatarios/', { params });
        return response.data;
    } catch (error) {
        console.error('❌ Error al obtener destinatarios:', error);
        throw error;
    }
};

/**
 * Crea un destinatario vinculado a un cliente.
 */
export const createDestinatario = async (data) => {
    try {
        const response = await api.post('/destinatarios/', data);
        return response.data;
    } catch (error) {
        console.error('❌ Error al crear destinatario:', error);
        throw error;
    }
};

/**
 * Actualiza un destinatario existente.
 */
export const updateDestinatario = async (id, data) => {
    try {
        const response = await api.put(`/destinatarios/${id}/`, data);
        return response.data;
    } catch (error) {
        console.error(`❌ Error al actualizar destinatario ${id}:`, error);
        throw error;
    }
};

/**
 * Elimina un destinatario (solo si no tiene paquetes).
 */
export const deleteDestinatario = async (id) => {
    try {
        const response = await api.delete(`/destinatarios/${id}/`);
        return response.data;
    } catch (error) {
        console.error(`❌ Error al eliminar destinatario ${id}:`, error);
        throw error;
    }
};

/**
 * URL para exportar los destinatarios a GPX (Locus Map / OsmAnd offline).
 */
export const getGpxUrl = (filtros = {}) => {
    const qs = new URLSearchParams(filtros).toString();
    return `${API_URL}destinatarios/gpx/${qs ? '?' + qs : ''}`;
};

// ==========================================
// USUARIOS DEL PERSONAL (solo admin/supervisor)
// ==========================================

/**
 * Lista los usuarios del personal.
 */
export const getUsuarios = async () => {
    try {
        const response = await api.get('/users/usuarios/');
        return response.data;
    } catch (error) {
        console.error('❌ Error al obtener usuarios:', error);
        throw error;
    }
};

/**
 * Crea un usuario del personal (solo admin/supervisor).
 */
export const createUsuario = async (data) => {
    try {
        const response = await api.post('/users/usuarios/', data);
        return response.data;
    } catch (error) {
        console.error('❌ Error al crear usuario:', error);
        throw error;
    }
};

/**
 * Actualiza un usuario del personal (solo admin/supervisor).
 */
export const updateUsuario = async (id, data) => {
    try {
        const response = await api.put(`/users/usuarios/${id}/`, data);
        return response.data;
    } catch (error) {
        console.error(`❌ Error al actualizar usuario ${id}:`, error);
        throw error;
    }
};

/**
 * Elimina un usuario (solo admin/supervisor). Si tiene registros asociados
 * el backend lo desactiva en lugar de borrarlo.
 */
export const deleteUsuario = async (id) => {
    try {
        const response = await api.delete(`/users/usuarios/${id}/`);
        return response.data;
    } catch (error) {
        console.error(`❌ Error al eliminar usuario ${id}:`, error);
        throw error;
    }
};

// ==========================================
// EXPORTAR INSTANCIA Y FUNCIONES
// ==========================================

export default api;