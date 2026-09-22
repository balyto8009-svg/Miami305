/**
 * frontend/src/pages/SeguimientoBultosPage.jsx
 * Ubicación: Miami305/frontend/src/pages/SeguimientoBultosPage.jsx
 *
 * DESCRIPCIÓN:
 * Lista de bultos consolidados y en tránsito con todos sus detalles
 * (corrección #15): código, aerolínea/vuelo, fecha y hora de salida,
 * estado, peso, cantidad de paquetes, foto documental y paquetes que
 * contiene. Permite "Marcar salida" manual (#10) y "Cancelar envío"
 * mientras el vuelo no haya salido.
 */
import React, { useEffect, useState } from 'react';
import { Table, Button, Card, Tag, Space, Modal, message, Image, Typography } from 'antd';
import { ReloadOutlined, SendOutlined, StopOutlined } from '@ant-design/icons';
import {
  getBultos, getBulto, salirVuelo, cancelarBulto, getDestinatarios,
} from '../api/apiService';

const { Text } = Typography;

const MEDIA_BASE = 'http://127.0.0.1:8000';

const ESTADO_BULTO = {
  consolidado: { color: 'purple', label: '📦 Consolidado' },
  en_curso: { color: 'orange', label: '✈️ En tránsito' },
  completado: { color: 'green', label: '✅ Completado' },
  cancelado: { color: 'red', label: '❌ Cancelado' },
};

