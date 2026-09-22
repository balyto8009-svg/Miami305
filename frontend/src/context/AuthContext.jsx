/**
 * frontend/src/context/AuthContext.jsx
 * Ubicación: Miami305/frontend/src/context/AuthContext.jsx
 * 
 * DESCRIPCIÓN:
 * Contexto para la autenticación de usuario.
 * Proporciona estado y funciones de autenticación a toda la aplicación.
 */

import React, { createContext, useState, useContext, useEffect } from 'react';
import { login as apiLogin, logout as apiLogout, getCurrentUser, isAuthenticated } from '../api/apiService';

// ==========================================
// CREAR CONTEXT
// ==========================================
const AuthContext = createContext(null);

// ==========================================
// ROLES Y PERMISOS (fuente única para toda la UI)
// ==========================================
export const ROLES = {
    ADMIN: 'admin',
    SUPERVISOR: 'supervisor',
    EMPLEADO: 'empleado',      // Personal de Miami
    HOLGUIN: 'holguin',        // Personal de la sede Holguín
};

const esAdmin = (user) => ['admin', 'supervisor'].includes(user?.rol);
const esMiami = (user) => ['admin', 'supervisor', 'empleado'].includes(user?.rol);
const esHolguin = (user) => user?.rol === 'holguin';

// Matriz de permisos que consume el resto de la interfaz
export const permisosDe = (user) => ({
    esAdmin: esAdmin(user),
    esMiami: esMiami(user),
    esHolguin: esHolguin(user),
    // Categorías y tarifas (configuración): solo admin/supervisor
    gestionarConfiguracion: esAdmin(user),
    // Usuarios del personal: solo admin/supervisor
    gestionarUsuarios: esAdmin(user),
    // Clientes: crear/editar = Miami; eliminar = admin
    crearClientes: esMiami(user),
    editarClientes: esMiami(user),
    eliminarClientes: esAdmin(user),
    // Destinatarios: crear = Miami; editar = todos; eliminar = admin
    crearDestinatarios: esMiami(user),
    editarDestinatarios: esMiami(user) || esHolguin(user),
    eliminarDestinatarios: esAdmin(user),
    // Operaciones
    recibirPaquetes: esMiami(user),          // Gestión de Paquetes
    confeccionarBultos: esMiami(user),       // Bultos
    operarHolguin: esHolguin(user) || esAdmin(user), // Operaciones Destino
    // Seguimiento de Bultos y Registros: todo el personal (#15)
    verSeguimiento: esMiami(user) || esHolguin(user),
    verRegistros: esMiami(user) || esHolguin(user),
    // Mapa de Destinatarios (capa offline): todo el personal
    verMapaDestinatarios: esMiami(user) || esHolguin(user),
    verReportes: esAdmin(user),
});

// ==========================================
// HOOK PERSONALIZADO
// ==========================================
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};

// ==========================================
// PROVIDER
// ==========================================
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ==========================================
    // CARGAR USUARIO AL INICIAR
    // ==========================================
    useEffect(() => {
        const loadUser = () => {
            try {
                const currentUser = getCurrentUser();
                if (currentUser && isAuthenticated()) {
                    setUser(currentUser);
                }
            } catch (err) {
                console.error('❌ Error al cargar usuario:', err);
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, []);

    // ==========================================
    // FUNCIÓN DE LOGIN
    // ==========================================
    const login = async (username, password) => {
        setLoading(true);
        setError(null);
        try {
            const result = await apiLogin(username, password);
            if (result && result.success) {
                setUser(result.user);
                return { success: true };
            } else {
                setError(result?.error || 'Credenciales inválidas');
                return { success: false, error: result?.error };
            }
        } catch (err) {
            const errorMessage = err.message || 'Error al iniciar sesión';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // FUNCIÓN DE LOGOUT
    // ==========================================
    const logout = () => {
        apiLogout();
        setUser(null);
    };

    // ==========================================
    // VALOR DEL CONTEXT
    // ==========================================
    const value = {
        user,
        loading,
        error,
        login,
        logout,
        isAuthenticated: !!user && isAuthenticated(),
        permisos: permisosDe(user),
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;