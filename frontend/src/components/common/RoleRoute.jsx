/**
 * frontend/src/components/common/RoleRoute.jsx
 * Ubicación: Miami305/frontend/src/components/common/RoleRoute.jsx
 *
 * DESCRIPCIÓN:
 * Protege rutas por rol. Redirige a /login si no hay sesión y al panel
 * principal del usuario si su rol no tiene acceso a la ruta.
 */

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../../context/AuthContext';

// Panel inicial según el rol (también se usa tras el login y en Sidebar)
export const hogarPorRol = (user) => {
    if (user?.rol === 'holguin') return '/holguin';
    return '/dashboard';
};

const RoleRoute = ({ roles }) => {
    const { user, isAuthenticated, loading } = useAuth();

    // Esperar la restauración de la sesión guardada (localStorage) antes de
    // decidir: si no, un reload manda al login aunque haya sesión válida.
    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <Spin size="large" tip="Cargando..." />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Sin restricción explícita o superusuario → acceso total
    const esSuper = user?.is_superuser;
    if (roles && !esSuper && !roles.includes(user?.rol)) {
        return <Navigate to={hogarPorRol(user)} replace />;
    }

    return <Outlet />;
};

export default RoleRoute;
