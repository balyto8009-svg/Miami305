// frontend/src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Progress, Table, Tag, Space, Button } from 'antd';
import { DropboxOutlined, RocketOutlined, CheckCircleOutlined, CompassOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getStats, getPaquetes } from '../api/apiService';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    recibidos: 0,
    consolidados: 0,
    en_transito: 0,
    en_cuba: 0,
    entregados: 0,
    total: 0
  });
  const [ultimosPaquetes, setUltimosPaquetes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const statsRes = await getStats();
      setStats(statsRes || {});
      const paquetesRes = await getPaquetes({ page_size: 5 });
      setUltimosPaquetes(paquetesRes.results || paquetesRes || []);
    } catch (err) {
      console.error('Error al cargar dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'Código', dataIndex: 'codigo_seguimiento', key: 'codigo', render: t => <strong>{t}</strong> },
    { title: 'Cliente', dataIndex: ['cliente', 'nombre_completo'], key: 'cliente' },
    { title: 'Destinatario', dataIndex: ['destinatario', 'nombre_completo'], key: 'destinatario' },
    { title: 'Reparto', dataIndex: ['destinatario', 'reparto_display'], key: 'reparto' },
    { title: 'Peso Total', dataIndex: 'peso_total_kg', key: 'peso', render: v => `${v || 0} kg` },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: est => (
        <Tag color={est === 'entregado' ? 'green' : est === 'en_cuba' ? 'cyan' : 'blue'}>
          {est?.toUpperCase()}
        </Tag>
      )
    }
  ];

  return (
    <div style={{ padding: '24px', backgroundColor: '#f4f6f9', minHeight: '100vh' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#001529' }}>📊 Control de Operaciones Miami - Holguín</h1>
          <p style={{ color: '#666', margin: '4px 0 0 0' }}>Gestión integrada de bultos, paquetes y entregas con geolocalización.</p>
        </div>
      </div>

      {/* STATS CARDS */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card style={{ borderLeft: '4px solid #1890ff', borderRadius: 8 }}>
            <Statistic title="📦 Recibidos en Miami" value={stats.recibidos || 0} prefix={<DropboxOutlined style={{ color: '#1890ff' }} />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderLeft: '4px solid #722ed1', borderRadius: 8 }}>
            <Statistic title="🧳 Bultos Consolidados" value={stats.consolidados || 0} prefix={<RocketOutlined style={{ color: '#722ed1' }} />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderLeft: '4px solid #13c2c2', borderRadius: 8 }}>
            <Statistic title="🇨🇺 En Sede Holguín" value={stats.en_cuba || 0} prefix={<CompassOutlined style={{ color: '#13c2c2' }} />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderLeft: '4px solid #52c41a', borderRadius: 8 }}>
            <Statistic title="✅ Entregados con Foto" value={stats.entregados || 0} prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} />
          </Card>
        </Col>
      </Row>

      {/* SECCION ACCIONES RAPIDAS */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 8, background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)', color: '#fff' }}>
            <h3 style={{ color: '#fff', margin: 0 }}>1. Recepción Miami</h3>
            <p style={{ fontSize: 12, opacity: 0.9 }}>Registra clientes, destinatarios y paquetes por categoría.</p>
            <Button type="default" icon={<ArrowRightOutlined />} onClick={() => navigate('/paquetes')}>Ir a Recepción</Button>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 8, background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)', color: '#fff' }}>
            <h3 style={{ color: '#fff', margin: 0 }}>2. Confeccionar Bultos (~50kg)</h3>
            <p style={{ fontSize: 12, opacity: 0.9 }}>Agrupa paquetes en maletines e imprime etiqueta.</p>
            <Button type="default" icon={<ArrowRightOutlined />} onClick={() => navigate('/bultos')}>Ir a Bultos</Button>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 8, background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)', color: '#fff' }}>
            <h3 style={{ color: '#fff', margin: 0 }}>3. Sede Holguín</h3>
            <p style={{ fontSize: 12, opacity: 0.9 }}>Recepciona bultos, organiza por reparto y guarda foto de entrega.</p>
            <Button type="default" icon={<ArrowRightOutlined />} onClick={() => navigate('/holguin')}>Ir a Holguín</Button>
          </Card>
        </Col>
      </Row>

      {/* ULTIMOS PAQUETES */}
      <Card title="Últimos Paquetes Registrados" style={{ borderRadius: 8 }}>
        <Table columns={columns} dataSource={ultimosPaquetes} rowKey="id" loading={loading} pagination={false} />
      </Card>
    </div>
  );
};

export default Dashboard;
