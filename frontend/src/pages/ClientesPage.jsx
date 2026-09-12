// frontend/src/pages/ClientesPage.jsx
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setClientes, addCliente, deleteCliente, setLoading, setError } from '../store/slices/clientesSlice';
import { getClientes, createCliente, deleteCliente as deleteClienteApi } from '../api/apiService';

const ClientesPage = () => {
    const dispatch = useDispatch();
    const { clientes, loading, error } = useSelector((state) => state.clientes);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        nombre_completo: '',
        email: '',
        telefono: '',
        domicilio: '',
    });

    useEffect(() => {
        cargarClientes();
    }, []);

    const cargarClientes = async () => {
        dispatch(setLoading(true));
        try {
            const data = await getClientes(searchTerm);
            dispatch(setClientes(data.results || data || []));
        } catch (error) {
            console.error('❌ Error al cargar clientes:', error);
            dispatch(setError(error.message || 'Error al cargar clientes'));
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        clearTimeout(window.searchTimeout);
        window.searchTimeout = setTimeout(() => cargarClientes(), 500);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = await createCliente(formData);
            dispatch(addCliente(data));
            setShowModal(false);
            setFormData({
                nombre_completo: '',
                email: '',
                telefono: '',
                domicilio: '',
            });
            cargarClientes();
        } catch (error) {
            console.error('❌ Error al crear cliente:', error);
            alert(error.response?.data?.error || 'Error al crear cliente');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar este cliente?')) {
            try {
                await deleteClienteApi(id);
                dispatch(deleteCliente(id));
            } catch (error) {
                console.error('❌ Error al eliminar cliente:', error);
                alert(error.response?.data?.error || 'Error al eliminar cliente');
            }
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
                <div>Cargando clientes...</div>
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
                <h1 style={{ margin: 0 }}>👥 Clientes</h1>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="🔍 Buscar cliente..."
                        value={searchTerm}
                        onChange={handleSearch}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid #d9d9d9',
                            borderRadius: '4px',
                            fontSize: '14px',
                            width: '200px'
                        }}
                    />
                    <button
                        onClick={() => setShowModal(true)}
                        style={{
                            background: '#1890ff',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        ➕ Nuevo Cliente
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
                {!clientes || clientes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                        No hay clientes registrados
                    </div>
                ) : (
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        minWidth: '600px'
                    }}>
                        <thead>
                            <tr style={{ 
                                borderBottom: '2px solid #f0f0f0',
                                textAlign: 'left'
                            }}>
                                <th style={{ padding: '12px 8px', color: '#666' }}>Nombre</th>
                                <th style={{ padding: '12px 8px', color: '#666' }}>Email</th>
                                <th style={{ padding: '12px 8px', color: '#666' }}>Teléfono</th>
                                <th style={{ padding: '12px 8px', color: '#666' }}>Dirección</th>
                                <th style={{ padding: '12px 8px', color: '#666', textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clientes.map((cliente) => (
                                <tr key={cliente.id} style={{ 
                                    borderBottom: '1px solid #f0f0f0'
                                }}>
                                    <td style={{ padding: '12px 8px', fontWeight: '500' }}>
                                        {cliente.nombre_completo}
                                    </td>
                                    <td style={{ padding: '12px 8px', color: '#1890ff' }}>
                                        {cliente.email || '-'}
                                    </td>
                                    <td style={{ padding: '12px 8px' }}>{cliente.telefono || '-'}</td>
                                    <td style={{ padding: '12px 8px', color: '#666' }}>
                                        {cliente.domicilio || '-'}
                                    </td>
                                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <button
                                                style={{
                                                    background: '#1890ff',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '4px 12px',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '12px'
                                                }}
                                            >
                                                ✏️ Editar
                                            </button>
                                            <button
                                                onClick={() => handleDelete(cliente.id)}
                                                style={{
                                                    background: '#ff4d4f',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '4px 12px',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '12px'
                                                }}
                                            >
                                                🗑️ Eliminar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal para nuevo cliente */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'white',
                        padding: '24px',
                        borderRadius: '12px',
                        width: '450px',
                        maxWidth: '90%',
                        maxHeight: '90%',
                        overflow: 'auto'
                    }}>
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: '20px'
                        }}>
                            <h2 style={{ margin: 0 }}>➕ Nuevo Cliente</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    color: '#999'
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                                    Nombre completo *
                                </label>
                                <input
                                    type="text"
                                    name="nombre_completo"
                                    value={formData.nombre_completo}
                                    onChange={handleChange}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '1px solid #d9d9d9',
                                        borderRadius: '4px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                                    Email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '1px solid #d9d9d9',
                                        borderRadius: '4px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                                    Teléfono
                                </label>
                                <input
                                    type="text"
                                    name="telefono"
                                    value={formData.telefono}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '1px solid #d9d9d9',
                                        borderRadius: '4px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                                    Dirección
                                </label>
                                <input
                                    type="text"
                                    name="domicilio"
                                    value={formData.domicilio}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '1px solid #d9d9d9',
                                        borderRadius: '4px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    style={{
                                        background: '#f5f5f5',
                                        border: '1px solid #d9d9d9',
                                        padding: '8px 16px',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        background: '#1890ff',
                                        color: 'white',
                                        border: 'none',
                                        padding: '8px 16px',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientesPage;