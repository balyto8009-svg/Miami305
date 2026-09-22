// frontend/src/pages/ClientesPage.jsx
import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Space, Card, Tag, Row, Col, message, Popconfirm } from 'antd';
import { PlusOutlined, UserOutlined, PhoneOutlined, DeleteOutlined, EditOutlined, EnvironmentOutlined } from '@ant-design/icons';
import MapaSoloLectura from '../components/common/MapaDestinatario';
import {
  getClientes, createCliente, updateCliente, deleteCliente,
  getDestinatariosPorCliente, createDestinatario, updateDestinatario, deleteDestinatario,
} from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import MapaUbicacion from '../components/common/MapaUbicacion';

const { Option } = Select;

// Catálogo completo de provincias de Cuba (el backend valida contra su lista).
// Holguín va primero porque es la operación principal y queda por defecto.
const PROVINCIAS_CUBA = [
  ['HOL', 'Holguín'],
  ['PRI', 'Pinar del Río'], ['ART', 'Artemisa'], ['MAY', 'Mayabeque'],
  ['HAB', 'La Habana'], ['MTZ', 'Matanzas'], ['CFG', 'Cienfuegos'],
  ['VCL', 'Villa Clara'], ['SSP', 'Sancti Spíritus'], ['CAV', 'Ciego de Ávila'],
  ['CMG', 'Camagüey'], ['LTU', 'Las Tunas'], ['GRM', 'Granma'],
  ['SCU', 'Santiago de Cuba'], ['GTM', 'Guantánamo'], ['IJV', 'Isla de la Juventud'],
];

// Municipios de la provincia Holguín (el backend también los valida)
const MUNICIPIOS_HOLGUIN = [
  ['HLG', 'Holguín'], ['MAR', 'Mayarí'], ['CUT', 'Cueto'], ['BAN', 'Banes'],
  ['ANT', 'Antilla'], ['CGA', 'Calixto Garcia'], ['CAC', 'Cacocum'],
  ['GIB', 'Gibara'], ['BAG', 'Baguano'], ['MOA', 'Moa'],
  ['STA', 'Sagua de Tánamo'], ['UNO', 'Urbano Noris'], ['FPA', 'Frank Pais'],
];

// Repartos del municipio Holguín (igual que el backend)
const REPARTOS = [
  ['VAL', 'Vista Alegre'], ['PBL', 'Piedra Blanca'], ['HAR', 'Harlem'], ['LEN', 'Lenin'],
  ['PAR', 'Parera'], ['CJA', 'Ciudad Jardin'], ['ELL', 'El Llano'], ['NLL', 'Nuevo Llano'],
  ['API', 'Alcides Pino'], ['LGU', 'Los Guillenes'], ['LLI', 'Los Lirios'], ['ZAY', 'Zayas'],
  ['LQU', 'La Quinta'], ['SNF', 'Dagoberto Sanfield'], ['PER', 'Peralta'], ['LIB', 'Libertad'],
  ['PNU', 'Pueblo Nuevo'], ['VN1', 'Villa Nueva'], ['VN2', 'Villa Nueva 2'], ['HTO', 'Hilda Torres'],
  ['26J', '26 de Julio'], ['RQU', 'Ramon Quintana'], ['EBA', 'Emilio Barsenas'], ['SAN', 'Santiesteban'],
  ['LAD', 'La Aduana'], ['NHO', 'Nuevo Holguin'], ['PDC', 'Pedro Diaz Coello'], ['HAG', 'Hermanos Aguilera'],
  ['PIT', 'Pitaluga'], ['MAB', 'Mayabe'], ['CMA', 'El Cayo de Mayabe'], ['SRA', 'San Rafael'],
  ['LBI', 'Las Biajacas'], ['SAR', 'Sao Arriba'], ['ACL', 'Aguas Claras'], ['EPA', 'El Paraiso'],
  ['SAD', 'San Andres'], ['LUZ', 'Luz'], ['CC', 'Centro Ciudad'], ['JD', 'Jose Diaz'],
  ['SSA', 'Salida San Andres'], ['EP', 'Edecio Perez'], ['YAR', 'Yareyal'], ['ELC', 'El Coco'],
  ['GUI', 'Guirabo'], ['18S', '18 de Septiembre'], ['AU', 'Alex Urquiola'], ['IBE', 'Iberoamericano'],
];

