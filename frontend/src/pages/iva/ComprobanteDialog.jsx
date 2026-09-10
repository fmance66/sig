import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { TabView, TabPanel } from 'primereact/tabview';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import * as comprobantesApi from '../../api/ivaComprobantes';
import * as personasApi from '../../api/ivaPersonas';
import * as tiposComprobanteApi from '../../api/ivaTiposComprobante';
import * as puntosVentaApi from '../../api/ivaPuntosVenta';
import * as periodosApi from '../../api/ivaPeriodos';
import * as condicionesVentaApi from '../../api/ivaCondicionesVenta';
import * as impuestosApi from '../../api/ivaImpuestos';
import * as itemsApi from '../../api/ivaItems';
import * as monedasApi from '../../api/monedas';
import { toDate, toIsoDate } from '../../utils/dates';

const CONCEPTO_OPTIONS = [
  { label: 'Producto', value: 'PRODUCTO' },
  { label: 'Servicio', value: 'SERVICIO' },
  { label: 'Producto y Servicio', value: 'PRODSERV' },
  { label: 'Bien de Uso', value: 'BIENDEUSO' },
  { label: 'Locación', value: 'LOCACION' },
];

const money = v => v === null || v === undefined ? '0,00' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMPTY_IDENTITY = { persona: null, tipo: null, letra: '', punto: null, comprobante: '', fecha: new Date(), periodo: null };
const EMPTY_FORM = {
  servicio_desde: null, servicio_hasta: null, numero_hasta: '', numero_aux: '',
  moneda: null, cotizacion: 1, concepto: null, rubro: '', provincia: '', condicion_venta: null,
  prorrateo: null, razon_social: '', tipo_documento: '', numero_documento: '', condicion_iva: '',
  numero_ib: '', localidad: '', observaciones: '', anulado: false, empresa_lote: '', orden: '',
};
const EMPTY_LINEA_IMPUESTO = { impuesto: null, rubro: '', alicuota: null, importe: null, calculo: '', imputacion: '' };
const EMPTY_LINEA_ITEM = { item: null, cantidad: null, precio: null, ivainc: false, importe: null, alicuota: null, iva: null, interno: null };

