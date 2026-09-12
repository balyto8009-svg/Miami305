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
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;