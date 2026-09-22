/**
 * frontend/src/pages/LoginPage.jsx
 * Ubicación: Miami305/frontend/src/pages/LoginPage.jsx
 * 
 * DESCRIPCIÓN:
 * Página de inicio de sesión.
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hogarPorRol } from '../components/common/RoleRoute';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login(username, password);
            
            if (result && result.success) {
                // Cada rol aterriza en su panel propio (Holguín → /holguin)
                navigate(hogarPorRol(result.user), { replace: true });
            } else {
                setError(result?.error || 'Credenciales inválidas');
            }
        } catch (err) {
            console.error('❌ Error en login:', err);
            setError('Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
            <div style={{
                background: 'white',
                padding: '40px',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                width: '100%',
                maxWidth: '400px'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <h1 style={{ fontSize: '32px', marginBottom: '4px', color: '#001529' }}>
                        🚀 Miami305
                    </h1>
                    <p style={{ color: '#666', fontSize: '14px' }}>
                        Sistema de Gestión de Envíos
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: '#fff2f0',
                        color: '#ff4d4f',
                        padding: '12px',
                        borderRadius: '4px',
                        marginBottom: '16px',
                        border: '1px solid #ffccc7'
                    }}>
                        ❌ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ 
                            display: 'block', 
                            marginBottom: '4px', 
                            fontWeight: '500',
                            fontSize: '14px'
                        }}>
                            Usuario
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Ingresa tu usuario"
                            autoComplete="username"
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid #d9d9d9',
                                borderRadius: '4px',
                                fontSize: '16px',
                                transition: 'border-color 0.3s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#1890ff'}
                            onBlur={(e) => e.target.style.borderColor = '#d9d9d9'}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ 
                            display: 'block', 
                            marginBottom: '4px', 
                            fontWeight: '500',
                            fontSize: '14px'
                        }}>
                            Contraseña
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Ingresa tu contraseña"
                            autoComplete="current-password"
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid #d9d9d9',
                                borderRadius: '4px',
                                fontSize: '16px',
                                transition: 'border-color 0.3s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#1890ff'}
                            onBlur={(e) => e.target.style.borderColor = '#d9d9d9'}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: loading ? '#d9d9d9' : '#1890ff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '16px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s',
                            fontWeight: '500'
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) e.target.style.background = '#40a9ff';
                        }}
                        onMouseLeave={(e) => {
                            if (!loading) e.target.style.background = '#1890ff';
                        }}
                    >
                        {loading ? '🔄 Iniciando sesión...' : 'Iniciar Sesión'}
                    </button>
                </form>

                {/* Acceso público al localizador de paquetes */}
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <Link
                        to="/tracking"
                        style={{
                            color: '#1890ff',
                            fontSize: '14px',
                            fontWeight: '500',
                            textDecoration: 'none',
                        }}
                        onMouseEnter={(e) => (e.target.style.textDecoration = 'underline')}
                        onMouseLeave={(e) => (e.target.style.textDecoration = 'none')}
                    >
                        📦 ¿Solo quieres rastrear tu paquete? Localizador público →
                    </Link>
                </div>

                {/* Botón de debug (opcional) */}
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <button
                        type="button"
                        onClick={() => {
                            console.log('🔍 Estado del localStorage:');
                            console.log('  token:', localStorage.getItem('access_token'));
                            console.log('  user:', localStorage.getItem('user'));
                        }}
                        style={{
                            background: 'transparent',
                            border: '1px solid #d9d9d9',
                            padding: '4px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: '#666'
                        }}
                    >
                        🔍 Debug
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;