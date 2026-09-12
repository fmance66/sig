import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import BuscadorTabla from '../../components/BuscadorTabla';
import * as api from '../../api/ivaImpuestos';
import { useEmpresa } from '../../context/EmpresaContext';
import BotonVolver from '../../components/BotonVolver';
import './iva.css';

const TIPO_OPTIONS = [
  { label: 'Neto', value: 'NETO' },
  { label: 'Exento', value: 'EXENTO' },
  { label: 'No Gravado', value: 'NO_GRAVADO' },
  { label: 'IVA', value: 'IVA' },
  { label: 'Impuesto 1', value: 'IMPUESTO_1' },
  { label: 'Impuesto 2', value: 'IMPUESTO_2' },
  { label: 'Impuesto 3', value: 'IMPUESTO_3' },
  { label: 'Impuesto 4', value: 'IMPUESTO_4' },
  { label: 'Impuesto 5', value: 'IMPUESTO_5' },
  { label: 'Impuesto 6', value: 'IMPUESTO_6' },
  { label: 'Impuesto 7', value: 'IMPUESTO_7' },
  { label: 'Impuesto 8', value: 'IMPUESTO_8' },
  { label: 'Impuesto 9', value: 'IMPUESTO_9' },
  { label: 'Auxiliar', value: 'AUXILIAR' },
];
const CALCULO_OPTIONS = [
  { label: 'Importe', value: 'IMPORTE' },
  { label: 'Impuesto', value: 'IMPUESTO' },
  { label: 'Interno', value: 'INTERNO' },
  { label: 'Comisión', value: 'COMISION' },
];
const APLICACION_OPTIONS = [
  { label: 'Comprobante', value: 'COMPROBANTE' },
  { label: 'Persona', value: 'PERSONA' },
  { label: 'Producto', value: 'PRODUCTO' },
];

const EMPTY_FORM = {
  id: '', nombre: '', tipo: null, alicuota: null, importe: null,
  formula_alicuota: '', formula_importe: '', calculo: null, alias: '',
  color: '', columna: '', shortcut: '', orden: '', grupo: '', provincia: '',
  ddjj_iva: false, aplicacion: null,
};

