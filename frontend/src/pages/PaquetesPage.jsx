// frontend/src/pages/PaquetesPage.jsx
// Gestión de Paquetes (Miami).
// Corrección #6: edición de paquetes + selección para consolidar.
// Corrección #9: sin acción "En tránsito" manual (solo vía bulto/vuelo).
// Corrección #11: el detalle muestra la foto de recepción y la de entrega.
// Corrección #16: filtro por defecto "no entregados".
import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Input, Select, Badge, Modal, Descriptions, Image, message } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, InboxOutlined, SearchOutlined, FilePdfOutlined } from '@ant-design/icons';
import { getPaquetes, getPaquete, consolidarPaquetes as consolidarApi, getFacturaUrl } from '../api/apiService';
import NuevoPaqueteModal from './NuevoPaqueteModal';

const { Option } = Select;

const MEDIA_BASE = 'http://127.0.0.1:8000';

const PaquetesPage = () => {
  const [paquetes, setPaquetes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('activos'); // #16: solo no entregados por defecto
  const [selectedPaquetes, setSelectedPaquetes] = useState([]);
  const [modalConsolidarVisible, setModalConsolidarVisible] = useState(false);
  const [modalNuevoVisible, setModalNuevoVisible] = useState(false);
  const [paqueteEditar, setPaqueteEditar] = useState(null);
  const [paqueteDetalle, setPaqueteDetalle] = useState(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const cargarPaquetes = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (filtroEstado && filtroEstado !== 'activos' && filtroEstado !== 'todos') params.estado = filtroEstado;

      const data = await getPaquetes(params);
      let lista = data.results || data || [];
      // Corrección #16: "activos" = todos los paquetes que aún no están entregados
      if (filtroEstado === 'activos') {
        lista = lista.filter(p => p.estado !== 'entregado');
      }
      setPaquetes(lista);
      setTotal(data.count ?? lista.length);
    } catch (error) {
      console.error('❌ Error al cargar paquetes:', error);
      message.error('Error al cargar paquetes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPaquetes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filtroEstado]);

  const handleConsolidar = () => {
    if (selectedPaquetes.length < 1) {
      message.warning('Selecciona al menos 1 paquete para consolidar');
      return;
    }
    setModalConsolidarVisible(true);
  };

  const confirmarConsolidacion = async () => {
    try {
      setLoading(true);
      await consolidarApi(selectedPaquetes, {
        observaciones: 'Consolidación manual desde Gestión de Paquetes'
      });
      setModalConsolidarVisible(false);
      setSelectedPaquetes([]);
      message.success('Paquetes consolidados en bulto exitosamente');
      cargarPaquetes();
    } catch (error) {
      console.error('❌ Error al consolidar:', error);
      message.error(error?.response?.data?.error || 'Error al consolidar paquetes');
    } finally {
      setLoading(false);
    }
  };

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
      title: 'Bulto',
      dataIndex: 'codigo_bulto',
      key: 'bulto',
      render: (bulto) => bulto ? <Tag color="geekblue">{bulto}</Tag> : <span style={{ color: '#bbb' }}>—</span>,
    },
    {
      title: 'Peso (kg)',
      dataIndex: 'peso_total_kg',
      key: 'peso',
      render: (peso) => `${peso || 0} kg`,
    },
    {
      title: 'Tarifa ($)',
      dataIndex: 'tarifa',
      key: 'tarifa',
      render: (tarifa) => `$${Number(tarifa ?? 0).toFixed(2)}`,
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
      width: 140,
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            size="small"
            title="Ver detalle"
            loading={detalleLoading && paqueteDetalle?.id === record.id}
            onClick={() => verDetalle(record.id)}
          />
          {record.estado === 'recibido' && (
            <Button
              type="default"
              icon={<EditOutlined />}
              size="small"
              title="Editar paquete"
              onClick={() => setPaqueteEditar(record)}
            />
          )}
          <Button
            type="default"
            icon={<FilePdfOutlined />}
            size="small"
            title="Descargar Factura PDF"
            onClick={() => window.open(getFacturaUrl(record.id), '_blank')}
          />
        </Space>
      ),
    },
  ];

  const verDetalle = async (id) => {
    setDetalleLoading(true);
    try {
      const data = await getPaquete(id);
      setPaqueteDetalle(data);
    } catch (error) {
      console.error('❌ Error al cargar detalle:', error);
      message.error('Error al cargar el detalle del paquete');
    } finally {
      setDetalleLoading(false);
    }
  };

  const urlMedia = (ruta) => {
    if (!ruta) return null;
    return ruta.startsWith('http') ? ruta : `${MEDIA_BASE}${ruta}`;
  };

  const rowSelection = {
    type: 'checkbox',
    selectedRowKeys: selectedPaquetes,
    onChange: (keys) => setSelectedPaquetes(keys),
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
            onClick={() => setModalNuevoVisible(true)}
          >
            Nuevo Paquete
          </Button>
          <Button
            type="primary"
            ghost
            icon={<InboxOutlined />}
            onClick={handleConsolidar}
            disabled={selectedPaquetes.length < 1}
            title="Los paquetes seleccionados se agrupan en un bulto con código propio"
          >
            Consolidar en Bulto ({selectedPaquetes.length})
          </Button>
        </Space>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Input
          placeholder="Buscar por código, cliente..."
          prefix={<SearchOutlined />}
          style={{ width: 300 }}
          onChange={(e) => setSearchTerm(e.target.value)}
          value={searchTerm}
          allowClear
        />
        <Select
          placeholder="Filtrar por estado"
          style={{ width: 220 }}
          onChange={setFiltroEstado}
          value={filtroEstado}
        >
          <Option value="activos">🔄 No entregados (en curso)</Option>
          <Option value="todos">Todos</Option>
          <Option value="recibido">📋 Recibido</Option>
          <Option value="consolidado">📦 Consolidado</Option>
          <Option value="en_transito">✈️ En Tránsito</Option>
          <Option value="en_cuba">🌴 En Cuba</Option>
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
          showTotal: (t) => `Total ${t} paquetes`,
        }}
      />

      {/* CONFIRMACIÓN DE CONSOLIDACIÓN */}
      <Modal
        title="Confirmar Consolidación en Bulto"
        open={modalConsolidarVisible}
        onOk={confirmarConsolidacion}
        onCancel={() => setModalConsolidarVisible(false)}
        okText="Consolidar"
        cancelText="Cancelar"
        confirmLoading={loading}
      >
        <p>Se agruparán <strong>{selectedPaquetes.length}</strong> paquetes en un bulto con código propio.</p>
        <p style={{ color: '#888', fontSize: 12 }}>
          Los paquetes heredarán el código del bulto y pasarán a estado <strong>Consolidado</strong>.
          Pasarán a <strong>En tránsito</strong> automáticamente a la hora de salida del vuelo
          (o al pulsar "Marcar salida" en Seguimiento de Bultos).
        </p>
      </Modal>

      {/* ALTA / EDICIÓN DE PAQUETE */}
      <NuevoPaqueteModal
        open={modalNuevoVisible || !!paqueteEditar}
        onClose={() => {
          setModalNuevoVisible(false);
          setPaqueteEditar(null);
        }}
        onSuccess={cargarPaquetes}
        paqueteEditar={paqueteEditar}
      />

      {/* DETALLE CON FOTOS (#11) */}
      <Modal
        title={`📦 Detalle ${paqueteDetalle?.codigo_seguimiento || ''}`}
        open={!!paqueteDetalle}
        onCancel={() => setPaqueteDetalle(null)}
        width={720}
        footer={[
          <Button key="pdf" type="primary" icon={<FilePdfOutlined />} onClick={() => window.open(getFacturaUrl(paqueteDetalle.id), '_blank')}>
            Factura PDF
          </Button>,
          <Button key="cerrar" onClick={() => setPaqueteDetalle(null)}>Cerrar</Button>,
        ]}
      >
        {paqueteDetalle && (
          <div>
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="Estado" span={2}>
                <Tag color={getEstadoColor(paqueteDetalle.estado)}>{paqueteDetalle.estado_display}</Tag>
                {paqueteDetalle.codigo_bulto && (
                  <Tag color="geekblue">Bulto {paqueteDetalle.codigo_bulto}</Tag>
                )}
                {paqueteDetalle.fecha_salida_vuelo && (
                  <Tag>Salida vuelo: {new Date(paqueteDetalle.fecha_salida_vuelo).toLocaleString('es-ES')}</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Cliente">
                {paqueteDetalle.cliente?.nombre_completo}{' '}
                {paqueteDetalle.cliente?.telefono && (
                  <a href={`tel:${paqueteDetalle.cliente.telefono}`}>({paqueteDetalle.cliente.telefono})</a>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Destinatario">
                {paqueteDetalle.destinatario?.nombre_completo}{' '}
                {paqueteDetalle.destinatario?.telefono && (
                  <a href={`tel:${paqueteDetalle.destinatario.telefono}`}>({paqueteDetalle.destinatario.telefono})</a>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Dirección" span={2}>
                {paqueteDetalle.destinatario?.domicilio_exacto}
                {paqueteDetalle.destinatario?.reparto_display ? `, ${paqueteDetalle.destinatario.reparto_display}` : ''}
                {paqueteDetalle.destinatario?.municipio_display ? `, ${paqueteDetalle.destinatario.municipio_display}` : ''}
              </Descriptions.Item>
              <Descriptions.Item label="Peso total">{paqueteDetalle.peso_total_kg} kg</Descriptions.Item>
              <Descriptions.Item label="Tarifa">${Number(paqueteDetalle.tarifa ?? 0).toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="Entrega estimada">
                {paqueteDetalle.fecha_entrega_estimada || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Entrega real">
                {paqueteDetalle.fecha_entrega_real
                  ? new Date(paqueteDetalle.fecha_entrega_real).toLocaleString('es-ES')
                  : '—'}
              </Descriptions.Item>
            </Descriptions>

            {/* FOTOS: recepción (paquete listo) y entrega (#11) */}
            <div style={{ marginTop: 16 }}>
              <h4 style={{ marginBottom: 8 }}>📸 Fotografías</h4>
              <Space size="large" wrap>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#666' }}>Recepción (paquete listo)</p>
                  {urlMedia(paqueteDetalle.foto) ? (
                    <Image
                      src={urlMedia(paqueteDetalle.foto)}
                      alt="Foto del paquete"
                      width={180}
                      style={{ borderRadius: 6, border: '1px solid #eee' }}
                    />
                  ) : (
                    <div style={{
                      width: 180, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: '#fafafa', border: '1px dashed #ddd', borderRadius: 6, color: '#bbb', fontSize: 12,
                    }}>
                      Sin foto de recepción
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#666' }}>Constancia de entrega</p>
                  {paqueteDetalle.foto_entrega && urlMedia(paqueteDetalle.foto_entrega) ? (
                    <Image
                      src={urlMedia(paqueteDetalle.foto_entrega)}
                      alt="Constancia de entrega"
                      width={180}
                      style={{ borderRadius: 6, border: '1px solid #eee' }}
                    />
                  ) : (
                    <div style={{
                      width: 180, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: '#fafafa', border: '1px dashed #ddd', borderRadius: 6, color: '#bbb', fontSize: 12,
                    }}>
                      {paqueteDetalle.estado === 'entregado'
                        ? 'Sin constancia registrada'
                        : 'Disponible al entregar'}
                    </div>
                  )}
                </div>
              </Space>
            </div>

            <div style={{ marginTop: 16 }}>
              <p style={{ marginBottom: 4 }}><strong>Descripción:</strong></p>
              <pre style={{ whiteSpace: 'pre-wrap', background: '#fafafa', padding: 8, borderRadius: 6, fontSize: 12 }}>
                {paqueteDetalle.descripcion}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PaquetesPage;
