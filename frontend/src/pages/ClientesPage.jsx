// frontend/src/pages/ClientesPage.jsx
import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, InputNumber, Space, Card, Tag, message } from 'antd';
import { PlusOutlined, UserOutlined, EnvironmentOutlined, PhoneOutlined, SolutionOutlined } from '@ant-design/icons';
import { getClientes, createCliente, deleteCliente, getDestinatariosPorCliente } from '../api/apiService';
import api from '../api/apiService';

const { Option } = Select;

const ClientesPage = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalClienteOpen, setModalClienteOpen] = useState(false);
  const [modalDestinatarioOpen, setModalDestinatarioOpen] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [destinatarios, setDestinatarios] = useState([]);

  const [formCliente] = Form.useForm();
  const [formDestinatario] = Form.useForm();

  useEffect(() => {
    cargarClientes();
  }, [searchTerm]);

  const cargarClientes = async () => {
    setLoading(true);
    try {
      const res = await getClientes(searchTerm);
      setClientes(res.results || res || []);
    } catch (err) {
      console.error(err);
      message.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const verDestinatarios = async (cliente) => {
    setClienteSeleccionado(cliente);
    try {
      const res = await getDestinatariosPorCliente(cliente.id);
      setDestinatarios(res || []);
      setModalDestinatarioOpen(true);
    } catch (err) {
      console.error(err);
      message.error('Error al cargar destinatarios');
    }
  };

  const handleCrearCliente = async () => {
    try {
      const values = await formCliente.validateFields();
      setLoading(true);
      await createCliente(values);
      message.success('Cliente registrado exitosamente');
      formCliente.resetFields();
      setModalClienteOpen(false);
      cargarClientes();
    } catch (err) {
      console.error(err);
      message.error('Error al guardar cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleCrearDestinatario = async () => {
    try {
      const values = await formDestinatario.validateFields();
      setLoading(true);

      const payload = {
        cliente: clienteSeleccionado.id,
        ...values
      };

      await api.post('/destinatarios/', payload);
      message.success('Destinatario vinculado con éxito');
      formDestinatario.resetFields();
      verDestinatarios(clienteSeleccionado);
    } catch (err) {
      console.error(err);
      message.error('Error al vincular destinatario');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'Cliente (Nombre y Apellidos)', dataIndex: 'nombre_completo', key: 'nombre', render: t => <strong>{t}</strong> },
    { title: 'Teléfono', dataIndex: 'telefono', key: 'telefono' },
    { title: 'Domicilio Miami', dataIndex: 'domicilio', key: 'domicilio' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => (
        <Space>
          <Button type="primary" size="small" icon={<UserOutlined />} onClick={() => verDestinatarios(record)}>
            Ver/Agregar Destinatarios
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>👥 Gestión de Clientes y Destinatarios Vinculados</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalClienteOpen(true)}>
          Nuevo Cliente
        </Button>
      </div>

      <Table columns={columns} dataSource={clientes} rowKey="id" loading={loading} />

      {/* MODAL NUEVO CLIENTE */}
      <Modal
        title="👤 Registrar Nuevo Cliente (Miami)"
        open={modalClienteOpen}
        onCancel={() => setModalClienteOpen(false)}
        onOk={handleCrearCliente}
        confirmLoading={loading}
      >
        <Form form={formCliente} layout="vertical">
          <Form.Item name="nombre_completo" label="Nombre y Dos Apellidos" rules={[{ required: true, message: 'Ej: Juan Pérez Pérez' }]}>
            <Input placeholder="Ej: Juan Pérez Pérez" />
          </Form.Item>
          <Form.Item name="telefono" label="Teléfono de Contacto" rules={[{ required: true }]}>
            <Input placeholder="+1 305-555-0123" />
          </Form.Item>
          <Form.Item name="domicilio" label="Domicilio Exacto en Miami">
            <Input placeholder="123 Main St, Miami, FL 33101" />
          </Form.Item>
          <Form.Item name="email" label="Correo Electrónico">
            <Input placeholder="cliente@email.com" />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL DESTINATARIOS VINCULADOS */}
      <Modal
        title={`🇨🇺 Destinatarios de ${clienteSeleccionado?.nombre_completo}`}
        open={modalDestinatarioOpen}
        onCancel={() => setModalDestinatarioOpen(false)}
        width={800}
        footer={null}
      >
        <Card title="Agregar Nuevo Destinatario Vinculado" size="small" style={{ marginBottom: 16, backgroundColor: '#f9f9f9' }}>
          <Form form={formDestinatario} layout="vertical" onFinish={handleCrearDestinatario}>
            <Form.Item name="nombre_completo" label="Nombre y Dos Apellidos" rules={[{ required: true }]}>
              <Input placeholder="Ej: María García García" />
            </Form.Item>
            <Form.Item name="ci" label="Carnet de Identidad (CI - 11 dígitos)" rules={[{ required: true, len: 11, message: 'Debe tener 11 dígitos' }]}>
              <Input placeholder="77041919291" maxLength={11} />
            </Form.Item>
            <Form.Item name="domicilio_exacto" label="Dirección Exacta (Calle, No, e/ calles)" rules={[{ required: true }]}>
              <Input placeholder="Calle 12 #45 e/ 3 y 5" />
            </Form.Item>
            <Space style={{ width: '100%' }}>
              <Form.Item name="provincia" label="Provincia" initialValue="HOL" rules={[{ required: true }]}>
                <Select style={{ width: 150 }}>
                  <Option value="HOL">Holguín</Option>
                </Select>
              </Form.Item>
              <Form.Item name="municipio" label="Municipio" initialValue="HLG" rules={[{ required: true }]}>
                <Select style={{ width: 150 }}>
                  <Option value="HLG">Holguín</Option>
                </Select>
              </Form.Item>
              <Form.Item name="reparto" label="Reparto" rules={[{ required: true }]}>
                <Select style={{ width: 200 }} placeholder="Seleccionar Reparto">
                  <Option value="VAL">Vista Alegre</Option>
                  <Option value="PBL">Piedra Blanca</Option>
                  <Option value="HAR">Harlem</Option>
                  <Option value="LEN">Lenin</Option>
                  <Option value="PAR">Parera</Option>
                  <Option value="CJA">Ciudad Jardin</Option>
                  <Option value="ELL">El Llano</Option>
                  <Option value="API">Alcides Pino</Option>
                  <Option value="PER">Peralta</Option>
                  <Option value="LIB">Libertad</Option>
                  <Option value="PNU">Pueblo Nuevo</Option>
                  <Option value="CC">Centro Ciudad</Option>
                </Select>
              </Form.Item>
            </Space>
            <Space style={{ width: '100%' }}>
              <Form.Item name="telefono" label="Teléfono Primario (móvil/fijo)" rules={[{ required: true }]}>
                <Input placeholder="53556701" />
              </Form.Item>
              <Form.Item name="telefono2" label="Teléfono Secundario">
                <Input placeholder="24421234" />
              </Form.Item>
            </Space>
            <Space style={{ width: '100%' }}>
              <Form.Item name="latitud" label="Latitud GPS" initialValue={20.88691871}>
                <InputNumber step={0.000001} style={{ width: 180 }} />
              </Form.Item>
              <Form.Item name="longitud" label="Longitud GPS" initialValue={-76.25923043}>
                <InputNumber step={0.000001} style={{ width: 180 }} />
              </Form.Item>
            </Space>
            <Form.Item name="referencias" label="Referencias de Dirección">
              <Input placeholder="Cerca del punto de gas, casa azul de dos plantas" />
            </Form.Item>
            <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={loading}>
              Guardar y Vincular Destinatario
            </Button>
          </Form>
        </Card>

        <h3>Destinatarios Actuales:</h3>
        <Table
          dataSource={destinatarios}
          rowKey="id"
          pagination={false}
          columns={[
            { title: 'Nombre', dataIndex: 'nombre_completo' },
            { title: 'CI', dataIndex: 'ci' },
            { title: 'Reparto', dataIndex: 'reparto_display', render: (t, r) => t || r.reparto },
            { title: 'Dirección', dataIndex: 'domicilio_exacto' },
            { title: 'Teléfonos', render: (_, r) => `${r.telefono} ${r.telefono2 ? '/ ' + r.telefono2 : ''}` },
          ]}
        />
      </Modal>
    </div>
  );
};

export default ClientesPage;
