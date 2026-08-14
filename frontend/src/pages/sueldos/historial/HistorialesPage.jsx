import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import BuscadorTabla from '../../../components/BuscadorTabla';
import { createCatalogoApi } from '../../../api/catalogo';
import * as api from '../../../api/historial';
import { toDate, toIsoDate } from '../../../utils/dates';

const camposApi = createCatalogoApi('/campos-historial');

const EMPTY_FORM = { campo: null, fecha_desde: null, fecha_hasta: null, valor: '' };

export default function HistorialesPage() {
  const [historiales, setHistoriales] = useState([]);
  const [campos, setCampos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const toast = useRef(null);

  useEffect(() => { load(); }, []);
  useEffect(() => { camposApi.getAll().then(res => setCampos(res.data.resultado)).catch(() => {}); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getHistorialesList({});
      setHistoriales(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los historiales' });
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
      campo: row.campo,
      fecha_desde: toDate(row.fecha_desde),
      fecha_hasta: toDate(row.fecha_hasta),
      valor: row.valor ?? '',
    });
    setEditMode(true);
    setDialogVisible(true);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    if (!form.campo) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El campo es requerido' });
      return;
    }
    if (!form.fecha_desde) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'La fecha desde es requerida' });
      return;
    }
    setSaving(true);
    try {
      const fecha_desde = toIsoDate(form.fecha_desde);
      const fecha_hasta = toIsoDate(form.fecha_hasta);
      if (editMode) {
        await api.updateHistorial(form.campo, fecha_desde, { fecha_hasta, valor: form.valor });
      } else {
        await api.createHistorial({ campo: form.campo, fecha_desde, fecha_hasta, valor: form.valor });
      }
      toast.current.show({ severity: 'success', summary: 'OK', detail: editMode ? 'Historial actualizado' : 'Historial creado' });
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
      message: `¿Está seguro de eliminar el registro de "${row.campo}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteHistorial(row.campo, toIsoDate(row.fecha_desde));
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Registro eliminado' });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el registro' });
        }
      },
    });
  }

  const campoOptions = campos.map(c => ({ label: `${c.id} - ${c.descripcion ?? ''}`, value: c.id }));

  const fechaTemplate = (field) => (row) => row[field] ? new Date(row[field]).toLocaleDateString('es-AR') : '—';

  const accionesTemplate = (row) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-pen" className="p-button-text p-button-sm" tooltip="Modificar" tooltipOptions={{ position: 'top' }} onClick={() => openEdit(row)} />
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar" tooltipOptions={{ position: 'top' }} onClick={() => handleDelete(row)} />
    </div>
  );

  const tableHeader = (
    <div className="table-toolbar my-2">
      <BuscadorTabla value={globalFilter} onChange={setGlobalFilter} />
      <Button label="Agregar historial" icon="fa-solid fa-plus" size="small" onClick={openNew} />
    </div>
  );

  const hasPaginator = historiales.length > 10;
  const totalRegistros = <span className="total-registros">Total: {historiales.length} registros</span>;
  const tableFooter = !hasPaginator && historiales.length > 0
    ? <div className="table-footer-right">{totalRegistros}</div>
    : null;

  const dialogFooter = (
    <div className="dialog-footer-btns mt-2">
      <Button label="Cancelar" icon="fa-solid fa-xmark" className="p-button-text" onClick={() => setDialogVisible(false)} disabled={saving} />
      <Button label="Aceptar" icon="fa-solid fa-check" onClick={handleSave} loading={saving} />
    </div>
  );

  return (
    <div className="page-novedades">
      <Toast ref={toast} />
      <ConfirmDialog />

      <h2 className="page-title"><i className="fa-solid fa-clock-rotate-left" /> Historiales</h2>

      <DataTable
        value={historiales}
        loading={loading}
        paginator={hasPaginator}
        rows={10}
        rowsPerPageOptions={[10, 25, 50, 100]}
        paginatorRight={totalRegistros}
        globalFilter={globalFilter}
        globalFilterFields={['campo', 'campo_desc', 'valor']}
        header={tableHeader}
        footer={tableFooter}
        emptyMessage="No hay historiales registrados"
        size="small"
        stripedRows
        removableSort
      >
        <Column field="campo" header="Campo" sortable style={{ width: '140px' }} />
        <Column field="campo_desc" header="Descripción" sortable />
        <Column body={fechaTemplate('fecha_desde')} header="Fecha Desde" sortField="fecha_desde" sortable style={{ width: '110px' }} />
        <Column body={fechaTemplate('fecha_hasta')} header="Fecha Hasta" style={{ width: '110px' }} />
        <Column field="valor" header="Valor" style={{ width: '140px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '90px', textAlign: 'center' }} />
      </DataTable>

      <Dialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        header={editMode ? 'Modificar historial' : 'Agregar historial'}
        footer={dialogFooter}
        style={{ width: '480px' }}
        modal
        draggable={false}
        resizable={false}
      >
        <div className="form-grid">
          <div className="form-field form-field--full">
            <label>Campo <span className="required">*</span></label>
            <Dropdown name="campo" value={form.campo} options={campoOptions}
              onChange={handleChange} placeholder="Seleccionar" filter showClear disabled={editMode} />
          </div>
          <div className="form-field">
            <label>Fecha Desde <span className="required">*</span></label>
            <Calendar value={form.fecha_desde} onChange={e => setForm(prev => ({ ...prev, fecha_desde: e.value }))}
              dateFormat="dd/mm/yy" showIcon disabled={editMode} />
          </div>
          <div className="form-field">
            <label>Fecha Hasta</label>
            <Calendar value={form.fecha_hasta} onChange={e => setForm(prev => ({ ...prev, fecha_hasta: e.value }))}
              dateFormat="dd/mm/yy" showIcon />
          </div>
          <div className="form-field form-field--full">
            <label>Valor</label>
            <InputText name="valor" value={form.valor} onChange={handleChange} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
