// frontend/src/pages/ConfiguracionPage.jsx
// Ubicación: Miami305/frontend/src/pages/ConfiguracionPage.jsx
//
// DESCRIPCIÓN:
// Panel de configuración para administradores y supervisores:
//  - Categorías: crear/editar/desactivar y su precio por kg
//  - Provincias: costo fijo de envío por provincia
// Estos valores son los que usa el calculador de tarifas de cada paquete.

import React, { useCallback, useEffect, useState } from 'react';
import {
  Tabs, Table, Button, Modal, Form, Input, InputNumber, Switch,
  Space, message, Popconfirm, Tag, Card,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
} from '@ant-design/icons';
import {
  getCategoriasConfig, createCategoria, updateCategoria, deleteCategoria,
  getProvincias, updateProvincia, sembrarProvincias,
} from '../api/apiService';

const dinero = (valor) => `$${Number(valor ?? 0).toFixed(2)}`;

// ==========================================
// TAB: CATEGORÍAS
// ==========================================
const CategoriasTab = () => {
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form] = Form.useForm();

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setCategorias(await getCategoriasConfig());
    } catch (e) {
      message.error('No se pudieron cargar las categorías');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirModal = (categoria = null) => {
    setEditando(categoria);
    form.setFieldsValue(
      categoria
        ? { nombre: categoria.nombre, precio_por_kg: Number(categoria.precio_por_kg) }
        : { nombre: '', precio_por_kg: 5 }
    );
    setModalAbierto(true);
  };

  const guardar = async () => {
    try {
      const valores = await form.validateFields();
      if (editando) {
        await updateCategoria(editando.id, valores);
        message.success('Categoría actualizada');
      } else {
        await createCategoria(valores);
        message.success('Categoría creada');
      }
      setModalAbierto(false);
      cargar();
    } catch (e) {
      if (e?.errorFields) return; // validación del formulario
      message.error(e?.response?.data?.error || 'No se pudo guardar la categoría');
    }
  };

  const eliminar = async (categoria) => {
    try {
      const resp = await deleteCategoria(categoria.id);
      if (resp?.desactivada) {
        message.warning(resp.detalle || 'Categoría desactivada (tiene paquetes asociados)');
      } else {
        message.success('Categoría eliminada');
      }
      cargar();
    } catch (e) {
      message.error(e?.response?.data?.error || 'No se pudo eliminar');
    }
  };

  const columnas = [
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', render: (t) => <strong>{t}</strong> },
    {
      title: 'Precio por kg',
      dataIndex: 'precio_por_kg',
      key: 'precio',
      render: (v) => dinero(v),
    },
    {
      title: 'Estado',
      dataIndex: 'activo',
      key: 'activo',
      render: (activo) => (activo
        ? <Tag color="green">Activa</Tag>
        : <Tag color="default">Inactiva</Tag>),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, cat) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => abrirModal(cat)}>
            Editar
          </Button>
          <Popconfirm
            title="¿Eliminar esta categoría?"
            description="Si tiene paquetes asociados se desactivará."
            onConfirm={() => eliminar(cat)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>Eliminar</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#666' }}>
          El precio por kg se multiplica por el peso declarado de cada categoría del paquete.
        </span>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={cargar}>Refrescar</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => abrirModal()}>
            Nueva Categoría
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columnas}
        dataSource={categorias}
        loading={cargando}
        pagination={false}
        size="middle"
      />

      <Modal
        title={editando ? `Editar: ${editando.nombre}` : 'Nueva Categoría'}
        open={modalAbierto}
        onOk={guardar}
        onCancel={() => setModalAbierto(false)}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="nombre"
            label="Nombre de la categoría"
            rules={[{ required: true, message: 'Indica el nombre' }]}
          >
            <Input placeholder="Ej: Alimentos, Medicamentos, Ropa..." />
          </Form.Item>
          <Form.Item
            name="precio_por_kg"
            label="Precio por kg ($)"
            rules={[{ required: true, message: 'Indica el precio' }]}
          >
            <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// ==========================================
// TAB: PROVINCIAS (tarifa fija de envío)
// ==========================================
const ProvinciasTab = () => {
  const [provincias, setProvincias] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form] = Form.useForm();

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setProvincias(await getProvincias());
    } catch (e) {
      message.error('No se pudieron cargar las provincias');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const sembrar = async () => {
    try {
      const resp = await sembrarProvincias();
      message.success(resp.creadas ? `Provincias creadas: ${resp.creadas}` : 'Ya están todas cargadas');
      cargar();
    } catch (e) {
      message.error(e?.response?.data?.error || 'No se pudieron crear las provincias');
    }
  };

  const guardar = async () => {
    try {
      const valores = await form.validateFields();
      await updateProvincia(editando.id, valores);
      message.success(`Tarifa de ${editando.nombre} actualizada`);
      setEditando(null);
      cargar();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.error || 'No se pudo actualizar la tarifa');
    }
  };

  const columnas = [
    { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 90 },
    { title: 'Provincia', dataIndex: 'nombre', key: 'nombre', render: (t) => <strong>{t}</strong> },
    {
      title: 'Costo de envío fijo',
      dataIndex: 'costo_envio',
      key: 'costo',
      render: (v) => dinero(v),
    },
    {
      title: 'Estado',
      dataIndex: 'activo',
      key: 'activo',
      render: (activo) => (activo
        ? <Tag color="green">Activa</Tag>
        : <Tag color="default">Inactiva</Tag>),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, prov) => (
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => {
            setEditando(prov);
            form.setFieldsValue({
              costo_envio: Number(prov.costo_envio),
              activo: prov.activo,
            });
          }}
        >
          Editar tarifa
        </Button>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#666' }}>
          Este costo fijo se suma a la tarifa base por peso de cada paquete enviado a la provincia.
        </span>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={cargar}>Refrescar</Button>
          <Button onClick={sembrar}>Cargar provincias de Cuba</Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columnas}
        dataSource={provincias}
        loading={cargando}
        pagination={false}
        size="middle"
      />

      <Modal
        title={`Tarifa de envío: ${editando?.nombre || ''}`}
        open={!!editando}
        onOk={guardar}
        onCancel={() => setEditando(null)}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="costo_envio"
            label="Costo fijo de envío ($)"
            rules={[{ required: true, message: 'Indica el costo' }]}
          >
            <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="activo" label="Provincia activa" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// ==========================================
// PÁGINA
// ==========================================
const ConfiguracionPage = () => (
  <div>
    <h1 style={{ marginBottom: 4 }}>⚙️ Configuración</h1>
    <p style={{ color: '#666', marginBottom: 24 }}>
      Administra las categorías y tarifas que se aplican al calcular cada factura.
      Solo administradores y supervisores pueden modificar estos valores.
    </p>

    <Card>
      <Tabs
        defaultActiveKey="categorias"
        items={[
          {
            key: 'categorias',
            label: '🏷️ Categorías y precio por kg',
            children: <CategoriasTab />,
          },
          {
            key: 'provincias',
            label: '🗺️ Tarifas por provincia',
            children: <ProvinciasTab />,
          },
        ]}
      />
    </Card>
  </div>
);

export default ConfiguracionPage;
