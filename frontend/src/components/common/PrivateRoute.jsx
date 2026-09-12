/**
 * frontend/src/components/common/PrivateRoute.jsx
 * Ubicación: Miami305/frontend/src/components/common/PrivateRoute.jsx
 * 
 * DESCRIPCIÓN:
 * Componente que protege rutas que requieren autenticación.
 * Si el usuario no está autenticado, redirige a /login.
 */

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { isAuthenticated } from '../../api/apiService';

const PrivateRoute = () => {
    const autenticado = isAuthenticated();
    
    console.log('🔒 PrivateRoute - Autenticado:', autenticado);
    console.log('  Token:', localStorage.getItem('access_token') ? '✅' : '❌');
    console.log('  User:', localStorage.getItem('user') ? '✅' : '❌');
    
    if (!autenticado) {
        console.log('🔒 No autenticado, redirigiendo a /login');
        return <Navigate to="/login" replace />;
    }
    
    console.log('🔒 Autenticado, mostrando contenido');
    return <Outlet />;
};

export default PrivateRoute;