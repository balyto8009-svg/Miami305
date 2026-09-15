// frontend/src/pages/NuevoPaqueteModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, Upload, Button, Row, Col, Card, Divider, message } from 'antd';
import { UploadOutlined, EnvironmentOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { getClientes, getDestinatariosPorCliente, getCategoriasActivas, crearPaquete } from '../api/apiService';

const { Option } = Select;
const { TextArea } = Input;

const NuevoPaqueteModal = ({ open, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [clientes, setClientes] = useState([]);
  const [destinatarios, setDestinatarios] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [selectedCatIds, setSelectedCatIds] = useState([]);
  const [descripcionesCat, setDescripcionesCat] = useState({});
  const [loading, setLoading] = useState(false);
  const [pesosCat, setPesosCat] = useState({});
  const [pesoTotal, setPesoTotal] = useState(0);
  const [fileList, setFileList] = useState([]);

  // Coordenadas seleccionadas
  const [latitud, setLatitud] = useState(20.88691871);
  const [longitud, setLongitud] = useState(-76.25923043);

  useEffect(() => {
    if (open) {
      cargarClientes();
      cargarCategorias();
    }
  }, [open]);

  const cargarClientes = async () => {
    try {
      const res = await getClientes();
      setClientes(res.results || res || []);
    } catch (err) {
      console.error(err);
    }
  };

  const cargarCategorias = async () => {
    try {
      const res = await getCategoriasActivas();
      setCategorias(res || [
        { id: 'alimentos', nombre: 'Alimentos', precio_por_kg: 5 },
        { id: 'medicamentos', nombre: 'Medicamentos', precio_por_kg: 4 },
        { id: 'ropa', nombre: 'Ropa', precio_por_kg: 6 },
        { id: 'electrodomesticos', nombre: 'Electrodomésticos', precio_por_kg: 10 },
        { id: 'otros', nombre: 'Otros', precio_por_kg: 5 }
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClienteChange = async (clienteId) => {
    form.setFieldsValue({ destinatario_id: undefined });
    try {
      const res = await getDestinatariosPorCliente(clienteId);
      setDestinatarios(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDestinatarioChange = (destId) => {
    const dest = destinatarios.find(d => d.id === destId);
    if (dest) {
      if (dest.latitud) setLatitud(parseFloat(dest.latitud));
      if (dest.longitud) setLongitud(parseFloat(dest.longitud));
    }
  };

  const handleSelectCategorias = (catIds) => {
    setSelectedCatIds(catIds);
    // Limpiar pesos y descripciones de categorías deseleccionadas
    const newPesos = { ...pesosCat };
    const newDesc = { ...descripcionesCat };
    Object.keys(newPesos).forEach(id => {
      if (!catIds.includes(id) && !catIds.includes(parseInt(id))) {
        delete newPesos[id];
      }
    });
    Object.keys(newDesc).forEach(id => {
      if (!catIds.includes(id) && !catIds.includes(parseInt(id))) {
        delete newDesc[id];
      }
    });
    setPesosCat(newPesos);
    setDescripcionesCat(newDesc);
    const total = Object.values(newPesos).reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0);
    setPesoTotal(total);
  };

  const handlePesoCategoryChange = (catId, value) => {
    const newPesos = { ...pesosCat, [catId]: value || 0 };
    setPesosCat(newPesos);
    const total = Object.values(newPesos).reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0);
    setPesoTotal(total);
  };

  const handleDescripcionCategoryChange = (catId, value) => {
    setDescripcionesCat({ ...descripcionesCat, [catId]: value });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (selectedCatIds.length === 0) {
        message.warning('Seleccione al menos una categoría para el paquete');
        return;
      }

      setLoading(true);

      // Construir la descripción unificada desglosada por categorías seleccionadas
      const lineasDescripcion = [];
      selectedCatIds.forEach(catId => {
        const catObj = categorias.find(c => c.id === catId || c.id === parseInt(catId));
        const nombreCat = catObj ? catObj.nombre : `Categoría ${catId}`;
        const pesoCat = pesosCat[catId] || 0;
        const descCat = descripcionesCat[catId] || 'Sin especificar artículos';
        lineasDescripcion.push(`[${nombreCat} - ${pesoCat} kg]: ${descCat}`);
      });

      const descripcionFinal = lineasDescripcion.join('\n');

      const formData = new FormData();
      formData.append('cliente_id', values.cliente_id);
      formData.append('destinatario_id', values.destinatario_id);
      formData.append('descripcion', descripcionFinal);
      formData.append('observaciones', values.observaciones || '');
      formData.append('pesos_categoria', JSON.stringify(pesosCat));

      if (fileList.length > 0) {
        formData.append('foto', fileList[0].originFileObj);
      }

      await crearPaquete(formData);
      message.success('Paquete registrado exitosamente');
      form.resetFields();
      setSelectedCatIds([]);
      setPesosCat({});
      setDescripcionesCat({});
      setPesoTotal(0);
      setFileList([]);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error al guardar paquete:', err);
      message.error('Error al guardar paquete');
    } finally {
      setLoading(false);
    }
  };

  const categoriasSeleccionadasObjetos = categorias.filter(c => selectedCatIds.includes(c.id) || selectedCatIds.includes(c.id.toString()));

  return (
    <Modal
      title="📦 Registrar Nuevo Paquete (Miami)"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={850}
      okText="Registrar y Generar Código"
      cancelText="Cancelar"
    >
      <Form form={form} layout="vertical">
        {/* PASO 1: CLIENTE Y DESTINATARIO */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="cliente_id" label="Cliente / Remitente" rules={[{ required: true, message: 'Seleccione un cliente' }]}>
              <Select placeholder="Seleccionar Cliente" onChange={handleClienteChange} showSearch optionFilterProp="children">
                {clientes.map(c => (
                  <Option key={c.id} value={c.id}>{c.nombre_completo} - {c.telefono}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="destinatario_id" label="Destinatario" rules={[{ required: true, message: 'Seleccione un destinatario' }]}>
              <Select placeholder="Seleccionar Destinatario" onChange={handleDestinatarioChange} showSearch optionFilterProp="children">
                {destinatarios.map(d => (
                  <Option key={d.id} value={d.id}>{d.nombre_completo} ({d.reparto_display || d.reparto || 'Holguín'})</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Card size="small" title="📍 Ubicación del Destinatario y Coordenadas GPS" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Latitud">
                <InputNumber style={{ width: '100%' }} value={latitud} onChange={setLatitud} step={0.000001} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Longitud">
                <InputNumber style={{ width: '100%' }} value={longitud} onChange={setLongitud} step={0.000001} />
              </Form.Item>
            </Col>
          </Row>
          <div style={{ fontSize: 12, color: '#666' }}>
            <EnvironmentOutlined /> Coordenadas fijadas para navegación GPS en entrega.
          </div>
        </Card>

        {/* PASO 2: SELECCIONAR CATEGORÍAS PRIMERO */}
        <Divider align="left">1️⃣ Seleccionar Categorías del Paquete</Divider>

        <Form.Item label="Seleccione las categorías que contiene este paquete:">
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Elija categorías (ej: Alimentos, Medicamentos, Ropa...)"
            value={selectedCatIds}
            onChange={handleSelectCategorias}
          >
            {categorias.map(cat => (
              <Option key={cat.id} value={cat.id}>{cat.nombre}</Option>
            ))}
          </Select>
        </Form.Item>

        {/* PASO 3: PESO Y DESCRIPCIÓN POR CATEGORÍA SELECCIONADA */}
        {categoriasSeleccionadasObjetos.length > 0 && (
          <>
            <Divider align="left">2️⃣ Pesos y Relación de Productos por Categoría Seleccionada</Divider>

            {categoriasSeleccionadasObjetos.map(cat => (
              <Card
                key={cat.id}
                size="small"
                title={<strong>🏷️ {cat.nombre}</strong>}
                style={{ marginBottom: 12, borderColor: '#1890ff', backgroundColor: '#f0f5ff' }}
              >
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item label={`Peso en kg (${cat.nombre})`} required>
                      <InputNumber
                        min={0.1}
                        step={0.1}
                        style={{ width: '100%' }}
                        placeholder="Peso (kg)"
                        value={pesosCat[cat.id]}
                        onChange={val => handlePesoCategoryChange(cat.id, val)}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={16}>
                    <Form.Item label={`Descripción de artículos (${cat.nombre})`} required>
                      <TextArea
                        rows={2}
                        placeholder={`Ej: Artículos de ${cat.nombre.toLowerCase()} (2 latas de atún, 1 paquete de arroz...)`}
                        value={descripcionesCat[cat.id] || ''}
                        onChange={e => handleDescripcionCategoryChange(cat.id, e.target.value)}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            ))}

            <Card style={{ backgroundColor: '#e6f7ff', marginBottom: 16, textAlign: 'right' }}>
              <h3 style={{ margin: 0, color: '#003366' }}>
                <strong>Peso Total Calculado: {pesoTotal.toFixed(2)} kg</strong>
              </h3>
            </Card>
          </>
        )}

        {/* FOTO Y OBSERVACIONES */}
        <Row gutter={16}>
          <Col span={16}>
            <Form.Item name="observaciones" label="Observaciones Generales (Opcional)">
              <TextArea rows={2} placeholder="Notas adicionales sobre el empaque o instrucciones de entrega..." />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Foto del Paquete Listo">
              <Upload
                beforeUpload={() => false}
                maxCount={1}
                fileList={fileList}
                onChange={({ fileList }) => setFileList(fileList)}
              >
                <Button icon={<UploadOutlined />}>Subir Fotografía</Button>
              </Upload>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default NuevoPaqueteModal;
