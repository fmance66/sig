import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useEmpresa } from '../../../context/EmpresaContext';
import BuscadorTabla from '../../../components/BuscadorTabla';
import * as empleadosApi from '../../../api/empleados';
import * as api from '../../../api/presentismo';
import { toDate, toIsoDate, toTimeDate, toIsoTime } from '../../../utils/dates';
import BotonVolver from '../../../components/BotonVolver';

const TIPO_OPTIONS = [
  { label: 'Entrada', value: 'ENTRADA' },
  { label: 'Salida', value: 'SALIDA' },
];

const EMPTY_FORM = { empleado: null, fecha: null, hora: null, tipo: null };

export default function PresentismoPage() {
  const { empresa } = useEmpresa();
  const [presentismos, setPresentismos] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const toast = useRef(null);

  useEffect(() => { load(); }, []);
  useEffect(() => { if (empresa) empleadosApi.getEmpleados(empresa.id, 'activo').then(res => setEmpleados(res.data.resultado)).catch(() => {}); }, [empresa?.id]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getPresentismosList({});
      setPresentismos(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los presentismos' });
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
      fecha: toDate(row.fecha),
      hora: toTimeDate(row.hora),
      tipo: row.tipo,
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
    if (!form.fecha) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'La fecha es requerida' });
      return;
    }
    if (!form.hora) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'La hora es requerida' });
      return;
    }
    setSaving(true);
    try {
      const fecha = toIsoDate(form.fecha);
      const hora = toIsoTime(form.hora);
      if (editMode) {
        await api.updatePresentismo(form.empleado, fecha, hora, { tipo: form.tipo });
      } else {
        await api.createPresentismo({ empleado: form.empleado, fecha, hora, tipo: form.tipo });
      }
      toast.current.show({ severity: 'success', summary: 'OK', detail: editMode ? 'Presentismo actualizado' : 'Presentismo creado' });
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
      message: `¿Está seguro de eliminar el registro de presentismo de "${row.apellido}, ${row.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deletePresentismo(row.empleado, toIsoDate(row.fecha), row.hora);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Registro eliminado' });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el registro' });
        }
      },
    });
  }

  const empleadoOptions = empleados.map(e => ({ label: `${e.legajo} - ${e.apellido}, ${e.nombre}`, value: e.id }));

  const nombreTemplate = row => `${row.apellido ?? ''}${row.apellido && row.nombre ? ', ' : ''}${row.nombre ?? ''}`;
  const fechaTemplate = row => row.fecha ? new Date(row.fecha).toLocaleDateString('es-AR') : '—';
  const horaTemplate = row => row.hora ? row.hora.slice(0, 5) : '—';

  const accionesTemplate = (row) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-pen" className="p-button-text p-button-sm" tooltip="Modificar" tooltipOptions={{ position: 'top' }} onClick={() => openEdit(row)} />
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar" tooltipOptions={{ position: 'top' }} onClick={() => handleDelete(row)} />
    </div>
  );

  const tableHeader = (
    <div className="table-toolbar my-2">
      <BuscadorTabla value={globalFilter} onChange={setGlobalFilter} />
      <Button label="Agregar presentismo" icon="fa-solid fa-plus" size="small" onClick={openNew} />
    </div>
  );

  const hasPaginator = presentismos.length > 10;
  const totalRegistros = <span className="total-registros">Total: {visibleCount} registros</span>;
  const tableFooter = !hasPaginator && presentismos.length > 0
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
        <h2 className="page-title"><i className="fa-solid fa-clock" /> Presentismo</h2>
      </div>

      <DataTable
        value={presentismos}
        loading={loading}
        paginator={hasPaginator}
        rows={10}
        rowsPerPageOptions={[10, 25, 50, 100]}
        paginatorRight={totalRegistros}
        globalFilter={globalFilter}
        globalFilterFields={['legajo', 'apellido', 'nombre', 'tipo']}
        onValueChange={(data) => setVisibleCount(data.length)}
        header={tableHeader}
        footer={tableFooter}
        emptyMessage="No hay presentismos registrados"
        size="small"
        stripedRows
        removableSort
      >
        <Column field="legajo" header="Legajo" sortable style={{ width: '90px' }} />
        <Column body={nombreTemplate} header="Apellido y Nombre" sortField="apellido" sortable />
        <Column body={fechaTemplate} header="Fecha" sortField="fecha" sortable style={{ width: '110px' }} />
        <Column body={horaTemplate} header="Hora" sortField="hora" sortable style={{ width: '90px' }} />
        <Column field="tipo" header="Tipo" sortable style={{ width: '110px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '90px', textAlign: 'center' }} />
      </DataTable>

      <Dialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        header={editMode ? 'Modificar presentismo' : 'Agregar presentismo'}
        footer={dialogFooter}
        style={{ width: '420px' }}
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
          <div className="form-field">
            <label>Fecha <span className="required">*</span></label>
            <Calendar value={form.fecha} onChange={e => setForm(prev => ({ ...prev, fecha: e.value }))}
              dateFormat="dd/mm/yy" showIcon disabled={editMode} />
          </div>
          <div className="form-field">
            <label>Hora <span className="required">*</span></label>
            <Calendar value={form.hora} onChange={e => setForm(prev => ({ ...prev, hora: e.value }))}
              timeOnly hourFormat="24" showIcon icon="fa-solid fa-clock" disabled={editMode} />
          </div>
          <div className="form-field form-field--full">
            <label>Tipo</label>
            <Dropdown name="tipo" value={form.tipo} options={TIPO_OPTIONS}
              onChange={handleChange} placeholder="Seleccionar" showClear />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
