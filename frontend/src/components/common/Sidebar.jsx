/**
 * frontend/src/components/common/Sidebar.jsx
 * Rediseño (solicitud #5): identidad propia de Miami 305 — paleta
 * "Muelle del Caribe", logotipo vectorial original y acento coral en el
 * ítem activo. Navegación y permisos sin cambios funcionales.
 * Corrección #5: "Operaciones Holguín" → "Operaciones Destino" y
 * "Recepción Miami" → "Gestión de Paquetes".
 * Corrección #15: entradas nuevas "Seguimiento de Bultos" y "Registros".
 */
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MARCA, GRADIENTE_AGUA, LogoMiami305 } from '../../brand/Brand';
import {
  DashboardOutlined,
  UserOutlined,
  DropboxOutlined,
  ShoppingOutlined,
  CompassOutlined,
  BarChartOutlined,
  SettingOutlined,
  TeamOutlined,
  FileSearchOutlined,
  ProfileOutlined,
  GlobalOutlined,
} from '@ant-design/icons';

const NOMBRE_ROL = {
  admin: 'Administrador',
  supervisor: 'Supervisor/Gerente',
  empleado: 'Personal Miami',
  holguin: 'Personal Destino (Holguín)',
  cliente: 'Cliente',
};

const Sidebar = () => {
  const { user, permisos } = useAuth();

  // Menú completo; se filtra según los permisos del rol
  const menuItems = [
    { path: '/dashboard', icon: <DashboardOutlined />, label: 'Panel Principal', visible: true },
    { path: '/clientes', icon: <UserOutlined />, label: 'Clientes & Destinatarios', visible: true },
    { path: '/paquetes', icon: <DropboxOutlined />, label: 'Gestión de Paquetes', visible: permisos?.recibirPaquetes },
    { path: '/bultos', icon: <ShoppingOutlined />, label: 'Bultos & Maletines', visible: permisos?.confeccionarBultos },
    { path: '/seguimiento-bultos', icon: <FileSearchOutlined />, label: 'Seguimiento de Bultos', visible: permisos?.verSeguimiento },
    { path: '/holguin', icon: <CompassOutlined />, label: 'Operaciones Destino', visible: permisos?.operarHolguin },
    { path: '/mapa-destinatarios', icon: <GlobalOutlined />, label: 'Mapa de Destinatarios', visible: permisos?.verMapaDestinatarios },
    { path: '/registros', icon: <ProfileOutlined />, label: 'Registros', visible: permisos?.verRegistros },
    { path: '/reportes', icon: <BarChartOutlined />, label: 'Reportes', visible: permisos?.verReportes },
    { path: '/configuracion', icon: <SettingOutlined />, label: 'Configuración', visible: permisos?.gestionarConfiguracion },
    { path: '/usuarios', icon: <TeamOutlined />, label: 'Usuarios del Personal', visible: permisos?.gestionarUsuarios },
  ].filter((item) => item.visible);

  return (
    <div style={{
      width: '260px',
      height: '100vh',
      background: `linear-gradient(180deg, ${MARCA.azulNoche} 0%, ${MARCA.azulPuerto} 100%)`,
      color: 'white',
      position: 'fixed',
      top: 0,
      left: 0,
      padding: '24px 0',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      boxShadow: '4px 0 15px rgba(11,34,57,0.25)'
    }}>
      {/* Brand Header con el logotipo original */}
      <div style={{
        padding: '0 24px 24px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LogoMiami305 tamano={46} />
          <div>
            <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}>
              MIAMI 305
            </h3>
            <span style={{ fontSize: '11px', color: MARCA.turquesa, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1.4px' }}>
              Miami · Holguín
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav style={{ flex: 1, padding: '0 12px', overflowY: 'auto' }}>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '12px 16px',
              margin: '4px 0',
              borderRadius: '10px',
              color: isActive ? '#ffffff' : 'rgba(255,255,255,0.62)',
              background: isActive ? GRADIENTE_AGUA : 'transparent',
              textDecoration: 'none',
              fontWeight: isActive ? '700' : '400',
              fontSize: '14px',
              transition: 'all 0.25s ease',
              boxShadow: isActive ? '0 4px 14px rgba(25,179,166,0.35)' : 'none'
            })}
          >
            <span style={{ fontSize: '18px', display: 'flex' }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Footer */}
      <div style={{
        padding: '16px 20px',
        margin: '0 12px',
        borderRadius: '10px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.07)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
              👤 {user?.nombre_completo || user?.username || 'Operador'}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
              {NOMBRE_ROL[user?.rol] || 'Agente'}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Sidebar;
