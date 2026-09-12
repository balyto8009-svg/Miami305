/**
 * frontend/src/components/common/Sidebar.jsx
 * Ubicación: Miami305/frontend/src/components/common/Sidebar.jsx
 * 
 * DESCRIPCIÓN:
 * Barra lateral de navegación con los módulos del sistema.
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
    const { user } = useAuth();

    const menuItems = [
        { path: '/dashboard', icon: '📊', label: 'Dashboard' },
        { path: '/clientes', icon: '👥', label: 'Clientes' },
        { path: '/envios', icon: '📦', label: 'Envíos' },
        { path: '/paquetes', icon: '📦', label: 'Paquetes' },
        { path: '/reportes', icon: '📈', label: 'Reportes' },
        { path: '/tracking', icon: '🔍', label: 'Tracking' },
    ];

    // Si es admin, mostrar usuarios (opcional)
    if (user?.rol === 'admin') {
        menuItems.push({ path: '/usuarios', icon: '👤', label: 'Usuarios' });
    }

    return (
        <div style={{
            width: '250px',
            height: '100vh',
            background: '#001529',
            color: 'white',
            position: 'fixed',
            top: 0,
            left: 0,
            padding: '20px 0',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000
        }}>
            {/* Logo */}
            <div style={{
                padding: '0 20px 20px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                marginBottom: '16px'
            }}>
                <h2 style={{ margin: 0, fontSize: '20px', color: '#fff' }}>
                    🚀 Miami305
                </h2>
            </div>

            {/* Menú */}
            <nav style={{ flex: 1 }}>
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 20px',
                            color: isActive ? '#1890ff' : 'rgba(255,255,255,0.7)',
                            background: isActive ? 'rgba(24,144,255,0.1)' : 'transparent',
                            textDecoration: 'none',
                            transition: 'all 0.3s',
                            borderLeft: isActive ? '3px solid #1890ff' : '3px solid transparent',
                        })}
                    >
                        <span style={{ fontSize: '18px' }}>{item.icon}</span>
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Usuario */}
            {user && (
                <div style={{
                    padding: '16px 20px',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.7)'
                }}>
                    <div>👤 {user.nombre_completo || user.username}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                        {user.rol || 'Usuario'}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sidebar;