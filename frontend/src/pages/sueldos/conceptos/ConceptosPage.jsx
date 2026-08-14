import { useState, useEffect, useRef, useMemo } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { TabView, TabPanel } from 'primereact/tabview';
import BuscadorTabla from '../../../components/BuscadorTabla';
import * as api from '../../../api/conceptos';
import ConceptoClasesTab from './ConceptoClasesTab';
import './conceptos.css';

const COLUMNA_OPTIONS = [
  { label: 'Remunerativo', value: 'REMUNERATIVO' },
  { label: 'No Remunerativo', value: 'NO_REMUNERATIVO' },
  { label: 'Descuento', value: 'DESCUENTO' },
  { label: 'Contribución', value: 'CONTRIBUCION' },
  { label: 'Auxiliar', value: 'AUXILIAR' },
];

const EMPTY_FORM = {
  id: '', id_afip: '', descripcion: '', columna: 'REMUNERATIVO',
  simbolo_unidad: '', decimales_unidad: '', unidad_visible: true,
  simbolo_unitario: '', decimales_unitario: '', unitario_visible: true,
  simbolo_afip: '', campo_unidad: false, leyenda_unidad: '',
  campo_importe: false, leyenda_importe: '',
  formula_unidad: '', formula_importe: '', formula_unitario: '', formula_condicion: '',
  activo: true, orden: '', clase: null,
  aporte_sipa: false, aporte_inssjyp: false, aporte_obrasocial: false, aporte_fsr: false,
  aporte_uatre: false, aporte_diferencial: false, aporte_regespecial: false,
  aporte_libre1: false, aporte_libre2: false,
  contribucion_sipa: false, contribucion_inssjyp: false, contribucion_obrasocial: false,
  contribucion_fsr: false, contribucion_renatre: false, contribucion_aaff: false,
  contribucion_fne: false, contribucion_lrt: false,
  contribucion_libre1: false, contribucion_libre2: false,
  repetible: false,
};

const LSD_FIELDS = [
  'aporte_sipa', 'aporte_inssjyp', 'aporte_obrasocial', 'aporte_fsr', 'aporte_uatre',
  'aporte_diferencial', 'aporte_regespecial', 'aporte_libre1', 'aporte_libre2',
  'contribucion_sipa', 'contribucion_inssjyp', 'contribucion_obrasocial', 'contribucion_fsr',
  'contribucion_renatre', 'contribucion_aaff', 'contribucion_fne', 'contribucion_lrt',
  'contribucion_libre1', 'contribucion_libre2', 'repetible',
];

function balanceadas(texto) {
  let balance = 0;
  for (const ch of texto) {
    if (ch === '(') balance++;
    if (ch === ')') balance--;
    if (balance < 0) return false;
  }
  return balance === 0;
}