// Modal compartido por Comprobante de Compra (modulo COMPRA, etiqueta "Proveedor")
// y Comprobante de Venta (modulo VENTA, etiqueta "Cliente"). Alta en dos fases:
// mientras no existe el header en el backend (creado === null) solo se puede
// completar la identidad (Persona/Tipo/Letra/Punto/Número/Fecha/Período) — recién
// al guardar esa identidad se habilitan Importes/Items, porque sus endpoints
// necesitan que el comprobante ya exista. Por eso, a diferencia de los demás
// modales del proyecto, "Guardar" NO cierra el diálogo: cerrar es una acción
// aparte ("Cerrar"), para poder seguir cargando impuestos/ítems sin perder
// el formulario.
export default function ComprobanteDialog({ visible, onHide, empresa, modulo, comprobanteRef, toast }) {
  const etiqueta = modulo === 'VENTA' ? 'Cliente' : 'Proveedor';
  const editandoExistente = !!comprobanteRef;

  const [activeTab, setActiveTab] = useState(0);
  const [identity, setIdentity] = useState(EMPTY_IDENTITY);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creado, setCreado] = useState(null); // header completo devuelto por el backend, null hasta la primera creación
  const [saving, setSaving] = useState(false);
  const [cargando, setCargando] = useState(false);

  const [personas, setPersonas] = useState([]);
  const [tiposComprobante, setTiposComprobante] = useState([]);
  const [letrasDelTipo, setLetrasDelTipo] = useState([]);
  const [puntosVenta, setPuntosVenta] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [condicionesVenta, setCondicionesVenta] = useState([]);
  const [monedas, setMonedas] = useState([]);
  const [impuestosCatalogo, setImpuestosCatalogo] = useState([]);
  const [itemsCatalogo, setItemsCatalogo] = useState([]);

  const [impuestosList, setImpuestosList] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [lineaImpuesto, setLineaImpuesto] = useState(EMPTY_LINEA_IMPUESTO);
  const [lineaItem, setLineaItem] = useState(EMPTY_LINEA_ITEM);

  useEffect(() => {
    if (!visible) return;
    setActiveTab(0);
    setLineaImpuesto(EMPTY_LINEA_IMPUESTO);
    setLineaItem(EMPTY_LINEA_ITEM);
    if (comprobanteRef) {
      loadExistente(comprobanteRef);
    } else {
      setIdentity(EMPTY_IDENTITY);
      setForm(EMPTY_FORM);
      setCreado(null);
      setImpuestosList([]);
      setItemsList([]);
    }
    if (empresa) {
      personasApi.getPersonas(modulo, empresa).then(res => setPersonas(res.data.resultado)).catch(() => setPersonas([]));
      tiposComprobanteApi.getTiposComprobante(empresa).then(res => setTiposComprobante(res.data.resultado)).catch(() => setTiposComprobante([]));
      puntosVentaApi.getPuntosVenta(empresa).then(res => setPuntosVenta(res.data.resultado)).catch(() => setPuntosVenta([]));
      periodosApi.getPeriodos(empresa).then(res => setPeriodos(res.data.resultado)).catch(() => setPeriodos([]));
      condicionesVentaApi.getCondicionesVenta(empresa).then(res => setCondicionesVenta(res.data.resultado)).catch(() => setCondicionesVenta([]));
      impuestosApi.getImpuestos(empresa).then(res => setImpuestosCatalogo(res.data.resultado)).catch(() => setImpuestosCatalogo([]));
      itemsApi.getItems(modulo, empresa).then(res => setItemsCatalogo(res.data.resultado)).catch(() => setItemsCatalogo([]));
    }
    monedasApi.getMonedas().then(res => setMonedas(res.data.resultado)).catch(() => setMonedas([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, comprobanteRef, empresa, modulo]);

  useEffect(() => {
    if (!identity.tipo || !empresa) { setLetrasDelTipo([]); return; }
    tiposComprobanteApi.getLetras(identity.tipo, empresa).then(res => setLetrasDelTipo(res.data.resultado)).catch(() => setLetrasDelTipo([]));
  }, [identity.tipo, empresa]);

  async function loadExistente(ref) {
    setCargando(true);
    try {
      const res = await comprobantesApi.getComprobante(ref.modulo, ref.tipo, ref.comprobante, ref.persona, ref.empresa);
      const b = res.data.resultado;
      setCreado(b);
      setIdentity({
        persona: b.persona, tipo: b.tipo, letra: b.letra ?? '', punto: b.punto ?? null,
        comprobante: b.comprobante, fecha: toDate(b.fecha), periodo: b.periodo ?? null,
      });
      setForm({
        servicio_desde: toDate(b.servicio_desde), servicio_hasta: toDate(b.servicio_hasta),
        numero_hasta: b.numero_hasta ?? '', numero_aux: b.numero_aux ?? '',
        moneda: b.moneda ?? null, cotizacion: b.cotizacion ?? 1, concepto: b.concepto ?? null,
        rubro: b.rubro ?? '', provincia: b.provincia ?? '', condicion_venta: b.condicion_venta ?? null,
        prorrateo: b.prorrateo ?? null, razon_social: b.razon_social ?? '', tipo_documento: b.tipo_documento ?? '',
        numero_documento: b.numero_documento ?? '', condicion_iva: b.condicion_iva ?? '', numero_ib: b.numero_ib ?? '',
        localidad: b.localidad ?? '', observaciones: b.observaciones ?? '', anulado: b.anulado ?? false,
        empresa_lote: b.empresa_lote ?? '', orden: b.orden ?? '',
      });
      setImpuestosList(b.impuestos ?? []);
      setItemsList(b.items ?? []);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el comprobante' });
    } finally {
      setCargando(false);
    }
  }

  function handlePersonaChange(personaId) {
    const p = personas.find(x => x.id === personaId);
    setIdentity(prev => ({
      ...prev, persona: personaId,
      tipo: prev.tipo ?? p?.tipo ?? null,
      letra: prev.letra || p?.letra || '',
      punto: prev.punto ?? p?.punto ?? null,
    }));
    if (p) {
      setForm(prev => ({
        ...prev,
        razon_social: prev.razon_social || p.razon_social || '',
        tipo_documento: prev.tipo_documento || p.tipo_documento || '',
        numero_documento: prev.numero_documento || p.numero_documento || '',
        condicion_iva: prev.condicion_iva || p.condicion_iva || '',
        numero_ib: prev.numero_ib || p.numero_ib || '',
        localidad: prev.localidad || p.localidad || '',
        provincia: prev.provincia || p.provincia || '',
        moneda: prev.moneda ?? p.moneda ?? null,
        rubro: prev.rubro || p.rubro || '',
        condicion_venta: prev.condicion_venta ?? p.condicion_venta ?? null,
      }));
    }
  }

  function handleFormChange(name, value) {
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleGuardar() {
    if (!identity.persona) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: `Elegí un ${etiqueta.toLowerCase()}` });
      return;
    }
    if (!identity.tipo || !String(identity.comprobante).trim() || !identity.fecha) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Completá Tipo, Número y Fecha del comprobante' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        fecha: toIsoDate(identity.fecha),
        periodo: identity.periodo,
        letra: identity.letra || null,
        punto: identity.punto,
        servicio_desde: toIsoDate(form.servicio_desde),
        servicio_hasta: toIsoDate(form.servicio_hasta),
        numero_hasta: form.numero_hasta,
        numero_aux: form.numero_aux,
        moneda: form.moneda,
        cotizacion: form.cotizacion,
        concepto: form.concepto,
        rubro: form.rubro,
        provincia: form.provincia,
        condicion_venta: form.condicion_venta,
        prorrateo: form.prorrateo,
        razon_social: form.razon_social,
        tipo_documento: form.tipo_documento,
        numero_documento: form.numero_documento,
        condicion_iva: form.condicion_iva,
        numero_ib: form.numero_ib,
        localidad: form.localidad,
        observaciones: form.observaciones,
        anulado: form.anulado,
        empresa_lote: form.empresa_lote,
        orden: form.orden,
      };
      if (creado) {
        const res = await comprobantesApi.updateComprobante(modulo, identity.tipo, identity.comprobante, identity.persona, empresa, payload);
        setCreado(prev => ({ ...prev, ...(res.data.resultado || payload) }));
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Comprobante actualizado' });
      } else {
        const res = await comprobantesApi.createComprobante({
          modulo, tipo: identity.tipo, comprobante: identity.comprobante, persona: identity.persona, empresa, ...payload,
        });
        const b = res.data.resultado;
        setCreado(b);
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Comprobante creado — ya podés cargar los impuestos' });
        setActiveTab(0);
      }
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al guardar';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setSaving(false);
    }
  }

  function handleImpuestoSeleccionado(id) {
    const imp = impuestosCatalogo.find(i => i.id === id);
    setLineaImpuesto(prev => ({
      ...prev, impuesto: id,
      alicuota: imp?.alicuota ?? prev.alicuota,
      rubro: imp?.grupo ?? prev.rubro,
      calculo: imp?.calculo ?? prev.calculo,
    }));
  }

  async function guardarImpuestos(nuevaLista) {
    try {
      const res = await comprobantesApi.setImpuestosComprobante(
        modulo, identity.tipo, identity.comprobante, identity.persona, empresa,
        nuevaLista.map(l => ({
          impuesto: l.impuesto, rubro: l.rubro, alicuota: l.alicuota, importe: l.importe,
          calculo: l.calculo, imputacion: l.imputacion, columna: l.columna, fila: l.fila,
        })),
      );
      setImpuestosList(nuevaLista);
      setCreado(prev => ({ ...prev, ...res.data.resultado }));
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'No se pudo actualizar los impuestos';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    }
  }

  function handleAgregarImpuesto() {
    if (!lineaImpuesto.impuesto) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Elegí un impuesto' });
      return;
    }
    guardarImpuestos([...impuestosList, { ...lineaImpuesto }]);
    setLineaImpuesto(EMPTY_LINEA_IMPUESTO);
  }

  function handleEliminarImpuesto(idx) {
    guardarImpuestos(impuestosList.filter((_, i) => i !== idx));
  }

  async function guardarItems(nuevaLista) {
    try {
      await comprobantesApi.setItemsComprobante(
        modulo, identity.tipo, identity.comprobante, identity.persona, empresa,
        nuevaLista.map(l => ({
          item: l.item, cantidad: l.cantidad, precio: l.precio, ivainc: l.ivainc,
          importe: l.importe, alicuota: l.alicuota, iva: l.iva, interno: l.interno,
        })),
      );
      setItemsList(nuevaLista);
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'No se pudo actualizar los ítems';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    }
  }

  function handleAgregarItem() {
    if (!lineaItem.item) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Elegí un ítem' });
      return;
    }
    guardarItems([...itemsList, { ...lineaItem }]);
    setLineaItem(EMPTY_LINEA_ITEM);
  }

  function handleEliminarItem(idx) {
    guardarItems(itemsList.filter((_, i) => i !== idx));
  }

  const personaOptions = personas.map(p => ({ label: `${p.id} — ${p.razon_social}`, value: p.id }));
  const tipoOptions = tiposComprobante.map(t => ({ label: `${t.id} - ${t.descripcion ?? ''}`, value: t.id }));
  const letraOptions = [...new Set(letrasDelTipo.map(l => l.letra))].map(l => ({ label: l, value: l }));
  const puntoOptions = puntosVenta.map(p => ({ label: `${p.punto} - ${p.nombre ?? ''}`, value: p.punto }));
  const periodoOptions = periodos.map(p => ({ label: p.periodo, value: p.periodo }));
  const condicionVentaOptions = condicionesVenta.map(c => ({ label: c.descripcion, value: c.id }));
  const monedaOptions = monedas.map(m => ({ label: `${m.id} - ${m.nombre ?? ''}`, value: m.id }));
  const impuestoOptions = impuestosCatalogo.map(i => ({ label: `${i.id} - ${i.nombre ?? ''}`, value: i.id }));
  const impuestoDescripcion = id => impuestosCatalogo.find(i => i.id === id)?.nombre ?? id;
  const itemOptions = itemsCatalogo.map(i => ({ label: `${i.id} - ${i.descripcion ?? ''}`, value: i.id }));
  const itemDescripcion = id => itemsCatalogo.find(i => i.id === id)?.descripcion ?? id;

  const identityLocked = !!creado; // Tipo/Letra/Punto/Número son inmutables una vez creado el comprobante

  const dialogFooter = (
    <div className="dialog-footer-btns mt-2">
      <Button label="Cerrar" icon="fa-solid fa-xmark" className="p-button-text" onClick={onHide} disabled={saving} />
      <Button label="Guardar" icon="fa-solid fa-check" onClick={handleGuardar} loading={saving} />
    </div>
  );

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={editandoExistente ? `Comprobante N° ${comprobanteRef?.comprobante}` : `Nuevo comprobante de ${modulo === 'VENTA' ? 'venta' : 'compra'}`}
      footer={dialogFooter}
      style={{ width: '950px' }}
      modal
      draggable={false}
      resizable={false}
    >
      {cargando ? <p>Cargando comprobante...</p> : (
        <>
          <div className="comprobante-persona-row form-grid">
            <div className="form-field form-field--full">
              <label>{etiqueta} <span className="required">*</span></label>
              <Dropdown value={identity.persona} options={personaOptions} onChange={e => handlePersonaChange(e.value)}
                filter showClear placeholder={`Seleccionar ${etiqueta.toLowerCase()}`} disabled={identityLocked} />
            </div>
            <div className="form-row-12 comprobante-id-row">
              <div className="form-field" style={{ gridColumn: 'span 3' }}>
                <label>Tipo</label>
                <Dropdown value={identity.tipo} options={tipoOptions} filter showClear disabled={identityLocked}
                  onChange={e => setIdentity(prev => ({ ...prev, tipo: e.value, letra: '' }))} />
              </div>
              <div className="form-field" style={{ gridColumn: 'span 2' }}>
                <label>Letra</label>
                <Dropdown value={identity.letra || null} options={letraOptions} showClear disabled={identityLocked}
                  onChange={e => setIdentity(prev => ({ ...prev, letra: e.value || '' }))} />
              </div>
              <div className="form-field" style={{ gridColumn: 'span 2' }}>
                <label>Punto</label>
                <Dropdown value={identity.punto} options={puntoOptions} filter showClear disabled={identityLocked}
                  onChange={e => setIdentity(prev => ({ ...prev, punto: e.value }))} />
              </div>
              <div className="form-field" style={{ gridColumn: 'span 2' }}>
                <label>Número</label>
                <InputText value={identity.comprobante} disabled={identityLocked}
                  onChange={e => setIdentity(prev => ({ ...prev, comprobante: e.target.value }))} />
              </div>
              <div className="form-field" style={{ gridColumn: 'span 2' }}>
                <label>Fecha</label>
                <Calendar value={identity.fecha} onChange={e => setIdentity(prev => ({ ...prev, fecha: e.value }))} dateFormat="dd/mm/yy" showIcon />
              </div>
              <div className="form-field" style={{ gridColumn: 'span 1' }}>
                <label>Período</label>
                <Dropdown value={identity.periodo} options={periodoOptions}
                  onChange={e => setIdentity(prev => ({ ...prev, periodo: e.value }))} />
              </div>
            </div>
          </div>

          <TabView className="iva-tabs" activeIndex={activeTab} onTabChange={e => setActiveTab(e.index)}>
            <TabPanel header="Importes">
              {!creado ? (
                <div className="tab-empty-msg">
                  <i className="fa-solid fa-circle-info" />
                  <span>Guardá la identidad del comprobante (arriba) para poder cargar los impuestos.</span>
                </div>
              ) : (
                <div className="sub-tab">
                  <div className="sub-form">
                    <div className="form-grid">
                      <div className="form-field">
                        <label>Impuesto</label>
                        <Dropdown value={lineaImpuesto.impuesto} options={impuestoOptions} filter showClear
                          onChange={e => handleImpuestoSeleccionado(e.value)} />
                      </div>
                      <div className="form-field">
                        <label>Alícuota</label>
                        <InputNumber value={lineaImpuesto.alicuota} suffix="%" minFractionDigits={0} maxFractionDigits={2}
                          onValueChange={e => setLineaImpuesto(prev => ({ ...prev, alicuota: e.value }))} />
                      </div>
                      <div className="form-field">
                        <label>Importe</label>
                        <InputNumber value={lineaImpuesto.importe} mode="decimal" minFractionDigits={2} maxFractionDigits={2}
                          onValueChange={e => setLineaImpuesto(prev => ({ ...prev, importe: e.value }))} />
                      </div>
                      <div className="form-field">
                        <label>Imputación</label>
                        <InputText value={lineaImpuesto.imputacion} onChange={e => setLineaImpuesto(prev => ({ ...prev, imputacion: e.target.value }))} />
                      </div>
                    </div>
                    <div className="sub-form-actions">
                      <Button label="Agregar" icon="fa-solid fa-plus" size="small" onClick={handleAgregarImpuesto} />
                    </div>
                  </div>
                  <DataTable value={impuestosList} size="small" stripedRows emptyMessage="El comprobante todavía no tiene impuestos cargados">
                    <Column body={l => impuestoDescripcion(l.impuesto)} header="Impuesto" />
                    <Column body={l => l.alicuota != null ? `${l.alicuota}%` : '—'} header="Alícuota" style={{ width: '100px' }} />
                    <Column body={l => money(l.importe)} header="Importe" style={{ width: '120px' }} />
                    <Column field="imputacion" header="Imputación" style={{ width: '160px' }} />
                    <Column body={(row, { rowIndex }) => (
                      <div className="acciones-col">
                        <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" onClick={() => handleEliminarImpuesto(rowIndex)} />
                      </div>
                    )} header="Acciones" alignHeader="center" style={{ width: '80px', textAlign: 'center' }} />
                  </DataTable>
                  <div className="comprobante-totales">
                    <div className="total-row"><span>Neto</span><span>{money(creado.neto)}</span></div>
                    <div className="total-row"><span>Exento</span><span>{money(creado.exento)}</span></div>
                    <div className="total-row"><span>No Gravado</span><span>{money(creado.nogravado)}</span></div>
                    <div className="total-row"><span>IVA</span><span>{money(creado.iva)}</span></div>
                    <div className="total-row total-row--main"><span>Total</span><span>{money(creado.total ?? creado.subtotal)}</span></div>
                  </div>
                </div>
              )}
            </TabPanel>

            <TabPanel header="Datos">
              <div className="form-grid">
                <div className="form-field">
                  <label>Servicio Desde</label>
                  <Calendar value={form.servicio_desde} onChange={e => handleFormChange('servicio_desde', e.value)} dateFormat="dd/mm/yy" showIcon />
                </div>
                <div className="form-field">
                  <label>Servicio Hasta</label>
                  <Calendar value={form.servicio_hasta} onChange={e => handleFormChange('servicio_hasta', e.value)} dateFormat="dd/mm/yy" showIcon />
                </div>
                <div className="form-field">
                  <label>Número Hasta</label>
                  <InputText value={form.numero_hasta} onChange={e => handleFormChange('numero_hasta', e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Número Aux.</label>
                  <InputText value={form.numero_aux} onChange={e => handleFormChange('numero_aux', e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Moneda</label>
                  <Dropdown value={form.moneda} options={monedaOptions} onChange={e => handleFormChange('moneda', e.value)} filter showClear />
                </div>
                <div className="form-field">
                  <label>Cotización</label>
                  <InputNumber value={form.cotizacion} onValueChange={e => handleFormChange('cotizacion', e.value)} minFractionDigits={2} maxFractionDigits={4} />
                </div>
                <div className="form-field">
                  <label>Concepto</label>
                  <Dropdown value={form.concepto} options={CONCEPTO_OPTIONS} onChange={e => handleFormChange('concepto', e.value)} showClear />
                </div>
                <div className="form-field">
                  <label>Rubro</label>
                  <InputText value={form.rubro} onChange={e => handleFormChange('rubro', e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Provincia</label>
                  <InputText value={form.provincia} onChange={e => handleFormChange('provincia', e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Condición de Venta</label>
                  <Dropdown value={form.condicion_venta} options={condicionVentaOptions} onChange={e => handleFormChange('condicion_venta', e.value)} filter showClear />
                </div>
                <div className="form-field">
                  <label>Prorrateo</label>
                  <InputNumber value={form.prorrateo} suffix="%" minFractionDigits={0} maxFractionDigits={2} onValueChange={e => handleFormChange('prorrateo', e.value)} />
                </div>
                <div className="form-field">
                  <label>Empresa Lote</label>
                  <InputText value={form.empresa_lote} onChange={e => handleFormChange('empresa_lote', e.target.value)} />
                </div>
                <div className="form-field form-field--full" style={{ marginTop: '0.25rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.3rem' }}>
                    Datos de {etiqueta.toLowerCase()} (pueden diferir del maestro para este comprobante)
                  </label>
                </div>
                <div className="form-field form-field--full">
                  <label>Razón Social</label>
                  <InputText value={form.razon_social} onChange={e => handleFormChange('razon_social', e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Tipo Documento</label>
                  <InputText value={form.tipo_documento} onChange={e => handleFormChange('tipo_documento', e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Número Documento</label>
                  <InputText value={form.numero_documento} onChange={e => handleFormChange('numero_documento', e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Condición IVA</label>
                  <InputText value={form.condicion_iva} onChange={e => handleFormChange('condicion_iva', e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Número IB</label>
                  <InputText value={form.numero_ib} onChange={e => handleFormChange('numero_ib', e.target.value)} />
                </div>
                <div className="form-field form-field--full">
                  <label>Localidad</label>
                  <InputText value={form.localidad} onChange={e => handleFormChange('localidad', e.target.value)} />
                </div>
                <div className="form-row-12">
                  <div className="form-field" style={{ gridColumn: 'span 8' }}>
                    <label>Orden</label>
                    <InputText value={form.orden} type="number" onChange={e => handleFormChange('orden', e.target.value)} />
                  </div>
                  <div className="form-field form-field--checkbox" style={{ gridColumn: 'span 4' }}>
                    <Checkbox inputId="anulado" checked={!!form.anulado} onChange={e => handleFormChange('anulado', e.checked)} />
                    <label htmlFor="anulado">Anulado</label>
                  </div>
                </div>
              </div>
            </TabPanel>

            <TabPanel header="Items">
              {!creado ? (
                <div className="tab-empty-msg">
                  <i className="fa-solid fa-circle-info" />
                  <span>Guardá la identidad del comprobante (arriba) para poder cargar los ítems.</span>
                </div>
              ) : (
                <div className="sub-tab">
                  <div className="sub-form">
                    <div className="form-grid">
                      <div className="form-field">
                        <label>Ítem</label>
                        <Dropdown value={lineaItem.item} options={itemOptions} filter showClear
                          onChange={e => setLineaItem(prev => ({ ...prev, item: e.value }))} />
                      </div>
                      <div className="form-field">
                        <label>Cantidad</label>
                        <InputNumber value={lineaItem.cantidad} minFractionDigits={0} maxFractionDigits={2}
                          onValueChange={e => setLineaItem(prev => ({ ...prev, cantidad: e.value }))} />
                      </div>
                      <div className="form-field">
                        <label>Precio</label>
                        <InputNumber value={lineaItem.precio} mode="decimal" minFractionDigits={2} maxFractionDigits={2}
                          onValueChange={e => setLineaItem(prev => ({ ...prev, precio: e.value }))} />
                      </div>
                      <div className="form-field">
                        <label>Importe</label>
                        <InputNumber value={lineaItem.importe} mode="decimal" minFractionDigits={2} maxFractionDigits={2}
                          onValueChange={e => setLineaItem(prev => ({ ...prev, importe: e.value }))} />
                      </div>
                      <div className="form-row-12">
                        <div className="form-field" style={{ gridColumn: 'span 4' }}>
                          <label>Alícuota</label>
                          <InputNumber value={lineaItem.alicuota} suffix="%" minFractionDigits={0} maxFractionDigits={2}
                            onValueChange={e => setLineaItem(prev => ({ ...prev, alicuota: e.value }))} />
                        </div>
                        <div className="form-field" style={{ gridColumn: 'span 4' }}>
                          <label>IVA</label>
                          <InputNumber value={lineaItem.iva} mode="decimal" minFractionDigits={2} maxFractionDigits={2}
                            onValueChange={e => setLineaItem(prev => ({ ...prev, iva: e.value }))} />
                        </div>
                        <div className="form-field form-field--checkbox" style={{ gridColumn: 'span 4' }}>
                          <Checkbox inputId="ivainc" checked={!!lineaItem.ivainc} onChange={e => setLineaItem(prev => ({ ...prev, ivainc: e.checked }))} />
                          <label htmlFor="ivainc">IVA incluido</label>
                        </div>
                      </div>
                    </div>
                    <div className="sub-form-actions">
                      <Button label="Agregar" icon="fa-solid fa-plus" size="small" onClick={handleAgregarItem} />
                    </div>
                  </div>
                  <DataTable value={itemsList} size="small" stripedRows emptyMessage="El comprobante todavía no tiene ítems cargados">
                    <Column body={l => itemDescripcion(l.item)} header="Ítem" />
                    <Column field="cantidad" header="Cantidad" style={{ width: '90px' }} />
                    <Column body={l => money(l.precio)} header="Precio" style={{ width: '110px' }} />
                    <Column body={l => money(l.importe)} header="Importe" style={{ width: '110px' }} />
                    <Column body={(row, { rowIndex }) => (
                      <div className="acciones-col">
                        <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" onClick={() => handleEliminarItem(rowIndex)} />
                      </div>
                    )} header="Acciones" alignHeader="center" style={{ width: '80px', textAlign: 'center' }} />
                  </DataTable>
                </div>
              )}
            </TabPanel>

            <TabPanel header="Observaciones">
              <div className="form-grid">
                <div className="form-field form-field--full">
                  <InputTextarea value={form.observaciones} onChange={e => handleFormChange('observaciones', e.target.value)} rows={10} autoResize={false} />
                </div>
              </div>
            </TabPanel>
          </TabView>
        </>
      )}
    </Dialog>
  );
}
