/**
 * frontend/src/App.jsx
 * Ubicación: Miami305/frontend/src/App.jsx
 * 
 * DESCRIPCIÓN:
 * Configuración principal con autenticación y control de acceso por rol.
 *
 * ROLES:
 *  - admin / supervisor: acceso total (Configuración y Reportes)
 *  - empleado: operaciones de Miami (clientes, paquetes, bultos)
 *  - holguin: Operaciones Holguín y edición de destinatarios
 *  - público: /tracking (localizador de paquetes, sin iniciar sesión)
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';
import { AuthProvider, useAuth } from './context/AuthContext';
import { hogarPorRol } from './components/common/RoleRoute';

// Páginas
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ClientesPage from './pages/ClientesPage';
import EnviosPage from './pages/EnviosPage';
import PaquetesPage from './pages/PaquetesPage';
import BultosPage from './pages/BultosPage';
import SeguimientoBultosPage from './pages/SeguimientoBultosPage';
import HolguinPage from './pages/HolguinPage';
import RegistrosPage from './pages/RegistrosPage';
import ReportesPage from './pages/ReportesPage';
import TrackingPage from './pages/TrackingPage';
import ConfiguracionPage from './pages/ConfiguracionPage';
import UsuariosPage from './pages/UsuariosPage';

// Componentes
import PrivateRoute from './components/common/PrivateRoute';
import RoleRoute from './components/common/RoleRoute';
import Layout from './components/common/Layout';

import './index.css';

const ROLES_TODOS = ['admin', 'supervisor', 'empleado', 'holguin'];
const ROLES_MIAMI = ['admin', 'supervisor', 'empleado'];
const ROLES_ADMIN = ['admin', 'supervisor'];

const AppRoutes = () => {
    const { user } = useAuth();

    return (
        <Routes>
            {/* RUTAS PÚBLICAS (sin iniciar sesión) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/tracking" element={<TrackingPage />} />

            {/* RUTAS PRIVADAS (personal de la agencia) */}
            <Route element={<PrivateRoute />}>
                <Route element={<Layout />}>
                    <Route element={<RoleRoute roles={ROLES_TODOS} />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/clientes" element={<ClientesPage />} />
                    </Route>

                    {/* Operaciones de Miami */}
                    <Route element={<RoleRoute roles={ROLES_MIAMI} />}>
                        <Route path="/paquetes" element={<PaquetesPage />} />
                        <Route path="/bultos" element={<BultosPage />} />
                        <Route path="/envios" element={<EnviosPage />} />
                    </Route>

                    {/* Seguimiento de bultos y Registros: Miami y Holguín (#15) */}
                    <Route element={<RoleRoute roles={ROLES_TODOS} />}>
                        <Route path="/seguimiento-bultos" element={<SeguimientoBultosPage />} />
                        <Route path="/registros" element={<RegistrosPage />} />
                    </Route>

                    {/* Operaciones de Holguín (Miami supervisa) */}
                    <Route element={<RoleRoute roles={[...ROLES_ADMIN, 'holguin']} />}>
                        <Route path="/holguin" element={<HolguinPage />} />
                    </Route>

                    {/* Administración: solo admin/supervisor */}
                    <Route element={<RoleRoute roles={ROLES_ADMIN} />}>
                        <Route path="/reportes" element={<ReportesPage />} />
                        <Route path="/configuracion" element={<ConfiguracionPage />} />
                        <Route path="/usuarios" element={<UsuariosPage />} />
                    </Route>
                </Route>
            </Route>

            {/* Raíz → panel según el rol */}
            <Route path="/" element={<Navigate to={hogarPorRol(user)} replace />} />

            {/* Ruta por defecto */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

const App = () => {
    return (
        <Provider store={store}>
            <Router>
                <AuthProvider>
                    <AppRoutes />
                </AuthProvider>
            </Router>
        </Provider>
    );
};

export default App;