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
import { useEmpresa } from '../../../context/EmpresaContext';
import BuscadorTabla from '../../../components/BuscadorTabla';
import { createCatalogoApi } from '../../../api/catalogo';
import * as empleadosApi from '../../../api/empleados';
import * as api from '../../../api/novedades';
import { toDate, toIsoDate } from '../../../utils/dates';
import BotonVolver from '../../../components/BotonVolver';

const tiposApi = createCatalogoApi('/tipos-novedad');

const EMPTY_FORM = { empleado: null, tipo_novedad: null, fecha: null, value: '' };

export default function NovedadesPage() {
  const { empresa } = useEmpresa();
  const [novedades, setNovedades] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const toast = useRef(null);

  useEffect(() => { load(); }, []);
  useEffect(() => { if (empresa) empleadosApi.getEmpleados(empresa.id, 'activo').then(res => setEmpleados(res.data.resultado)).catch(() => {}); }, [empresa?.id]);
  useEffect(() => { tiposApi.getAll().then(res => setTipos(res.data.resultado)).catch(() => {}); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getNovedadesList({});
      setNovedades(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las novedades' });
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
      tipo_novedad: row.tipo_novedad,
      fecha: toDate(row.fecha),
      value: row.value ?? '',
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
    if (!form.tipo_novedad) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'La novedad es requerida' });
      return;
    }
    if (!form.fecha) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'La fecha es requerida' });
      return;
    }
    setSaving(true);
    try {
      const fecha = toIsoDate(form.fecha);
      if (editMode) {
        await api.updateNovedad(form.empleado, form.tipo_novedad, fecha, form.value);
      } else {
        await api.createNovedad({ empleado: form.empleado, tipo_novedad: form.tipo_novedad, fecha, value: form.value });
      }
      toast.current.show({ severity: 'success', summary: 'OK', detail: editMode ? 'Novedad actualizada' : 'Novedad creada' });
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
      message: `¿Está seguro de eliminar la novedad "${row.tipo_novedad}" de "${row.apellido}, ${row.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteNovedad(row.empleado, row.tipo_novedad, toIsoDate(row.fecha));
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Novedad eliminada' });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la novedad' });
        }
      },
    });
  }

  const empleadoOptions = empleados.map(e => ({ label: `${e.legajo} - ${e.apellido}, ${e.nombre}`, value: e.id }));
  const tipoOptions = tipos.map(t => ({ label: `${t.id} - ${t.descripcion ?? ''}`, value: t.id }));

  const nombreTemplate = row => `${row.apellido ?? ''}${row.apellido && row.nombre ? ', ' : ''}${row.nombre ?? ''}`;
  const fechaTemplate = row => row.fecha ? new Date(row.fecha).toLocaleDateString('es-AR') : '—';

  const accionesTemplate = (row) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-pen" className="p-button-text p-button-sm" tooltip="Modificar" tooltipOptions={{ position: 'top' }} onClick={() => openEdit(row)} />
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar" tooltipOptions={{ position: 'top' }} onClick={() => handleDelete(row)} />
    </div>
  );

  const tableHeader = (
    <div className="table-toolbar my-2">
      <BuscadorTabla value={globalFilter} onChange={setGlobalFilter} />
      <Button label="Agregar novedad" icon="fa-solid fa-plus" size="small" onClick={openNew} />
    </div>
  );

  const hasPaginator = novedades.length > 10;
  const totalRegistros = <span className="total-registros">Total: {novedades.length} registros</span>;
  const tableFooter = !hasPaginator && novedades.length > 0
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
        <h2 className="page-title"><i className="fa-solid fa-bell" /> Novedades</h2>
      </div>

      <DataTable
        value={novedades}
        loading={loading}
        paginator={hasPaginator}
        rows={10}
        rowsPerPageOptions={[10, 25, 50, 100]}
        paginatorRight={totalRegistros}
        globalFilter={globalFilter}
        globalFilterFields={['legajo', 'apellido', 'nombre', 'tipo_novedad', 'tipo_novedad_desc']}
        header={tableHeader}
        footer={tableFooter}
        emptyMessage="No hay novedades registradas"
        size="small"
        stripedRows
        removableSort
      >
        <Column field="legajo" header="Legajo" sortable style={{ width: '90px' }} />
        <Column body={nombreTemplate} header="Apellido y Nombre" sortField="apellido" sortable />
        <Column field="tipo_novedad" header="Novedad" sortable style={{ width: '160px' }} />
        <Column field="tipo_novedad_desc" header="Descripción" />
        <Column body={fechaTemplate} header="Fecha" sortField="fecha" sortable style={{ width: '110px' }} />
        <Column field="value" header="Valor" style={{ width: '120px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '90px', textAlign: 'center' }} />
      </DataTable>

      <Dialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        header={editMode ? 'Modificar novedad' : 'Agregar novedad'}
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
            <label>Novedad <span className="required">*</span></label>
            <Dropdown name="tipo_novedad" value={form.tipo_novedad} options={tipoOptions}
              onChange={handleChange} placeholder="Seleccionar" filter showClear disabled={editMode} />
          </div>
          <div className="form-field">
            <label>Fecha <span className="required">*</span></label>
            <Calendar value={form.fecha} onChange={e => setForm(prev => ({ ...prev, fecha: e.value }))}
              dateFormat="dd/mm/yy" showIcon disabled={editMode} />
          </div>
          <div className="form-field">
            <label>Valor</label>
            <InputText name="value" value={form.value} onChange={handleChange} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
