// frontend/src/pages/NuevoPaqueteModal.jsx
// Modal de registro/edición de paquete (Miami).
// Corrección #7: las categorías se eligen con checkboxes clicables
// (etiqueta completa clicable) en lugar de un select desplegable.
// Corrección #6: el mismo componente edita paquetes existentes.
import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, Upload, Button, Row, Col, Card, Divider, Checkbox, message } from 'antd';
import { UploadOutlined, EnvironmentOutlined, SnippetsOutlined } from '@ant-design/icons';
import {
  getClientes, getDestinatariosPorCliente, getCategoriasActivas,
  crearPaquete, actualizarPaquete, getPaquete,
} from '../api/apiService';

const { TextArea } = Input;

const NuevoPaqueteModal = ({ open, onClose, onSuccess, paqueteEditar = null }) => {
  const [form] = Form.useForm();
  const esEdicion = !!paqueteEditar;

  const [clientes, setClientes] = useState([]);
  const [destinatarios, setDestinatarios] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [selectedCatIds, setSelectedCatIds] = useState([]);
  const [descripcionesCat, setDescripcionesCat] = useState({});
  const [loading, setLoading] = useState(false);
  const [pesosCat, setPesosCat] = useState({});
  const [pesoTotal, setPesoTotal] = useState(0);
  const [fileList, setFileList] = useState([]);
  const [fotoActual, setFotoActual] = useState(null);

  // Importador: pegar la relación de artículos de una factura
  const [modalPegar, setModalPegar] = useState(false);
  const [textoPegado, setTextoPegado] = useState('');

  // Coordenadas seleccionadas (solo informativas: provienen del destinatario)
  const [latitud, setLatitud] = useState(20.88691871);
  const [longitud, setLongitud] = useState(-76.25923043);

  useEffect(() => {
    if (!open) return;
    cargarClientes();
    cargarCategorias();
    if (esEdicion) {
      cargarPaquete(paqueteEditar.id);
    } else {
      form.resetFields();
      setSelectedCatIds([]);
      setPesosCat({});
      setDescripcionesCat({});
      setPesoTotal(0);
      setFileList([]);
      setFotoActual(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, paqueteEditar]);

  const cargarClientes = async () => {
    try {
      const res = await getClientes();
      setClientes(res.results || res || []);
    } catch (err) {
      console.error(err);
    }
  };

  const cargarCategorias = async () => {
    try {
      const res = await getCategoriasActivas();
      setCategorias(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  const cargarPaquete = async (id) => {
    try {
      const p = await getPaquete(id);
      form.setFieldsValue({
        cliente_id: p.cliente?.id,
        observaciones: p.observaciones,
      });
      if (p.cliente?.id) {
        const res = await getDestinatariosPorCliente(p.cliente.id);
        setDestinatarios(res || []);
        form.setFieldsValue({ destinatario_id: p.destinatario?.id });
      }
      // Precargar categorías, pesos y descripciones desde el JSON
      const pesos = p.pesos_categoria || {};
      const claves = Object.keys(pesos);
      setSelectedCatIds(claves);
      setPesosCat(Object.fromEntries(claves.map(k => [k, parseFloat(pesos[k]) || 0])));
      setPesoTotal(claves.reduce((a, k) => a + (parseFloat(pesos[k]) || 0), 0));
      // Reconstruir descripciones por categoría desde el texto guardado
      const descs = {};
      (p.descripcion || '').split('\n').forEach(linea => {
        const m = linea.match(/^\[(.+?)\s*-\s*[\d.,]+\s*kg\]\s*:\s*(.*)$/);
        if (m) {
          const cat = categorias.find(c => c.nombre.toLowerCase() === m[1].toLowerCase());
          if (cat) descs[cat.id] = m[2];
        }
      });
      setDescripcionesCat(descs);
      setFotoActual(p.foto || null);
      if (p.destinatario?.latitud) setLatitud(parseFloat(p.destinatario.latitud));
      if (p.destinatario?.longitud) setLongitud(parseFloat(p.destinatario.longitud));
    } catch (err) {
      console.error(err);
      message.error('Error al cargar el paquete');
    }
  };

  const handleClienteChange = async (clienteId) => {
    form.setFieldsValue({ destinatario_id: undefined });
    try {
      const res = await getDestinatariosPorCliente(clienteId);
      setDestinatarios(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDestinatarioChange = (destId) => {
    const dest = destinatarios.find(d => d.id === destId);
    if (dest) {
      if (dest.latitud) setLatitud(parseFloat(dest.latitud));
      if (dest.longitud) setLongitud(parseFloat(dest.longitud));
    }
  };

  const normalizarCatId = (id) => String(id);

  const handleToggleCategoria = (catId, marcado) => {
    const clave = normalizarCatId(catId);
    const nuevas = marcado
      ? [...selectedCatIds, clave]
      : selectedCatIds.filter(k => k !== clave);
    setSelectedCatIds(nuevas);
    if (!marcado) {
      const newPesos = { ...pesosCat };
      const newDesc = { ...descripcionesCat };
      delete newPesos[clave];
      delete newDesc[clave];
      setPesosCat(newPesos);
      setDescripcionesCat(newDesc);
      setPesoTotal(Object.values(newPesos).reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0));
    }
  };

  const handlePesoCategoryChange = (catId, value) => {
    const clave = normalizarCatId(catId);
    const newPesos = { ...pesosCat, [clave]: value || 0 };
    setPesosCat(newPesos);
    setPesoTotal(Object.values(newPesos).reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0));
  };

  const handleDescripcionCategoryChange = (catId, value) => {
    setDescripcionesCat({ ...descripcionesCat, [normalizarCatId(catId)]: value });
  };

  // ==================================================================
  // IMPORTADOR DE ARTÍCULOS (pegar desde una factura)
  // Acepta dos formatos:
  //   A) Encabezados [Categoría - X kg]: artículos  (también convierte lbs)
  //   B) Lista simple del sistema antiguo ("2 LATAS DE COMIDA..."):
  //      se clasifica por palabras clave en las categorías existentes.
  // ==================================================================
  const LB_A_KG = 0.453592;

  const encontrarCategoriaPorNombre = (nombre) => {
    const n = (nombre || '').toLowerCase().trim();
    const cat = categorias.find(c => c.nombre.toLowerCase() === n)
      || categorias.find(c => c.nombre.toLowerCase().includes(n) || n.includes(c.nombre.toLowerCase()));
    return cat ? String(cat.id) : null;
  };

  const PALABRAS_CATEGORIA = {
    alimentos: ['comida', 'refresco', 'leche', 'té', 'te ', 'sobres de te', 'comino', 'arroz', 'aceite', 'frijol', 'azucar', 'azúcar', 'cafe', 'café', 'pasta', 'harina', 'galleta', 'lata', 'salsa', 'mayonesa', 'chocolate', 'conserva'],
    medicamentos: ['medicina', 'paracetamol', 'vitamina', 'vitamin', 'aspirina', 'jarabe', 'pastilla', 'ibuprofeno', 'antibiot', 'pomada'],
    ropa: ['camiseta', 'pantalon', 'pantalón', 'camisa', 'zapato', 'vestido', 'ropa'],
    electrodomesticos: ['electro', 'cocina ', 'ventilador', 'freidora', 'ollas'],
  };

  const clasificarLinea = (linea) => {
    const l = linea.toLowerCase();
    for (const [clave, palabras] of Object.entries(PALABRAS_CATEGORIA)) {
      if (palabras.some(p => l.includes(p))) return clave;
    }
    return 'otros';
  };

  const procesarPegado = () => {
    const lineas = textoPegado.split('\n').map(l => l.trim()).filter(Boolean);
    if (lineas.length === 0) {
      message.warning('Pegue primero el texto de los artículos');
      return;
    }

    const patron = /^\[(.+?)\s*-\s*([\d.,]+)\s*(kg|lbs?|libras?)\]\s*:?\s*(.*)$/i;
    const grupos = {};
    const orden = [];
    let conFormato = false;

    for (const linea of lineas) {
      const m = linea.match(patron);
      if (m) {
        conFormato = true;
        const idCat = encontrarCategoriaPorNombre(m[1]);
        if (!idCat) continue;
        let peso = parseFloat(String(m[2]).replace(',', '.')) || 0;
        if ((m[3] || '').toLowerCase().startsWith('lb') || (m[3] || '').toLowerCase().startsWith('libra')) {
          peso = +(peso * LB_A_KG).toFixed(2);
        }
        const items = m[4] ? m[4].split(',').map(s => s.trim()).filter(Boolean) : [];
        if (!grupos[idCat]) { grupos[idCat] = { peso: 0, items: [] }; orden.push(idCat); }
        if (peso) grupos[idCat].peso = peso;
        grupos[idCat].items.push(...items);
      } else if (conFormato && orden.length > 0) {
        // Línea suelta tras un encabezado: artículo adicional (escrito con Enter)
        const ultimo = orden[orden.length - 1];
        grupos[ultimo].items.push(linea.replace(/^[-•·–—]\s*/, ''));
      }
    }

    const nuevosIds = [];
    const nuevosPesos = {};
    const nuevasDescs = {};

    if (conFormato) {
      for (const idCat of orden) {
        nuevosIds.push(idCat);
        nuevosPesos[idCat] = grupos[idCat].peso || 0;
        nuevasDescs[idCat] = grupos[idCat].items.join('\n');
      }
    } else {
      // Lista simple del sistema antiguo: clasificar por palabras clave
      const porCat = {};
      for (const linea of lineas) {
        const clave = clasificarLinea(linea);
        const idCat = encontrarCategoriaPorNombre(clave);
        if (!idCat) continue;
        (porCat[idCat] = porCat[idCat] || []).push(linea.replace(/^[-•·–—]\s*/, ''));
      }
      for (const [idCat, items] of Object.entries(porCat)) {
        nuevosIds.push(idCat);
        nuevosPesos[idCat] = 0; // el peso se escribe manualmente
        nuevasDescs[idCat] = items.join('\n');
      }
    }

    if (nuevosIds.length === 0) {
      message.error('No se pudo clasificar ningún artículo. Verifique que las categorías existan en Configuración.');
      return;
    }

    setSelectedCatIds(nuevosIds);
    setPesosCat(nuevosPesos);
    setDescripcionesCat(nuevasDescs);
    setPesoTotal(Object.values(nuevosPesos).reduce((a, b) => a + (parseFloat(b) || 0), 0));
    setModalPegar(false);
    setTextoPegado('');
    message.success(`Importados ${nuevosIds.length} categoría(s). Revise los pesos antes de guardar.`);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (selectedCatIds.length === 0) {
        message.warning('Seleccione al menos una categoría para el paquete');
        return;
      }

      setLoading(true);

      // Construir la descripción unificada desglosada por categorías seleccionadas
      const lineasDescripcion = [];
      selectedCatIds.forEach(clave => {
        const catObj = categorias.find(c => String(c.id) === clave);
        const nombreCat = catObj ? catObj.nombre : `Categoría ${clave}`;
        const pesoCat = pesosCat[clave] || 0;
        const descCat = descripcionesCat[clave] || 'Sin especificar artículos';
        lineasDescripcion.push(`[${nombreCat} - ${pesoCat} kg]: ${descCat}`);
      });
      const descripcionFinal = lineasDescripcion.join('\n');

      const formData = new FormData();
      formData.append('descripcion', descripcionFinal);
      formData.append('observaciones', values.observaciones || '');
      formData.append('pesos_categoria', JSON.stringify(
        Object.fromEntries(selectedCatIds.map(clave => [clave, pesosCat[clave] || 0]))
      ));

      if (!esEdicion) {
        formData.append('cliente_id', values.cliente_id);
        formData.append('destinatario_id', values.destinatario_id);
      }
      if (fileList.length > 0) {
        formData.append('foto', fileList[0].originFileObj);
      }

      if (esEdicion) {
        await actualizarPaquete(paqueteEditar.id, formData);
        message.success('Paquete actualizado exitosamente');
      } else {
        await crearPaquete(formData);
        message.success('Paquete registrado exitosamente');
      }
      form.resetFields();
      setSelectedCatIds([]);
      setPesosCat({});
      setDescripcionesCat({});
      setPesoTotal(0);
      setFileList([]);
      setFotoActual(null);
      onSuccess();
      onClose();
    } catch (err) {
      if (!err?.errorFields) {
        console.error('Error al guardar paquete:', err);
        const detalle = err?.response?.data;
        // Mostrar el primer error de validación del backend de forma legible
        let msg = 'Error al guardar paquete';
        if (typeof detalle === 'string') {
          msg = detalle;
        } else if (detalle?.descripcion) {
          msg = `Descripción: ${Array.isArray(detalle.descripcion) ? detalle.descripcion[0] : detalle.descripcion}`;
        } else if (detalle && typeof detalle === 'object') {
          const primera = Object.entries(detalle)[0];
          if (primera) {
            const valor = Array.isArray(primera[1]) ? primera[1][0] : primera[1];
            msg = `${primera[0]}: ${valor}`;
          }
        }
        message.error(msg, 6);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={esEdicion ? `✏️ Editar Paquete ${paqueteEditar?.codigo_seguimiento || ''}` : '📦 Registrar Nuevo Paquete'}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={850}
      okText={esEdicion ? 'Guardar Cambios' : 'Registrar y Generar Código'}
      cancelText="Cancelar"
    >
      <Form form={form} layout="vertical" autoComplete="off">
        {/* PASO 1: CLIENTE Y DESTINATARIO */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="cliente_id" label="Cliente / Remitente" rules={[{ required: true, message: 'Seleccione un cliente' }]}>
              <Select
                placeholder="Seleccionar Cliente"
                onChange={handleClienteChange}
                showSearch
                optionFilterProp="children"
                disabled={esEdicion}
              >
                {clientes.map(c => (
                  <Select.Option key={c.id} value={c.id}>{c.nombre_completo} - {c.telefono}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="destinatario_id" label="Destinatario" rules={[{ required: !esEdicion, message: 'Seleccione un destinatario' }]}>
              <Select
                placeholder="Seleccionar Destinatario"
                onChange={handleDestinatarioChange}
                showSearch
                optionFilterProp="children"
                disabled={esEdicion}
              >
                {destinatarios.map(d => (
                  <Select.Option key={d.id} value={d.id}>{d.nombre_completo} ({d.reparto_display || d.reparto || ''})</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {esEdicion && (
          <div style={{ fontSize: 12, color: '#999', marginTop: -8, marginBottom: 12 }}>
            <EnvironmentOutlined /> En la edición no se puede cambiar el cliente/destinatario. Coordenadas GPS del destinatario: {latitud}, {longitud}
          </div>
        )}

        {/* PASO 2: CATEGORÍAS CON CHECKBOX */}
        <Divider align="left">1️⃣ Categorías del Paquete (marque las que contiene)</Divider>

        <Button
          size="small"
          icon={<SnippetsOutlined />}
          onClick={() => setModalPegar(true)}
          style={{ marginBottom: 12 }}
        >
          📋 Pegar relación de artículos (desde factura)
        </Button>

        {categorias.length === 0 && (
          <p style={{ color: '#999' }}>Cargando categorías…</p>
        )}

        <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
          {categorias.map(cat => (
            <Col key={cat.id} span={8}>
              <Checkbox
                checked={selectedCatIds.includes(String(cat.id))}
                onChange={e => handleToggleCategoria(cat.id, e.target.checked)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: 6,
                  backgroundColor: selectedCatIds.includes(String(cat.id)) ? '#e6f7ff' : '#fff',
                }}
              >
                🏷️ {cat.nombre} <span style={{ color: '#888', fontSize: 12 }}>({Number(cat.precio_por_kg).toFixed(2)} $/kg)</span>
              </Checkbox>
            </Col>
          ))}
        </Row>

        {/* PASO 3: PESO Y DESCRIPCIÓN POR CATEGORÍA MARCADA */}
        {selectedCatIds.length > 0 && (
          <>
            <Divider align="left">2️⃣ Pesos y Relación de Productos por Categoría</Divider>

            {categorias
              .filter(cat => selectedCatIds.includes(String(cat.id)))
              .map(cat => (
                <Card
                  key={cat.id}
                  size="small"
                  title={<strong>🏷️ {cat.nombre}</strong>}
                  style={{ marginBottom: 12, borderColor: '#1890ff', backgroundColor: '#f0f5ff' }}
                >
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item label={`Peso en kg (${cat.nombre})`} required>
                        <InputNumber
                          min={0.1}
                          step={0.1}
                          style={{ width: '100%' }}
                          placeholder="Peso (kg)"
                          value={pesosCat[String(cat.id)]}
                          onChange={val => handlePesoCategoryChange(cat.id, val)}
                          autoComplete="off"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={16}>
                      <Form.Item label={`Descripción de artículos (${cat.nombre})`} required>
                        <TextArea
                          rows={2}
                          placeholder={`Ej: Artículos de ${cat.nombre.toLowerCase()} (2 latas de atún, 1 paquete de arroz...)`}
                          value={descripcionesCat[String(cat.id)] || ''}
                          onChange={e => handleDescripcionCategoryChange(cat.id, e.target.value)}
                          autoComplete="off"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              ))}

            <Card style={{ backgroundColor: '#e6f7ff', marginBottom: 16, textAlign: 'right' }}>
              <h3 style={{ margin: 0, color: '#003366' }}>
                <strong>Peso Total Calculado: {pesoTotal.toFixed(2)} kg</strong>
              </h3>
            </Card>
          </>
        )}

        {/* FOTO Y OBSERVACIONES */}
        <Row gutter={16}>
          <Col span={16}>
            <Form.Item name="observaciones" label="Observaciones Generales (Opcional)">
              <TextArea rows={2} placeholder="Notas adicionales sobre el empaque o instrucciones de entrega..." autoComplete="off" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label={esEdicion && fotoActual ? 'Foto actual / reemplazar' : 'Foto del Paquete Listo'}>
              {esEdicion && fotoActual && (
                <img
                  src={fotoActual.startsWith('http') ? fotoActual : `${fotoActual}`}
                  alt="Foto actual"
                  style={{ maxWidth: '100%', maxHeight: 80, marginBottom: 8, borderRadius: 4, display: 'block' }}
                />
              )}
              <Upload
                beforeUpload={() => false}
                maxCount={1}
                fileList={fileList}
                onChange={({ fileList }) => setFileList(fileList)}
              >
                <Button icon={<UploadOutlined />}>{esEdicion && fotoActual ? 'Reemplazar Fotografía' : 'Subir Fotografía'}</Button>
              </Upload>
            </Form.Item>
          </Col>
        </Row>
      </Form>

      {/* IMPORTADOR: pegar la relación de artículos de una factura */}
      <Modal
        title="📋 Pegar Relación de Artículos"
        open={modalPegar}
        onOk={procesarPegado}
        onCancel={() => setModalPegar(false)}
        okText="Importar"
        cancelText="Cancelar"
        width={640}
      >
        <p style={{ color: '#666', fontSize: 13 }}>
          Se aceptan dos formatos: encabezados <code>[Categoría - X kg]: artículos</code>
          {' '}(también convierte <b>lbs</b> automáticamente) o la lista simple del
          sistema antiguo (<em>"2 LATAS DE COMIDA PARA GATO"</em>), que se clasifica
          por palabras clave. Después revise los pesos de cada categoría.
        </p>
        <Input.TextArea
          rows={10}
          value={textoPegado}
          onChange={e => setTextoPegado(e.target.value)}
          autoComplete="off"
          placeholder={'[Alimentos - 4.54 kg]: 2 latas de comida para gato, 4 paq de refresco Guama\n[Otros - 6.52 kg]: 2 bolsas grandes, 1 shampoo Lendrex\n[Medicamentos - 0.10 kg]: 1 pomo de gummy vites multivitamin x70'}
        />
      </Modal>
    </Modal>
  );
};

export default NuevoPaqueteModal;
