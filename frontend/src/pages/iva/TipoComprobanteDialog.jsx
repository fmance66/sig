import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { TabView, TabPanel } from 'primereact/tabview';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import * as tiposApi from '../../api/ivaTiposComprobante';
import * as monedasApi from '../../api/monedas';

const DOCUMENTO_OPTIONS = [
  { label: 'Factura', value: 'FACTURA' },
  { label: 'Factura Nota de Crédito', value: 'FACTURA_NC' },
  { label: 'Factura Nota de Débito', value: 'FACTURA_ND' },
  { label: 'Documento', value: 'DOCUMENTO' },
];
const SALDO_OPTIONS = [
  { label: 'Suma', value: 'SUMA' },
  { label: 'Resta', value: 'RESTA' },
  { label: 'No Calcula', value: 'NO_CALCULA' },
];
const CONCEPTO_OPTIONS = [
  { label: 'Producto', value: 'PRODUCTO' },
  { label: 'Servicio', value: 'SERVICIO' },
  { label: 'Producto y Servicio', value: 'PRODSERV' },
  { label: 'Bien de Uso', value: 'BIENDEUSO' },
  { label: 'Locación', value: 'LOCACION' },
];

const EMPTY_FORM = {
  id: '', descripcion: '', documento: null, saldo: null, moneda: null,
  concepto_cmp: null, concepto_vta: null, save_tipo: false, save_punto: false,
  campo_hasta: false, color: '', orden: '',
};
const EMPTY_LETRA = { letra: '', punto: '', tipo_afip: null };

