// frontend/src/pages/EnviosPage.jsx
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setEnvios, setLoading, setError } from '../store/slices/enviosSlice';
import { getPaquetes } from '../api/apiService';

const EnviosPage = () => {
    const dispatch = useDispatch();
    const { envios, loading, error } = useSelector((state) => state.envios);
    const [searchTerm, setSearchTerm] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        cargarEnvios();
    }, []);

    const cargarEnvios = async () => {
        dispatch(setLoading(true));
        try {
            const params = {};
            if (searchTerm) params.search = searchTerm;
            if (filtroEstado !== 'todos') params.estado = filtroEstado;
            
            const data = await getPaquetes(params);
            dispatch(setEnvios(data.results || data || []));
        } catch (error) {
            console.error('❌ Error al cargar envíos:', error);
            dispatch(setError(error.message || 'Error al cargar envíos'));
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        clearTimeout(window.searchTimeout);
        window.searchTimeout = setTimeout(() => cargarEnvios(), 500);
    };

    const handleFiltroChange = (e) => {
        setFiltroEstado(e.target.value);
        clearTimeout(window.filtroTimeout);
        window.filtroTimeout = setTimeout(() => cargarEnvios(), 300);
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

    const getEstadoLabel = (estado) => {
        const labels = {
            'recibido': '📋 Recibido',
            'consolidado': '📦 Consolidado',
            'en_transito': '✈️ En Tránsito',
            'en_cuba': '🌴 En Cuba',
            'entregado': '✅ Entregado',
        };
        return labels[estado] || estado;
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
                <div>Cargando envíos...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ 
                background: '#fff2f0', 
                color: '#ff4d4f',
                padding: '20px',
                borderRadius: '8px'
            }}>
                ❌ Error: {error}
            </div>
        );
    }

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
                <h1 style={{ margin: 0 }}>📦 Envíos</h1>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder="🔍 Buscar por código o cliente..."
                        value={searchTerm}
                        onChange={handleSearch}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid #d9d9d9',
                            borderRadius: '4px',
                            fontSize: '14px',
                            width: '220px'
                        }}
                    />
                    <select
                        value={filtroEstado}
                        onChange={handleFiltroChange}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid #d9d9d9',
                            borderRadius: '4px',
                            fontSize: '14px',
                            background: 'white'
                        }}
                    >
                        <option value="todos">Todos los estados</option>
                        <option value="recibido">📋 Recibido</option>
                        <option value="consolidado">📦 Consolidado</option>
                        <option value="en_transito">✈️ En Tránsito</option>
                        <option value="en_cuba">🌴 En Cuba</option>
                        <option value="entregado">✅ Entregado</option>
                    </select>
                    <button
                        onClick={() => setShowModal(true)}
                        style={{
                            background: '#1890ff',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        ➕ Nuevo Envío
                    </button>
                </div>
            </div>

            <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                overflow: 'auto'
            }}>
                {!envios || envios.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                        No hay envíos registrados
                    </div>
                ) : (
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        minWidth: '700px'
                    }}>
                        <thead>
                            <tr style={{ 
                                borderBottom: '2px solid #f0f0f0',
                                textAlign: 'left'
                            }}>
                                <th style={{ padding: '12px 8px', color: '#666' }}>Código</th>
                                <th style={{ padding: '12px 8px', color: '#666' }}>Cliente</th>
                                <th style={{ padding: '12px 8px', color: '#666' }}>Destino</th>
                                <th style={{ padding: '12px 8px', color: '#666' }}>Peso</th>
                                <th style={{ padding: '12px 8px', color: '#666' }}>Tarifa</th>
                                <th style={{ padding: '12px 8px', color: '#666' }}>Estado</th>
                                <th style={{ padding: '12px 8px', color: '#666' }}>Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            {envios.map((envio) => (
                                <tr key={envio.id} style={{ 
                                    borderBottom: '1px solid #f0f0f0'
                                }}>
                                    <td style={{ 
                                        padding: '12px 8px', 
                                        fontWeight: '500',
                                        color: '#1890ff'
                                    }}>
                                        {envio.codigo_seguimiento || 'N/A'}
                                    </td>
                                    <td style={{ padding: '12px 8px' }}>
                                        {envio.cliente?.nombre_completo || 'N/A'}
                                    </td>
                                    <td style={{ padding: '12px 8px', color: '#666' }}>
                                        {envio.destinatario?.provincia || 'N/A'}
                                    </td>
                                    <td style={{ padding: '12px 8px' }}>{envio.peso_kg || 0} kg</td>
                                    <td style={{ padding: '12px 8px', fontWeight: '500' }}>
                                        ${envio.tarifa || 0}
                                    </td>
                                    <td style={{ padding: '12px 8px' }}>
                                        <span style={{
                                            background: getEstadoColor(envio.estado),
                                            color: 'white',
                                            padding: '2px 10px',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {getEstadoLabel(envio.estado)}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 8px', color: '#666' }}>
                                        {envio.fecha_recepcion ? new Date(envio.fecha_recepcion).toLocaleDateString('es-ES') : 'N/A'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default EnviosPage;