/**
 * Conecta el mapa interactivo con el formulario de destinatario:
 * sincroniza los campos latitud/longitud al hacer clic o arrastrar el marcador.
 */
const MapaDestinatario = ({ form }) => {
  const lat = Form.useWatch('latitud', form);
  const lng = Form.useWatch('longitud', form);

  return (
    <MapaUbicacion
      latitud={lat ?? 20.88691871}
      longitud={lng ?? -76.25923043}
      onChange={(newLat, newLng) => {
        form.setFieldsValue({ latitud: newLat, longitud: newLng });
      }}
      altura={280}
    />
  );
};

/**
 * Formulario de destinatario reutilizado por el modo CREAR (modal de
 * destinatarios vinculados) y el modo EDITAR. Solo renderiza los campos;
 * el <Form> lo envuelve quien lo usa.
 */
const FormularioDestinatario = ({ form }) => {
  // Corrección #3: provincia seleccionable entre todas las activas; al elegir
  // Holguín se muestran sus municipios. Sin autocomplete del navegador (#4).
  const provincia = Form.useWatch('provincia', form);

  return (
    <>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="nombre_completo" label="Nombre y Dos Apellidos" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Ej: María García García" autoComplete="off" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="ci" label="Carnet de Identidad (CI - 11 dígitos)" rules={[{ required: true, len: 11, message: 'Debe tener 11 dígitos' }]}>
            <Input placeholder="77041919291" maxLength={11} autoComplete="off" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="domicilio_exacto" label="Dirección Exacta (Calle, No, e/ calles)" rules={[{ required: true }]}>
        <Input placeholder="Calle 12 #45 e/ 3 y 5" autoComplete="off" />
      </Form.Item>

      <Row gutter={12}>
        <Col span={8}>
          <Form.Item name="provincia" label="Provincia" initialValue="HOL" rules={[{ required: true }]}>
            <Select
              style={{ width: '100%' }}
              onChange={(valor) => {
                // Al salir de Holguín el reparto ya no aplica
                if (valor !== 'HOL') form.setFieldsValue({ reparto: undefined });
              }}
            >
              {PROVINCIAS_CUBA.map(([codigo, nombre]) => (
                <Option key={codigo} value={codigo}>{nombre}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="municipio" label="Municipio" initialValue="HLG" rules={[{ required: true }]}>
            <Select showSearch style={{ width: '100%' }} optionFilterProp="children">
              {MUNICIPIOS_HOLGUIN.map(([codigo, nombre]) => (
                <Option key={codigo} value={codigo}>{nombre}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="reparto" label="Reparto (solo Holguín)">
            <Select
              showSearch
              style={{ width: '100%' }}
              placeholder="Seleccionar Reparto"
              allowClear
              optionFilterProp="children"
              disabled={provincia && provincia !== 'HOL'}
            >
              {REPARTOS.map(([codigo, nombre]) => (
                <Option key={codigo} value={codigo}>{nombre}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="telefono" label="Teléfono Móvil (Primary)" rules={[{ required: true, message: 'Teléfono obligatorio' }]}>
            <Input placeholder="53556701" maxLength={8} autoComplete="off" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="telefono2" label="Teléfono Fijo / Secundario">
            <Input placeholder="24421234" maxLength={8} autoComplete="off" />
          </Form.Item>
        </Col>
      </Row>

      {/* Corrección #3: los puntos de referencia ya no son obligatorios */}
      <Form.Item name="referencias" label="Puntos de Referencia (opcional)">
        <Input placeholder="Punto de gas, casa azul de dos plantas" autoComplete="off" />
      </Form.Item>

      <Form.Item name="latitud" hidden initialValue={20.88691871}>
        <Input />
      </Form.Item>
      <Form.Item name="longitud" hidden initialValue={-76.25923043}>
        <Input />
      </Form.Item>

      <Form.Item label="📍 Marque en el mapa la ubicación exacta del destinatario">
        <MapaDestinatario form={form} />
      </Form.Item>
    </>
  );
};

const ClientesPage = () => {
  const { permisos } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalClienteOpen, setModalClienteOpen] = useState(false);
  const [modalDestinatarioOpen, setModalDestinatarioOpen] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [destinatarios, setDestinatarios] = useState([]);

  // Edición/eliminación según rol
  const [clienteEnEdicion, setClienteEnEdicion] = useState(null);
  const [destinatarioEnEdicion, setDestinatarioEnEdicion] = useState(null);

  // Solicitud #3: ver la ubicación con el mapa interno (sin abrir el navegador)
  const [destinatarioMapa, setDestinatarioMapa] = useState(null);

  const [formCliente] = Form.useForm();
  const [formDestinatario] = Form.useForm();
  const [formEditarCliente] = Form.useForm();
  const [formEditarDestinatario] = Form.useForm();

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
        cliente_id: clienteSeleccionado.id,
        ...values
      };

      await createDestinatario(payload);
      message.success('Destinatario vinculado exitosamente');
      formDestinatario.resetFields();
      verDestinatarios(clienteSeleccionado);
    } catch (err) {
      console.error(err);
      const detalle = err.response?.data;
      if (detalle?.detalle) {
        message.error(`Datos inválidos: ${JSON.stringify(detalle.detalle)}`);
      } else {
        message.error(detalle?.error || 'Error al registrar el destinatario');
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // EDITAR / ELIMINAR CLIENTE (según rol)
  // ==========================================
  const abrirEdicionCliente = (cliente) => {
    setClienteEnEdicion(cliente);
    formEditarCliente.setFieldsValue({
      nombre_completo: cliente.nombre_completo,
      telefono: cliente.telefono,
      domicilio: cliente.domicilio,
      email: cliente.email,
    });
  };

  const guardarEdicionCliente = async () => {
    try {
      const values = await formEditarCliente.validateFields();
      setLoading(true);
      await updateCliente(clienteEnEdicion.id, values);
      message.success('Cliente actualizado');
      setClienteEnEdicion(null);
      cargarClientes();
    } catch (err) {
      if (!err?.errorFields) {
        message.error(err?.response?.data?.error || 'Error al actualizar el cliente');
      }
    } finally {
      setLoading(false);
    }
  };

  const eliminarCliente = async (cliente) => {
    try {
      await deleteCliente(cliente.id);
      message.success('Cliente eliminado');
      cargarClientes();
    } catch (err) {
      message.error(err?.response?.data?.error || 'No se pudo eliminar el cliente');
    }
  };

  // ==========================================
  // EDITAR / ELIMINAR DESTINATARIO (según rol)
  // ==========================================
  const abrirEdicionDestinatario = (dest) => {
    setDestinatarioEnEdicion(dest);
    formEditarDestinatario.setFieldsValue({
      nombre_completo: dest.nombre_completo,
      ci: dest.ci,
      domicilio_exacto: dest.domicilio_exacto,
      provincia: dest.provincia || 'HOL',
      municipio: dest.municipio || 'HLG',
      reparto: dest.reparto,
      telefono: dest.telefono,
      telefono2: dest.telefono2,
      referencias: dest.referencias,
      latitud: dest.latitud ?? 20.88691871,
      longitud: dest.longitud ?? -76.25923043,
    });
  };

  const guardarEdicionDestinatario = async () => {
    try {
      const values = await formEditarDestinatario.validateFields();
      setLoading(true);
      await updateDestinatario(destinatarioEnEdicion.id, values);
      message.success('Destinatario actualizado');
      setDestinatarioEnEdicion(null);
      verDestinatarios(clienteSeleccionado); // recarga la lista del modal
    } catch (err) {
      if (!err?.errorFields) {
        message.error(err?.response?.data?.error || 'Error al actualizar el destinatario');
      }
    } finally {
      setLoading(false);
    }
  };

  const eliminarDestinatario = async (dest) => {
    try {
      await deleteDestinatario(dest.id);
      message.success('Destinatario eliminado');
      verDestinatarios(clienteSeleccionado);
    } catch (err) {
      message.error(err?.response?.data?.error || 'No se pudo eliminar el destinatario');
    }
  };

  const columns = [
    { title: 'Cliente (Nombre y Apellidos)', dataIndex: 'nombre_completo', key: 'nombre', render: t => <strong>{t}</strong> },
    { title: 'Teléfono', dataIndex: 'telefono', key: 'telefono', render: t => t ? <a href={`tel:${t}`}><PhoneOutlined /> {t}</a> : '-' },
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
          {permisos?.editarClientes && (
            <Button size="small" icon={<EditOutlined />} onClick={() => abrirEdicionCliente(record)}>
              Editar
            </Button>
          )}
          {permisos?.eliminarClientes && (
            <Popconfirm
              title="¿Eliminar este cliente?"
              description="Se eliminará junto con sus destinatarios si no tienen paquetes."
              onConfirm={() => eliminarCliente(record)}
            >
              <Button size="small" danger icon={<DeleteOutlined />}>Eliminar</Button>
            </Popconfirm>
          )}
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
        <Space size="middle">
          <Input.Search
            placeholder="Buscar cliente por nombre, teléfono o email..."
            allowClear
            enterButton
            style={{ width: 320 }}
            value={searchTerm}
            onSearch={setSearchTerm}
            onChange={(e) => {
              const valor = e.target.value;
              setSearchTerm(valor);
            }}
          />
          {permisos?.crearClientes && (
            <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setModalClienteOpen(true)} style={{ borderRadius: 6 }}>
              Registrar Nuevo Cliente
            </Button>
          )}
        </Space>
      </div>

      <Card style={{ borderRadius: 8 }}>
        <Table columns={columns} dataSource={clientes} rowKey="id" loading={loading} />
      </Card>

      {/* MODAL NUEVO CLIENTE */}
      <Modal
        title="👤 Registrar Cliente"
        open={modalClienteOpen}
        onCancel={() => setModalClienteOpen(false)}
        onOk={handleCrearCliente}
        confirmLoading={loading}
        okText="Guardar Cliente"
        cancelText="Cancelar"
      >
        <Form form={formCliente} layout="vertical" autoComplete="off">
          <Form.Item name="nombre_completo" label="Nombre y Dos Apellidos" rules={[{ required: true, message: 'Ingrese nombre y dos apellidos' }]}>
            <Input placeholder="Ej: Juan Pérez Pérez" autoComplete="off" />
          </Form.Item>
          <Form.Item name="telefono" label="Teléfono" rules={[{ required: true, message: 'Teléfono obligatorio' }]}>
            <Input placeholder="+1 (305) 555-0123" autoComplete="off" />
          </Form.Item>
          <Form.Item name="domicilio" label="Dirección Exacta">
            <Input placeholder="Ej: 123 Main St, Miami, FL 33101" autoComplete="off" />
          </Form.Item>
          <Form.Item name="email" label="Correo Electrónico">
            <Input placeholder="cliente@email.com" autoComplete="off" />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL DESTINATARIOS VINCULADOS */}
      <Modal
        title={`🌴 Destinatarios Vinculados a: ${clienteSeleccionado?.nombre_completo}`}
        open={modalDestinatarioOpen}
        onCancel={() => setModalDestinatarioOpen(false)}
        width={850}
        footer={null}
      >
        <h3 style={{ marginTop: 8, marginBottom: 12 }}>📋 Destinatarios Registrados ({destinatarios.length}):</h3>
        <Table
          dataSource={destinatarios}
          rowKey="id"
          pagination={false}
          columns={[
            { title: 'Nombre Completo', dataIndex: 'nombre_completo', render: t => <strong>{t}</strong> },
            { title: 'CI', dataIndex: 'ci' },
            { title: 'Reparto', dataIndex: 'reparto_display', render: (t, r) => <Tag color="geekblue">{t || r.reparto}</Tag> },
            { title: 'Dirección', dataIndex: 'domicilio_exacto' },
            { title: 'Teléfonos', render: (_, r) => (
              <Space>
                {r.telefono && <a href={`tel:${r.telefono}`}><PhoneOutlined /> {r.telefono}</a>}
                {r.telefono2 && <a href={`tel:${r.telefono2}`}><PhoneOutlined /> {r.telefono2}</a>}
              </Space>
            )},
            { title: 'Mapa', render: (_, r) => r.latitud && r.longitud ? (
              <Button
                size="small"
                type="link"
                icon={<EnvironmentOutlined />}
                onClick={() => setDestinatarioMapa(r)}
              >
                📍 Ubicación
              </Button>
            ) : '-' },
            { title: 'Acciones', key: 'acciones', width: 120, render: (_, r) => (
              <Space size={4} wrap={false}>
                {permisos?.editarDestinatarios && (
                  <Button size="small" icon={<EditOutlined />} title="Editar destinatario" onClick={() => abrirEdicionDestinatario(r)} />
                )}
                {permisos?.eliminarDestinatarios && (
                  <Popconfirm
                    title="¿Eliminar este destinatario?"
                    onConfirm={() => eliminarDestinatario(r)}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} title="Eliminar destinatario" />
                  </Popconfirm>
                )}
              </Space>
            )},
          ]}
        />

        {permisos?.crearDestinatarios && (
          <Card
            title="➕ Agregar Destinatario"
            size="small"
            style={{ marginTop: 24, backgroundColor: '#f0f5ff', borderColor: '#91d5ff' }}
          >
            <Form form={formDestinatario} layout="vertical" onFinish={handleCrearDestinatario} autoComplete="off">
              <FormularioDestinatario form={formDestinatario} />
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={loading} block style={{ borderRadius: 6 }}>
                Guardar y Vincular Destinatario
              </Button>
            </Form>
          </Card>
        )}
        {!permisos?.crearDestinatarios && (
          <p style={{ color: '#999', fontStyle: 'italic', marginTop: 24 }}>
            Su rol puede consultar y editar los destinatarios existentes, pero no crear nuevos.
          </p>
        )}
      </Modal>

      {/* MODAL EDITAR CLIENTE (Miami: admin/supervisor/empleado) */}
      <Modal
        title={`✏️ Editar Cliente: ${clienteEnEdicion?.nombre_completo || ''}`}
        open={!!clienteEnEdicion}
        onCancel={() => setClienteEnEdicion(null)}
        onOk={guardarEdicionCliente}
        confirmLoading={loading}
        okText="Guardar Cambios"
        cancelText="Cancelar"
      >
        <Form form={formEditarCliente} layout="vertical" autoComplete="off">
          <Form.Item name="nombre_completo" label="Nombre y Dos Apellidos" rules={[{ required: true, message: 'Ingrese nombre y dos apellidos' }]}>
            <Input placeholder="Ej: Juan Pérez Pérez" autoComplete="off" />
          </Form.Item>
          <Form.Item name="telefono" label="Teléfono" rules={[{ required: true, message: 'Teléfono obligatorio' }]}>
            <Input placeholder="+1 (305) 555-0123" autoComplete="off" />
          </Form.Item>
          <Form.Item name="domicilio" label="Dirección Exacta">
            <Input placeholder="Ej: 123 Main St, Miami, FL 33101" autoComplete="off" />
          </Form.Item>
          <Form.Item name="email" label="Correo Electrónico">
            <Input placeholder="cliente@email.com" autoComplete="off" />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL MAPA INTERNO (solicitud #3) */}
      <Modal
        title={`🗺️ Ubicación — ${destinatarioMapa?.nombre_completo || ''}`}
        open={!!destinatarioMapa}
        onCancel={() => setDestinatarioMapa(null)}
        footer={[
          <Button key="cerrar" onClick={() => setDestinatarioMapa(null)}>Cerrar</Button>,
          <Button
            key="gps" type="primary" icon={<EnvironmentOutlined />}
            onClick={() => window.open(`geo:${destinatarioMapa.latitud},${destinatarioMapa.longitud}`, '_blank')}
          >
            Abrir GPS del móvil
          </Button>,
        ]}
        width={720}
      >
        {destinatarioMapa && (
          <MapaSoloLectura
            latitud={destinatarioMapa.latitud}
            longitud={destinatarioMapa.longitud}
            nombre={destinatarioMapa.nombre_completo}
          />
        )}
      </Modal>

      {/* MODAL EDITAR DESTINATARIO (Miami y Holguín) */}
      <Modal
        title={`✏️ Editar Destinatario: ${destinatarioEnEdicion?.nombre_completo || ''}`}
        open={!!destinatarioEnEdicion}
        onCancel={() => setDestinatarioEnEdicion(null)}
        onOk={guardarEdicionDestinatario}
        confirmLoading={loading}
        okText="Guardar Cambios"
        cancelText="Cancelar"
        width={720}
      >
        <Form form={formEditarDestinatario} layout="vertical">
          <FormularioDestinatario form={formEditarDestinatario} />
        </Form>
      </Modal>
    </div>
  );
};

export default ClientesPage;
