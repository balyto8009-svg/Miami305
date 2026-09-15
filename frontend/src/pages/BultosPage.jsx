// frontend/src/pages/BultosPage.jsx
import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Row, Col, Upload, Input, Space, Tag, Modal, message, Progress } from 'antd';
import { UploadOutlined, PrinterOutlined, CodeOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { getPaquetes, crearBulto } from '../api/apiService';

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
      message.warning('Debe seleccionar al menos un paquete para confeccionar el bulto');
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
      message.success(`Bulto ${res.codigo_bulto} creado con éxito`);

      setSelectedIds([]);
      setFileList([]);
      cargarPaquetesRecibidos();
    } catch (err) {
      console.error(err);
      message.error('Error al crear el bulto');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'Código Paquete', dataIndex: 'codigo_seguimiento', key: 'codigo' },
    { title: 'Cliente', dataIndex: ['cliente', 'nombre_completo'], key: 'cliente' },
    { title: 'Destinatario', dataIndex: ['destinatario', 'nombre_completo'], key: 'destinatario' },
    { title: 'Reparto', dataIndex: ['destinatario', 'reparto_display'], key: 'reparto', render: (text, r) => text || r.destinatario?.reparto || 'Holguín' },
    { title: 'Peso (kg)', dataIndex: 'peso_total_kg', key: 'peso', render: (val, r) => `${val || r.peso_kg || 0} kg` },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2>🧳 Confección de Bultos / Maletines (~50 kg)</h2>

      <Row gutter={16}>
        <Col span={16}>
          <Card title="Paquetes Recibidos en Miami Listos para Consolidar">
            <Table
              rowSelection={rowSelection}
              columns={columns}
              dataSource={paquetes}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </Col>

        <Col span={8}>
          <Card title="Resumen del Bulto" style={{ backgroundColor: '#fafafa' }}>
            <div style={{ marginBottom: 16 }}>
              <h4>Peso Acumulado:</h4>
              <Progress
                percent={Math.min(100, Math.round((pesoTotalAcumulado / 50) * 100))}
                status={pesoTotalAcumulado > 52 ? 'exception' : 'active'}
                format={() => `${pesoTotalAcumulado.toFixed(2)} kg / 50 kg`}
              />
              <p style={{ color: pesoTotalAcumulado > 50 ? 'orange' : '#666', marginTop: 4 }}>
                {pesoTotalAcumulado > 50 ? '⚠️ Límite recomendado de 50kg superado' : 'Aproximadamente 50kg por bulto/maletín'}
              </p>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label>Aerolínea / Transporte:</label>
              <Input value={aerolinea} onChange={e => setAerolinea(e.target.value)} placeholder="Ej: American Airlines" />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label>Número de Vuelo / Guía:</label>
              <Input value={numeroVuelo} onChange={e => setNumeroVuelo(e.target.value)} placeholder="Ej: AA1234" />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label>Fotografía del Bulto / Maletín:</label>
              <Upload
                beforeUpload={() => false}
                maxCount={1}
                fileList={fileList}
                onChange={({ fileList }) => setFileList(fileList)}
              >
                <Button icon={<UploadOutlined />}>Tomar/Subir Foto Bulto</Button>
              </Upload>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label>Observaciones:</label>
              <Input.TextArea rows={2} value={observaciones} onChange={e => setObservaciones(e.target.value)} />
            </div>

            <Button
              type="primary"
              size="large"
              block
              icon={<ShoppingCartOutlined />}
              onClick={handleCrearBulto}
              disabled={selectedIds.length === 0}
              loading={loading}
            >
              Generar Bulto e Imprimir Etiqueta
            </Button>
          </Card>
        </Col>
      </Row>

      <Modal
        title="🏷️ Etiqueta de Bulto Creado"
        open={modalImprimirVisible}
        onCancel={() => setModalImprimirVisible(false)}
        footer={[
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>
            Imprimir Etiqueta
          </Button>,
          <Button key="close" onClick={() => setModalImprimirVisible(false)}>
            Cerrar
          </Button>
        ]}
      >
        {bultoCreado && (
          <div id="etiqueta-bulto" style={{ border: '2px dashed #003366', padding: 20, textAlign: 'center', backgroundColor: '#fff' }}>
            <h2>MIAMI 305 TRAVEL</h2>
            <h1 style={{ fontSize: 28, color: '#003366', margin: '10px 0' }}>BULTO: {bultoCreado.codigo_bulto}</h1>
            <CodeOutlined style={{ fontSize: 48 }} />
            <p style={{ marginTop: 10 }}><strong>Cantidad de Paquetes:</strong> {bultoCreado.cantidad_paquetes}</p>
            <p><strong>Peso Total:</strong> {parseFloat(bultoCreado.peso_total).toFixed(2)} kg</p>
            <p><strong>Vuelo:</strong> {bultoCreado.aerolinea} - {bultoCreado.numero_vuelo}</p>
            <p style={{ fontSize: 11, color: '#888' }}>Pegar esta etiqueta de forma visible en la maleta/bulto.</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BultosPage;
