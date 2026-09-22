// frontend/src/pages/UsuariosPage.jsx
// Ubicación: Miami305/frontend/src/pages/UsuariosPage.jsx
//
// DESCRIPCIÓN:
// Gestión de usuarios del personal (solo admin/supervisor):
// crear, editar, desactivar/eliminar y restablecer contraseñas.
// Los clientes reales no inician sesión: no se gestionan aquí.

import React, { useCallback, useEffect, useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Switch, Space, Tag,
  message, Popconfirm,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, KeyOutlined,
} from '@ant-design/icons';
import {
  getUsuarios, createUsuario, updateUsuario, deleteUsuario,
} from '../api/apiService';

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'supervisor', label: 'Supervisor/Gerente' },
  { value: 'empleado', label: 'Personal Miami' },
  { value: 'holguin', label: 'Personal Holguín' },
];

const COLOR_ROL = {
  admin: 'red',
  supervisor: 'gold',
  empleado: 'geekblue',
  holguin: 'green',
};

const UsuariosPage = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form] = Form.useForm();

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUsuarios();
      setUsuarios(Array.isArray(data) ? data : data.results || []);
    } catch (e) {
      message.error('No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirModal = (usuario = null) => {
    setEditando(usuario);
    form.setFieldsValue(
      usuario
        ? {
            username: usuario.username,
            first_name: usuario.first_name || '',
            last_name: usuario.last_name || '',
            email: usuario.email || '',
            telefono: usuario.telefono || '',
            rol: usuario.rol,
            is_active: usuario.is_active,
            password: '',
          }
        : { username: '', first_name: '', last_name: '', email: '', telefono: '', rol: 'empleado', is_active: true, password: '' }
    );
    setModalAbierto(true);
  };

  const guardar = async () => {
    try {
      const valores = await form.validateFields();
      if (editando) {
        const { password, ...resto } = valores;
        const payload = { ...resto };
        if (password) payload.password = password; // solo si se cambió
        await updateUsuario(editando.id, payload);
        message.success('Usuario actualizado');
      } else {
        await createUsuario(valores);
        message.success('Usuario creado');
      }
      setModalAbierto(false);
      cargar();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.error || 'No se pudo guardar el usuario');
    }
  };

  const eliminar = async (usuario) => {
    try {
      const resp = await deleteUsuario(usuario.id);
      if (resp?.desactivado) {
        message.warning(resp.detalle || 'Usuario desactivado (tiene registros asociados)');
      } else {
        message.success('Usuario eliminado');
      }
      cargar();
    } catch (e) {
      message.error(e?.response?.data?.error || 'No se pudo eliminar el usuario');
    }
  };

  const filtrados = usuarios.filter((u) => {
    const texto = `${u.username} ${u.nombre_completo} ${u.rol_display}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase());
  });

  const columnas = [
    {
      title: 'Usuario',
      dataIndex: 'username',
      key: 'username',
      render: (t, u) => (
        <div>
          <strong>{t}</strong>
          <div style={{ fontSize: 12, color: '#999' }}>{u.nombre_completo}</div>
        </div>
      ),
    },
    { title: 'Teléfono', dataIndex: 'telefono', key: 'telefono', render: (t) => t || '-' },
    {
      title: 'Rol',
      dataIndex: 'rol',
      key: 'rol',
      render: (rol, u) => (
        <Space>
          <Tag color={COLOR_ROL[rol] || 'default'}>{u.rol_display}</Tag>
          {u.is_superuser && <Tag color="purple">Superusuario</Tag>}
        </Space>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (activo) => (activo
        ? <Tag color="green">Activo</Tag>
        : <Tag color="default">Inactivo</Tag>),
    },
    {
      title: 'Último acceso',
      dataIndex: 'ultimo_acceso',
      key: 'ultimo_acceso',
      render: (f) => (f ? new Date(f).toLocaleString('es-ES') : 'Nunca'),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, u) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => abrirModal(u)}>
            Editar
          </Button>
          <Popconfirm
            title={u.is_active ? '¿Eliminar este usuario?' : '¿Eliminar definitivamente?'}
            description={u.is_active
              ? 'Si tiene registros asociados será desactivado.'
              : 'Este usuario ya está inactivo; se eliminará si no tiene registros.'}
            onConfirm={() => eliminar(u)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>Eliminar</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 700, color: '#001529' }}>🧑‍💼 Usuarios del Personal</h2>
          <p style={{ color: '#666', margin: 0 }}>
            Cree cuentas para el personal de Miami y Holguín. Cada rol define qué puede ver y hacer.
          </p>
        </div>
        <Space>
          <Input.Search
            placeholder="Buscar usuario, nombre o rol..."
            allowClear
            style={{ width: 260 }}
            onSearch={setBusqueda}
            onChange={(e) => !e.target.value && setBusqueda('')}
          />
          <Button icon={<ReloadOutlined />} onClick={cargar}>Refrescar</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => abrirModal()}>
            Nuevo Usuario
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columnas}
        dataSource={filtrados}
        loading={loading}
        pagination={false}
        size="middle"
      />

      <Modal
        title={editando ? `Editar usuario: ${editando.username}` : 'Nuevo usuario del personal'}
        open={modalAbierto}
        onOk={guardar}
        onCancel={() => setModalAbierto(false)}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="username"
            label="Nombre de usuario"
            rules={[{ required: true, message: 'Indique el nombre de usuario' }]}
          >
            <Input placeholder="Ej: juan.perez" autoComplete="off" />
          </Form.Item>

          <Form.Item
            name="password"
            label={editando ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
            rules={editando ? [] : [{ required: true, min: 6, message: 'Mínimo 6 caracteres' }]}
          >
            <Input.Password
              placeholder={editando ? 'Sin cambios' : 'Mínimo 6 caracteres'}
              autoComplete="new-password"
              prefix={<KeyOutlined />}
            />
          </Form.Item>

          <Form.Item name="rol" label="Rol del usuario" rules={[{ required: true }]}>
            <Select options={ROLES} placeholder="Seleccionar rol" />
          </Form.Item>

          <Form.Item name="is_active" label="Cuenta activa" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="first_name" label="Nombre">
            <Input placeholder="Juan" />
          </Form.Item>
          <Form.Item name="last_name" label="Apellidos">
            <Input placeholder="Pérez Pérez" />
          </Form.Item>
          <Form.Item name="email" label="Correo electrónico">
            <Input placeholder="juan@miami305.com" />
          </Form.Item>
          <Form.Item name="telefono" label="Teléfono">
            <Input placeholder="+1 (305) 555-0123" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UsuariosPage;
