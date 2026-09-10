import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import * as personasApi from '../../api/ivaPersonas';
import * as tiposComprobanteApi from '../../api/ivaTiposComprobante';
import * as puntosVentaApi from '../../api/ivaPuntosVenta';
import * as modelosApi from '../../api/ivaModelosComprobante';
import * as condicionesVentaApi from '../../api/ivaCondicionesVenta';
import * as monedasApi from '../../api/monedas';

const EMPTY_FORM = {
  id: '', razon_social: '', nombre_comercial: '', tipo_documento: '', numero_documento: '',
  condicion_iva: '', numero_ib: '', grupo: '', direccion: '', localidad: '', provincia: '',
  pais: '', cpa: '', orden: '', observaciones: '',
  tipo: null, letra: '', punto: null, modelo: null, moneda: null, rubro: '', condicion_venta: null,
};

// Modal compartido por Proveedor (modulo COMPRA) y Cliente (modulo VENTA) —
// misma tabla iva_persona, mismo formulario, solo cambia el texto según `modulo`.
export default function PersonaDialog({ visible, onHide, onSaved, empresa, modulo, persona, toast }) {
  const editMode = !!persona;
  const etiqueta = modulo === 'VENTA' ? 'Cliente' : 'Proveedor';
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [tiposComprobante, setTiposComprobante] = useState([]);
  const [puntosVenta, setPuntosVenta] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [condicionesVenta, setCondicionesVenta] = useState([]);
  const [monedas, setMonedas] = useState([]);

  useEffect(() => {
    if (!visible) return;
    if (persona) {
      setForm({
        id: persona.id,
        razon_social: persona.razon_social ?? '',
        nombre_comercial: persona.nombre_comercial ?? '',
        tipo_documento: persona.tipo_documento ?? '',
        numero_documento: persona.numero_documento ?? '',
        condicion_iva: persona.condicion_iva ?? '',
        numero_ib: persona.numero_ib ?? '',
        grupo: persona.grupo ?? '',
        direccion: persona.direccion ?? '',
        localidad: persona.localidad ?? '',
        provincia: persona.provincia ?? '',
        pais: persona.pais ?? '',
        cpa: persona.cpa ?? '',
        orden: persona.orden ?? '',
        observaciones: persona.observaciones ?? '',
        tipo: persona.tipo ?? null,
        letra: persona.letra ?? '',
        punto: persona.punto ?? null,
        modelo: persona.modelo ?? null,
        moneda: persona.moneda ?? null,
        rubro: persona.rubro ?? '',
        condicion_venta: persona.condicion_venta ?? null,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    if (empresa) {
      tiposComprobanteApi.getTiposComprobante(empresa).then(res => setTiposComprobante(res.data.resultado)).catch(() => setTiposComprobante([]));
      puntosVentaApi.getPuntosVenta(empresa).then(res => setPuntosVenta(res.data.resultado)).catch(() => setPuntosVenta([]));
      modelosApi.getModelosComprobante(empresa).then(res => setModelos(res.data.resultado)).catch(() => setModelos([]));
      condicionesVentaApi.getCondicionesVenta(empresa).then(res => setCondicionesVenta(res.data.resultado)).catch(() => setCondicionesVenta([]));
    }
    monedasApi.getMonedas().then(res => setMonedas(res.data.resultado)).catch(() => setMonedas([]));
  }, [visible, persona, empresa]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleFieldChange(name, value) {
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    if (!editMode && !form.id.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El código es requerido' });
      return;
    }
    if (!form.razon_social.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'La razón social es requerida' });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.id;
      if (editMode) {
        await personasApi.updatePersona(modulo, persona.id, empresa, payload);
        toast.current.show({ severity: 'success', summary: 'OK', detail: `${etiqueta} actualizado` });
      } else {
        await personasApi.createPersona({ modulo, id: form.id, empresa, ...payload });
        toast.current.show({ severity: 'success', summary: 'OK', detail: `${etiqueta} creado` });
      }
      onSaved();
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al guardar';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setSaving(false);
    }
  }

  const modelosDelModulo = modelos.filter(m => m.modulo === modulo);
  const tipoOptions = tiposComprobante.map(t => ({ label: `${t.id} - ${t.descripcion ?? ''}`, value: t.id }));
  const puntoOptions = puntosVenta.map(p => ({ label: `${p.punto} - ${p.nombre ?? ''}`, value: p.punto }));
  const modeloOptions = modelosDelModulo.map(m => ({ label: `${m.id} - ${m.descripcion ?? ''}`, value: m.id }));
  const condicionVentaOptions = condicionesVenta.map(c => ({ label: c.descripcion, value: c.id }));
  const monedaOptions = monedas.map(m => ({ label: `${m.id} - ${m.nombre ?? ''}`, value: m.id }));

  const dialogFooter = (
    <div className="dialog-footer-btns mt-2">
      <Button label="Cancelar" icon="fa-solid fa-xmark" className="p-button-text" onClick={onHide} disabled={saving} />
      <Button label="Guardar" icon="fa-solid fa-check" onClick={handleSave} loading={saving} />
    </div>
  );

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={editMode ? `Modificar ${etiqueta.toLowerCase()}` : `Agregar ${etiqueta.toLowerCase()}`}
      footer={dialogFooter}
      style={{ width: '850px' }}
      modal
      draggable={false}
      resizable={false}
    >
      <div className="form-grid">
        {!editMode && (
          <div className="form-field">
            <label>Código <span className="required">*</span></label>
            <InputText name="id" value={form.id} onChange={handleChange} />
          </div>
        )}
        <div className="form-field form-field--full">
          <label>Razón Social <span className="required">*</span></label>
          <InputText name="razon_social" value={form.razon_social} onChange={handleChange} />
        </div>
        <div className="form-field">
          <label>Nombre Comercial</label>
          <InputText name="nombre_comercial" value={form.nombre_comercial} onChange={handleChange} />
        </div>
        <div className="form-field">
          <label>Grupo</label>
          <InputText name="grupo" value={form.grupo} onChange={handleChange} />
        </div>
        <div className="form-field">
          <label>Tipo Documento</label>
          <InputText name="tipo_documento" value={form.tipo_documento} onChange={handleChange} placeholder="CUIT / DNI / CUIL" />
        </div>
        <div className="form-field">
          <label>Número Documento</label>
          <InputText name="numero_documento" value={form.numero_documento} onChange={handleChange} />
        </div>
        <div className="form-field">
          <label>Condición IVA</label>
          <InputText name="condicion_iva" value={form.condicion_iva} onChange={handleChange} placeholder="Responsable Inscripto, Monotributo..." />
        </div>
        <div className="form-field">
          <label>Número IB</label>
          <InputText name="numero_ib" value={form.numero_ib} onChange={handleChange} />
        </div>
        <div className="form-field form-field--full">
          <label>Dirección</label>
          <InputText name="direccion" value={form.direccion} onChange={handleChange} />
        </div>
        <div className="form-row-12">
          <div className="form-field" style={{ gridColumn: 'span 4' }}>
            <label>Localidad</label>
            <InputText name="localidad" value={form.localidad} onChange={handleChange} />
          </div>
          <div className="form-field" style={{ gridColumn: 'span 4' }}>
            <label>Provincia</label>
            <InputText name="provincia" value={form.provincia} onChange={handleChange} />
          </div>
          <div className="form-field" style={{ gridColumn: 'span 4' }}>
            <label>País</label>
            <InputText name="pais" value={form.pais} onChange={handleChange} />
          </div>
        </div>
        <div className="form-field">
          <label>CPA</label>
          <InputText name="cpa" value={form.cpa} onChange={handleChange} />
        </div>
        <div className="form-field">
          <label>Orden</label>
          <InputText name="orden" value={form.orden} onChange={handleChange} type="number" />
        </div>

        <div className="form-field form-field--full" style={{ marginTop: '0.25rem' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.3rem' }}>
            Valores por defecto para nuevos comprobantes
          </label>
        </div>
        <div className="form-field">
          <label>Tipo</label>
          <Dropdown value={form.tipo} options={tipoOptions} onChange={e => handleFieldChange('tipo', e.value)} filter showClear />
        </div>
        <div className="form-row-12">
          <div className="form-field" style={{ gridColumn: 'span 4' }}>
            <label>Letra</label>
            <InputText name="letra" value={form.letra} maxLength={1} onChange={e => handleFieldChange('letra', e.target.value.toUpperCase())} />
          </div>
          <div className="form-field" style={{ gridColumn: 'span 8' }}>
            <label>Punto de Venta</label>
            <Dropdown value={form.punto} options={puntoOptions} onChange={e => handleFieldChange('punto', e.value)} filter showClear />
          </div>
        </div>
        <div className="form-field">
          <label>Modelo de Comprobante</label>
          <Dropdown value={form.modelo} options={modeloOptions} onChange={e => handleFieldChange('modelo', e.value)} filter showClear />
        </div>
        <div className="form-field">
          <label>Moneda</label>
          <Dropdown value={form.moneda} options={monedaOptions} onChange={e => handleFieldChange('moneda', e.value)} filter showClear />
        </div>
        <div className="form-field">
          <label>Rubro</label>
          <InputText name="rubro" value={form.rubro} onChange={handleChange} />
        </div>
        <div className="form-field">
          <label>Condición de Venta</label>
          <Dropdown value={form.condicion_venta} options={condicionVentaOptions} onChange={e => handleFieldChange('condicion_venta', e.value)} filter showClear />
        </div>
        <div className="form-field form-field--full">
          <label>Observaciones</label>
          <InputTextarea name="observaciones" value={form.observaciones} onChange={handleChange} rows={3} autoResize={false} />
        </div>
      </div>
    </Dialog>
  );
}
