// frontend/src/pages/BultosPage.jsx
// Confección de Bultos & Maletines (Miami).
// Corrección #8: etiqueta limpia (sin ENVÍOS MIAMI - HOLGUÍN, sin la palabra
// "BULTO:", sin "Cantidad de Paquetes" y sin el texto de herencia).
// Corrección #10: al confeccionar el bulto se declara la fecha y la hora
// aproximada de salida del vuelo; al alcanzar esa hora el bulto y sus
// paquetes pasan a En tránsito automáticamente (salvo cancelación manual).
import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Row, Col, Upload, Input, Space, Tag, Modal, message, Progress, Typography, DatePicker, TimePicker } from 'antd';
import { UploadOutlined, PrinterOutlined, QrcodeOutlined, InboxOutlined } from '@ant-design/icons';
import { getPaquetesParaBulto, crearBulto } from '../api/apiService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const BultosPage = () => {
  const [paquetes, setPaquetes] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aerolinea, setAerolinea] = useState('Vuelo Regular Miami-Holguín');
  const [numeroVuelo, setNumeroVuelo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [fechaSalida, setFechaSalida] = useState(null);   // dayjs | null
  const [horaSalida, setHoraSalida] = useState(null);     // dayjs | null
  const [fileList, setFileList] = useState([]);
  const [bultoCreado, setBultoCreado] = useState(null);
  const [modalImprimirVisible, setModalImprimirVisible] = useState(false);

  useEffect(() => {
    cargarPaquetesRecibidos();
  }, []);

  const cargarPaquetesRecibidos = async () => {
    setLoading(true);
    try {
      const res = await getPaquetesParaBulto();
      setPaquetes(res.results || res || []);
    } catch (err) {
      console.error(err);
      message.error('Error al cargar paquetes recibidos');
    } finally {
      setLoading(false);
    }
  };

  const paquetesSeleccionados = paquetes.filter(p => selectedIds.includes(p.id));
  const pesoTotalAcumulado = paquetesSeleccionados.reduce((acc, p) => acc + (parseFloat(p.peso_total_kg) || 0), 0);

  const rowSelection = {
    selectedRowKeys: selectedIds,
    onChange: (keys) => setSelectedIds(keys),
  };

  const handleCrearBulto = async () => {
    if (selectedIds.length === 0) {
      message.warning('Debe seleccionar paquetes para formar el bulto');
      return;
    }
    if (!fechaSalida) {
      message.warning('Indique la fecha de salida del vuelo');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      selectedIds.forEach(id => formData.append('paquete_ids', id));
      formData.append('aerolinea', aerolinea);
      formData.append('numero_vuelo', numeroVuelo);
      formData.append('numero_guia_aerea', numeroVuelo);
      formData.append('observaciones', observaciones);
      formData.append('fecha_salida', fechaSalida.format('YYYY-MM-DD'));
      if (horaSalida) {
        formData.append('hora_salida', horaSalida.format('HH:mm'));
      }

      if (fileList.length > 0) {
        formData.append('foto_bulto', fileList[0].originFileObj);
      }

      const res = await crearBulto(formData);
      setBultoCreado(res);
      setModalImprimirVisible(true);
      const salida = res.fecha_hora_salida
        ? `Salida programada: ${new Date(res.fecha_hora_salida).toLocaleString('es-ES')}`
        : `Salida: ${res.fecha_salida}`;
      message.success(`Bulto ${res.codigo_bulto} confeccionado. ${salida}`);

      setSelectedIds([]);
      setFileList([]);
      setFechaSalida(null);
      setHoraSalida(null);
      cargarPaquetesRecibidos();
    } catch (err) {
      console.error(err);
      message.error(err?.response?.data?.error || 'Error al empaquetar y generar el bulto');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'Código', dataIndex: 'codigo_seguimiento', key: 'codigo', render: t => <strong>{t}</strong> },
    { title: 'Cliente', dataIndex: ['cliente', 'nombre_completo'], key: 'cliente' },
    { title: 'Destinatario', dataIndex: ['destinatario', 'nombre_completo'], key: 'destinatario' },
    { title: 'Reparto', dataIndex: ['destinatario', 'reparto_display'], key: 'reparto', render: (text, r) => <Tag color="blue">{text || r.destinatario?.reparto || '—'}</Tag> },
    { title: 'Peso (kg)', dataIndex: 'peso_total_kg', key: 'peso', render: (val) => `${val || 0} kg` },
  ];

  return (
    <div style={{ padding: 24, backgroundColor: '#f4f6f9', minHeight: '100vh' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontWeight: 700, color: '#001529' }}>🧳 Confección de Bultos & Maletines (~50 kg)</h2>
        <p style={{ color: '#666', margin: 0 }}>
          Consolide los paquetes recibidos en bultos de aprox. 50 kg, declare la salida del vuelo y adjunte la fotografía documental.
          A la hora de salida, el bulto y sus paquetes pasan a <strong>En tránsito</strong> automáticamente.
        </p>
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
          <Card title="⚖️ Control de Peso y Salida del Vuelo" style={{ borderRadius: 8, backgroundColor: '#fafafa' }}>
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
              <Input value={aerolinea} onChange={e => setAerolinea(e.target.value)} placeholder="Ej: American Airlines" autoComplete="off" />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label><strong>No. de Vuelo / Guía Aérea:</strong></label>
              <Input value={numeroVuelo} onChange={e => setNumeroVuelo(e.target.value)} placeholder="Ej: AA1234" autoComplete="off" />
            </div>

            {/* Corrección #10: fecha + hora aproximada de salida del vuelo */}
            <Row gutter={8} style={{ marginBottom: 12 }}>
              <Col span={12}>
                <label><strong>Fecha de salida del vuelo:</strong></label>
                <DatePicker
                  style={{ width: '100%', marginTop: 4 }}
                  value={fechaSalida}
                  onChange={setFechaSalida}
                  placeholder="Fecha de salida"
                  format="DD/MM/YYYY"
                />
              </Col>
              <Col span={12}>
                <label><strong>Hora aproximada:</strong></label>
                <TimePicker
                  style={{ width: '100%', marginTop: 4 }}
                  value={horaSalida}
                  onChange={setHoraSalida}
                  placeholder="Hora aprox."
                  format="HH:mm"
                  minuteStep={5}
                />
              </Col>
            </Row>
            <p style={{ fontSize: 12, color: '#888', marginTop: -6 }}>
              ✈️ Al alcanzar esta fecha/hora, el bulto y sus paquetes pasan a <strong>En tránsito</strong> automáticamente
              (salvo que se cancele el envío desde <em>Seguimiento de Bultos</em>).
            </p>

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
              <Input.TextArea rows={2} value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Detalles de embalaje..." autoComplete="off" />
            </div>

            <Button
              type="primary"
              size="large"
              block
              icon={<InboxOutlined />}
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

      {/* MODAL ETIQUETA IMPRIMIBLE (limpia según #8) */}
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

            <div style={{ margin: '16px 0', padding: 12, backgroundColor: '#e6f7ff', borderRadius: 6 }}>
              <Title level={2} style={{ margin: 0, color: '#1890ff', letterSpacing: 2 }}>{bultoCreado.codigo_bulto}</Title>
            </div>

            <QrcodeOutlined style={{ fontSize: 64, color: '#001529' }} />

            <div style={{ marginTop: 16, textAlign: 'left', fontSize: 14 }}>
              <p><strong>Peso Total:</strong> {parseFloat(bultoCreado.peso_total).toFixed(2)} kg</p>
              <p><strong>Aerolínea / Vuelo:</strong> {bultoCreado.aerolinea} - {bultoCreado.numero_vuelo}</p>
              {bultoCreado.fecha_hora_salida && (
                <p><strong>Salida del vuelo:</strong> {new Date(bultoCreado.fecha_hora_salida).toLocaleString('es-ES')}</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BultosPage;