const SeguimientoBultosPage = () => {
  const [bultos, setBultos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [detalleLoading, setDetalleLoading] = useState(false);

  const cargarBultos = async () => {
    setLoading(true);
    try {
      const data = await getBultos();
      setBultos(data.results || data || []);
    } catch (err) {
      console.error(err);
      message.error('Error al cargar los bultos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarBultos();
  }, []);

  const verDetalle = async (bulto) => {
    setDetalleLoading(true);
    try {
      const data = await getBulto(bulto.id);
      setDetalle(data);
    } catch (err) {
      console.error(err);
      message.error('Error al cargar el detalle del bulto');
    } finally {
      setDetalleLoading(false);
    }
  };

  const handleMarcarSalida = async (bulto) => {
    try {
      const res = await salirVuelo(bulto.id);
      message.success(res.message || `Bulto ${bulto.codigo_bulto} En tránsito`);
      cargarBultos();
    } catch (err) {
      message.error(err?.response?.data?.error || 'No se pudo marcar la salida');
    }
  };

  const handleCancelar = async (bulto) => {
    try {
      const res = await cancelarBulto(bulto.id);
      message.success(res.message || `Bulto ${bulto.codigo_bulto} cancelado`);
      cargarBultos();
    } catch (err) {
      message.error(err?.response?.data?.error || 'No se pudo cancelar el bulto');
    }
  };

  const columns = [
    { title: 'Código', dataIndex: 'codigo_bulto', key: 'codigo', render: t => <strong>{t}</strong> },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (e) => {
        const info = ESTADO_BULTO[e] || { color: 'default', label: e };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    { title: 'Aerolínea / Vuelo', key: 'vuelo', render: (_, r) => `${r.aerolinea || '—'} ${r.numero_vuelo ? `/ ${r.numero_vuelo}` : ''}` },
    {
      title: 'Salida del vuelo',
      dataIndex: 'fecha_hora_salida',
      key: 'salida',
      render: (fh, r) => {
        if (fh) return new Date(fh).toLocaleString('es-ES');
        if (r.fecha_salida) return new Date(r.fecha_salida).toLocaleDateString('es-ES') + ' (sin hora)';
        return '—';
      },
    },
    { title: 'Paquetes', dataIndex: 'cantidad_paquetes', key: 'paquetes', align: 'center' },
    { title: 'Peso (kg)', dataIndex: 'peso_total', key: 'peso', render: v => `${Number(v || 0).toFixed(2)} kg` },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 200,
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" type="primary" ghost onClick={() => verDetalle(r)} loading={detalleLoading && detalle?.id === r.id}>
            Detalle
          </Button>
          {r.estado === 'consolidado' && (
            <>
              <Button size="small" icon={<SendOutlined />} title="Marcar salida del vuelo ahora" onClick={() => handleMarcarSalida(r)}>
                Salida
              </Button>
              <Button size="small" danger icon={<StopOutlined />} title="Cancelar el envío: los paquetes vuelven a Recibido" onClick={() => handleCancelar(r)}>
                Cancelar
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const urlMedia = (ruta) => (ruta ? (ruta.startsWith('http') ? ruta : `${MEDIA_BASE}${ruta}`) : null);

  return (
    <div style={{ padding: 24, backgroundColor: '#f4f6f9', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 700, color: '#001529' }}>🧳 Seguimiento de Bultos</h2>
          <p style={{ color: '#666', margin: 0 }}>
            Bultos consolidados y en tránsito. A la hora de salida declarada, el bulto y sus paquetes pasan a En tránsito automáticamente.
          </p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={cargarBultos} loading={loading}>
          Actualizar
        </Button>
      </div>

      <Card style={{ borderRadius: 8 }}>
        <Table
          columns={columns}
          dataSource={bultos}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showTotal: (t) => `Total ${t} bultos` }}
        />
      </Card>

      {/* DETALLE DEL BULTO */}
      <Modal
        title={`📦 Bulto ${detalle?.codigo_bulto || ''}`}
        open={!!detalle}
        onCancel={() => setDetalle(null)}
        width={860}
        footer={[
          detalle?.estado === 'consolidado' && (
            <Button key="salida" type="primary" icon={<SendOutlined />} onClick={() => handleMarcarSalida(detalle)}>
              Marcar salida del vuelo
            </Button>
          ),
          detalle?.estado === 'consolidado' && (
            <Button key="cancelar" danger icon={<StopOutlined />} onClick={() => handleCancelar(detalle)}>
              Cancelar envío
            </Button>
          ),
          <Button key="cerrar" onClick={() => setDetalle(null)}>Cerrar</Button>,
        ].filter(Boolean)}
      >
        {detalle && (
          <div>
            <Space size="large" wrap style={{ marginBottom: 16 }}>
              <Tag color={(ESTADO_BULTO[detalle.estado] || {}).color || 'default'}>
                {(ESTADO_BULTO[detalle.estado] || {}).label || detalle.estado}
              </Tag>
              <Text strong>Aerolínea:</Text> {detalle.aerolinea || '—'}
              <Text strong>Vuelo:</Text> {detalle.numero_vuelo || '—'}
              <Text strong>Guía aérea:</Text> {detalle.numero_guia_aerea || '—'}
            </Space>
            <Space size="large" wrap style={{ marginBottom: 16 }}>
              <span><Text strong>Salida:</Text> {detalle.fecha_hora_salida ? new Date(detalle.fecha_hora_salida).toLocaleString('es-ES') : (detalle.fecha_salida || '—')}</span>
              <span><Text strong>Llegada a Cuba:</Text> {detalle.fecha_llegada_cuba || '—'}</span>
              <span><Text strong>Peso:</Text> {Number(detalle.peso_total || 0).toFixed(2)} kg</span>
              <span><Text strong>Paquetes:</Text> {detalle.cantidad_paquetes}</span>
            </Space>

            {urlMedia(detalle.foto_bulto) && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ marginBottom: 4 }}><strong>📷 Foto documental del bulto (Miami)</strong></p>
                <Image src={urlMedia(detalle.foto_bulto)} width={220} style={{ borderRadius: 6 }} />
              </div>
            )}

            <h4>📋 Paquetes en este bulto ({detalle.paquetes?.length || 0})</h4>
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={detalle.paquetes || []}
              columns={[
                { title: 'Código', dataIndex: 'codigo_seguimiento', render: t => <strong>{t}</strong> },
                { title: 'Destinatario', dataIndex: ['destinatario', 'nombre_completo'] },
                { title: 'Reparto', dataIndex: ['destinatario', 'reparto_display'] },
                { title: 'Peso (kg)', dataIndex: 'peso_total_kg' },
                { title: 'Estado', dataIndex: 'estado_display' },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SeguimientoBultosPage;
