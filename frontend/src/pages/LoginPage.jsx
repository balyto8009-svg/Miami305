/**
 * frontend/src/pages/LoginPage.jsx
 * Ubicación: Miami305/frontend/src/pages/LoginPage.jsx
 *
 * DESCRIPCIÓN:
 * Página de inicio de sesión. Rediseño (solicitud #5): pantalla de acceso
 * con la identidad propia de Miami 305 — fondo del estrecho (gradiente
 * azul puerto), logotipo vectorial original y tarjeta arena.
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hogarPorRol } from '../components/common/RoleRoute';
import { MARCA, GRADIENTE_MARCA, GRADIENTE_ATARDECER, LogoMiami305 } from '../brand/Brand';

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
            background: GRADIENTE_MARCA,
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Olas decorativas de fondo (SVG original) */}
            <svg
                viewBox="0 0 1440 320"
                preserveAspectRatio="none"
                style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '38%', opacity: 0.25 }}
            >
                <path
                    d="M0,192 C240,96 480,96 720,160 C960,224 1200,224 1440,128 L1440,320 L0,320 Z"
                    fill={MARCA.turquesa}
                />
                <path
                    d="M0,256 C240,192 480,192 720,224 C960,256 1200,256 1440,192 L1440,320 L0,320 Z"
                    fill={MARCA.azulStereo}
                />
            </svg>
            <svg
                viewBox="0 0 1440 320"
                preserveAspectRatio="none"
                style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '24%', opacity: 0.5 }}
            >
                <path
                    d="M0,224 C240,160 480,160 720,192 C960,224 1200,224 1440,160 L1440,320 L0,320 Z"
                    fill={MARCA.azulNoche}
                />
            </svg>

            <div style={{
                background: MARCA.arena,
                padding: '40px',
                borderRadius: '18px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
                width: '100%',
                maxWidth: '410px',
                borderTop: `6px solid ${MARCA.coral}`,
                position: 'relative',
                zIndex: 1,
            }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                        <LogoMiami305 tamano={72} />
                    </div>
                    <h1 style={{ fontSize: '28px', marginBottom: '2px', color: MARCA.azulNoche, fontWeight: 800, letterSpacing: 0.5 }}>
                        MIAMI 305
                    </h1>
                    <p style={{ color: MARCA.azulStereo, fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2 }}>
                        Envíos Miami · Holguín
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: '#fff2f0',
                        color: '#ff4d4f',
                        padding: '12px',
                        borderRadius: '8px',
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
                            fontWeight: 600,
                            fontSize: '14px',
                            color: MARCA.tinta
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
                                borderRadius: '8px',
                                fontSize: '16px',
                                transition: 'border-color 0.3s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = MARCA.turquesa}
                            onBlur={(e) => e.target.style.borderColor = '#d9d9d9'}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '4px',
                            fontWeight: 600,
                            fontSize: '14px',
                            color: MARCA.tinta
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
                                borderRadius: '8px',
                                fontSize: '16px',
                                transition: 'border-color 0.3s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = MARCA.turquesa}
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
                            background: GRADIENTE_ATARDECER,
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 700,
                            cursor: loading ? 'wait' : 'pointer',
                            boxShadow: '0 6px 16px rgba(255,107,87,0.4)',
                            letterSpacing: 0.3,
                        }}
                    >
                        {loading ? 'Ingresando…' : 'Iniciar sesión'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: 18 }}>
                    <Link to="/tracking" style={{ color: MARCA.azulStereo, fontSize: 13, fontWeight: 600 }}>
                        📦 ¿Tienes un paquete? Rastrear sin cuenta →
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
