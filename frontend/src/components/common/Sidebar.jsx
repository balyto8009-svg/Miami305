/**
 * frontend/src/components/common/Sidebar.jsx
 */
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  DashboardOutlined,
  UserOutlined,
  DropboxOutlined,
  ShoppingOutlined,
  CompassOutlined,
  BarChartOutlined,
  LogoutOutlined,
  SendOutlined
} from '@ant-design/icons';

const Sidebar = () => {
  const { user, logout } = useAuth();

  const menuItems = [
    { path: '/dashboard', icon: <DashboardOutlined />, label: 'Panel Principal' },
    { path: '/clientes', icon: <UserOutlined />, label: 'Clientes & Destinatarios' },
    { path: '/paquetes', icon: <DropboxOutlined />, label: 'Recepción Miami' },
    { path: '/bultos', icon: <ShoppingOutlined />, label: 'Bultos & Maletines' },
    { path: '/holguin', icon: <CompassOutlined />, label: 'Operaciones Holguín' },
    { path: '/reportes', icon: <BarChartOutlined />, label: 'Reportes' },
  ];

  return (
    <div style={{
      width: '260px',
      height: '100vh',
      background: 'linear-gradient(180deg, #001529 0%, #002140 100%)',
      color: 'white',
      position: 'fixed',
      top: 0,
      left: 0,
      padding: '24px 0',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      boxShadow: '4px 0 15px rgba(0,0,0,0.1)'
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '0 24px 24px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            boxShadow: '0 4px 10px rgba(24,144,255,0.3)'
          }}>
            ✈️
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#fff', letterSpacing: '0.5px' }}>
              MIAMI 305
            </h3>
            <span style={{ fontSize: '11px', color: '#1890ff', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '1px' }}>
              Agencia de Envíos
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav style={{ flex: 1, padding: '0 12px' }}>
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
              borderRadius: '8px',
              color: isActive ? '#ffffff' : 'rgba(255,255,255,0.65)',
              background: isActive ? 'linear-gradient(90deg, #1890ff 0%, #096dd9 100%)' : 'transparent',
              textDecoration: 'none',
              fontWeight: isActive ? '600' : '400',
              fontSize: '14px',
              transition: 'all 0.25s ease',
              boxShadow: isActive ? '0 4px 12px rgba(24,144,255,0.25)' : 'none'
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
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>
              👤 {user?.nombre_completo || user?.username || 'Operador'}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>
              {user?.rol || 'Agente Miami'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
