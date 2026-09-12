// frontend/src/pages/ReportesPage.jsx
import React, { useState, useEffect } from 'react';
import { getStats, getReporteEnviosMensual, getReporteResumen } from '../api/apiService';

const ReportesPage = () => {
    const [reportes, setReportes] = useState({
        enviosPorEstado: [],
        enviosPorMes: [],
        estadisticas: {
            totalEnvios: 0,
            totalClientes: 0,
            promedioEnviosPorDia: 0,
            tarifaPromedio: 0,
            ingresosTotales: 0,
        }
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchReportes = async () => {
            try {
                setLoading(true);
                setError(null);

                console.log('📊 Cargando reportes...');

                // Obtener estadísticas del dashboard
                const stats = await getStats();
                console.log('📊 Estadísticas:', stats);
                
                // Obtener envíos por mes
                const porMes = await getReporteEnviosMensual();
                console.log('📊 Por mes:', porMes);
                
                // Obtener resumen (opcional)
                let resumen = null;
                try {
                    resumen = await getReporteResumen();
                    console.log('📊 Resumen:', resumen);
                } catch (e) {
                    console.log('⚠️ Resumen no disponible:', e.message);
                }

                // Calcular envíos por estado desde stats
                const estados = stats ? [
                    { estado: 'recibido', cantidad: stats.recibidos || 0 },
                    { estado: 'consolidado', cantidad: stats.consolidados || 0 },
                    { estado: 'en_transito', cantidad: stats.en_transito || 0 },
                    { estado: 'en_cuba', cantidad: stats.en_cuba || 0 },
                    { estado: 'entregado', cantidad: stats.entregados || 0 },
                ] : [];

                setReportes({
                    estadisticas: {
                        totalEnvios: stats?.total_envios || 0,
                        totalClientes: stats?.total_clientes || 0,
                        promedioEnviosPorDia: resumen?.promedio_por_dia || 0,
                        tarifaPromedio: resumen?.tarifa_promedio || 0,
                        ingresosTotales: resumen?.ingresos_totales || 0,
                    },
                    enviosPorEstado: estados,
                    enviosPorMes: porMes || [],
                });
            } catch (error) {
                console.error('❌ Error al cargar reportes:', error);
                setError(error.message || 'Error al cargar los reportes');
            } finally {
                setLoading(false);
            }
        };

        fetchReportes();
    }, []);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
                <div>Cargando reportes...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ 
                background: '#fff2f0', 
                color: '#ff4d4f',
                padding: '20px',
                borderRadius: '8px',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>❌</div>
                <div>{error}</div>
                <button 
                    onClick={() => window.location.reload()}
                    style={{
                        marginTop: '16px',
                        background: '#1890ff',
                        color: 'white',
                        border: 'none',
                        padding: '8px 24px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Reintentar
                </button>
            </div>
        );
    }

    const maxCantidad = reportes.enviosPorMes && reportes.enviosPorMes.length > 0 
        ? Math.max(...reportes.enviosPorMes.map(item => item.cantidad || 0))
        : 1;

    const estadoColors = {
        'recibido': '#faad14',
        'consolidado': '#1890ff',
        'en_transito': '#1890ff',
        'en_cuba': '#13c2c2',
        'entregado': '#52c41a',
    };

    const estadoLabels = {
        'recibido': '📋 Recibido',
        'consolidado': '📦 Consolidado',
        'en_transito': '✈️ En Tránsito',
        'en_cuba': '🇨🇺 En Cuba',
        'entregado': '✅ Entregado',
    };

    return (
        <div>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                <h1 style={{ margin: 0 }}>📊 Reportes y Estadísticas</h1>
                <button style={{
                    background: '#1890ff',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    📥 Exportar Excel
                </button>
            </div>

            {/* Tarjetas de estadísticas */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
            }}>
                <div style={{
                    background: 'white',
                    padding: '16px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    borderLeft: '4px solid #1890ff'
                }}>
                    <div style={{ color: '#666', fontSize: '14px' }}>📦 Total Envíos</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1890ff' }}>
                        {reportes.estadisticas.totalEnvios}
                    </div>
                </div>
                <div style={{
                    background: 'white',
                    padding: '16px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    borderLeft: '4px solid #52c41a'
                }}>
                    <div style={{ color: '#666', fontSize: '14px' }}>👥 Total Clientes</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#52c41a' }}>
                        {reportes.estadisticas.totalClientes}
                    </div>
                </div>
                <div style={{
                    background: 'white',
                    padding: '16px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    borderLeft: '4px solid #faad14'
                }}>
                    <div style={{ color: '#666', fontSize: '14px' }}>📊 Promedio por día</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#faad14' }}>
                        {reportes.estadisticas.promedioEnviosPorDia.toFixed(1)}
                    </div>
                </div>
                <div style={{
                    background: 'white',
                    padding: '16px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    borderLeft: '4px solid #13c2c2'
                }}>
                    <div style={{ color: '#666', fontSize: '14px' }}>💰 Ingresos Totales</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#13c2c2' }}>
                        ${reportes.estadisticas.ingresosTotales.toFixed(2)}
                    </div>
                </div>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '24px'
            }}>
                {/* Gráfico de envíos por estado */}
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}>
                    <h3 style={{ marginBottom: '16px' }}>📊 Envíos por Estado</h3>
                    {!reportes.enviosPorEstado || reportes.enviosPorEstado.length === 0 || reportes.enviosPorEstado.every(e => e.cantidad === 0) ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                            No hay datos disponibles
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {reportes.enviosPorEstado.map((item, index) => {
                                const porcentaje = reportes.estadisticas.totalEnvios > 0 
                                    ? (item.cantidad / reportes.estadisticas.totalEnvios * 100) 
                                    : 0;
                                const color = estadoColors[item.estado] || '#d9d9d9';
                                const label = estadoLabels[item.estado] || item.estado;
                                
                                return (
                                    <div key={index}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginBottom: '4px',
                                            fontSize: '14px'
                                        }}>
                                            <span>{label}</span>
                                            <span style={{ fontWeight: '500' }}>{item.cantidad}</span>
                                        </div>
                                        <div style={{
                                            height: '8px',
                                            background: '#f0f0f0',
                                            borderRadius: '4px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${Math.max(porcentaje, 0)}%`,
                                                height: '100%',
                                                background: color,
                                                borderRadius: '4px',
                                                transition: 'width 0.8s ease'
                                            }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Gráfico de envíos por mes */}
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}>
                    <h3 style={{ marginBottom: '16px' }}>📈 Envíos por Mes</h3>
                    {!reportes.enviosPorMes || reportes.enviosPorMes.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                            No hay datos disponibles
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'space-between',
                            height: '180px',
                            gap: '8px'
                        }}>
                            {reportes.enviosPorMes.map((item, index) => {
                                const altura = maxCantidad > 0 ? (item.cantidad / maxCantidad) * 100 : 0;
                                return (
                                    <div key={index} style={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <div style={{
                                            width: '100%',
                                            background: '#1890ff',
                                            borderRadius: '4px 4px 0 0',
                                            height: `${Math.max(altura, 4)}%`,
                                            minHeight: '4px',
                                            transition: 'height 0.8s ease'
                                        }} />
                                        <div style={{
                                            fontSize: '12px',
                                            color: '#666',
                                            textAlign: 'center'
                                        }}>
                                            {item.mes || item.fecha?.slice(5, 7) || 'N/A'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportesPage;