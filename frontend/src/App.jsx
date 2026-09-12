/**
 * frontend/src/App.jsx
 * Ubicación: Miami305/frontend/src/App.jsx
 * 
 * DESCRIPCIÓN:
 * Configuración principal de la aplicación con autenticación.
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';
import { AuthProvider } from './context/AuthContext';

// Páginas
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ClientesPage from './pages/ClientesPage';
import EnviosPage from './pages/EnviosPage';
import PaquetesPage from './pages/PaquetesPage';
import ReportesPage from './pages/ReportesPage';
import TrackingPage from './pages/TrackingPage';

// Componentes
import PrivateRoute from './components/common/PrivateRoute';
import Layout from './components/common/Layout';

import './index.css';

const App = () => {
    return (
        <Provider store={store}>
            <Router>
                <AuthProvider>
                    <Routes>
                        {/* Ruta pública */}
                        <Route path="/login" element={<LoginPage />} />
                        
                        {/* Rutas privadas */}
                        <Route element={<PrivateRoute />}>
                            <Route element={<Layout />}>
                                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/clientes" element={<ClientesPage />} />
                                <Route path="/envios" element={<EnviosPage />} />
                                <Route path="/paquetes" element={<PaquetesPage />} />
                                <Route path="/reportes" element={<ReportesPage />} />
                                <Route path="/tracking" element={<TrackingPage />} />
                            </Route>
                        </Route>
                        
                        {/* Ruta por defecto */}
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                </AuthProvider>
            </Router>
        </Provider>
    );
};

export default App;