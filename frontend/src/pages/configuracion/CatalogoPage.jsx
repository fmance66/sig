import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Checkbox } from 'primereact/checkbox';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import BuscadorTabla from '../../components/BuscadorTabla';
import { createCatalogoApi } from '../../api/catalogo';
import './CatalogoPage.css';

function emptyForm(fields) {
  const form = { id: '' };
  fields.forEach(f => {
    if (f.type === 'select' || f.type === 'date') form[f.name] = null;
    else if (f.type === 'checkbox') form[f.name] = f.default ?? false;
    else form[f.name] = '';
  });
  return form;
}

function emptyValue(f) {
  if (f.type === 'select' || f.type === 'date') return null;
  if (f.type === 'checkbox') return false;
  return '';
}

function toDateInput(val) {
  if (!val) return null;
  const d = val instanceof Date ? val : new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

function serializeForm(form, fields) {
  const out = { ...form };
  fields.forEach(f => {
    if (f.type === 'date' && out[f.name] instanceof Date) {
      const d = out[f.name];
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      out[f.name] = `${d.getFullYear()}-${mm}-${dd}`;
    }
  });
  return out;
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function CatalogoPage({ title, icon, basePath, entityLabel, columns, fields, dialogWidth = '600px', filterFields = ['id', 'descripcion'], idLabel = 'Código', idFirst = true, idSpan = null, deleteLabelField = 'descripcion' }) {
  const api = useRef(createCatalogoApi(basePath)).current;

  const [registros, setRegistros]       = useState([]);
  const [loading, setLoading]           = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editMode, setEditMode]         = useState(false);
  const [form, setForm]                 = useState(() => emptyForm(fields));
  const [saving, setSaving]             = useState(false);
  const toast = useRef(null);

  useEffect(() => { load(); }, [basePath]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getAll();
      setRegistros(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: `No se pudo cargar el listado de ${entityLabel}` });
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setForm(emptyForm(fields));
    setEditMode(false);
    setDialogVisible(true);
  }

  function openEdit(row) {
    const next = { id: row.id ?? '' };
    fields.forEach(f => {
      if (f.type === 'date') next[f.name] = toDateInput(row[f.name]);
      else next[f.name] = row[f.name] ?? emptyValue(f);
    });
    setForm(next);
    setEditMode(true);
    setDialogVisible(true);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleSelectChange(name, value) {
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    if (!editMode && !form.id.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El código es requerido' });
      return;
    }
    const missing = fields.find(f => f.required && !String(form[f.name] ?? '').trim());
    if (missing) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: `${missing.label} es requerido/a` });
      return;
    }
    setSaving(true);
    try {
      const payload = serializeForm(form, fields);
      if (editMode) {
        await api.update(form.id, payload);
        toast.current.show({ severity: 'success', summary: 'OK', detail: `${cap(entityLabel)} actualizado/a` });
      } else {
        await api.create(payload);
        toast.current.show({ severity: 'success', summary: 'OK', detail: `${cap(entityLabel)} creado/a` });
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
      message: `¿Está seguro de eliminar "${row[deleteLabelField] || row.id}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.remove(row.id);
          toast.current.show({ severity: 'success', summary: 'OK', detail: `${cap(entityLabel)} eliminado/a` });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
        }
      },
    });
  }

  const tableHeader = (
    <div className="table-toolbar my-2">
      <BuscadorTabla value={globalFilter} onChange={setGlobalFilter} />
      <Button label={`Agregar ${entityLabel}`} icon="fa-solid fa-plus" onClick={openNew} size="small" />
    </div>
  );

  const hasPaginator = registros.length > 10;
  const totalRegistros = <span className="total-registros">Total: {registros.length} registros</span>;
  const tableFooter = !hasPaginator && registros.length > 0
    ? <div className="table-footer-right">{totalRegistros}</div>
    : null;

  const accionesTemplate = (row) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-pen" className="p-button-text p-button-sm" tooltip="Modificar" tooltipOptions={{ position: 'top' }} onClick={() => openEdit(row)} />
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar" tooltipOptions={{ position: 'top' }} onClick={() => handleDelete(row)} />
    </div>
  );

  function renderField(f) {
    return (
      <div key={f.name} className={`form-field${f.full ? ' form-field--full' : ''}${f.type === 'checkbox' ? ' form-field--checkbox' : ''}`} style={f.span ? { gridColumn: `span ${f.span}` } : undefined}>
        {f.type === 'checkbox' ? (
          <label className="checkbox-label">
            <Checkbox checked={!!form[f.name]} onChange={e => handleSelectChange(f.name, e.checked)} />
            {f.label}
          </label>
        ) : (
          <label>{f.label} {f.required && <span className="required">*</span>}</label>
        )}
        {f.type === 'select' ? (
          <Dropdown
            value={form[f.name]}
            options={f.options}
            onChange={e => handleSelectChange(f.name, e.value)}
            placeholder="Seleccionar..."
            showClear
          />
        ) : f.type === 'date' ? (
          <Calendar
            value={form[f.name]}
            onChange={e => handleSelectChange(f.name, e.value)}
            dateFormat="dd/mm/yy"
            showIcon
            showButtonBar
          />
        ) : f.type === 'textarea' ? (
          <InputTextarea
            name={f.name}
            value={form[f.name] ?? ''}
            onChange={handleChange}
            rows={3}
            autoResize
          />
        ) : f.type === 'checkbox' ? null : (
          <InputText
            name={f.name}
            value={form[f.name] ?? ''}
            onChange={handleChange}
            type={f.type === 'number' ? 'number' : 'text'}
            placeholder={f.placeholder}
          />
        )}
      </div>
    );
  }

  const idField = (
    <div className="form-field" style={idSpan ? { gridColumn: `span ${idSpan}` } : undefined}>
      <label>{idLabel} {!editMode && <span className="required">*</span>}</label>
      <InputText name="id" value={form.id} onChange={handleChange} disabled={editMode} />
    </div>
  );

  const dialogFooter = (
    <div className="dialog-footer-btns mt-2">
      <Button label="Cancelar" icon="fa-solid fa-xmark" className="p-button-text" onClick={() => setDialogVisible(false)} disabled={saving} />
      <Button label="Aceptar" icon="fa-solid fa-check" onClick={handleSave} loading={saving} />
    </div>
  );

  return (
    <div className="page-catalogo">
      <Toast ref={toast} />
      <ConfirmDialog />

      <h2 className="catalogo-page-title"><i className={icon} /> {title}</h2>

      <DataTable
        value={registros}
        loading={loading}
        paginator={hasPaginator}
        rows={10}
        rowsPerPageOptions={[10, 15, 25, 50]}
        paginatorRight={totalRegistros}
        globalFilter={globalFilter}
        globalFilterFields={filterFields}
        header={tableHeader}
        footer={tableFooter}
        emptyMessage={`No hay registros de ${entityLabel}`}
        size="small"
        stripedRows
        removableSort
      >
        {columns.map(col => (
          <Column key={col.field} field={col.field} header={col.header} sortable style={col.style} />
        ))}
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '100px', textAlign: 'center' }} />
      </DataTable>

      <Dialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        header={editMode ? `Modificar ${entityLabel}` : `Agregar ${entityLabel}`}
        footer={dialogFooter}
        style={{ width: dialogWidth }}
        modal
        draggable={false}
        resizable={false}
      >
        <div className="form-grid">
          {idSpan ? (
            <div className="form-row-12">
              {idFirst && idField}
              {fields[0] && renderField({ ...fields[0], span: 12 - idSpan })}
              {!idFirst && idField}
            </div>
          ) : (
            idFirst && idField
          )}
          {(idSpan ? fields.slice(1) : fields).map(f => renderField(f))}
          {!idFirst && !idSpan && idField}
        </div>
      </Dialog>
    </div>
  );
}
