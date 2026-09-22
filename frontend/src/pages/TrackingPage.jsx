/**
 * frontend/src/pages/TrackingPage.jsx
 * Ubicación: Miami305/frontend/src/pages/TrackingPage.jsx
 *
 * DESCRIPCIÓN:
 * Localizador público de paquetes (sin iniciar sesión).
 * Corrección #18: muestra los datos reales del paquete y su estado con
 * una línea de tiempo basada en el historial del backend.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Input, Tag, Steps, Descriptions, Button, Space, message, Result, Typography } from 'antd';
import { SearchOutlined, ArrowLeftOutlined, LoginOutlined, ClearOutlined, FilePdfOutlined } from '@ant-design/icons';
import { getTrackingPublico } from '../api/apiService';

// PDF de la constancia de rastreo (público, por código)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/';
const urlPdfRastreo = (codigo) => `${API_BASE}tracking/publico/${encodeURIComponent(codigo)}/pdf/`;

const { Text } = Typography;

const ORDEN_ESTADOS = ['recibido', 'consolidado', 'en_transito', 'en_cuba', 'entregado'];
const NOMBRES_ESTADOS = {
  recibido: 'Recibido en Miami',
  consolidado: 'Consolidado en bulto',
  en_transito: 'En tránsito aéreo',
  en_cuba: 'En Cuba (Holguín)',
  entregado: 'Entregado',
};

const TrackingPage = () => {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState('');
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  // Vuelve atrás si la navegación fue interna (react-router guarda el índice
  // en history.state); si se llegó directamente a /tracking, va al login.
  const volver = () => {
    const idx = window.history.state?.idx ?? 0;
    if (idx > 0) {
      navigate(-1);
    } else {
      navigate('/login');
    }
  };

  // Limpia el resultado para hacer otra consulta sin recargar la página
  const nuevaConsulta = () => {
    setResultado(null);
    setError(null);
    setCodigo('');
  };

  const buscar = async (valor) => {
    const cod = (valor ?? codigo).trim();
    if (!cod) {
      message.warning('Escriba el código de seguimiento que aparece en su factura');
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const data = await getTrackingPublico(cod);
      setResultado(data);
    } catch (err) {
      setResultado(null);
      setError(
        err?.response?.status === 404
          ? 'No existe un paquete con ese código. Verifique e intente de nuevo.'
          : 'No se pudo consultar el estado. Intente más tarde.'
      );
    } finally {
      setCargando(false);
    }
  };

  const pasoActual = resultado ? ORDEN_ESTADOS.indexOf(resultado.estado_clave || 'recibido') : 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #001529 0%, #002140 100%)',
      padding: '40px 16px',
    }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        {/* Barra superior: volver atrás / iniciar sesión (página pública) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            style={{ color: 'rgba(255,255,255,0.85)' }}
            onClick={volver}
          >
            Volver
          </Button>
          <Button
            type="text"
            icon={<LoginOutlined />}
            style={{ color: 'rgba(255,255,255,0.85)' }}
            onClick={() => navigate('/login')}
          >
            Iniciar sesión
          </Button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 44 }}>📦</div>
          <h1 style={{ color: '#fff', margin: '8px 0 4px', fontSize: 28 }}>Rastreo de Paquetes</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', margin: 0 }}>
            Miami 305 Travel · Consulte el estado de su envío con el código de su factura
          </p>
        </div>

        <Card style={{ borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
          <Input.Search
            size="large"
            placeholder="Código de seguimiento (ej: PKG-2026-0001)"
            enterButton={<><SearchOutlined /> Rastrear</>}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            onSearch={buscar}
            loading={cargando}
            autoComplete="off"
            style={{ marginBottom: 8 }}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            El código se entrega en la agencia al registrar el paquete.
          </Text>
        </Card>

        {error && (
          <Card style={{ marginTop: 20, borderRadius: 12 }}>
            <Result
              status="warning"
              title="Sin resultados"
              subTitle={error}
            />
          </Card>
        )}

        {resultado && (
          <Card style={{ marginTop: 20, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Tag color="geekblue" style={{ fontSize: 16, padding: '6px 16px' }}>
                {resultado.codigo_seguimiento}
              </Tag>
              <Tag
                color={resultado.estado_clave === 'entregado' ? 'green' : 'orange'}
                style={{ fontSize: 16, padding: '6px 16px' }}
              >
                {resultado.estado_actual}
              </Tag>
            </div>

            {/* Línea de tiempo del estado */}
            <Steps
              direction="horizontal"
              size="small"
              current={pasoActual < 0 ? 0 : pasoActual}
              items={ORDEN_ESTADOS.map((e, i) => ({
                title: NOMBRES_ESTADOS[e],
                status: i <= pasoActual ? (i === pasoActual ? 'process' : 'finish') : 'wait',
              }))}
              style={{ marginBottom: 24 }}
            />

            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Destinatario">{resultado.destinatario}</Descriptions.Item>
              <Descriptions.Item label="Destino">
                {[resultado.reparto, resultado.municipio, resultado.provincia].filter(Boolean).join(', ')}
              </Descriptions.Item>
              <Descriptions.Item label="Peso">{resultado.peso_total_kg} kg</Descriptions.Item>
              <Descriptions.Item label="Fecha de recepción">
                {resultado.fecha_recepcion ? new Date(resultado.fecha_recepcion).toLocaleString('es-ES') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Entrega estimada">
                {resultado.fecha_entrega_estimada || 'A coordinar'}
              </Descriptions.Item>
              {resultado.fecha_entrega_real && (
                <Descriptions.Item label="Entregado el">
                  {new Date(resultado.fecha_entrega_real).toLocaleString('es-ES')}
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* Historial de eventos reales */}
            <h4 style={{ marginTop: 20, marginBottom: 8 }}>🕘 Historial del envío</h4>
            {(resultado.eventos || []).length > 0 ? (
              resultado.eventos.map((ev, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', gap: 12, padding: '10px 0',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <div style={{ color: '#1890ff', fontSize: 18 }}>●</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{ev.tipo_nombre}</div>
                    <div style={{ color: '#666', fontSize: 13 }}>{ev.descripcion}</div>
                    <div style={{ color: '#999', fontSize: 12 }}>
                      {new Date(ev.fecha).toLocaleString('es-ES')} · {ev.ubicacion}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <Text type="secondary">Sin eventos registrados aún.</Text>
            )}

            {/* Constancia fotográfica de la entrega (#11/#18) */}
            {resultado.foto_entrega && (
              <div style={{ marginTop: 16 }}>
                <h4 style={{ marginBottom: 8 }}>📷 Constancia de entrega</h4>
                <img
                  src={resultado.foto_entrega}
                  alt="Constancia de entrega"
                  style={{ maxWidth: 320, borderRadius: 8, border: '1px solid #eee' }}
                />
              </div>
            )}

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <Space>
                <Button icon={<ClearOutlined />} onClick={nuevaConsulta}>
                  Nueva consulta
                </Button>
                {/* Exportar la constancia de rastreo a PDF */}
                <Button
                  type="primary"
                  ghost
                  icon={<FilePdfOutlined />}
                  onClick={() => window.open(urlPdfRastreo(resultado.codigo_seguimiento), '_blank')}
                >
                  Exportar a PDF
                </Button>
              </Space>
            </div>
          </Card>
        )}

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)', marginTop: 24, fontSize: 12 }}>
          © {new Date().getFullYear()} Miami 305 Travel — Gracias por elegirnos
        </p>
      </div>
    </div>
  );
};

export default TrackingPage;
