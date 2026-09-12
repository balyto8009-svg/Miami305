/**
 * frontend/src/components/common/Layout.jsx
 * Ubicación: Miami305/frontend/src/components/common/Layout.jsx
 * 
 * DESCRIPCIÓN:
 * Layout principal con barra de navegación y sidebar.
 * Envuelve todas las páginas privadas.
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = () => {
    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <Sidebar />
            
            {/* Contenido principal */}
            <div style={{ 
                flex: 1, 
                marginLeft: '250px', // Ancho del sidebar
                padding: '24px',
                background: '#f0f2f5',
                minHeight: '100vh'
            }}>
                {/* Navbar */}
                <Navbar />
                
                {/* Contenido de la página */}
                <main style={{ marginTop: '20px' }}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;