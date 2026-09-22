// frontend/src/pages/HolguinPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Input, Button, Tabs, Tag, Upload, Modal, Row, Col, Badge, Space, message, List, Typography, DatePicker, Table, Tooltip, Empty } from 'antd';
import { ScanOutlined, CameraOutlined, CheckCircleOutlined, EnvironmentOutlined, PhoneOutlined, SafetyCertificateOutlined, ReloadOutlined, InboxOutlined, EyeOutlined, SendOutlined, DownloadOutlined } from '@ant-design/icons';
import { getPaquetesPorReparto, registrarEntregaConFoto, recibirYDesembalarBulto, getBultos, getBulto, cambiarEstadoBulto } from '../api/apiService';
import MapaDestinatario from '../components/common/MapaDestinatario';
import { EncabezadoPagina } from '../brand/Brand';

const { Text, Title } = Typography;

const HolguinPage = () => {
  const [codigoBultoInput, setCodigoBultoInput] = useState('');
  const [repartos, setRepartos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paqueteEntrega, setPaqueteEntrega] = useState(null);
  const [modalEntregaOpen, setModalEntregaOpen] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [observacionEntrega, setObservacionEntrega] = useState('');
  const [fechaFiltro, setFechaFiltro] = useState(null);

  // Bultos en vuelo (solicitud #1): visibles y gestionables antes del escaneo
  const [bultosVuelo, setBultosVuelo] = useState([]);
  const [bultoDetalle, setBultoDetalle] = useState(null);
  const [modalBultoOpen, setModalBultoOpen] = useState(false);
  // Solicitud #3: mapa interno para "Ver en mapa" (sin abrir el navegador)
  const [destinatarioMapa, setDestinatarioMapa] = useState(null);

  const bultosConsolidados = bultosVuelo.filter(b => b.estado === 'consolidado');
  const bultosEnTransito = bultosVuelo.filter(b => b.estado === 'en_curso');

  useEffect(() => {
    cargarPaquetesPorReparto();
  }, []);

  const cargarPaquetesPorReparto = async (filtros = {}) => {
    setLoading(true);
    try {
      const res = await getPaquetesPorReparto(filtros);
      setRepartos(res || []);
    } catch (err) {
      console.error('Error al cargar repartos:', err);
      message.error('Error al cargar paquetes por reparto');
    } finally {
      setLoading(false);
    }
  };

  // Solicitud #1: bultos consolidados y en tránsito aéreo
  const cargarBultosVuelo = useCallback(async () => {
    try {
      const res = await getBultos({});
      setBultosVuelo((res || []).filter(b => b.estado === 'consolidado' || b.estado === 'en_curso'));
    } catch (err) {
      console.error('Error al cargar bultos en vuelo:', err);
    }
  }, []);

  useEffect(() => { cargarBultosVuelo(); }, [cargarBultosVuelo]);

  const verBulto = async (id) => {
    try {
      const detalle = await getBulto(id);
      setBultoDetalle(detalle);
      setModalBultoOpen(true);
    } catch (err) {
      message.error('No se pudo cargar el detalle del bulto');
    }
  };

  const cambiarEstado = async (bulto, estado) => {
    try {
      const res = await cambiarEstadoBulto(bulto.id, estado);
      message.success(res.message || 'Estado actualizado');
      setModalBultoOpen(false);
      cargarBultosVuelo();
    } catch (err) {
      message.error(err?.response?.data?.error || 'No se pudo cambiar el estado');
    }
  };

  const handleDesembalarBulto = async (codigoDirecto = null) => {
    const codigo = (typeof codigoDirecto === 'string' ? codigoDirecto : codigoBultoInput).trim();
    if (!codigo) {
      message.warning('Ingrese o escanee el código del bulto');
      return;
    }

    try {
      setLoading(true);
      const res = await recibirYDesembalarBulto(codigo);
      message.success(res.message || 'Bulto desembalado exitosamente');
      setCodigoBultoInput('');
      cargarPaquetesPorReparto();
      cargarBultosVuelo();
    } catch (err) {
      console.error(err);
      const detalle = err.response?.data?.error;
      message.error(detalle || 'Error al desembalar el bulto');
    } finally {
      setLoading(false);
    }
  };

  const handleFiltroFecha = (fecha) => {
    setFechaFiltro(fecha);
    cargarPaquetesPorReparto(fecha ? { fecha: fecha.format('YYYY-MM-DD') } : {});
  };

  const abrirModalEntrega = (paquete) => {
    setPaqueteEntrega(paquete);
    setFileList([]);
    setObservacionEntrega('');
    setModalEntregaOpen(true);
  };

  const handleConfirmarEntrega = async () => {
    if (fileList.length === 0) {
      message.warning('La foto de constancia de entrega es obligatoria');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('foto_entrega', fileList[0].originFileObj);
      formData.append('observacion', observacionEntrega);

      await registrarEntregaConFoto(paqueteEntrega.id, formData);
      message.success(`Paquete ${paqueteEntrega.codigo_seguimiento} entregado con constancia fotográfica estampada`);
      setModalEntregaOpen(false);
      cargarPaquetesPorReparto(fechaFiltro ? { fecha: fechaFiltro.format('YYYY-MM-DD') } : {});
    } catch (err) {
      console.error(err);
      const detalle = err.response?.data?.error;
      message.error(detalle || 'Error al registrar entrega');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, minHeight: '100vh' }}>
      <EncabezadoPagina
        icono="🌴"
        titulo="Operaciones Destino · Holguín"
        subtitulo="Recepcione los bultos del vuelo, organice las entregas por reparto y registre evidencias con foto estampada."
      />

      {/* SECCION 1: BULTOS CONSOLIDADOS (aún en Miami, esperando vuelo) */}
      <Card
        title="📦 1. Bultos Consolidados en Miami (esperando vuelo)"
        style={{ marginBottom: 24, borderRadius: 8, borderColor: '#b37feb' }}
        extra={<Button size="small" icon={<ReloadOutlined />} onClick={cargarBultosVuelo}>Actualizar</Button>}
      >
        {bultosConsolidados.length === 0 ? (
          <Empty description="No hay bultos consolidados pendientes de vuelo" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Table
            rowKey="id"
            size="middle"
            pagination={false}
            dataSource={bultosConsolidados}
            columns={[
              {
                title: 'Código', dataIndex: 'codigo_bulto', key: 'codigo',
                render: t => <strong>{t}</strong>, width: 150,
              },
              {
                title: 'Estado', dataIndex: 'estado_display', key: 'estado', width: 130,
                render: (t, b) => (
                  <Tag color={b.estado === 'en_curso' ? 'orange' : 'purple'}>
                    {b.estado === 'en_curso' ? '✈️' : '📦'} {t}
                  </Tag>
                ),
              },
              {
                title: 'Vuelo', key: 'vuelo', render: (_, b) => `${b.aerolinea || '—'} ${b.numero_vuelo || ''}`,
              },
              {
                title: 'Salida programada', key: 'salida', width: 170,
                render: (_, b) => (b.fecha_hora_salida
                  ? new Date(b.fecha_hora_salida).toLocaleString('es-ES')
                  : (b.fecha_salida || '—')),
              },
              { title: 'Paquetes', dataIndex: 'cantidad_paquetes', key: 'paq', width: 90, align: 'center' },
              { title: 'Peso', key: 'peso', width: 100, render: (_, b) => `${(b.peso_total || 0).toFixed(2)} kg` },
              {
                title: 'Acciones', key: 'acciones', width: 210,
                render: (_, b) => (
                  <Space size={4}>
                    <Tooltip title="Ver detalle del bulto">
                      <Button size="small" icon={<EyeOutlined />} onClick={() => verBulto(b.id)} />
                    </Tooltip>
                    <Tooltip title="Confirmar salida del vuelo (pasa a En tránsito)">
                      <Button size="small" icon={<SendOutlined />} style={{ color: '#fa8c16', borderColor: '#fa8c16' }}
                        onClick={() => cambiarEstado(b, 'en_curso')} />
                    </Tooltip>
                  </Space>
                ),
              },
            ]}
          />
        )}
      </Card>

      {/* SECCION 2: BULTOS EN TRÁNSITO AÉREO (en vuelo hacia Holguín) */}
      <Card
        title="✈️ 2. Bultos en Tránsito Aéreo (Miami → Holguín)"
        style={{ marginBottom: 24, borderRadius: 8, borderColor: '#ffd591' }}
      >
        {bultosEnTransito.length === 0 ? (
          <Empty description="No hay bultos en vuelo ahora mismo" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Table
            rowKey="id"
            size="middle"
            pagination={false}
            dataSource={bultosEnTransito}
            columns={[
              {
                title: 'Código', dataIndex: 'codigo_bulto', key: 'codigo',
                render: t => <strong>{t}</strong>, width: 150,
              },
              {
                title: 'Estado', dataIndex: 'estado_display', key: 'estado', width: 130,
                render: t => <Tag color="orange">✈️ {t}</Tag>,
              },
              { title: 'Vuelo', key: 'vuelo', render: (_, b) => `${b.aerolinea || '—'} ${b.numero_vuelo || ''}` },
              {
                title: 'Salida del vuelo', key: 'salida', width: 170,
                render: (_, b) => (b.fecha_hora_salida
                  ? new Date(b.fecha_hora_salida).toLocaleString('es-ES')
                  : (b.fecha_salida || '—')),
              },
              { title: 'Paquetes', dataIndex: 'cantidad_paquetes', key: 'paq', width: 90, align: 'center' },
              { title: 'Peso', key: 'peso', width: 100, render: (_, b) => `${(b.peso_total || 0).toFixed(2)} kg` },
              {
                title: 'Acciones', key: 'acciones', width: 210,
                render: (_, b) => (
                  <Space size={4}>
                    <Tooltip title="Ver detalle del bulto">
                      <Button size="small" icon={<EyeOutlined />} onClick={() => verBulto(b.id)} />
                    </Tooltip>
                    <Tooltip title="Ya llegó a la sede (equivale a escanear el bulto)">
                      <Button size="small" icon={<DownloadOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a' }}
                        onClick={() => cambiarEstado(b, 'completado')} />
                    </Tooltip>
                  </Space>
                ),
              },
            ]}
          />
        )}
      </Card>

      {/* SECCION 3: LECTURA / ESCANEO DEL BULTO + LISTA CLICABLE */}
      <Card
        title="🛬 3. Lectura / Escaneo del Bulto al Llegar de Aeropuerto"
        style={{ marginBottom: 24, borderRadius: 8, borderColor: '#91d5ff' }}
      >
        <Row gutter={16} align="middle">
          <Col span={16}>
            <Input
              size="large"
              placeholder="Escanee o escriba el código del bulto (ej: BUL-2026-001)"
              prefix={<ScanOutlined style={{ color: '#1890ff' }} />}
              value={codigoBultoInput}
              onChange={e => setCodigoBultoInput(e.target.value)}
              onPressEnter={handleDesembalarBulto}
            />
          </Col>
          <Col span={8}>
            <Button type="primary" size="large" icon={<CheckCircleOutlined />} onClick={handleDesembalarBulto} loading={loading} block style={{ borderRadius: 6 }}>
              Desembalar & Clasificar
            </Button>
          </Col>
        </Row>

        {/* Lista clicable de bultos listos para escanear (solo el código) */}
        {bultosEnTransito.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              👆 Toque el código del bulto que acaba de llegar para escanearlo:
            </Text>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {bultosEnTransito.map(b => (
                <Button
                  key={b.id}
                  size="large"
                  type="dashed"
                  icon={<ScanOutlined />}
                  onClick={() => handleDesembalarBulto(b.codigo_bulto)}
                >
                  {b.codigo_bulto}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* SECCION 4: PAQUETES CLASIFICADOS POR REPARTO */}
      <Card
        title="📍 4. Clasificación Ordenada de Paquetes por Reparto para Entregas Rápidas"
        style={{ borderRadius: 8 }}
        extra={
          <Space>
            <DatePicker
              placeholder="Filtrar por fecha"
              value={fechaFiltro}
              onChange={handleFiltroFecha}
              allowClear
            />
            <Button icon={<ReloadOutlined />} onClick={() => cargarPaquetesPorReparto(fechaFiltro ? { fecha: fechaFiltro.format('YYYY-MM-DD') } : {})}>
              Actualizar
            </Button>
          </Space>
        }
      >
        {repartos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
            No hay paquetes pendientes de distribución en Holguín.
          </div>
        ) : (
          <Tabs
            type="card"
            size="large"
            items={repartos.map(rep => ({
              key: rep.codigo_reparto,
              label: (
                <Space>
                  <strong>{rep.nombre_reparto}</strong>
                  <Badge count={rep.total_paquetes} style={{ backgroundColor: '#52c41a' }} />
                </Space>
              ),
              children: (
                <List
                  grid={{ gutter: 16, column: 2 }}
                  dataSource={rep.paquetes}
                  renderItem={p => (
                    <List.Item>
                      <Card
                        style={{ borderRadius: 8, borderColor: p.estado === 'entregado' ? '#b7eb8f' : '#d9d9d9' }}
                        title={<span style={{ fontSize: 16 }}>📦 <strong>{p.codigo_seguimiento}</strong></span>}
                        extra={<Tag color={p.estado === 'entregado' ? 'green' : 'blue'}>{p.estado_display}</Tag>}
                      >
                        <p><strong>Destinatario:</strong> {p.destinatario?.nombre_completo}</p>
                        <p><strong>CI:</strong> {p.destinatario?.ci || 'N/A'}</p>
                        <p><strong>Dirección:</strong> {p.destinatario?.domicilio_exacto}</p>
                        {p.destinatario?.referencias && <p><strong>Ref:</strong> {p.destinatario.referencias}</p>}
                        <p><strong>Teléfonos Directos:</strong>
                          {p.destinatario?.telefono && (
                            <a href={`tel:${p.destinatario.telefono}`} style={{ marginLeft: 8, fontWeight: 'bold' }}>
                              <PhoneOutlined /> {p.destinatario.telefono}
                            </a>
                          )}
                          {p.destinatario?.telefono2 && (
                            <a href={`tel:${p.destinatario.telefono2}`} style={{ marginLeft: 8, fontWeight: 'bold' }}>
                              <PhoneOutlined /> {p.destinatario.telefono2}
                            </a>
                          )}
                        </p>
                        <p><strong>Contenido:</strong> {p.descripcion || 'Sin descripción'}</p>

                        {p.destinatario?.latitud && p.destinatario?.longitud && (
                          <div style={{ margin: '12px 0' }}>
                            <Button
                              type="dashed"
                              icon={<EnvironmentOutlined />}
                              block
                              onClick={() => window.open(`geo:${p.destinatario.latitud},${p.destinatario.longitud}`, '_blank')}
                            >
                              Navegar GPS a Dirección
                            </Button>
                            <Button
                              type="link"
                              icon={<EnvironmentOutlined />}
                              block
                              onClick={() => setDestinatarioMapa(p.destinatario)}
                            >
                              Ver en mapa interno
                            </Button>
                          </div>
                        )}

                        {p.estado !== 'entregado' ? (
                          <Button
                            type="primary"
                            icon={<CameraOutlined />}
                            block
                            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', height: 40, marginTop: 8 }}
                            onClick={() => abrirModalEntrega(p)}
                          >
                            Registrar Entrega con Foto
                          </Button>
                        ) : (
                          <Tag color="success" style={{ padding: '6px 12px', width: '100%', textAlign: 'center', fontSize: 13 }}>
                            <SafetyCertificateOutlined /> Entregado con foto estampada
                          </Tag>
                        )}
                      </Card>
                    </List.Item>
                  )}
                />
              ),
            }))}
          />
        )}
      </Card>

      {/* MODAL MAPA INTERNO (solicitud #3) */}
      <Modal
        title={`🗺️ Ubicación — ${destinatarioMapa?.nombre_completo || ''}`}
        open={!!destinatarioMapa}
        onCancel={() => setDestinatarioMapa(null)}
        footer={[
          <Button key="cerrar" onClick={() => setDestinatarioMapa(null)}>Cerrar</Button>,
          <Button
            key="gps" type="primary" icon={<EnvironmentOutlined />}
            onClick={() => window.open(`geo:${destinatarioMapa.latitud},${destinatarioMapa.longitud}`, '_blank')}
          >
            Abrir GPS del móvil
          </Button>,
        ]}
        width={720}
      >
        {destinatarioMapa && (
          <MapaDestinatario
            latitud={destinatarioMapa.latitud}
            longitud={destinatarioMapa.longitud}
            nombre={destinatarioMapa.nombre_completo}
          />
        )}
      </Modal>

      {/* MODAL DETALLE DE BULTO (solicitud #1) */}
      <Modal
        title={`📦 Bulto ${bultoDetalle?.codigo_bulto || ''}`}
        open={modalBultoOpen}
        onCancel={() => setModalBultoOpen(false)}
        width={760}
        footer={[
          <Button key="cerrar" onClick={() => setModalBultoOpen(false)}>Cerrar</Button>,
          bultoDetalle?.estado === 'consolidado' && (
            <Button key="salida" type="primary" icon={<SendOutlined />}
              onClick={() => cambiarEstado(bultoDetalle, 'en_curso')}>
              Confirmar salida del vuelo
            </Button>
          ),
          bultoDetalle?.estado === 'en_curso' && (
            <Button key="recibir" type="primary" icon={<DownloadOutlined />} style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              onClick={() => cambiarEstado(bultoDetalle, 'completado')}>
              Ya llegó a la sede (recibir)
            </Button>
          ),
        ]}
      >
        {bultoDetalle && (
          <>
            <Row gutter={16} style={{ marginBottom: 12 }}>
              <Col span={12}><strong>Estado:</strong> {bultoDetalle.estado_display}</Col>
              <Col span={12}><strong>Vuelo:</strong> {bultoDetalle.aerolinea} {bultoDetalle.numero_vuelo}</Col>
              <Col span={12}><strong>Salida programada:</strong> {bultoDetalle.fecha_hora_salida ? new Date(bultoDetalle.fecha_hora_salida).toLocaleString('es-ES') : '—'}</Col>
              <Col span={12}><strong>Peso:</strong> {parseFloat(bultoDetalle.peso_total || 0).toFixed(2)} kg · {bultoDetalle.cantidad_paquetes} paquetes</Col>
            </Row>
            {bultoDetalle.foto_bulto && (
              <img
                src={`http://127.0.0.1:8000${bultoDetalle.foto_bulto}`}
                alt="Foto del bulto"
                style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8, marginBottom: 12 }}
              />
            )}
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={bultoDetalle.paquetes || []}
              columns={[
                { title: 'Código', dataIndex: 'codigo_seguimiento', key: 'cod' },
                { title: 'Destinatario', key: 'dest', render: (_, p) => p.destinatario?.nombre_completo },
                { title: 'Reparto', key: 'rep', render: (_, p) => p.destinatario?.reparto_display || '—' },
                { title: 'Estado', dataIndex: 'estado_display', key: 'est', render: t => <Tag>{t}</Tag> },
              ]}
            />
          </>
        )}
      </Modal>

      {/* MODAL EVIDENCIA DE ENTREGA */}
      <Modal
        title={`📸 Registrar Constancia de Entrega (${paqueteEntrega?.codigo_seguimiento})`}
        open={modalEntregaOpen}
        onCancel={() => setModalEntregaOpen(false)}
        onOk={handleConfirmarEntrega}
        okText="Confirmar Entrega"
        cancelText="Cancelar"
        confirmLoading={loading}
      >
        <div style={{ marginBottom: 16 }}>
          <p><strong>Destinatario:</strong> {paqueteEntrega?.destinatario?.nombre_completo}</p>
          <p><strong>Dirección de Entrega:</strong> {paqueteEntrega?.destinatario?.domicilio_exacto}</p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label><strong>Fotografía de la Entrega (Obligatorio):</strong></label>
          <Upload
            beforeUpload={() => false}
            maxCount={1}
            fileList={fileList}
            onChange={({ fileList }) => setFileList(fileList)}
          >
            <Button icon={<CameraOutlined />} block size="large" style={{ marginTop: 8 }}>Capturar / Cargar Foto</Button>
          </Upload>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6 }}>
            ℹ️ El sistema estampará automáticamente la marca de agua con la leyenda "ENTREGADO - Día Fecha Hora" en la foto.
          </Text>
        </div>

        <div>
          <label><strong>Observaciones:</strong></label>
          <Input.TextArea
            rows={2}
            value={observacionEntrega}
            onChange={e => setObservacionEntrega(e.target.value)}
            placeholder="Notas sobre el estado de la entrega..."
          />
        </div>
      </Modal>
    </div>
  );
};

export default HolguinPage;
