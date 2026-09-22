/**
 * frontend/src/pages/RegistrosPage.jsx
 * Ubicación: Miami305/frontend/src/pages/RegistrosPage.jsx
 *
 * DESCRIPCIÓN:
 * Página de Registros (corrección #15): bitácora con el historial de
 * cambios de estado de los paquetes (quién, cuándo y por qué) y las
 * entregas realizadas en Holguín. Permite filtrar por fecha y estado.
 *
 * NOTA: el contenido de cada pestaña va en items[].children (con antd,
 * los hijos del <Tabs> se ignoran si se usa la prop items).
 */
import React, { useEffect, useState } from 'react';
import { Table, Card, Tabs, Tag, Input, DatePicker, Space, Empty, message, Typography } from 'antd';
import { getRegistros, getRegistrosEntregas } from '../api/apiService';

const { Text } = Typography;

const COLOR_ESTADO = {
  recibido: 'blue',
  consolidado: 'purple',
  en_transito: 'orange',
  en_cuba: 'cyan',
  entregado: 'green',
};

const MEDIA_BASE = 'http://127.0.0.1:8000';

const RegistrosPage = () => {
  const [tab, setTab] = useState('estados');
  const [registros, setRegistros] = useState([]);
  const [entregas, setEntregas] = useState([]);
  const [cargandoEstados, setCargandoEstados] = useState(false);
  const [cargandoEntregas, setCargandoEntregas] = useState(false);
  const [fecha, setFecha] = useState(null);
  const [estado, setEstado] = useState('');
  const [buscado, setBuscado] = useState(false);

  // Carga de cambios de estado
  const cargarRegistros = async (f = fecha, e = estado) => {
    setCargandoEstados(true);
    setBuscado(true);
    try {
      const params = {};
      if (f) params.fecha = f.format('YYYY-MM-DD');
      if (e) params.estado = e;
      const data = await getRegistros(params);
      setRegistros(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error(err);
      message.error('Error al cargar los registros de estados');
    } finally {
      setCargandoEstados(false);
    }
  };

  // Carga de entregas
  const cargarEntregas = async (f = fecha) => {
    setCargandoEntregas(true);
    setBuscado(true);
    try {
      const params = {};
      if (f) params.fecha = f.format('YYYY-MM-DD');
      const data = await getRegistrosEntregas(params);
      setEntregas(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error(err);
      message.error('Error al cargar las entregas');
    } finally {
      setCargandoEntregas(false);
    }
  };

  // Carga inicial
  useEffect(() => {
    if (tab === 'estados') {
      cargarRegistros(fecha, estado);
    } else {
      cargarEntregas(fecha);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const columnasEstados = [
    {
      title: 'Fecha y hora',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 180,
      render: (f) => (f ? new Date(f).toLocaleString('es-ES') : '—'),
    },
    {
      title: 'Paquete',
      key: 'paquete',
      render: (_, r) => <strong>{r?.paquete?.codigo_seguimiento || '—'}</strong>,
    },
    {
      title: 'De',
      dataIndex: 'estado_anterior',
      key: 'estado_anterior',
      width: 130,
      render: (e) => (e ? <Tag color={COLOR_ESTADO[e] || 'default'}>{e}</Tag> : <Tag>inicio</Tag>),
    },
    {
      title: 'A',
      dataIndex: 'estado_nuevo',
      key: 'estado_nuevo',
      width: 130,
      render: (e) => <Tag color={COLOR_ESTADO[e] || 'default'}>{e}</Tag>,
    },
    {
      title: 'Usuario',
      key: 'usuario',
      render: (_, r) => r?.usuario?.username || 'sistema',
    },
    {
      title: 'Observación',
      dataIndex: 'observacion',
      key: 'observacion',
      ellipsis: true,
    },
  ];

  const columnasEntregas = [
    {
      title: 'Fecha y hora',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 180,
      render: (f) => (f ? new Date(f).toLocaleString('es-ES') : '—'),
    },
    {
      title: 'Paquete',
      key: 'paquete',
      render: (_, r) => <strong>{r?.paquete?.codigo_seguimiento || '—'}</strong>,
    },
    {
      title: 'Destinatario',
      key: 'destinatario',
      render: (_, r) => r?.destinatario?.nombre_completo || '—',
    },
    {
      title: 'Reparto',
      key: 'reparto',
      render: (_, r) => r?.destinatario?.reparto_display || '—',
    },
    {
      title: 'Entregado por',
      key: 'usuario',
      render: (_, r) => r?.usuario?.username || '—',
    },
    {
      title: 'Constancia',
      key: 'foto',
      render: (_, r) => {
        if (!r?.foto_entrega) return '—';
        const url = r.foto_entrega.startsWith('http')
          ? r.foto_entrega
          : `${MEDIA_BASE}${r.foto_entrega}`;
        return <a href={url} target="_blank" rel="noreferrer">📷 Ver foto estampada</a>;
      },
    },
  ];

  const filtros = (
    <Space>
      {tab === 'estados' && (
        <Input
          placeholder="Filtrar por estado (ej: en_transito)"
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          onPressEnter={() => cargarRegistros(fecha, estado)}
          allowClear
          style={{ width: 240 }}
          autoComplete="off"
        />
      )}
      <DatePicker
        value={fecha}
        onChange={(f) => {
          setFecha(f);
          if (tab === 'estados') cargarRegistros(f, estado);
          else cargarEntregas(f);
        }}
        placeholder="Filtrar por fecha"
        format="DD/MM/YYYY"
        allowClear
      />
      <Text type="secondary">
        {tab === 'estados'
          ? `${registros.length} registros`
          : `${entregas.length} entregas`}
      </Text>
    </Space>
  );

  return (
    <div style={{ padding: 24, backgroundColor: '#f4f6f9', minHeight: '100vh' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontWeight: 700, color: '#001529' }}>📖 Registros</h2>
        <p style={{ color: '#666', margin: 0 }}>
          Bitácora completa del sistema: cambios de estado de paquetes y entregas realizadas en Holguín.
        </p>
      </div>

      <Card style={{ borderRadius: 8 }}>
        <Tabs
          activeKey={tab}
          onChange={setTab}
          tabBarExtraContent={filtros}
          items={[
            {
              key: 'estados',
              label: '🔄 Cambios de estado',
              children: (
                <Table
                  columns={columnasEstados}
                  dataSource={registros}
                  rowKey={(r) => `${r?.paquete?.id || r?.paquete}-${r?.fecha}`}
                  loading={cargandoEstados}
                  size="small"
                  locale={{ emptyText: <Empty description="Sin registros de cambios de estado" /> }}
                  pagination={{ pageSize: 15, showTotal: (t) => `Total ${t} registros` }}
                />
              ),
            },
            {
              key: 'entregas',
              label: '✅ Entregas (Holguín)',
              children: (
                <Table
                  columns={columnasEntregas}
                  dataSource={entregas}
                  rowKey={(r) => `${r?.paquete?.id || r?.paquete}-${r?.fecha}`}
                  loading={cargandoEntregas}
                  size="small"
                  locale={{ emptyText: <Empty description="Sin entregas registradas" /> }}
                  pagination={{ pageSize: 15, showTotal: (t) => `Total ${t} entregas` }}
                />
              ),
            },
          ]}
        />
        {buscado && registros.length === 0 && tab === 'estados' && !cargandoEstados && null}
      </Card>
    </div>
  );
};

export default RegistrosPage;
