/**
 * frontend/src/pages/Dashboard.jsx
 * Ubicación: Miami305/frontend/src/pages/Dashboard.jsx
 * 
 * DESCRIPCIÓN:
 * Página principal del dashboard con estadísticas y resumen del sistema.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    getStats, 
    getPaquetes, 
    getReporteResumen,
    getCurrentUser 
} from '../api/apiService';

// ==========================================
// COMPONENTE DE TARJETA DE ESTADÍSTICA
// ==========================================
const StatCard = ({ icon, title, value, color, subtitle }) => {
    const colors = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        yellow: 'bg-yellow-100 text-yellow-600',
        red: 'bg-red-100 text-red-600',
        purple: 'bg-purple-100 text-purple-600',
        indigo: 'bg-indigo-100 text-indigo-600',
    };

    return (
        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                        {title}
                    </p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">
                        {value !== undefined ? value : '-'}
                    </p>
                    {subtitle && (
                        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
                    )}
                </div>
                <div className={`p-3 rounded-full ${colors[color] || colors.blue}`}>
                    <span className="text-xl">{icon}</span>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// COMPONENTE PRINCIPAL DASHBOARD
// ==========================================
const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [reporteResumen, setReporteResumen] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);

    // ==========================================
    // CARGAR DATOS
    // ==========================================
    useEffect(() => {
        // Obtener usuario actual
        const currentUser = getCurrentUser();
        setUser(currentUser);

        // Cargar datos
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
				
				console.log('📊 Intentando obtener estadísticas...');
                console.log('  Token:', localStorage.getItem('access_token') ? '✅' : '❌');

                // Obtener estadísticas del dashboard
                const statsData = await getStats();
                setStats(statsData);

                // Obtener resumen de reportes (opcional)
                try {
                    const resumenData = await getReporteResumen();
                    setReporteResumen(resumenData);
                } catch (reportErr) {
                    console.log('⚠️ Reportes no disponibles:', reportErr.message);
                }

            } catch (err) {
                console.error('❌ Error al cargar datos del dashboard:', err);
                
                if (err.response) {
                    if (err.response.status === 403) {
                        setError('No tienes permisos para ver el dashboard. Contacta al administrador.');
                    } else if (err.response.status === 401) {
                        setError('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
                        // Redirigir al login después de un momento
                        setTimeout(() => {
                            window.location.href = '/login';
                        }, 2000);
                    } else {
                        setError(`Error del servidor: ${err.response.data?.error || err.response.status}`);
                    }
                } else if (err.request) {
                    setError('No se pudo conectar con el servidor. Verifica tu conexión.');
                } else {
                    setError(`Error: ${err.message}`);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // ==========================================
    // ESTADO DE CARGA
    // ==========================================
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600">Cargando dashboard...</p>
                </div>
            </div>
        );
    }

    // ==========================================
    // ESTADO DE ERROR
    // ==========================================
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
                    <div className="text-5xl mb-4">⚠️</div>
                    <h2 className="text-xl font-bold text-red-600 mb-2">Error al cargar el dashboard</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDERIZAR DASHBOARD
    // ==========================================
    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            {/* ==========================================
                ENCABEZADO
                ========================================== */}
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                            Dashboard
                        </h1>
                        <p className="text-gray-500 text-sm">
                            {user ? `Bienvenido, ${user.nombre_completo || user.username}` : 'Bienvenido'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 mt-3 md:mt-0">
                        <span className="text-sm text-gray-500">
                            Última actualización: {new Date().toLocaleString()}
                        </span>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                        >
                            🔄
                        </button>
                    </div>
                </div>

                {/* ==========================================
                    TARJETAS DE ESTADÍSTICAS
                    ========================================== */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <StatCard
                        icon="📦"
                        title="Total Envíos"
                        value={stats?.total_envios || 0}
                        color="blue"
                    />
                    <StatCard
                        icon="👤"
                        title="Total Clientes"
                        value={stats?.total_clientes || 0}
                        color="green"
                    />
                    <StatCard
                        icon="⏳"
                        title="Pendientes"
                        value={stats?.pendientes || 0}
                        color="yellow"
                        subtitle={`Consolidados: ${stats?.consolidados || 0}`}
                    />
                    <StatCard
                        icon="💰"
                        title="Ingresos del Mes"
                        value={`$${stats?.ingresos_mes?.toFixed(2) || '0.00'}`}
                        color="purple"
                    />
                </div>

                {/* ==========================================
                    SEGUNDA FILA - MÁS ESTADÍSTICAS
                    ========================================== */}
                {reporteResumen && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <StatCard
                            icon="📊"
                            title="Total Ingresos"
                            value={`$${reporteResumen?.ingresos_totales?.toFixed(2) || '0.00'}`}
                            color="indigo"
                        />
                        <StatCard
                            icon="📈"
                            title="Promedio por Día (30d)"
                            value={reporteResumen?.promedio_por_dia || 0}
                            color="green"
                        />
                        <StatCard
                            icon="✈️"
                            title="En Tránsito"
                            value={stats?.en_transito || 0}
                            color="red"
                        />
                        <StatCard
                            icon="✅"
                            title="Entregados"
                            value={stats?.entregados || 0}
                            color="green"
                        />
                    </div>
                )}

                {/* ==========================================
                    GRÁFICOS Y TABLAS (OPCIONAL)
                    ========================================== */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Envíos por estado */}
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                            📊 Envíos por Estado
                        </h3>
                        <div className="space-y-3">
                            {stats && (
                                <>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Recibidos</span>
                                        <span className="font-bold text-gray-800">{stats.recibidos || 0}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                            className="bg-blue-500 rounded-full h-2" 
                                            style={{ width: `${stats.total_envios ? ((stats.recibidos || 0) / stats.total_envios) * 100 : 0}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Consolidados</span>
                                        <span className="font-bold text-gray-800">{stats.consolidados || 0}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                            className="bg-yellow-500 rounded-full h-2" 
                                            style={{ width: `${stats.total_envios ? ((stats.consolidados || 0) / stats.total_envios) * 100 : 0}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">En Tránsito</span>
                                        <span className="font-bold text-gray-800">{stats.en_transito || 0}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                            className="bg-purple-500 rounded-full h-2" 
                                            style={{ width: `${stats.total_envios ? ((stats.en_transito || 0) / stats.total_envios) * 100 : 0}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Entregados</span>
                                        <span className="font-bold text-gray-800">{stats.entregados || 0}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                            className="bg-green-500 rounded-full h-2" 
                                            style={{ width: `${stats.total_envios ? ((stats.entregados || 0) / stats.total_envios) * 100 : 0}%` }}
                                        ></div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Acciones rápidas */}
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                            ⚡ Acciones Rápidas
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <Link
                                to="/paquetes"
                                className="flex flex-col items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                            >
                                <span className="text-2xl">📦</span>
                                <span className="text-sm font-medium text-gray-700 mt-1">Ver Paquetes</span>
                            </Link>
                            <Link
                                to="/clientes"
                                className="flex flex-col items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                            >
                                <span className="text-2xl">👤</span>
                                <span className="text-sm font-medium text-gray-700 mt-1">Clientes</span>
                            </Link>
                            <Link
                                to="/reportes"
                                className="flex flex-col items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                            >
                                <span className="text-2xl">📊</span>
                                <span className="text-sm font-medium text-gray-700 mt-1">Reportes</span>
                            </Link>
                            <Link
                                to="/tracking"
                                className="flex flex-col items-center p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors"
                            >
                                <span className="text-2xl">🔍</span>
                                <span className="text-sm font-medium text-gray-700 mt-1">Tracking</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* ==========================================
                    PIE DE PÁGINA
                    ========================================== */}
                <div className="mt-8 text-center text-sm text-gray-400 border-t border-gray-200 pt-4">
                    Miami305 Envíos - Sistema de Gestión v1.0
                </div>
            </div>
        </div>
    );
};

export default Dashboard;