export default function ConceptosPage() {
  const [conceptos, setConceptos] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnaFiltro, setColumnaFiltro] = useState(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editMode, setEditMode]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const toast = useRef(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getConceptos();
      setConceptos(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los conceptos' });
    } finally {
      setLoading(false);
    }
  }

  const registrosFiltrados = useMemo(() => {
    if (!columnaFiltro) return conceptos;
    return conceptos.filter(c => c.columna === columnaFiltro);
  }, [conceptos, columnaFiltro]);

  function openNew() {
    setForm(EMPTY_FORM);
    setEditMode(false);
    setActiveTab(0);
    setDialogVisible(true);
  }

  async function openEdit(row) {
    setEditMode(true);
    setActiveTab(0);
    setDialogVisible(true);
    setLoadingForm(true);
    try {
      const [conceptoRes, lsdRes] = await Promise.all([
        api.getConcepto(row.id),
        api.getConceptoLsd(row.id),
      ]);
      const c = conceptoRes.data.resultado;
      const lsd = lsdRes.data.resultado ?? {};
      const next = { id: c.id ?? '' };
      Object.keys(EMPTY_FORM).forEach(k => {
        if (k === 'id') return;
        if (LSD_FIELDS.includes(k)) next[k] = lsd[k] ?? false;
        else next[k] = c[k] ?? EMPTY_FORM[k];
      });
      setForm(next);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el concepto' });
      setDialogVisible(false);
    } finally {
      setLoadingForm(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleCheck(name, checked) {
    setForm(prev => ({ ...prev, [name]: checked }));
  }

  function seleccionarTodosLsd(checked) {
    setForm(prev => {
      const next = { ...prev };
      LSD_FIELDS.forEach(f => { next[f] = checked; });
      return next;
    });
  }

  function handleValidar(nombreCampo) {
    const texto = form[nombreCampo] ?? '';
    if (!texto.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Fórmula vacía', detail: 'No hay nada para validar' });
      return;
    }
    if (!balanceadas(texto)) {
      toast.current.show({ severity: 'error', summary: 'Fórmula inválida', detail: 'Los paréntesis no están balanceados' });
      return;
    }
    toast.current.show({ severity: 'success', summary: 'OK', detail: 'Sintaxis básica correcta (no valida el motor de cálculo real)' });
  }

  async function handleSave() {
    if (!editMode && !form.id.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El código es requerido' });
      return;
    }
    if (!form.descripcion.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El nombre es requerido' });
      return;
    }
    setSaving(true);
    try {
      const payload = {};
      Object.keys(EMPTY_FORM).forEach(k => {
        if (k === 'id' || LSD_FIELDS.includes(k)) return;
        payload[k] = form[k];
      });

      let conceptoId = form.id;
      if (editMode) {
        await api.updateConcepto(form.id, payload);
      } else {
        const res = await api.createConcepto({ id: form.id, ...payload });
        conceptoId = res.data.resultado.id;
      }

      const lsdPayload = {};
      LSD_FIELDS.forEach(f => { lsdPayload[f] = form[f]; });
      await api.updateConceptoLsd(conceptoId, lsdPayload);

      toast.current.show({ severity: 'success', summary: 'OK', detail: editMode ? 'Concepto actualizado' : 'Concepto creado' });
      setDialogVisible(false);
      load();
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al guardar';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(row) {
    confirmDialog({
      message: `¿Está seguro de eliminar el concepto "${row.descripcion || row.id}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteConcepto(row.id);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Concepto eliminado' });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
        }
      },
    });
  }

  const activoTemplate = (row) => (
    row.activo
      ? <i className="fa-solid fa-check" style={{ color: '#22c55e' }} />
      : <i className="fa-solid fa-xmark" style={{ color: '#ef4444' }} />
  );

  const accionesTemplate = (row) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-pen" className="p-button-text p-button-sm" tooltip="Modificar" tooltipOptions={{ position: 'top' }} onClick={() => openEdit(row)} />
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar" tooltipOptions={{ position: 'top' }} onClick={() => handleDelete(row)} />
    </div>
  );

  const tableHeader = (
    <div className="table-toolbar my-2">
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <BuscadorTabla value={globalFilter} onChange={setGlobalFilter} />
        <Dropdown value={columnaFiltro} options={COLUMNA_OPTIONS} onChange={e => setColumnaFiltro(e.value)}
          placeholder="Columna" showClear style={{ width: '210px' }} />
      </div>
      <Button label="Agregar concepto" icon="fa-solid fa-plus" size="small" onClick={openNew} />
    </div>
  );

  const hasPaginator = registrosFiltrados.length > 10;
  const totalRegistros = <span className="total-registros">Total: {registrosFiltrados.length} registros</span>;

  const dialogFooter = (
    <div className="dialog-footer-btns mt-2">
      <Button label="Cancelar" icon="fa-solid fa-xmark" className="p-button-text" onClick={() => setDialogVisible(false)} disabled={saving} />
      <Button label="Aceptar" icon="fa-solid fa-check" onClick={handleSave} loading={saving} disabled={loadingForm} />
    </div>
  );

  return (
    <div className="page-conceptos">
      <Toast ref={toast} />
      <ConfirmDialog />

      <h2 className="page-title"><i className="fa-solid fa-tags" /> Conceptos de liquidación</h2>

      <DataTable
        value={registrosFiltrados}
        loading={loading}
        paginator={hasPaginator}
        rows={10}
        rowsPerPageOptions={[10, 25, 50, 100]}
        paginatorRight={totalRegistros}
        globalFilter={globalFilter}
        globalFilterFields={['id', 'descripcion', 'clase']}
        header={tableHeader}
        emptyMessage="No hay conceptos registrados"
        size="small"
        stripedRows
        removableSort
      >
        <Column field="id" header="Código" sortable style={{ width: '90px' }} />
        <Column field="descripcion" header="Concepto" sortable />
        <Column field="columna" header="Columna" sortable style={{ width: '150px' }} />
        <Column field="simbolo_unidad" header="Símbolo" style={{ width: '90px' }} />
        <Column field="orden" header="Orden" sortable style={{ width: '90px' }} />
        <Column body={activoTemplate} header="Activo" style={{ width: '80px', textAlign: 'center' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '90px', textAlign: 'center' }} />
      </DataTable>

      <Dialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        header={editMode ? 'Modificar concepto' : 'Agregar concepto'}
        footer={dialogFooter}
        style={{ width: '900px' }}
        contentStyle={{ maxHeight: '78vh', overflowY: 'auto' }}
        onShow={() => document.querySelector('.p-dialog-content')?.scrollTo(0, 0)}
        modal
        draggable={false}
        resizable={false}
      >
        <div className="form-grid">
          {!editMode && (
            <div className="form-field">
              <label>Concepto (código) <span className="required">*</span></label>
              <InputText name="id" value={form.id} onChange={handleChange} />
            </div>
          )}
          <div className="form-row-12">
            <div className="form-field" style={{ gridColumn: 'span 10' }}>
              <label>Nombre <span className="required">*</span></label>
              <InputText name="descripcion" value={form.descripcion} onChange={handleChange} />
            </div>
            <div className="form-field form-field--checkbox" style={{ gridColumn: 'span 2' }}>
              <Checkbox inputId="activo" checked={form.activo} onChange={e => handleCheck('activo', e.checked)} />
              <label htmlFor="activo">Activo</label>
            </div>
          </div>
          <div className="form-field">
            <label>Columna Recibo</label>
            <Dropdown name="columna" value={form.columna} options={COLUMNA_OPTIONS} onChange={handleChange} showClear />
          </div>
          <div className="form-field">
            <label>Código AFIP</label>
            <InputText name="id_afip" value={form.id_afip} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label>Símbolo AFIP</label>
            <InputText name="simbolo_afip" value={form.simbolo_afip} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label>Orden</label>
            <InputText name="orden" value={form.orden} onChange={handleChange} type="number" />
          </div>

          <div className="form-row-12">
            <div className="form-field" style={{ gridColumn: 'span 5' }}>
              <label>Símbolo Unidad</label>
              <InputText name="simbolo_unidad" value={form.simbolo_unidad} onChange={handleChange} />
            </div>
            <div className="form-field" style={{ gridColumn: 'span 5' }}>
              <label>Decimales Unidad</label>
              <InputText name="decimales_unidad" value={form.decimales_unidad} onChange={handleChange} type="number" />
            </div>
            <div className="form-field form-field--checkbox" style={{ gridColumn: 'span 2' }}>
              <Checkbox inputId="unidad_visible" checked={form.unidad_visible} onChange={e => handleCheck('unidad_visible', e.checked)} />
              <label htmlFor="unidad_visible">Unidad Visible</label>
            </div>
          </div>

          <div className="form-row-12">
            <div className="form-field" style={{ gridColumn: 'span 5' }}>
              <label>Símbolo Unitario</label>
              <InputText name="simbolo_unitario" value={form.simbolo_unitario} onChange={handleChange} />
            </div>
            <div className="form-field" style={{ gridColumn: 'span 5' }}>
              <label>Decimales Unitario</label>
              <InputText name="decimales_unitario" value={form.decimales_unitario} onChange={handleChange} />
            </div>
            <div className="form-field form-field--checkbox" style={{ gridColumn: 'span 2' }}>
              <Checkbox inputId="unitario_visible" checked={form.unitario_visible} onChange={e => handleCheck('unitario_visible', e.checked)} />
              <label htmlFor="unitario_visible">Valor Unitario Visible</label>
            </div>
          </div>

          <div className="form-row-12">
            <div className="form-field" style={{ gridColumn: 'span 10' }}>
              <label>Leyenda Unidad</label>
              <InputText name="leyenda_unidad" value={form.leyenda_unidad} onChange={handleChange} disabled={!form.campo_unidad} />
            </div>
            <div className="form-field form-field--checkbox" style={{ gridColumn: 'span 2' }}>
              <Checkbox inputId="campo_unidad" checked={form.campo_unidad} onChange={e => handleCheck('campo_unidad', e.checked)} />
              <label htmlFor="campo_unidad">Unidad x Teclado</label>
            </div>
          </div>
          <div className="form-row-12">
            <div className="form-field" style={{ gridColumn: 'span 10' }}>
              <label>Leyenda Importe</label>
              <InputText name="leyenda_importe" value={form.leyenda_importe} onChange={handleChange} disabled={!form.campo_importe} />
            </div>
            <div className="form-field form-field--checkbox" style={{ gridColumn: 'span 2' }}>
              <Checkbox inputId="campo_importe" checked={form.campo_importe} onChange={e => handleCheck('campo_importe', e.checked)} />
              <label htmlFor="campo_importe">Importe x Teclado</label>
            </div>
          </div>
        </div>

        <TabView activeIndex={activeTab} onTabChange={e => setActiveTab(e.index)} className="conceptos-tabs">

          <TabPanel header="Fórmulas">
            <div className="form-field form-field--full">
              <div className="form-field-label-row">
                <label>Fórmula de Unidad</label>
                <Button label="Validar" icon="fa-solid fa-circle-check" size="small" className="p-button-text" onClick={() => handleValidar('formula_unidad')} />
              </div>
              <InputTextarea name="formula_unidad" value={form.formula_unidad} onChange={handleChange} rows={4} autoResize />
            </div>
            <div className="form-field form-field--full" style={{ marginTop: '0.75rem' }}>
              <div className="form-field-label-row">
                <label>Fórmula de Importe</label>
                <Button label="Validar" icon="fa-solid fa-circle-check" size="small" className="p-button-text" onClick={() => handleValidar('formula_importe')} />
              </div>
              <InputTextarea name="formula_importe" value={form.formula_importe} onChange={handleChange} rows={4} autoResize />
            </div>
          </TabPanel>

          <TabPanel header="Condiciones">
            <div className="form-field form-field--full">
              <label>Fórmula Valor Unitario</label>
              <InputTextarea name="formula_unitario" value={form.formula_unitario} onChange={handleChange} rows={4} autoResize />
              <div className="sub-form-actions">
                <Button label="Validar" icon="fa-solid fa-circle-check" size="small" className="p-button-text" onClick={() => handleValidar('formula_unitario')} />
              </div>
            </div>
            <div className="form-field form-field--full">
              <label>Fórmula de Condición</label>
              <InputTextarea name="formula_condicion" value={form.formula_condicion} onChange={handleChange} rows={4} autoResize />
              <div className="sub-form-actions">
                <Button label="Validar" icon="fa-solid fa-circle-check" size="small" className="p-button-text" onClick={() => handleValidar('formula_condicion')} />
              </div>
            </div>
          </TabPanel>

          <TabPanel header="Clases">
            <ConceptoClasesTab clase={form.clase} onChange={v => setForm(p => ({ ...p, clase: v }))} toast={toast} />
          </TabPanel>

          <TabPanel header="LSD">
            <div className="lsd-grid">
              <div className="lsd-row">
                <span className="lsd-row-title">Aportes</span>
                {[
                  ['aporte_sipa', 'SIPA'], ['aporte_inssjyp', 'INSSJyP'], ['aporte_obrasocial', 'OS'],
                  ['aporte_fsr', 'FSR'], ['aporte_uatre', 'UATRE'], ['aporte_diferencial', 'Diferencial'],
                  ['aporte_regespecial', 'Reg. Esp.'], ['aporte_libre1', 'Libre 1'], ['aporte_libre2', 'Libre 2'],
                ].map(([field, label]) => (
                  <label key={field} className="lsd-check">
                    <Checkbox inputId={field} checked={form[field]} onChange={e => handleCheck(field, e.checked)} />
                    {label}
                  </label>
                ))}
              </div>
              <div className="lsd-row">
                <span className="lsd-row-title">Contribuciones</span>
                {[
                  ['contribucion_sipa', 'SIPA'], ['contribucion_inssjyp', 'INSSJyP'], ['contribucion_obrasocial', 'OS'],
                  ['contribucion_fsr', 'FSR'], ['contribucion_renatre', 'RENATRE'], ['contribucion_aaff', 'AAFF'],
                  ['contribucion_fne', 'FNE'], ['contribucion_lrt', 'LRT'],
                  ['contribucion_libre1', 'Libre 1'], ['contribucion_libre2', 'Libre 2'],
                ].map(([field, label]) => (
                  <label key={field} className="lsd-check">
                    <Checkbox inputId={field} checked={form[field]} onChange={e => handleCheck(field, e.checked)} />
                    {label}
                  </label>
                ))}
              </div>
              <div className="lsd-row">
                <label className="lsd-check">
                  <Checkbox inputId="repetible" checked={form.repetible} onChange={e => handleCheck('repetible', e.checked)} />
                  Concepto Repetible
                </label>
                <label className="lsd-check">
                  <Checkbox checked={LSD_FIELDS.every(f => form[f])} onChange={e => seleccionarTodosLsd(e.checked)} />
                  Seleccionar Todos
                </label>
              </div>
            </div>
          </TabPanel>

        </TabView>
      </Dialog>
    </div>
  );
}
