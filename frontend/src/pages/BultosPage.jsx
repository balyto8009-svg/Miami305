// frontend/src/pages/BultosPage.jsx
import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Row, Col, Upload, Input, Space, Tag, Modal, message, Progress, Typography } from 'antd';
import { UploadOutlined, PrinterOutlined, QrcodeOutlined, ShoppingBagOutlined, WarningOutlined } from '@ant-design/icons';
import { getPaquetes, crearBulto } from '../api/apiService';

const { Title, Text } = Typography;

const BultosPage = () => {
  const [paquetes, setPaquetes] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aerolinea, setAerolinea] = useState('Vuelo Regular Miami-Holguín');
  const [numeroVuelo, setNumeroVuelo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [fileList, setFileList] = useState([]);
  const [bultoCreado, setBultoCreado] = useState(null);
  const [modalImprimirVisible, setModalImprimirVisible] = useState(false);

  useEffect(() => {
    cargarPaquetesRecibidos();
  }, []);

  const cargarPaquetesRecibidos = async () => {
    setLoading(true);
    try {
      const res = await getPaquetes({ estado: 'recibido' });
      setPaquetes(res.results || res || []);
    } catch (err) {
      console.error(err);
      message.error('Error al cargar paquetes recibidos');
    } finally {
      setLoading(false);
    }
  };

  const paquetesSeleccionados = paquetes.filter(p => selectedIds.includes(p.id));
  const pesoTotalAcumulado = paquetesSeleccionados.reduce((acc, p) => acc + (parseFloat(p.peso_total_kg || p.peso_kg) || 0), 0);

  const rowSelection = {
    selectedRowKeys: selectedIds,
    onChange: (keys) => setSelectedIds(keys),
  };

  const handleCrearBulto = async () => {
    if (selectedIds.length === 0) {
      message.warning('Debe seleccionar paquetes para formar el bulto');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      selectedIds.forEach(id => formData.append('paquete_ids', id));
      formData.append('aerolinea', aerolinea);
      formData.append('numero_vuelo', numeroVuelo);
      formData.append('observaciones', observaciones);

      if (fileList.length > 0) {
        formData.append('foto_bulto', fileList[0].originFileObj);
      }

      const res = await crearBulto(formData);
      setBultoCreado(res);
      setModalImprimirVisible(true);
      message.success(`Bulto ${res.codigo_bulto} confeccionado exitosamente`);

      setSelectedIds([]);
      setFileList([]);
      cargarPaquetesRecibidos();
    } catch (err) {
      console.error(err);
      message.error('Error al empaquetar y generar el bulto');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'Código', dataIndex: 'codigo_seguimiento', key: 'codigo', render: t => <strong>{t}</strong> },
    { title: 'Cliente', dataIndex: ['cliente', 'nombre_completo'], key: 'cliente' },
    { title: 'Destinatario', dataIndex: ['destinatario', 'nombre_completo'], key: 'destinatario' },
    { title: 'Reparto', dataIndex: ['destinatario', 'reparto_display'], key: 'reparto', render: (text, r) => <Tag color="blue">{text || r.destinatario?.reparto || 'Holguín'}</Tag> },
    { title: 'Peso (kg)', dataIndex: 'peso_total_kg', key: 'peso', render: (val, r) => `${val || r.peso_kg || 0} kg` },
  ];

  return (
    <div style={{ padding: 24, backgroundColor: '#f4f6f9', minHeight: '100vh' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontWeight: 700, color: '#001529' }}>🧳 Confección de Bultos & Maletines (~50 kg)</h2>
        <p style={{ color: '#666', margin: 0 }}>Consolide los paquetes recibidos en bultos de aprox. 50kg, adjunte fotografía e imprima su etiqueta.</p>
      </div>

      <Row gutter={16}>
        <Col span={15}>
          <Card title="📦 Paquetes Listos para Empaquetar" style={{ borderRadius: 8 }}>
            <Table
              rowSelection={rowSelection}
              columns={columns}
              dataSource={paquetes}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 8 }}
            />
          </Card>
        </Col>

        <Col span={9}>
          <Card title="⚖️ Control de Peso del Maletín" style={{ borderRadius: 8, backgroundColor: '#fafafa' }}>
            <div style={{ marginBottom: 20, textAlign: 'center' }}>
              <Progress
                type="dashboard"
                percent={Math.min(100, Math.round((pesoTotalAcumulado / 50) * 100))}
                status={pesoTotalAcumulado > 52 ? 'exception' : 'active'}
                format={() => `${pesoTotalAcumulado.toFixed(1)} / 50 kg`}
                width={140}
              />
              <div style={{ marginTop: 8 }}>
                <Text type={pesoTotalAcumulado > 50 ? 'warning' : 'secondary'}>
                  {pesoTotalAcumulado > 50 ? '⚠️ Límite recomendado de 50 kg alcanzado/superado' : 'Capacidad recomendada para vuelos aéreos'}
                </Text>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label><strong>Transporte / Aerolínea:</strong></label>
              <Input value={aerolinea} onChange={e => setAerolinea(e.target.value)} placeholder="Ej: American Airlines" />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label><strong>No. de Vuelo / Guía Aérea:</strong></label>
              <Input value={numeroVuelo} onChange={e => setNumeroVuelo(e.target.value)} placeholder="Ej: AA1234" />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label><strong>Fotografía del Bulto Preparado:</strong></label>
              <Upload
                beforeUpload={() => false}
                maxCount={1}
                fileList={fileList}
                onChange={({ fileList }) => setFileList(fileList)}
              >
                <Button icon={<UploadOutlined />} block>Capturar / Cargar Foto Bulto</Button>
              </Upload>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label><strong>Observaciones:</strong></label>
              <Input.TextArea rows={2} value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Detalles de embalaje..." />
            </div>

            <Button
              type="primary"
              size="large"
              block
              icon={<ShoppingBagOutlined />}
              onClick={handleCrearBulto}
              disabled={selectedIds.length === 0}
              loading={loading}
              style={{ borderRadius: 6, height: 48, fontSize: 16 }}
            >
              Confeccionar Bulto e Imprimir Etiqueta
            </Button>
          </Card>
        </Col>
      </Row>

      {/* MODAL ETIQUETA IMPRIMIBLE */}
      <Modal
        title="🏷️ Etiqueta de Identificación de Bulto"
        open={modalImprimirVisible}
        onCancel={() => setModalImprimirVisible(false)}
        footer={[
          <Button key="print" type="primary" size="large" icon={<PrinterOutlined />} onClick={() => window.print()}>
            Imprimir Etiqueta
          </Button>,
          <Button key="close" size="large" onClick={() => setModalImprimirVisible(false)}>
            Cerrar
          </Button>
        ]}
      >
        {bultoCreado && (
          <div id="etiqueta-bulto" style={{ border: '3px solid #001529', borderRadius: 8, padding: 24, textAlign: 'center', backgroundColor: '#fff' }}>
            <h2 style={{ margin: 0, color: '#001529' }}>MIAMI 305 TRAVEL</h2>
            <Text type="secondary">ENVÍOS MIAMI - HOLGUÍN</Text>

            <div style={{ margin: '16px 0', padding: 12, backgroundColor: '#e6f7ff', borderRadius: 6 }}>
              <Title level={2} style={{ margin: 0, color: '#1890ff' }}>BULTO: {bultoCreado.codigo_bulto}</Title>
            </div>

            <QrcodeOutlined style={{ fontSize: 64, color: '#001529' }} />

            <div style={{ marginTop: 16, textAlign: 'left', fontSize: 14 }}>
              <p><strong>Cantidad de Paquetes:</strong> {bultoCreado.cantidad_paquetes}</p>
              <p><strong>Peso Total del Bulto:</strong> {parseFloat(bultoCreado.peso_total).toFixed(2)} kg</p>
              <p><strong>Aerolínea / Vuelo:</strong> {bultoCreado.aerolinea} - {bultoCreado.numero_vuelo}</p>
            </div>

            <p style={{ fontSize: 11, color: '#888', marginTop: 12, borderTop: '1px solid #eee', paddingTop: 8 }}>
              Adherir esta etiqueta de forma visible en el maletín/bulto. Cada paquete hereda este código.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BultosPage;