export default function ImpuestosPage() {
  const { empresa } = useEmpresa();
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const toast = useRef(null);

  useEffect(() => { if (empresa) load(); }, [empresa?.id]);
  useEffect(() => { setVisibleCount(registros.length); }, [registros]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getImpuestos(empresa.id);
      setRegistros(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el listado de impuestos' });
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setForm(EMPTY_FORM);
    setEditMode(false);
    setDialogVisible(true);
  }

  function openEdit(row) {
    setForm({
      id: row.id,
      nombre: row.nombre ?? '',
      tipo: row.tipo ?? null,
      alicuota: row.alicuota ?? null,
      importe: row.importe ?? null,
      formula_alicuota: row.formula_alicuota ?? '',
      formula_importe: row.formula_importe ?? '',
      calculo: row.calculo ?? null,
      alias: row.alias ?? '',
      color: row.color ?? '',
      columna: row.columna ?? '',
      shortcut: row.shortcut ?? '',
      orden: row.orden ?? '',
      grupo: row.grupo ?? '',
      provincia: row.provincia ?? '',
      ddjj_iva: row.ddjj_iva ?? false,
      aplicacion: row.aplicacion ?? null,
    });
    setEditMode(true);
    setDialogVisible(true);
  }

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
    if (!form.nombre.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El nombre es requerido' });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.id;
      if (editMode) {
        await api.updateImpuesto(form.id, empresa.id, payload);
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Impuesto actualizado' });
      } else {
        await api.createImpuesto({ id: form.id, empresa: empresa.id, ...payload });
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Impuesto creado' });
      }
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
      message: `¿Está seguro de eliminar el impuesto "${row.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteImpuesto(row.id, empresa.id);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Impuesto eliminado' });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
        }
      },
    });
  }

  const colorTemplate = row => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      {row.color && <span style={{ width: '0.85rem', height: '0.85rem', borderRadius: '3px', background: row.color, border: '1px solid #d1d5db' }} />}
      {row.color || '—'}
    </div>
  );

  const accionesTemplate = (row) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-pen" className="p-button-text p-button-sm" tooltip="Modificar" tooltipOptions={{ position: 'top' }} onClick={() => openEdit(row)} />
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar" tooltipOptions={{ position: 'top' }} onClick={() => handleDelete(row)} />
    </div>
  );

  const tableHeader = (
    <div className="table-toolbar my-2">
      <BuscadorTabla value={globalFilter} onChange={setGlobalFilter} />
      <Button label="Agregar impuesto" icon="fa-solid fa-plus" size="small" onClick={openNew} />
    </div>
  );

  const hasPaginator = registros.length > 10;
  const totalRegistros = <span className="total-registros">Total: {visibleCount} registros</span>;

  const dialogFooter = (
    <div className="dialog-footer-btns mt-2">
      <Button label="Cancelar" icon="fa-solid fa-xmark" className="p-button-text" onClick={() => setDialogVisible(false)} disabled={saving} />
      <Button label="Guardar" icon="fa-solid fa-check" onClick={handleSave} loading={saving} />
    </div>
  );

  return (
    <div className="page-iva">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-percent" /> Impuestos</h2>
      </div>

      <DataTable
        value={registros}
        loading={loading}
        paginator={hasPaginator}
        rows={10}
        rowsPerPageOptions={[10, 15, 25, 50]}
        paginatorRight={totalRegistros}
        globalFilter={globalFilter}
        globalFilterFields={['id', 'nombre', 'alias']}
        onValueChange={(data) => setVisibleCount(data.length)}
        header={tableHeader}
        emptyMessage="No hay impuestos registrados"
        size="small"
        stripedRows
        removableSort
      >
        <Column field="id" header="Código" sortable style={{ width: '90px' }} />
        <Column field="nombre" header="Nombre" sortable />
        <Column field="tipo" header="Tipo" sortable style={{ width: '130px' }} />
        <Column body={r => r.alicuota != null ? `${r.alicuota}%` : '—'} header="Alícuota" style={{ width: '100px' }} />
        <Column body={colorTemplate} header="Color" style={{ width: '110px' }} />
        <Column field="orden" header="Orden" sortable style={{ width: '90px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '100px', textAlign: 'center' }} />
      </DataTable>

      <Dialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        header={editMode ? 'Modificar impuesto' : 'Agregar impuesto'}
        footer={dialogFooter}
        style={{ width: '800px' }}
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
            <label>Nombre <span className="required">*</span></label>
            <InputText name="nombre" value={form.nombre} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label>Tipo</label>
            <Dropdown value={form.tipo} options={TIPO_OPTIONS} onChange={e => handleFieldChange('tipo', e.value)} showClear filter />
          </div>
          <div className="form-field">
            <label>Cálculo</label>
            <Dropdown value={form.calculo} options={CALCULO_OPTIONS} onChange={e => handleFieldChange('calculo', e.value)} showClear />
          </div>
          <div className="form-field">
            <label>Aplicación</label>
            <Dropdown value={form.aplicacion} options={APLICACION_OPTIONS} onChange={e => handleFieldChange('aplicacion', e.value)} showClear />
          </div>
          <div className="form-field">
            <label>Alícuota</label>
            <InputNumber value={form.alicuota} suffix="%" minFractionDigits={0} maxFractionDigits={2}
              onValueChange={e => handleFieldChange('alicuota', e.value)} />
          </div>
          <div className="form-field">
            <label>Importe</label>
            <InputNumber value={form.importe} mode="decimal" minFractionDigits={2} maxFractionDigits={2}
              onValueChange={e => handleFieldChange('importe', e.value)} />
          </div>
          <div className="form-field">
            <label>Alias</label>
            <InputText name="alias" value={form.alias} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label>Fórmula Alícuota</label>
            <InputText name="formula_alicuota" value={form.formula_alicuota} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label>Fórmula Importe</label>
            <InputText name="formula_importe" value={form.formula_importe} onChange={handleChange} />
          </div>
          <div className="form-row-12">
            <div className="form-field" style={{ gridColumn: 'span 4' }}>
              <label>Columna</label>
              <InputText name="columna" value={form.columna} onChange={handleChange} />
            </div>
            <div className="form-field" style={{ gridColumn: 'span 4' }}>
              <label>Shortcut</label>
              <InputText name="shortcut" value={form.shortcut} onChange={handleChange} />
            </div>
            <div className="form-field" style={{ gridColumn: 'span 4' }}>
              <label>Orden</label>
              <InputText name="orden" value={form.orden} onChange={handleChange} type="number" />
            </div>
          </div>
          <div className="form-field">
            <label>Grupo</label>
            <InputText name="grupo" value={form.grupo} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label>Provincia</label>
            <InputText name="provincia" value={form.provincia} onChange={handleChange} />
          </div>
          <div className="form-row-12">
            <div className="form-field" style={{ gridColumn: 'span 10' }}>
              <label>Color</label>
              <InputText name="color" value={form.color} onChange={handleChange} placeholder="#RRGGBB" />
            </div>
            <div className="form-field form-field--checkbox" style={{ gridColumn: 'span 2' }}>
              <Checkbox inputId="ddjj_iva" checked={!!form.ddjj_iva} onChange={e => handleFieldChange('ddjj_iva', e.checked)} />
              <label htmlFor="ddjj_iva">DDJJ IVA</label>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
