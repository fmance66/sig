import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useEmpresa } from '../../../context/EmpresaContext';
import BuscadorTabla from '../../../components/BuscadorTabla';
import { createCatalogoApi } from '../../../api/catalogo';
import * as empleadosApi from '../../../api/empleados';
import * as api from '../../../api/ausentismo';
import { toDate, toIsoDate } from '../../../utils/dates';
import BotonVolver from '../../../components/BotonVolver';

const motivosApi = createCatalogoApi('/motivos-ausentismo');

const EMPTY_FORM = { empleado: null, motivo: null, fecha_desde: null, fecha_hasta: null, observaciones: '' };

export default function AusentismoPage() {
  const { empresa } = useEmpresa();
  const [ausentismos, setAusentismos] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [motivos, setMotivos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const toast = useRef(null);

  useEffect(() => { if (empresa) load(); }, [empresa?.id]);
  useEffect(() => { if (empresa) empleadosApi.getEmpleados(empresa.id, 'activo').then(res => setEmpleados(res.data.resultado)).catch(() => {}); }, [empresa?.id]);
  useEffect(() => { motivosApi.getAll().then(res => setMotivos(res.data.resultado)).catch(() => {}); }, []);
  useEffect(() => { setVisibleCount(ausentismos.length); }, [ausentismos]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getAusentismosList({ empresa: empresa?.id });
      setAusentismos(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los ausentismos' });
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
      empleado: row.empleado,
      motivo: row.motivo,
      fecha_desde: toDate(row.fecha_desde),
      fecha_hasta: toDate(row.fecha_hasta),
      observaciones: row.observaciones ?? '',
    });
    setEditMode(true);
    setDialogVisible(true);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    if (!form.empleado) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El empleado es requerido' });
      return;
    }
    if (!form.motivo) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El motivo es requerido' });
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
        await api.updateAusentismo(form.empleado, form.motivo, fecha_desde, { fecha_hasta, observaciones: form.observaciones });
      } else {
        await api.createAusentismo({ empleado: form.empleado, motivo: form.motivo, fecha_desde, fecha_hasta, observaciones: form.observaciones });
      }
      toast.current.show({ severity: 'success', summary: 'OK', detail: editMode ? 'Ausentismo actualizado' : 'Ausentismo creado' });
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
      message: `¿Está seguro de eliminar el ausentismo de "${row.apellido}, ${row.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteAusentismo(row.empleado, row.motivo, toIsoDate(row.fecha_desde));
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Registro eliminado' });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el registro' });
        }
      },
    });
  }

  const empleadoOptions = empleados.map(e => ({ label: `${e.legajo} - ${e.apellido}, ${e.nombre}`, value: e.id }));
  const motivoOptions = motivos.map(m => ({ label: `${m.id} - ${m.descripcion ?? ''}`, value: m.id }));

  const nombreTemplate = row => `${row.apellido ?? ''}${row.apellido && row.nombre ? ', ' : ''}${row.nombre ?? ''}`;
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
      <Button label="Agregar ausentismo" icon="fa-solid fa-plus" size="small" onClick={openNew} />
    </div>
  );

  const hasPaginator = ausentismos.length > 10;
  const totalRegistros = <span className="total-registros">Total: {visibleCount} registros</span>;
  const tableFooter = !hasPaginator && ausentismos.length > 0
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
        <h2 className="page-title"><i className="fa-solid fa-user-slash" /> Ausentismo</h2>
      </div>

      <DataTable
        value={ausentismos}
        loading={loading}
        paginator={hasPaginator}
        rows={10}
        rowsPerPageOptions={[10, 25, 50, 100]}
        paginatorRight={totalRegistros}
        globalFilter={globalFilter}
        globalFilterFields={['legajo', 'apellido', 'nombre', 'motivo', 'motivo_desc']}
        onValueChange={(data) => setVisibleCount(data.length)}
        header={tableHeader}
        footer={tableFooter}
        emptyMessage="No hay ausentismos registrados"
        size="small"
        stripedRows
        removableSort
      >
        <Column field="legajo" header="Legajo" sortable style={{ width: '90px' }} />
        <Column body={nombreTemplate} header="Apellido y Nombre" sortField="apellido" sortable />
        <Column field="motivo" header="Motivo" sortable style={{ width: '140px' }} />
        <Column field="motivo_desc" header="Descripción" />
        <Column body={fechaTemplate('fecha_desde')} header="Fecha Desde" sortField="fecha_desde" sortable style={{ width: '110px' }} />
        <Column body={fechaTemplate('fecha_hasta')} header="Fecha Hasta" style={{ width: '110px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '90px', textAlign: 'center' }} />
      </DataTable>

      <Dialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        header={editMode ? 'Modificar ausentismo' : 'Agregar ausentismo'}
        footer={dialogFooter}
        style={{ width: '480px' }}
        modal
        draggable={false}
        resizable={false}
      >
        <div className="form-grid">
          <div className="form-field form-field--full">
            <label>Empleado <span className="required">*</span></label>
            <Dropdown name="empleado" value={form.empleado} options={empleadoOptions}
              onChange={handleChange} placeholder="Seleccionar" filter showClear disabled={editMode} />
          </div>
          <div className="form-field form-field--full">
            <label>Motivo de Ausentismo <span className="required">*</span></label>
            <Dropdown name="motivo" value={form.motivo} options={motivoOptions}
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
            <label>Observaciones</label>
            <InputTextarea name="observaciones" value={form.observaciones} onChange={handleChange} rows={3} autoResize />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
