import { Fragment, useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import BuscadorTabla from '../../../components/BuscadorTabla';
import * as api from '../../../api/tiposTabla';
import './conceptos.css';

const TIPO_OPTIONS = [
  { label: 'Texto', value: 'TEXT' },
  { label: 'Entero', value: 'INTEGER' },
  { label: 'Decimal', value: 'DECIMAL' },
  { label: 'Fecha', value: 'DATE' },
];

const N_COLUMNAS = 9;

function emptyColumnas() {
  return Array.from({ length: N_COLUMNAS }, () => ({ nombre: '', tipo: null, longitud: '', decimales: '' }));
}

const EMPTY_FORM = { id: '', descripcion: '', orden: '', columnas: emptyColumnas() };

function rowToForm(row) {
  const columnas = Array.from({ length: N_COLUMNAS }, (_, i) => {
    const n = i + 1;
    return {
      nombre: row[`column_${n}`] ?? '',
      tipo: row[`data_type_${n}`] ?? null,
      longitud: row[`length_${n}`] ?? '',
      decimales: row[`decimals_${n}`] ?? '',
    };
  });
  return { id: row.id, descripcion: row.descripcion ?? '', orden: row.orden ?? '', columnas };
}

function formToPayload(form) {
  const payload = { descripcion: form.descripcion, orden: form.orden };
  form.columnas.forEach((c, i) => {
    const n = i + 1;
    payload[`column_${n}`] = c.nombre || null;
    payload[`data_type_${n}`] = c.tipo || null;
    payload[`length_${n}`] = c.longitud;
    payload[`decimals_${n}`] = c.decimales;
  });
  return payload;
}

export default function TiposTablaPage() {
  const [tipos, setTipos]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const toast = useRef(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getTiposTabla();
      setTipos(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el listado de tipos de tabla' });
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
    setForm(rowToForm(row));
    setEditMode(true);
    setDialogVisible(true);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleColumnaChange(index, field, value) {
    setForm(prev => ({
      ...prev,
      columnas: prev.columnas.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    }));
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
      const payload = formToPayload(form);
      if (editMode) {
        await api.updateTipoTabla(form.id, payload);
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Tipo de tabla actualizado' });
      } else {
        await api.createTipoTabla({ id: form.id, ...payload });
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Tipo de tabla creado' });
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
      message: `¿Está seguro de eliminar el tipo de tabla "${row.descripcion || row.id}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteTipoTabla(row.id);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Tipo de tabla eliminado' });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
        }
      },
    });
  }

  const accionesTemplate = (row) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-pen" className="p-button-text p-button-sm" tooltip="Modificar" tooltipOptions={{ position: 'top' }} onClick={() => openEdit(row)} />
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar" tooltipOptions={{ position: 'top' }} onClick={() => handleDelete(row)} />
    </div>
  );

  const tableHeader = (
    <div className="table-toolbar my-2">
      <BuscadorTabla value={globalFilter} onChange={setGlobalFilter} />
      <Button label="Agregar tipo de tabla" icon="fa-solid fa-plus" size="small" onClick={openNew} />
    </div>
  );

  const hasPaginator = tipos.length > 10;
  const totalRegistros = <span className="total-registros">Total: {tipos.length} registros</span>;

  const dialogFooter = (
    <div className="dialog-footer-btns mt-2">
      <Button label="Cancelar" icon="fa-solid fa-xmark" className="p-button-text" onClick={() => setDialogVisible(false)} disabled={saving} />
      <Button label="Aceptar" icon="fa-solid fa-check" onClick={handleSave} loading={saving} />
    </div>
  );

  return (
    <div className="page-conceptos">
      <Toast ref={toast} />
      <ConfirmDialog />

      <h2 className="page-title"><i className="fa-solid fa-table-cells" /> Tipo de Tabla</h2>

      <DataTable
        value={tipos}
        loading={loading}
        paginator={hasPaginator}
        rows={10}
        rowsPerPageOptions={[10, 15, 25, 50]}
        paginatorRight={totalRegistros}
        globalFilter={globalFilter}
        globalFilterFields={['id', 'descripcion']}
        header={tableHeader}
        emptyMessage="No hay tipos de tabla registrados"
        size="small"
        stripedRows
        removableSort
      >
        <Column field="id" header="Tabla" sortable style={{ width: '160px' }} />
        <Column field="descripcion" header="Descripción" sortable />
        <Column field="orden" header="Orden" sortable style={{ width: '100px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '100px', textAlign: 'center' }} />
      </DataTable>

      <Dialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        header={editMode ? 'Modificar tipo de tabla' : 'Agregar tipo de tabla'}
        footer={dialogFooter}
        style={{ width: '780px' }}
        contentStyle={{ maxHeight: '78vh', overflowY: 'auto' }}
        modal
        draggable={false}
        resizable={false}
      >
        <div className="form-grid">
          {!editMode && (
            <div className="form-field">
              <label>Tabla <span className="required">*</span></label>
              <InputText name="id" value={form.id} onChange={handleChange} />
            </div>
          )}
          <div className="form-field">
            <label>Descripción <span className="required">*</span></label>
            <InputText name="descripcion" value={form.descripcion} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label>Orden</label>
            <InputText name="orden" value={form.orden} onChange={handleChange} type="number" />
          </div>
        </div>

        <div className="form-section-title">Columnas</div>
        <div className="tabla-columnas-grid">
          <div className="col-header">#</div>
          <div className="col-header">Nombre</div>
          <div className="col-header">Tipo</div>
          <div className="col-header">Longitud</div>
          <div className="col-header">Decimales</div>
          {form.columnas.map((c, i) => (
            <Fragment key={i}>
              <div className="col-label">Columna {i + 1}</div>
              <InputText value={c.nombre} onChange={e => handleColumnaChange(i, 'nombre', e.target.value)} />
              <Dropdown value={c.tipo} options={TIPO_OPTIONS} onChange={e => handleColumnaChange(i, 'tipo', e.value)} placeholder="—" showClear />
              <InputText value={c.longitud} onChange={e => handleColumnaChange(i, 'longitud', e.target.value)} type="number" />
              <InputText value={c.decimales} onChange={e => handleColumnaChange(i, 'decimales', e.target.value)} type="number" />
            </Fragment>
          ))}
        </div>
      </Dialog>
    </div>
  );
}
