// frontend/src/pages/HolguinPage.jsx
import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Tabs, Tag, Upload, Modal, Row, Col, Badge, Space, message, List, Typography, DatePicker } from 'antd';
import { ScanOutlined, CameraOutlined, CheckCircleOutlined, EnvironmentOutlined, PhoneOutlined, SafetyCertificateOutlined, ReloadOutlined } from '@ant-design/icons';
import { getPaquetesPorReparto, registrarEntregaConFoto, recibirYDesembalarBulto } from '../api/apiService';

const { Text, Title } = Typography;

const HolguinPage = () => {
  const [codigoBultoInput, setCodigoBultoInput] = useState('');
  const [repartos, setRepartos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paqueteEntrega, setPaqueteEntrega] = useState(null);
  const [modalEntregaOpen, setModalEntregaOpen] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [observacionEntrega, setObservacionEntrega] = useState('');
  const [fechaFiltro, setFechaFiltro] = useState(null);

  useEffect(() => {
    cargarPaquetesPorReparto();
  }, []);

  const cargarPaquetesPorReparto = async (filtros = {}) => {
    setLoading(true);
    try {
      const res = await getPaquetesPorReparto(filtros);
      setRepartos(res || []);
    } catch (err) {
      console.error('Error al cargar repartos:', err);
      message.error('Error al cargar paquetes por reparto');
    } finally {
      setLoading(false);
    }
  };

  const handleDesembalarBulto = async () => {
    if (!codigoBultoInput.trim()) {
      message.warning('Ingrese o escanee el código del bulto');
      return;
    }

    try {
      setLoading(true);
      const res = await recibirYDesembalarBulto(codigoBultoInput.trim());
      message.success(res.message || 'Bulto desembalado exitosamente');
      setCodigoBultoInput('');
      cargarPaquetesPorReparto();
    } catch (err) {
      console.error(err);
      const detalle = err.response?.data?.error;
      message.error(detalle || 'Error al desembalar el bulto');
    } finally {
      setLoading(false);
    }
  };

  const handleFiltroFecha = (fecha) => {
    setFechaFiltro(fecha);
    cargarPaquetesPorReparto(fecha ? { fecha: fecha.format('YYYY-MM-DD') } : {});
  };

  const abrirModalEntrega = (paquete) => {
    setPaqueteEntrega(paquete);
    setFileList([]);
    setObservacionEntrega('');
    setModalEntregaOpen(true);
  };

  const handleConfirmarEntrega = async () => {
    if (fileList.length === 0) {
      message.warning('La foto de constancia de entrega es obligatoria');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('foto_entrega', fileList[0].originFileObj);
      formData.append('observacion', observacionEntrega);

      await registrarEntregaConFoto(paqueteEntrega.id, formData);
      message.success(`Paquete ${paqueteEntrega.codigo_seguimiento} entregado con constancia fotográfica estampada`);
      setModalEntregaOpen(false);
      cargarPaquetesPorReparto(fechaFiltro ? { fecha: fechaFiltro.format('YYYY-MM-DD') } : {});
    } catch (err) {
      console.error(err);
      const detalle = err.response?.data?.error;
      message.error(detalle || 'Error al registrar entrega');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, backgroundColor: '#f4f6f9', minHeight: '100vh' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontWeight: 700, color: '#001529' }}>🇨🇺 Operaciones Sede Holguín - Entregas por Reparto</h2>
        <p style={{ color: '#666', margin: 0 }}>Recepcione los bultos del vuelo, organice las entregas por reparto y registre evidencias con foto estampada.</p>
      </div>

      {/* SECCION 1: RECEPCION DE VUELO Y DESEMBALAJE DE BULTOS */}
      <Card title="🛬 1. Lectura / Escaneo de Bulto al Llegar de Aeropuerto" style={{ marginBottom: 24, borderRadius: 8, borderColor: '#91d5ff' }}>
        <Row gutter={16} align="middle">
          <Col span={16}>
            <Input
              size="large"
              placeholder="Escanee o escriba el código del bulto (ej: BUL-2026-001)"
              prefix={<ScanOutlined style={{ color: '#1890ff' }} />}
              value={codigoBultoInput}
              onChange={e => setCodigoBultoInput(e.target.value)}
              onPressEnter={handleDesembalarBulto}
            />
          </Col>
          <Col span={8}>
            <Button type="primary" size="large" icon={<CheckCircleOutlined />} onClick={handleDesembalarBulto} loading={loading} block style={{ borderRadius: 6 }}>
              Desembalar & Clasificar
            </Button>
          </Col>
        </Row>
      </Card>

      {/* SECCION 2: PAQUETES CLASIFICADOS POR REPARTO */}
      <Card
        title="📍 2. Clasificación Ordenada de Paquetes por Reparto para Entregas Rápidas"
        style={{ borderRadius: 8 }}
        extra={
          <Space>
            <DatePicker
              placeholder="Filtrar por fecha"
              value={fechaFiltro}
              onChange={handleFiltroFecha}
              allowClear
            />
            <Button icon={<ReloadOutlined />} onClick={() => cargarPaquetesPorReparto(fechaFiltro ? { fecha: fechaFiltro.format('YYYY-MM-DD') } : {})}>
              Actualizar
            </Button>
          </Space>
        }
      >
        {repartos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
            No hay paquetes pendientes de distribución en Holguín.
          </div>
        ) : (
          <Tabs
            type="card"
            size="large"
            items={repartos.map(rep => ({
              key: rep.codigo_reparto,
              label: (
                <Space>
                  <strong>{rep.nombre_reparto}</strong>
                  <Badge count={rep.total_paquetes} style={{ backgroundColor: '#52c41a' }} />
                </Space>
              ),
              children: (
                <List
                  grid={{ gutter: 16, column: 2 }}
                  dataSource={rep.paquetes}
                  renderItem={p => (
                    <List.Item>
                      <Card
                        style={{ borderRadius: 8, borderColor: p.estado === 'entregado' ? '#b7eb8f' : '#d9d9d9' }}
                        title={<span style={{ fontSize: 16 }}>📦 <strong>{p.codigo_seguimiento}</strong></span>}
                        extra={<Tag color={p.estado === 'entregado' ? 'green' : 'blue'}>{p.estado_display}</Tag>}
                      >
                        <p><strong>Destinatario:</strong> {p.destinatario?.nombre_completo}</p>
                        <p><strong>CI:</strong> {p.destinatario?.ci || 'N/A'}</p>
                        <p><strong>Dirección:</strong> {p.destinatario?.domicilio_exacto}</p>
                        {p.destinatario?.referencias && <p><strong>Ref:</strong> {p.destinatario.referencias}</p>}
                        <p><strong>Teléfonos Directos:</strong>
                          {p.destinatario?.telefono && (
                            <a href={`tel:${p.destinatario.telefono}`} style={{ marginLeft: 8, fontWeight: 'bold' }}>
                              <PhoneOutlined /> {p.destinatario.telefono}
                            </a>
                          )}
                          {p.destinatario?.telefono2 && (
                            <a href={`tel:${p.destinatario.telefono2}`} style={{ marginLeft: 8, fontWeight: 'bold' }}>
                              <PhoneOutlined /> {p.destinatario.telefono2}
                            </a>
                          )}
                        </p>
                        <p><strong>Contenido:</strong> {p.descripcion || 'Sin descripción'}</p>

                        {p.destinatario?.latitud && p.destinatario?.longitud && (
                          <div style={{ margin: '12px 0' }}>
                            <Button
                              type="dashed"
                              icon={<EnvironmentOutlined />}
                              block
                              onClick={() => window.open(`geo:${p.destinatario.latitud},${p.destinatario.longitud}`, '_blank')}
                            >
                              Navegar GPS a Dirección
                            </Button>
                            <Button
                              type="link"
                              icon={<EnvironmentOutlined />}
                              block
                              onClick={() => window.open(`https://www.openstreetmap.org/?mlat=${p.destinatario.latitud}&mlon=${p.destinatario.longitud}&zoom=17`, '_blank')}
                            >
                              Ver en mapa (OpenStreetMap)
                            </Button>
                          </div>
                        )}

                        {p.estado !== 'entregado' ? (
                          <Button
                            type="primary"
                            icon={<CameraOutlined />}
                            block
                            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', height: 40, marginTop: 8 }}
                            onClick={() => abrirModalEntrega(p)}
                          >
                            Registrar Entrega con Foto
                          </Button>
                        ) : (
                          <Tag color="success" style={{ padding: '6px 12px', width: '100%', textAlign: 'center', fontSize: 13 }}>
                            <SafetyCertificateOutlined /> Entregado con foto estampada
                          </Tag>
                        )}
                      </Card>
                    </List.Item>
                  )}
                />
              ),
            }))}
          />
        )}
      </Card>

      {/* MODAL EVIDENCIA DE ENTREGA */}
      <Modal
        title={`📸 Registrar Constancia de Entrega (${paqueteEntrega?.codigo_seguimiento})`}
        open={modalEntregaOpen}
        onCancel={() => setModalEntregaOpen(false)}
        onOk={handleConfirmarEntrega}
        okText="Confirmar Entrega"
        cancelText="Cancelar"
        confirmLoading={loading}
      >
        <div style={{ marginBottom: 16 }}>
          <p><strong>Destinatario:</strong> {paqueteEntrega?.destinatario?.nombre_completo}</p>
          <p><strong>Dirección de Entrega:</strong> {paqueteEntrega?.destinatario?.domicilio_exacto}</p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label><strong>Fotografía de la Entrega (Obligatorio):</strong></label>
          <Upload
            beforeUpload={() => false}
            maxCount={1}
            fileList={fileList}
            onChange={({ fileList }) => setFileList(fileList)}
          >
            <Button icon={<CameraOutlined />} block size="large" style={{ marginTop: 8 }}>Capturar / Cargar Foto</Button>
          </Upload>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6 }}>
            ℹ️ El sistema estampará automáticamente la marca de agua con la leyenda "ENTREGADO - Día Fecha Hora" en la foto.
          </Text>
        </div>

        <div>
          <label><strong>Observaciones:</strong></label>
          <Input.TextArea
            rows={2}
            value={observacionEntrega}
            onChange={e => setObservacionEntrega(e.target.value)}
            placeholder="Notas sobre el estado de la entrega..."
          />
        </div>
      </Modal>
    </div>
  );
};

export default HolguinPage;
