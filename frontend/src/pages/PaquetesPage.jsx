// frontend/src/pages/PaquetesPage.jsx
import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Input, Select, Badge, Modal, message } from 'antd';
import { PlusOutlined, EyeOutlined, CheckOutlined, SearchOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { getPaquetes, consolidarPaquetes as consolidarApi } from '../api/apiService';

const { Option } = Select;

const PaquetesPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [paquetes, setPaquetes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [selectedPaquetes, setSelectedPaquetes] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [total, setTotal] = useState(0);

  const cargarPaquetes = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (filtroEstado) params.estado = filtroEstado;
      
      const data = await getPaquetes(params);
      setPaquetes(data.results || data || []);
      setTotal(data.count || data.length || 0);
    } catch (error) {
      console.error('❌ Error al cargar paquetes:', error);
      message.error('Error al cargar paquetes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPaquetes();
  }, [searchTerm, filtroEstado]);

  const handleSearch = (value) => {
    setSearchTerm(value);
  };

  const handleEstadoFilter = (value) => {
    setFiltroEstado(value);
  };

  const handleConsolidar = () => {
    if (selectedPaquetes.length < 2) {
      message.warning('Selecciona al menos 2 paquetes para consolidar');
      return;
    }
    setModalVisible(true);
  };

  const confirmarConsolidacion = async () => {
    try {
      setLoading(true);
      await consolidarApi(selectedPaquetes, {
        observaciones: 'Consolidación manual desde el sistema'
      });
      setModalVisible(false);
      setSelectedPaquetes([]);
      message.success('Paquetes consolidados exitosamente');
      cargarPaquetes();
    } catch (error) {
      console.error('❌ Error al consolidar:', error);
      message.error('Error al consolidar paquetes');
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado) => {
    const colors = {
      recibido: 'blue',
      consolidado: 'purple',
      en_transito: 'orange',
      en_cuba: 'cyan',
      entregado: 'green',
    };
    return colors[estado] || 'default';
  };

  const getEstadoBadge = (estado) => {
    const labels = {
      recibido: '📋 Recibido',
      consolidado: '📦 Consolidado',
      en_transito: '✈️ En Tránsito',
      en_cuba: '🇨🇺 En Cuba',
      entregado: '✅ Entregado',
    };
    return labels[estado] || estado;
  };

  const columns = [
    {
      title: 'Código',
      dataIndex: 'codigo_seguimiento',
      key: 'codigo',
      fixed: 'left',
      width: 150,
    },
    {
      title: 'Cliente',
      dataIndex: ['cliente', 'nombre_completo'],
      key: 'cliente',
      render: (text) => text || 'N/A',
    },
    {
      title: 'Destinatario',
      dataIndex: ['destinatario', 'nombre_completo'],
      key: 'destinatario',
      render: (text) => text || 'N/A',
    },
    {
      title: 'Peso (kg)',
      dataIndex: 'peso_kg',
      key: 'peso',
      render: (peso) => `${peso || 0} kg`,
    },
    {
      title: 'Tarifa ($)',
      dataIndex: 'tarifa',
      key: 'tarifa',
      render: (tarifa) => `$${tarifa?.toFixed(2) || '0.00'}`,
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
      render: (fecha) => fecha ? new Date(fecha).toLocaleDateString('es-ES') : 'N/A',
    },
    {
      title: 'Acciones',
      key: 'acciones',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => navigate(`/paquetes/${record.id}`)}
          />
          {record.estado === 'recibido' && (
            <Button
              type="default"
              icon={<CheckOutlined />}
              size="small"
              onClick={() => handleCambiarEstado(record.id, 'consolidado')}
            />
          )}
        </Space>
      ),
    },
  ];

  const handleCambiarEstado = async (id, estado) => {
    // Implementar cambio de estado
    message.info('Funcionalidad en desarrollo');
  };

  const rowSelection = {
    type: 'checkbox',
    onChange: (selectedRowKeys) => setSelectedPaquetes(selectedRowKeys),
    selectedRowKeys: selectedPaquetes,
    getCheckboxProps: (record) => ({
      disabled: record.estado !== 'recibido',
    }),
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>Gestión de Paquetes</h2>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/paquetes/nuevo')}
          >
            Nuevo Paquete
          </Button>
          <Button
            type="default"
            icon={<CheckOutlined />}
            onClick={handleConsolidar}
            disabled={selectedPaquetes.length < 2}
          >
            Consolidar ({selectedPaquetes.length})
          </Button>
        </Space>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Input
          placeholder="Buscar por código, cliente..."
          prefix={<SearchOutlined />}
          style={{ width: 300 }}
          onChange={(e) => handleSearch(e.target.value)}
          value={searchTerm}
          allowClear
        />
        <Select
          placeholder="Filtrar por estado"
          style={{ width: 200 }}
          onChange={handleEstadoFilter}
          value={filtroEstado || undefined}
          allowClear
        >
          <Option value="recibido">📋 Recibido</Option>
          <Option value="consolidado">📦 Consolidado</Option>
          <Option value="en_transito">✈️ En Tránsito</Option>
          <Option value="en_cuba">🇨🇺 En Cuba</Option>
          <Option value="entregado">✅ Entregado</Option>
        </Select>
        <span style={{ marginLeft: 'auto', color: '#666' }}>
          Total: {total} paquetes
        </span>
      </div>

      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={paquetes}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1200 }}
        pagination={{
          total: total,
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} paquetes`,
        }}
      />

      <Modal
        title="Confirmar Consolidación"
        open={modalVisible}
        onOk={confirmarConsolidacion}
        onCancel={() => setModalVisible(false)}
        okText="Consolidar"
        cancelText="Cancelar"
        confirmLoading={loading}
      >
        <p>Se consolidarán <strong>{selectedPaquetes.length}</strong> paquetes en un solo bulto.</p>
        <p>¿Deseas continuar con la consolidación?</p>
      </Modal>
    </div>
  );
};

export default PaquetesPage;