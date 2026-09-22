/**
 * frontend/src/components/common/Navbar.jsx
 * Rediseño (solicitud #5): barra superior con la identidad de marca
 * (logo vectorial original, paleta propia y acento coral en el botón).
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MARCA, LogoMiami305 } from '../../brand/Brand';

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
            background: '#fff',
            borderRadius: '12px',
            borderBottom: `3px solid ${MARCA.coral}`,
            boxShadow: '0 2px 10px rgba(11,34,57,0.08)',
            marginBottom: '20px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <LogoMiami305 tamano={34} conSol={false} />
                <h2 style={{ margin: 0, fontSize: '17px', color: MARCA.azulNoche, fontWeight: 800 }}>
                    Miami 305 · Gestión de Envíos
                </h2>
                <span style={{
                    fontSize: '11px',
                    color: MARCA.azulStereo,
                    background: 'rgba(25,179,166,0.12)',
                    border: '1px solid rgba(25,179,166,0.4)',
                    padding: '2px 10px',
                    borderRadius: '12px',
                    fontWeight: 600,
                }}>
                    Miami → Holguín
                </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {isAuthenticated && user && (
                    <>
                        <span style={{ fontSize: '14px', color: MARCA.tinta, fontWeight: 600 }}>
                            👤 {user.nombre_completo || user.username}
                        </span>
                        <span style={{
                            fontSize: '12px',
                            color: '#fff',
                            background: MARCA.azulStereo,
                            padding: '3px 12px',
                            borderRadius: '12px',
                            fontWeight: 600,
                        }}>
                            {user.rol || 'Usuario'}
                        </span>
                        <button
                            onClick={handleLogout}
                            style={{
                                background: MARCA.coral,
                                color: 'white',
                                border: 'none',
                                padding: '7px 18px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 600,
                                boxShadow: '0 3px 8px rgba(255,107,87,0.35)',
                            }}
                        >
                            Salir
                        </button>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
