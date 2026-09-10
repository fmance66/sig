import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { TabView, TabPanel } from 'primereact/tabview';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import * as modelosApi from '../../api/ivaModelosComprobante';
import * as impuestosApi from '../../api/ivaImpuestos';

const MODULO_OPTIONS = [
  { label: 'Compra', value: 'COMPRA' },
  { label: 'Venta', value: 'VENTA' },
];

const EMPTY_FORM = { id: '', descripcion: '', modulo: 'COMPRA', columna_total: '', fila_total: '', orden: '' };
const EMPTY_LINEA = { impuesto: null, rubro: '', alicuota: null, importe: null, formula_alicuota: '', formula_importe: '', etiqueta: '', columna: '', fila: '' };

// Modal compartido por ModeloComprobantePage. `modelo` es la fila a editar
// (null = alta nueva). Tab "Impuestos" es un sub-recurso que se reemplaza
// entero al guardar (mismo patrón que Letras de Tipo de Comprobante).
export default function ModeloComprobanteDialog({ visible, onHide, onSaved, empresa, modelo, toast }) {
  const editMode = !!modelo;
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [impuestosCatalogo, setImpuestosCatalogo] = useState([]);
  const [lineas, setLineas] = useState([]);
  const [lineaForm, setLineaForm] = useState(EMPTY_LINEA);
  const [loadingLineas, setLoadingLineas] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setActiveTab(0);
    setLineaForm(EMPTY_LINEA);
    if (modelo) {
      setForm({
        id: modelo.id,
        descripcion: modelo.descripcion ?? '',
        modulo: modelo.modulo ?? 'COMPRA',
        columna_total: modelo.columna_total ?? '',
        fila_total: modelo.fila_total ?? '',
        orden: modelo.orden ?? '',
      });
      loadLineas(modelo.id);
    } else {
      setForm(EMPTY_FORM);
      setLineas([]);
    }
    if (empresa) {
      impuestosApi.getImpuestos(empresa).then(res => setImpuestosCatalogo(res.data.resultado)).catch(() => setImpuestosCatalogo([]));
    }
  }, [visible, modelo, empresa]);

  async function loadLineas(id) {
    setLoadingLineas(true);
    try {
      const res = await modelosApi.getImpuestosModelo(id, empresa);
      setLineas(res.data.resultado);
    } catch {
      setLineas([]);
    } finally {
      setLoadingLineas(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleFieldChange(name, value) {
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleImpuestoChange(id) {
    const imp = impuestosCatalogo.find(i => i.id === id);
    setLineaForm(prev => ({ ...prev, impuesto: id, alicuota: imp?.alicuota ?? prev.alicuota, rubro: imp?.grupo ?? prev.rubro }));
  }

  function addLinea() {
    if (!lineaForm.impuesto) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Elegí un impuesto' });
      return;
    }
    setLineas(prev => [...prev, { ...lineaForm }]);
    setLineaForm(EMPTY_LINEA);
  }

  function removeLinea(idx) {
    setLineas(prev => prev.filter((_, i) => i !== idx));
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
      const id = editMode ? modelo.id : form.id;
      if (editMode) {
        await modelosApi.updateModeloComprobante(id, empresa, payload);
      } else {
        await modelosApi.createModeloComprobante({ id, empresa, ...payload });
      }
      await modelosApi.setImpuestosModelo(id, empresa, lineas.map(l => ({
        impuesto: l.impuesto, rubro: l.rubro, alicuota: l.alicuota, importe: l.importe,
        formula_alicuota: l.formula_alicuota, formula_importe: l.formula_importe,
        etiqueta: l.etiqueta, columna: l.columna, fila: l.fila,
      })));
      toast.current.show({ severity: 'success', summary: 'OK', detail: editMode ? 'Modelo de comprobante actualizado' : 'Modelo de comprobante creado' });
      onSaved();
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al guardar';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setSaving(false);
    }
  }

  const impuestoOptions = impuestosCatalogo.map(i => ({ label: `${i.id} - ${i.nombre ?? ''}`, value: i.id }));
  const impuestoDescripcion = id => impuestosCatalogo.find(i => i.id === id)?.nombre ?? id;

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
      header={editMode ? 'Modificar modelo de comprobante' : 'Agregar modelo de comprobante'}
      footer={dialogFooter}
      style={{ width: '850px' }}
      modal
      draggable={false}
      resizable={false}
    >
      <TabView className="iva-tabs" activeIndex={activeTab} onTabChange={e => setActiveTab(e.index)}>
        <TabPanel header="Modelo">
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
              <label>Módulo</label>
              <Dropdown value={form.modulo} options={MODULO_OPTIONS} onChange={e => handleFieldChange('modulo', e.value)} />
            </div>
            <div className="form-field">
              <label>Orden</label>
              <InputText name="orden" value={form.orden} onChange={handleChange} type="number" />
            </div>
            <div className="form-field">
              <label>Columna Total</label>
              <InputText name="columna_total" value={form.columna_total} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label>Fila Total</label>
              <InputText name="fila_total" value={form.fila_total} onChange={handleChange} />
            </div>
          </div>
        </TabPanel>
        <TabPanel header="Impuestos">
          {!editMode && !form.id ? (
            <div className="tab-empty-msg">
              <i className="fa-solid fa-circle-info" />
              <span>Completá el código del modelo para poder asignarle impuestos.</span>
            </div>
          ) : (
            <div className="sub-tab">
              <div className="sub-form">
                <div className="form-grid">
                  <div className="form-field">
                    <label>Impuesto</label>
                    <Dropdown value={lineaForm.impuesto} options={impuestoOptions} filter showClear
                      onChange={e => handleImpuestoChange(e.value)} />
                  </div>
                  <div className="form-field">
                    <label>Rubro</label>
                    <InputText value={lineaForm.rubro} onChange={e => setLineaForm(prev => ({ ...prev, rubro: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label>Alícuota</label>
                    <InputNumber value={lineaForm.alicuota} suffix="%" minFractionDigits={0} maxFractionDigits={2}
                      onValueChange={e => setLineaForm(prev => ({ ...prev, alicuota: e.value }))} />
                  </div>
                  <div className="form-field">
                    <label>Importe</label>
                    <InputNumber value={lineaForm.importe} mode="decimal" minFractionDigits={2} maxFractionDigits={2}
                      onValueChange={e => setLineaForm(prev => ({ ...prev, importe: e.value }))} />
                  </div>
                  <div className="form-field">
                    <label>Etiqueta</label>
                    <InputText value={lineaForm.etiqueta} onChange={e => setLineaForm(prev => ({ ...prev, etiqueta: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label>Columna</label>
                    <InputText value={lineaForm.columna} onChange={e => setLineaForm(prev => ({ ...prev, columna: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label>Fila</label>
                    <InputText value={lineaForm.fila} onChange={e => setLineaForm(prev => ({ ...prev, fila: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label>Fórmula Alícuota</label>
                    <InputText value={lineaForm.formula_alicuota} onChange={e => setLineaForm(prev => ({ ...prev, formula_alicuota: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label>Fórmula Importe</label>
                    <InputText value={lineaForm.formula_importe} onChange={e => setLineaForm(prev => ({ ...prev, formula_importe: e.target.value }))} />
                  </div>
                </div>
                <div className="sub-form-actions">
                  <Button label="Agregar" icon="fa-solid fa-plus" size="small" onClick={addLinea} />
                </div>
              </div>
              <DataTable value={lineas} loading={loadingLineas} size="small" stripedRows emptyMessage="Este modelo no tiene impuestos asignados">
                <Column body={l => impuestoDescripcion(l.impuesto)} header="Impuesto" />
                <Column field="rubro" header="Rubro" style={{ width: '100px' }} />
                <Column body={l => l.alicuota != null ? `${l.alicuota}%` : '—'} header="Alícuota" style={{ width: '90px' }} />
                <Column field="columna" header="Columna" style={{ width: '90px' }} />
                <Column field="fila" header="Fila" style={{ width: '80px' }} />
                <Column body={(row, { rowIndex }) => (
                  <div className="acciones-col">
                    <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" onClick={() => removeLinea(rowIndex)} />
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
