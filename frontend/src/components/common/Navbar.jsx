/**
 * frontend/src/components/common/Navbar.jsx
 * Ubicación: Miami305/frontend/src/components/common/Navbar.jsx
 * 
 * DESCRIPCIÓN:
 * Barra de navegación superior con información del usuario y acciones.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 24px',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            marginBottom: '20px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#1a237e' }}>
                    📦 Miami305
                </h2>
                <span style={{ fontSize: '14px', color: '#666' }}>
                    Sistema de Gestión de Envíos
                </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {isAuthenticated && user && (
                    <>
                        <span style={{ fontSize: '14px', color: '#333' }}>
                            👤 {user.nombre_completo || user.username}
                        </span>
                        <span style={{ fontSize: '12px', color: '#666', background: '#f0f0f0', padding: '2px 10px', borderRadius: '12px' }}>
                            {user.rol || 'Usuario'}
                        </span>
                        <button
                            onClick={handleLogout}
                            style={{
                                background: '#ff4d4f',
                                color: 'white',
                                border: 'none',
                                padding: '6px 16px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            🚪 Salir
                        </button>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;