// Modal compartido por TipoComprobantePage. `tipo` es la fila a editar
// (null = alta nueva). Tab "Letras" es un sub-recurso que se reemplaza
// entero al guardar (igual que Centros de Costo en CuentaDialog).
export default function TipoComprobanteDialog({ visible, onHide, onSaved, empresa, tipo, toast }) {
  const editMode = !!tipo;
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [monedas, setMonedas] = useState([]);
  const [tiposAfip, setTiposAfip] = useState([]);
  const [letras, setLetras] = useState([]);
  const [letraForm, setLetraForm] = useState(EMPTY_LETRA);
  const [loadingLetras, setLoadingLetras] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setActiveTab(0);
    setLetraForm(EMPTY_LETRA);
    if (tipo) {
      setForm({
        id: tipo.id,
        descripcion: tipo.descripcion ?? '',
        documento: tipo.documento ?? null,
        saldo: tipo.saldo ?? null,
        moneda: tipo.moneda ?? null,
        concepto_cmp: tipo.concepto_cmp ?? null,
        concepto_vta: tipo.concepto_vta ?? null,
        save_tipo: tipo.save_tipo ?? false,
        save_punto: tipo.save_punto ?? false,
        campo_hasta: tipo.campo_hasta ?? false,
        color: tipo.color ?? '',
        orden: tipo.orden ?? '',
      });
      loadLetras(tipo.id);
    } else {
      setForm(EMPTY_FORM);
      setLetras([]);
    }
    monedasApi.getMonedas().then(res => setMonedas(res.data.resultado)).catch(() => setMonedas([]));
    tiposApi.getTiposAfip().then(res => setTiposAfip(res.data.resultado)).catch(() => setTiposAfip([]));
  }, [visible, tipo]);

  async function loadLetras(id) {
    setLoadingLetras(true);
    try {
      const res = await tiposApi.getLetras(id, empresa);
      setLetras(res.data.resultado);
    } catch {
      setLetras([]);
    } finally {
      setLoadingLetras(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleFieldChange(name, value) {
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function addLetra() {
    if (!letraForm.letra.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Ingresá una letra' });
      return;
    }
    setLetras(prev => [...prev, { ...letraForm }]);
    setLetraForm(EMPTY_LETRA);
  }

  function removeLetra(idx) {
    setLetras(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!editMode && !form.id.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El código es requerido' });
      return;
    }
    if (!form.descripcion.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'La descripción es requerida' });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.id;
      const id = editMode ? tipo.id : form.id;
      if (editMode) {
        await tiposApi.updateTipoComprobante(id, empresa, payload);
      } else {
        await tiposApi.createTipoComprobante({ id, empresa, ...payload });
      }
      await tiposApi.setLetras(id, empresa, letras.map(l => ({
        letra: l.letra, punto: l.punto || null, tipo_afip: l.tipo_afip,
      })));
      toast.current.show({ severity: 'success', summary: 'OK', detail: editMode ? 'Tipo de comprobante actualizado' : 'Tipo de comprobante creado' });
      onSaved();
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al guardar';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setSaving(false);
    }
  }

  const monedaOptions = monedas.map(m => ({ label: `${m.id} - ${m.nombre ?? ''}`, value: m.id }));
  const tipoAfipOptions = tiposAfip.map(t => ({ label: `${t.id} - ${t.descripcion ?? ''}`, value: t.id }));
  const tipoAfipDescripcion = id => tiposAfip.find(t => t.id === id)?.descripcion ?? '';

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
      header={editMode ? 'Modificar tipo de comprobante' : 'Agregar tipo de comprobante'}
      footer={dialogFooter}
      style={{ width: '800px' }}
      modal
      draggable={false}
      resizable={false}
    >
      <TabView className="iva-tabs" activeIndex={activeTab} onTabChange={e => setActiveTab(e.index)}>
        <TabPanel header="Tipo">
          <div className="form-grid">
            {!editMode && (
              <div className="form-field">
                <label>Código <span className="required">*</span></label>
                <InputText name="id" value={form.id} onChange={handleChange} />
              </div>
            )}
            <div className="form-field form-field--full">
              <label>Descripción <span className="required">*</span></label>
              <InputText name="descripcion" value={form.descripcion} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label>Documento</label>
              <Dropdown value={form.documento} options={DOCUMENTO_OPTIONS} onChange={e => handleFieldChange('documento', e.value)} showClear />
            </div>
            <div className="form-field">
              <label>Saldo</label>
              <Dropdown value={form.saldo} options={SALDO_OPTIONS} onChange={e => handleFieldChange('saldo', e.value)} showClear />
            </div>
            <div className="form-field">
              <label>Concepto Compra</label>
              <Dropdown value={form.concepto_cmp} options={CONCEPTO_OPTIONS} onChange={e => handleFieldChange('concepto_cmp', e.value)} showClear />
            </div>
            <div className="form-field">
              <label>Concepto Venta</label>
              <Dropdown value={form.concepto_vta} options={CONCEPTO_OPTIONS} onChange={e => handleFieldChange('concepto_vta', e.value)} showClear />
            </div>
            <div className="form-field">
              <label>Moneda</label>
              <Dropdown value={form.moneda} options={monedaOptions} onChange={e => handleFieldChange('moneda', e.value)} filter showClear />
            </div>
            <div className="form-field">
              <label>Color</label>
              <InputText name="color" value={form.color} onChange={handleChange} placeholder="#RRGGBB" />
            </div>
            <div className="form-row-12">
              <div className="form-field" style={{ gridColumn: 'span 6' }}>
                <label>Orden</label>
                <InputText name="orden" value={form.orden} onChange={handleChange} type="number" />
              </div>
              <div className="form-field form-field--checkbox" style={{ gridColumn: 'span 2' }}>
                <Checkbox inputId="campo_hasta" checked={!!form.campo_hasta} onChange={e => handleFieldChange('campo_hasta', e.checked)} />
                <label htmlFor="campo_hasta">Campo Hasta</label>
              </div>
              <div className="form-field form-field--checkbox" style={{ gridColumn: 'span 2' }}>
                <Checkbox inputId="save_tipo" checked={!!form.save_tipo} onChange={e => handleFieldChange('save_tipo', e.checked)} />
                <label htmlFor="save_tipo">Guardar Tipo</label>
              </div>
              <div className="form-field form-field--checkbox" style={{ gridColumn: 'span 2' }}>
                <Checkbox inputId="save_punto" checked={!!form.save_punto} onChange={e => handleFieldChange('save_punto', e.checked)} />
                <label htmlFor="save_punto">Guardar Punto</label>
              </div>
            </div>
          </div>
        </TabPanel>
        <TabPanel header="Letras">
          {!editMode && !form.id ? (
            <div className="tab-empty-msg">
              <i className="fa-solid fa-circle-info" />
              <span>Completá el código del tipo de comprobante para poder asignarle letras.</span>
            </div>
          ) : (
            <div className="sub-tab">
              <div className="sub-form">
                <div className="form-grid">
                  <div className="form-field">
                    <label>Letra</label>
                    <InputText value={letraForm.letra} maxLength={1}
                      onChange={e => setLetraForm(prev => ({ ...prev, letra: e.target.value.toUpperCase() }))} />
                  </div>
                  <div className="form-field">
                    <label>Punto</label>
                    <InputText value={letraForm.punto} type="number"
                      onChange={e => setLetraForm(prev => ({ ...prev, punto: e.target.value }))} />
                  </div>
                  <div className="form-field form-field--full">
                    <label>Tipo AFIP</label>
                    <Dropdown value={letraForm.tipo_afip} options={tipoAfipOptions} filter showClear
                      onChange={e => setLetraForm(prev => ({ ...prev, tipo_afip: e.value }))} />
                  </div>
                </div>
                <div className="sub-form-actions">
                  <Button label="Agregar" icon="fa-solid fa-plus" size="small" onClick={addLetra} />
                </div>
              </div>
              <DataTable value={letras} loading={loadingLetras} size="small" stripedRows emptyMessage="Este tipo de comprobante no tiene letras asignadas">
                <Column field="letra" header="Letra" style={{ width: '80px' }} />
                <Column field="punto" header="Punto" style={{ width: '100px' }} body={l => l.punto || '—'} />
                <Column body={l => tipoAfipDescripcion(l.tipo_afip) || l.tipo_afip || '—'} header="Tipo AFIP" />
                <Column body={(row, { rowIndex }) => (
                  <div className="acciones-col">
                    <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" onClick={() => removeLetra(rowIndex)} />
                  </div>
                )} header="Acciones" alignHeader="center" style={{ width: '80px', textAlign: 'center' }} />
              </DataTable>
            </div>
          )}
        </TabPanel>
      </TabView>
    </Dialog>
  );
}
