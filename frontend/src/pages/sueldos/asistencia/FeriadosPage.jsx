import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import BuscadorTabla from '../../../components/BuscadorTabla';
import { createCatalogoApi } from '../../../api/catalogo';
import { toDate, toIsoDate } from '../../../utils/dates';
import BotonVolver from '../../../components/BotonVolver';

const api = createCatalogoApi('/feriados');

const EMPTY_FORM = { fecha: null, descripcion: '' };

export default function FeriadosPage() {
  const [feriados, setFeriados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const toast = useRef(null);

  useEffect(() => { load(); }, []);
  useEffect(() => { setVisibleCount(feriados.length); }, [feriados]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getAll();
      setFeriados(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los feriados' });
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
    setForm({ fecha: toDate(row.id), descripcion: row.descripcion ?? '' });
    setEditMode(true);
    setDialogVisible(true);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    if (!form.fecha) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'La fecha es requerida' });
      return;
    }
    setSaving(true);
    try {
      const fecha = toIsoDate(form.fecha);
      if (editMode) {
        await api.update(fecha, { descripcion: form.descripcion });
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Feriado actualizado' });
      } else {
        await api.create({ id: fecha, descripcion: form.descripcion });
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Feriado creado' });
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
      message: `¿Está seguro de eliminar el feriado "${row.descripcion || row.id}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.remove(toIsoDate(toDate(row.id)));
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Feriado eliminado' });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el feriado' });
        }
      },
    });
  }

  const fechaTemplate = row => row.id ? new Date(row.id).toLocaleDateString('es-AR') : '—';

  const accionesTemplate = (row) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-pen" className="p-button-text p-button-sm" tooltip="Modificar" tooltipOptions={{ position: 'top' }} onClick={() => openEdit(row)} />
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar" tooltipOptions={{ position: 'top' }} onClick={() => handleDelete(row)} />
    </div>
  );

  const tableHeader = (
    <div className="table-toolbar my-2">
      <BuscadorTabla value={globalFilter} onChange={setGlobalFilter} />
      <Button label="Agregar feriado" icon="fa-solid fa-plus" size="small" onClick={openNew} />
    </div>
  );

  const hasPaginator = feriados.length > 10;
  const totalRegistros = <span className="total-registros">Total: {visibleCount} registros</span>;
  const tableFooter = !hasPaginator && feriados.length > 0
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

      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-umbrella-beach" /> Feriados</h2>
      </div>

      <DataTable
        value={feriados}
        loading={loading}
        paginator={hasPaginator}
        rows={10}
        rowsPerPageOptions={[10, 25, 50, 100]}
        paginatorRight={totalRegistros}
        globalFilter={globalFilter}
        globalFilterFields={['descripcion']}
        onValueChange={(data) => setVisibleCount(data.length)}
        header={tableHeader}
        footer={tableFooter}
        emptyMessage="No hay feriados registrados"
        size="small"
        stripedRows
        removableSort
      >
        <Column body={fechaTemplate} header="Feriado" sortField="id" sortable style={{ width: '140px' }} />
        <Column field="descripcion" header="Descripción" sortable />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '90px', textAlign: 'center' }} />
      </DataTable>

      <Dialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        header={editMode ? 'Modificar feriado' : 'Agregar feriado'}
        footer={dialogFooter}
        style={{ width: '420px' }}
        modal
        draggable={false}
        resizable={false}
      >
        <div className="form-grid">
          <div className="form-field">
            <label>Fecha <span className="required">*</span></label>
            <Calendar value={form.fecha} onChange={e => setForm(prev => ({ ...prev, fecha: e.value }))}
              dateFormat="dd/mm/yy" showIcon disabled={editMode} />
          </div>
          <div className="form-field form-field--full">
            <label>Descripción</label>
            <InputText name="descripcion" value={form.descripcion} onChange={handleChange} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
