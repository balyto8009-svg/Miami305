// frontend/src/pages/HolguinPage.jsx
import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Tabs, Table, Tag, Upload, Modal, Row, Col, Badge, Space, message, List } from 'antd';
import { ScanOutlined, CameraOutlined, CheckCircleOutlined, EnvironmentOutlined, PhoneOutlined } from '@ant-design/icons';
import { getPaquetesPorReparto, registrarEntregaConFoto, recibirYDesembalarBulto } from '../api/apiService';

const HolguinPage = () => {
  const [codigoBultoInput, setCodigoBultoInput] = useState('');
  const [repartos, setRepartos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paqueteEntrega, setPaqueteEntrega] = useState(null);
  const [modalEntregaOpen, setModalEntregaOpen] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [observacionEntrega, setObservacionEntrega] = useState('');

  useEffect(() => {
    cargarPaquetesPorReparto();
  }, []);

  const cargarPaquetesPorReparto = async () => {
    setLoading(true);
    try {
      const res = await getPaquetesPorReparto();
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
      message.success(res.message || 'Bulto desembalado con éxito');
      setCodigoBultoInput('');
      cargarPaquetesPorReparto();
    } catch (err) {
      console.error(err);
      message.error('Error al desembalar el bulto');
    } finally {
      setLoading(false);
    }
  };

  const abrirModalEntrega = (paquete) => {
    setPaqueteEntrega(paquete);
    setFileList([]);
    setObservacionEntrega('');
    setModalEntregaOpen(true);
  };

  const handleConfirmarEntrega = async () => {
    if (fileList.length === 0) {
      message.warning('Es obligatorio tomar/subir la foto de constancia de entrega');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('foto_entrega', fileList[0].originFileObj);
      formData.append('observacion', observacionEntrega);

      await registrarEntregaConFoto(paqueteEntrega.id, formData);
      message.success(`Paquete ${paqueteEntrega.codigo_seguimiento} entregado exitosamente`);
      setModalEntregaOpen(false);
      cargarPaquetesPorReparto();
    } catch (err) {
      console.error(err);
      message.error('Error al registrar entrega con foto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>🇨🇺 Operaciones Sede Holguín - Recepción y Entregas</h2>

      {/* SECCION 1: RECEPCION DE VUELO Y DESEMBALAJE DE BULTOS */}
      <Card title="🛬 1. Recepción de Vuelo y Desembalaje de Bultos" style={{ marginBottom: 24, backgroundColor: '#e6f7ff' }}>
        <Row gutter={16} align="middle">
          <Col span={14}>
            <Input
              size="large"
              placeholder="Escanee o ingrese el Código del Bulto (ej: BUL-2026-001)"
              prefix={<ScanOutlined />}
              value={codigoBultoInput}
              onChange={e => setCodigoBultoInput(e.target.value)}
              onPressEnter={handleDesembalarBulto}
            />
          </Col>
          <Col span={10}>
            <Button type="primary" size="large" icon={<CheckCircleOutlined />} onClick={handleDesembalarBulto} loading={loading}>
              Recibir y Sacar Paquetes
            </Button>
          </Col>
        </Row>
      </Card>

      {/* SECCION 2: DISTRIBUCION POR REPARTO */}
      <Card title="📍 2. Clasificación de Paquetes por Reparto en Holguín para Entrega Rápida">
        {repartos.length === 0 ? (
          <p style={{ color: '#888' }}>No hay paquetes pendientes por reparto.</p>
        ) : (
          <Tabs type="card">
            {repartos.map(rep => (
              <Tabs.TabPane
                tab={
                  <span>
                    <strong>{rep.nombre_reparto}</strong> <Badge count={rep.total_paquetes} style={{ backgroundColor: '#52c41a', marginLeft: 8 }} />
                  </span>
                }
                key={rep.codigo_reparto}
              >
                <List
                  grid={{ gutter: 16, column: 2 }}
                  dataSource={rep.paquetes}
                  renderItem={p => (
                    <List.Item>
                      <Card
                        title={<strong>{p.codigo_seguimiento} - {p.destinatario?.nombre_completo}</strong>}
                        extra={<Tag color={p.estado === 'entregado' ? 'green' : 'blue'}>{p.estado_display}</Tag>}
                      >
                        <p><strong>CI:</strong> {p.destinatario?.ci || 'N/A'}</p>
                        <p><strong>Dirección Exacta:</strong> {p.destinatario?.domicilio_exacto}</p>
                        <p><strong>Teléfonos:</strong>
                          {p.destinatario?.telefono && (
                            <a href={`tel:${p.destinatario.telefono}`} style={{ marginLeft: 8 }}>
                              <PhoneOutlined /> {p.destinatario.telefono}
                            </a>
                          )}
                          {p.destinatario?.telefono2 && (
                            <a href={`tel:${p.destinatario.telefono2}`} style={{ marginLeft: 8 }}>
                              <PhoneOutlined /> {p.destinatario.telefono2}
                            </a>
                          )}
                        </p>
                        <p><strong>Descripción:</strong> {p.descripcion || 'Paquete regular'}</p>

                        {p.destinatario?.latitud && p.destinatario?.longitud && (
                          <div style={{ marginBottom: 12 }}>
                            <a
                              href={`https://www.openstreetmap.org/?mlat=${p.destinatario.latitud}&mlon=${p.destinatario.longitud}&zoom=17`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <EnvironmentOutlined /> Abrir Ubicación GPS en Mapa
                            </a>
                          </div>
                        )}

                        {p.estado !== 'entregado' ? (
                          <Button
                            type="primary"
                            icon={<CameraOutlined />}
                            block
                            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                            onClick={() => abrirModalEntrega(p)}
                          >
                            Registrar Entrega con Foto
                          </Button>
                        ) : (
                          <Tag color="success">✅ Entregado con evidencia fotográfica</Tag>
                        )}
                      </Card>
                    </List.Item>
                  )}
                />
              </Tabs.TabPane>
            ))}
          </Tabs>
        )}
      </Card>

      {/* MODAL DE CONFIRMACION DE ENTREGA Y CAPTURA DE FOTO */}
      <Modal
        title={`📸 Evidencia de Entrega: ${paqueteEntrega?.codigo_seguimiento}`}
        open={modalEntregaOpen}
        onCancel={() => setModalEntregaOpen(false)}
        onOk={handleConfirmarEntrega}
        okText="Confirmar y Guardar Foto"
        cancelText="Cancelar"
        confirmLoading={loading}
      >
        <p><strong>Destinatario:</strong> {paqueteEntrega?.destinatario?.nombre_completo}</p>
        <p><strong>Dirección:</strong> {paqueteEntrega?.destinatario?.domicilio_exacto}</p>

        <div style={{ margin: '16px 0' }}>
          <label><strong>Foto de la Entrega (Obligatorio):</strong></label>
          <Upload
            beforeUpload={() => false}
            maxCount={1}
            fileList={fileList}
            onChange={({ fileList }) => setFileList(fileList)}
          >
            <Button icon={<CameraOutlined />}>Tomar Foto / Subir Captura</Button>
          </Upload>
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
            * La foto incluirá automáticamente la marca de agua visual con texto ENTREGADO, Día, Fecha y Hora exacta.
          </div>
        </div>

        <div>
          <label>Observaciones de Entrega:</label>
          <Input.TextArea
            rows={2}
            value={observacionEntrega}
            onChange={e => setObservacionEntrega(e.target.value)}
            placeholder="Escriba algún detalle adicional si aplica"
          />
        </div>
      </Modal>
    </div>
  );
};

export default HolguinPage;
