// frontend/src/pages/ClientesPage.jsx
import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, InputNumber, Space, Card, Tag, Row, Col, message, Tooltip } from 'antd';
import { PlusOutlined, UserOutlined, EnvironmentOutlined, PhoneOutlined, SolutionOutlined, EyeOutlined } from '@ant-design/icons';
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
      message.error('Error al cargar la lista de clientes');
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
      message.error('Error al cargar los destinatarios asociados');
    }
  };

  const handleCrearCliente = async () => {
    try {
      const values = await formCliente.validateFields();
      setLoading(true);
      await createCliente(values);
      message.success('Cliente guardado exitosamente');
      formCliente.resetFields();
      setModalClienteOpen(false);
      cargarClientes();
    } catch (err) {
      console.error(err);
      message.error('Error al crear el cliente');
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
      message.success('Destinatario vinculado exitosamente');
      formDestinatario.resetFields();
      verDestinatarios(clienteSeleccionado);
    } catch (err) {
      console.error(err);
      message.error('Error al registrar el destinatario');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'Cliente (Nombre y Apellidos)', dataIndex: 'nombre_completo', key: 'nombre', render: t => <strong>{t}</strong> },
    { title: 'Teléfono', dataIndex: 'telefono', key: 'telefono', render: t => <><PhoneOutlined /> {t}</> },
    { title: 'Domicilio Miami', dataIndex: 'domicilio', key: 'domicilio' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => (
        <Space>
          <Button type="primary" size="small" icon={<UserOutlined />} onClick={() => verDestinatarios(record)}>
            Gestión Destinatarios
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24, backgroundColor: '#f4f6f9', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 700, color: '#001529' }}>👥 Directorio de Clientes y Destinatarios</h2>
          <p style={{ color: '#666', margin: 0 }}>Administre los clientes remitentes y sus destinatarios vinculados en Cuba.</p>
        </div>
        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setModalClienteOpen(true)} style={{ borderRadius: 6 }}>
          Registrar Nuevo Cliente
        </Button>
      </div>

      <Card style={{ borderRadius: 8 }}>
        <Table columns={columns} dataSource={clientes} rowKey="id" loading={loading} />
      </Card>

      {/* MODAL NUEVO CLIENTE */}
      <Modal
        title="👤 Registrar Cliente (Miami)"
        open={modalClienteOpen}
        onCancel={() => setModalClienteOpen(false)}
        onOk={handleCrearCliente}
        confirmLoading={loading}
        okText="Guardar Cliente"
        cancelText="Cancelar"
      >
        <Form form={formCliente} layout="vertical">
          <Form.Item name="nombre_completo" label="Nombre y Dos Apellidos" rules={[{ required: true, message: 'Ingrese nombre y dos apellidos' }]}>
            <Input placeholder="Ej: Juan Pérez Pérez" />
          </Form.Item>
          <Form.Item name="telefono" label="Teléfono en Miami" rules={[{ required: true, message: 'Teléfono obligatorio' }]}>
            <Input placeholder="+1 (305) 555-0123" />
          </Form.Item>
          <Form.Item name="domicilio" label="Dirección Exacta en Miami">
            <Input placeholder="Ej: 123 Main St, Miami, FL 33101" />
          </Form.Item>
          <Form.Item name="email" label="Correo Electrónico">
            <Input placeholder="cliente@email.com" />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL DESTINATARIOS VINCULADOS */}
      <Modal
        title={`🇨🇺 Destinatarios Vinculados a: ${clienteSeleccionado?.nombre_completo}`}
        open={modalDestinatarioOpen}
        onCancel={() => setModalDestinatarioOpen(false)}
        width={850}
        footer={null}
      >
        <Card title="➕ Agregar Destinatario Vinculado en Holguín / Cuba" size="small" style={{ marginBottom: 16, backgroundColor: '#f0f5ff', borderColor: '#91d5ff' }}>
          <Form form={formDestinatario} layout="vertical" onFinish={handleCrearDestinatario}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="nombre_completo" label="Nombre y Dos Apellidos" rules={[{ required: true, message: 'Requerido' }]}>
                  <Input placeholder="Ej: María García García" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="ci" label="Carnet de Identidad (CI - 11 dígitos)" rules={[{ required: true, len: 11, message: 'Debe tener 11 dígitos' }]}>
                  <Input placeholder="77041919291" maxLength={11} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="domicilio_exacto" label="Dirección Exacta (Calle, No, e/ calles)" rules={[{ required: true }]}>
              <Input placeholder="Calle 12 #45 e/ 3 y 5" />
            </Form.Item>

            <Row gutter={12}>
              <Col span={8}>
                <Form.Item name="provincia" label="Provincia" initialValue="HOL" rules={[{ required: true }]}>
                  <Select style={{ width: '100%' }}>
                    <Option value="HOL">Holguín</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="municipio" label="Municipio" initialValue="HLG" rules={[{ required: true }]}>
                  <Select style={{ width: '100%' }}>
                    <Option value="HLG">Holguín</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="reparto" label="Reparto" rules={[{ required: true, message: 'Seleccione el reparto' }]}>
                  <Select style={{ width: '100%' }} placeholder="Seleccionar Reparto">
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
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="telefono" label="Teléfono Móvil (Primary)" rules={[{ required: true }]}>
                  <Input placeholder="53556701" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="telefono2" label="Teléfono Fijo / Secundario">
                  <Input placeholder="24421234" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="latitud" label="Latitud GPS" initialValue={20.88691871}>
                  <InputNumber step={0.000001} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="longitud" label="Longitud GPS" initialValue={-76.25923043}>
                  <InputNumber step={0.000001} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="referencias" label="Puntos de Referencia">
              <Input placeholder="Punto de gas, casa azul de dos plantas" />
            </Form.Item>

            <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={loading} block style={{ borderRadius: 6 }}>
              Guardar y Vincular Destinatario
            </Button>
          </Form>
        </Card>

        <h3>Destinatarios Registrados:</h3>
        <Table
          dataSource={destinatarios}
          rowKey="id"
          pagination={false}
          columns={[
            { title: 'Nombre Completo', dataIndex: 'nombre_completo', render: t => <strong>{t}</strong> },
            { title: 'CI', dataIndex: 'ci' },
            { title: 'Reparto', dataIndex: 'reparto_display', render: (t, r) => <Tag color="geekblue">{t || r.reparto}</Tag> },
            { title: 'Dirección', dataIndex: 'domicilio_exacto' },
            { title: 'Teléfonos', render: (_, r) => `${r.telefono} ${r.telefono2 ? '/ ' + r.telefono2 : ''}` },
          ]}
        />
      </Modal>
    </div>
  );
};

export default ClientesPage;
