// frontend/src/pages/TrackingPage.jsx
import React, { useState } from 'react';
import { getTrackingPublico } from '../api/apiService';

const TrackingPage = () => {
    const [codigo, setCodigo] = useState('');
    const [trackingData, setTrackingData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleBuscar = async (e) => {
        e.preventDefault();
        
        if (!codigo.trim()) {
            setError('Por favor, ingresa un código de seguimiento');
            return;
        }

        setLoading(true);
        setError('');
        setTrackingData(null);

        try {
            const data = await getTrackingPublico(codigo.trim());
            setTrackingData(data);
        } catch (error) {
            console.error('❌ Error al buscar tracking:', error);
            if (error.response?.status === 404) {
                setError('No se encontró el envío. Verifica el código ingresado.');
            } else {
                setError(error.response?.data?.error || 'Error al buscar el envío');
            }
        } finally {
            setLoading(false);
        }
    };

    const getEstadoEmoji = (estado) => {
        const emojis = {
            'recibido': '📋',
            'consolidado': '📦',
            'en_transito': '✈️',
            'en_cuba': '🇨🇺',
            'entregado': '✅',
        };
        return emojis[estado] || '📦';
    };

    const getEstadoLabel = (estado) => {
        const labels = {
            'recibido': 'Recibido en Miami',
            'consolidado': 'Consolidado',
            'en_transito': 'En Tránsito Aéreo',
            'en_cuba': 'Llegó a Cuba',
            'entregado': 'Entregado',
        };
        return labels[estado] || estado;
    };

    const getEstadoColor = (estado) => {
        const colors = {
            'recibido': '#faad14',
            'consolidado': '#1890ff',
            'en_transito': '#1890ff',
            'en_cuba': '#13c2c2',
            'entregado': '#52c41a',
        };
        return colors[estado] || '#d9d9d9';
    };

    return (
        <div>
            <h1 style={{ marginBottom: '8px' }}>📍 Seguimiento de Envíos</h1>
            <p style={{ color: '#666', marginBottom: '24px' }}>
                Ingresa tu código de seguimiento para conocer el estado de tu envío
            </p>

            <div style={{
                background: 'white',
                padding: '32px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                marginBottom: '24px'
            }}>
                <form onSubmit={handleBuscar} style={{
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap'
                }}>
                    <input
                        type="text"
                        placeholder="Ej: PKG-2026-0001"
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value)}
                        style={{
                            flex: 1,
                            minWidth: '200px',
                            padding: '12px 16px',
                            border: '2px solid #d9d9d9',
                            borderRadius: '8px',
                            fontSize: '16px',
                            transition: 'border-color 0.3s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#1890ff'}
                        onBlur={(e) => e.target.style.borderColor = '#d9d9d9'}
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '12px 32px',
                            background: loading ? '#d9d9d9' : '#1890ff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        {loading ? '🔍 Buscando...' : '🔍 Buscar'}
                    </button>
                </form>

                {error && (
                    <div style={{
                        background: '#fff2f0',
                        color: '#ff4d4f',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        marginTop: '16px',
                        border: '1px solid #ffccc7'
                    }}>
                        ❌ {error}
                    </div>
                )}
            </div>

            {loading && (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
                    <div>Buscando tu envío...</div>
                </div>
            )}

            {trackingData && !loading && (
                <div style={{
                    background: 'white',
                    padding: '24px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px',
                        flexWrap: 'wrap',
                        gap: '12px'
                    }}>
                        <div>
                            <h2 style={{ margin: 0 }}>📦 {trackingData.codigo_seguimiento}</h2>
                            <p style={{ color: '#666', margin: '4px 0 0 0' }}>
                                Cliente: {trackingData.cliente?.nombre_completo || 'N/A'}
                            </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{
                                display: 'inline-block',
                                background: getEstadoColor(trackingData.estado) + '22',
                                color: getEstadoColor(trackingData.estado),
                                padding: '4px 16px',
                                borderRadius: '20px',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}>
                                {getEstadoEmoji(trackingData.estado)} {getEstadoLabel(trackingData.estado)}
                            </span>
                        </div>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '16px',
                        padding: '16px',
                        background: '#fafafa',
                        borderRadius: '8px',
                        marginBottom: '24px'
                    }}>
                        <div>
                            <div style={{ color: '#666', fontSize: '12px' }}>📦 Peso</div>
                            <div style={{ fontWeight: '500' }}>{trackingData.peso_kg || 0} kg</div>
                        </div>
                        <div>
                            <div style={{ color: '#666', fontSize: '12px' }}>📍 Origen</div>
                            <div style={{ fontWeight: '500' }}>Miami, FL</div>
                        </div>
                        <div>
                            <div style={{ color: '#666', fontSize: '12px' }}>🎯 Destino</div>
                            <div style={{ fontWeight: '500' }}>
                                {trackingData.destinatario?.provincia || 'N/A'}
                            </div>
                        </div>
                        <div>
                            <div style={{ color: '#666', fontSize: '12px' }}>💰 Tarifa</div>
                            <div style={{ fontWeight: '500' }}>${trackingData.tarifa || 0}</div>
                        </div>
                    </div>

                    <h3 style={{ marginBottom: '16px' }}>📋 Historial de seguimiento</h3>
                    <div style={{ position: 'relative', paddingLeft: '24px' }}>
                        <div style={{
                            position: 'absolute',
                            left: '6px',
                            top: '0',
                            bottom: '0',
                            width: '2px',
                            background: '#e8e8e8'
                        }} />
                        {trackingData.historial && trackingData.historial.length > 0 ? (
                            trackingData.historial.map((evento, index) => (
                                <div key={index} style={{
                                    position: 'relative',
                                    padding: '12px 16px',
                                    marginBottom: '8px',
                                    background: '#fafafa',
                                    borderRadius: '8px',
                                    borderLeft: '3px solid #1890ff'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <span style={{ fontWeight: '500' }}>
                                            {evento.estado || evento.descripcion || 'Evento'}
                                        </span>
                                        <span style={{ fontSize: '12px', color: '#999' }}>
                                            {evento.fecha ? new Date(evento.fecha).toLocaleString('es-ES') : 'N/A'}
                                        </span>
                                    </div>
                                    {evento.descripcion && (
                                        <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                                            {evento.descripcion}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div style={{ 
                                textAlign: 'center', 
                                padding: '20px',
                                color: '#999'
                            }}>
                                No hay eventos de seguimiento disponibles
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrackingPage;