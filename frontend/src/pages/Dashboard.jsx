// frontend/src/pages/Dashboard.jsx
// Panel Principal.
// Corrección #16: datos reales desde el backend y "Últimos paquetes"
// muestra todos los paquetes que NO han llegado a entregarse.
import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Badge, message, Spin } from 'antd';
import {
  InboxOutlined, DatabaseOutlined, UserOutlined, DollarOutlined,
  SendOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { getStats, getPaquetes } from '../api/apiService';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [paquetesPendientes, setPaquetesPendientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        // Datos reales del backend
        const res = await getStats();
        setStats(res);

        // Corrección #16: todos los paquetes no entregados, más recientes primero
        const data = await getPaquetes({});
        const lista = data.results || data || [];
        setPaquetesPendientes(lista.filter(p => p.estado !== 'entregado'));
      } catch (err) {
        console.error('Error al cargar el dashboard:', err);
        message.error('Error al cargar los datos del panel');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const getEstadoColor = (estado) => ({
    recibido: 'blue',
    consolidado: 'purple',
    en_transito: 'orange',
    en_cuba: 'cyan',
    entregado: 'green',
  }[estado] || 'default');

  const getEstadoBadge = (estado) => ({
    recibido: '📋 Recibido',
    consolidado: '📦 Consolidado',
    en_transito: '✈️ En Tránsito',
    en_cuba: '🌴 En Cuba',
    entregado: '✅ Entregado',
  }[estado] || estado);

  const columns = [
    {
      title: 'Código',
      dataIndex: 'codigo_seguimiento',
      key: 'codigo',
      render: (t) => <strong>{t}</strong>,
    },
    {
      title: 'Cliente',
      dataIndex: ['cliente', 'nombre_completo'],
      key: 'cliente',
      render: (t) => t || 'N/A',
    },
    {
      title: 'Destinatario',
      dataIndex: ['destinatario', 'nombre_completo'],
      key: 'destinatario',
      render: (t) => t || 'N/A',
    },
    {
      title: 'Peso (kg)',
      dataIndex: 'peso_total_kg',
      key: 'peso',
      render: (v) => `${v || 0} kg`,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado) => (
        <Badge color={getEstadoColor(estado)} text={getEstadoBadge(estado)} />
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha_recepcion',
      key: 'fecha',
      render: (f) => (f ? new Date(f).toLocaleDateString('es-ES') : '—'),
    },
  ];

  // Mapeo flexible de claves del backend (varios formatos históricos)
  const s = stats || {};
  const recibidos = s.paquetes_recibidos ?? s.recibidos ?? 0;
  const enCurso = (s.paquetes_en_transito ?? s.en_transito ?? 0) + (s.paquetes_consolidados ?? s.consolidados ?? 0);
  const enCuba = s.paquetes_en_cuba ?? s.en_cuba ?? 0;
  const entregados = s.paquetes_entregados ?? s.entregados ?? 0;
  const totalClientes = s.total_clientes ?? s.clientes ?? 0;
  const ingresos = Number(s.ingresos_totales ?? s.ingresos_mes ?? s.ingresos ?? 0);
  const bultosActivos = s.bultos_activos ?? null;

  return (
    <div style={{ padding: 24, backgroundColor: '#f4f6f9', minHeight: '100vh' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontWeight: 700, color: '#001529' }}>📊 Panel Principal</h2>
        <p style={{ color: '#666', margin: 0 }}>Estado operativo en tiempo real de la agencia.</p>
      </div>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic title="Paquetes Recibidos" value={recibidos} prefix={<InboxOutlined />} valueStyle={{ color: '#1890ff' }} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic title="En Curso (bulto/vuelo)" value={enCurso} prefix={<SendOutlined />} valueStyle={{ color: '#722ed1' }} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic title="En Cuba (por entregar)" value={enCuba} prefix={<DatabaseOutlined />} valueStyle={{ color: '#13c2c2' }} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic title="Entregados" value={entregados} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic title="Clientes" value={totalClientes} prefix={<UserOutlined />} valueStyle={{ color: '#fa8c16' }} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic title="Ingresos ($)" value={ingresos} precision={2} prefix={<DollarOutlined />} valueStyle={{ color: '#389e0d' }} />
            </Card>
          </Col>
        </Row>

        {bultosActivos !== null && (
          <Card style={{ marginTop: 16, borderRadius: 8 }}>
            <Statistic title="Bultos activos (consolidados / en vuelo)" value={bultosActivos} prefix={<SendOutlined />} />
          </Card>
        )}

        <Card
          title="📦 Paquetes sin entregar"
          style={{ marginTop: 16, borderRadius: 8 }}
          extra={<a onClick={() => navigate('/paquetes')}>Ver todos en Gestión de Paquetes</a>}
        >
          <Table
            columns={columns}
            dataSource={paquetesPendientes}
            rowKey="id"
            size="small"
            loading={loading}
            pagination={{ pageSize: 8, showTotal: (t) => `${t} paquetes pendientes de entrega` }}
          />
        </Card>
      </Spin>
    </div>
  );
};

export default Dashboard;
