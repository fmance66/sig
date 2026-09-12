import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { TabView, TabPanel } from 'primereact/tabview';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useEmpresa } from '../../../context/EmpresaContext';
import BuscadorTabla from '../../../components/BuscadorTabla';
import * as empleadosApi from '../../../api/empleados';
import * as api from '../../../api/jornadaLaboral';
import { toTimeDate, toIsoTime } from '../../../utils/dates';
import BotonVolver from '../../../components/BotonVolver';

const DIAS = [
  { value: 'LUNES', label: 'Lunes' },
  { value: 'MARTES', label: 'Martes' },
  { value: 'MIERCOLES', label: 'Miércoles' },
  { value: 'JUEVES', label: 'Jueves' },
  { value: 'VIERNES', label: 'Viernes' },
  { value: 'SABADO', label: 'Sábado' },
  { value: 'DOMINGO', label: 'Domingo' },
];

const HORARIO_OPTIONS = [
  { label: 'Fijo', value: 'FIJO' },
  { label: 'Rotativo', value: 'ROTATIVO' },
];

const SINO_OPTIONS = [
  { label: 'Sí', value: 'SI' },
  { label: 'No', value: 'NO' },
];

const EMPTY_HORARIOS = () => DIAS.map(d => ({ dia: d.value, entrada: null, salida: null }));
const EMPTY_FORM = { empleado: null, horario: null, feriados: null, horarios: EMPTY_HORARIOS() };

export default function JornadaLaboralPage() {
  const { empresa } = useEmpresa();
  const [jornadas, setJornadas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const toast = useRef(null);

  useEffect(() => { if (empresa) load(); }, [empresa?.id]);
  useEffect(() => { if (empresa) empleadosApi.getEmpleados(empresa.id, 'activo').then(res => setEmpleados(res.data.resultado)).catch(() => {}); }, [empresa?.id]);
  useEffect(() => { setVisibleCount(jornadas.length); }, [jornadas]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getJornadasLaboralesList({ empresa: empresa?.id });
      setJornadas(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las jornadas laborales' });
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setForm(EMPTY_FORM);
    setEditMode(false);
    setActiveTab(0);
    setDialogVisible(true);
  }

  async function openEdit(row) {
    try {
      const res = await api.getJornadaLaboral(row.empleado);
      const data = res.data.resultado;
      setForm({
        empleado: data.empleado,
        horario: data.horario,
        feriados: data.feriados,
        horarios: DIAS.map(d => {
          const h = data.horarios.find(x => x.dia === d.value);
          return { dia: d.value, entrada: toTimeDate(h?.entrada), salida: toTimeDate(h?.salida) };
        }),
      });
      setEditMode(true);
      setActiveTab(0);
      setDialogVisible(true);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la jornada laboral' });
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleHorarioChange(dia, campo, value) {
    setForm(prev => ({
      ...prev,
      horarios: prev.horarios.map(h => h.dia === dia ? { ...h, [campo]: value } : h),
    }));
  }

  async function handleSave() {
    if (!form.empleado) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El empleado es requerido' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        empleado: form.empleado,
        horario: form.horario,
        feriados: form.feriados,
        horarios: form.horarios.map(h => ({ dia: h.dia, entrada: toIsoTime(h.entrada), salida: toIsoTime(h.salida) })),
      };
      if (editMode) {
        await api.updateJornadaLaboral(form.empleado, payload);
      } else {
        await api.createJornadaLaboral(payload);
      }
      toast.current.show({ severity: 'success', summary: 'OK', detail: editMode ? 'Jornada laboral actualizada' : 'Jornada laboral creada' });
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
      message: `¿Está seguro de eliminar la jornada laboral de "${row.apellido}, ${row.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteJornadaLaboral(row.empleado);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Jornada laboral eliminada' });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la jornada laboral' });
        }
      },
    });
  }

  const empleadoOptions = empleados.map(e => ({ label: `${e.legajo} - ${e.apellido}, ${e.nombre}`, value: e.id }));

  const nombreTemplate = row => `${row.apellido ?? ''}${row.apellido && row.nombre ? ', ' : ''}${row.nombre ?? ''}`;
  const horarioTemplate = row => HORARIO_OPTIONS.find(o => o.value === row.horario)?.label ?? '—';
  const feriadosTemplate = row => SINO_OPTIONS.find(o => o.value === row.feriados)?.label ?? '—';

  const accionesTemplate = (row) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-pen" className="p-button-text p-button-sm" tooltip="Modificar" tooltipOptions={{ position: 'top' }} onClick={() => openEdit(row)} />
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar" tooltipOptions={{ position: 'top' }} onClick={() => handleDelete(row)} />
    </div>
  );

  const tableHeader = (
    <div className="table-toolbar my-2">
      <BuscadorTabla value={globalFilter} onChange={setGlobalFilter} />
      <Button label="Agregar jornada laboral" icon="fa-solid fa-plus" size="small" onClick={openNew} />
    </div>
  );

  const hasPaginator = jornadas.length > 10;
  const totalRegistros = <span className="total-registros">Total: {visibleCount} registros</span>;
  const tableFooter = !hasPaginator && jornadas.length > 0
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
        <h2 className="page-title"><i className="fa-solid fa-calendar-week" /> Jornada Laboral</h2>
      </div>

      <DataTable
        value={jornadas}
        loading={loading}
        paginator={hasPaginator}
        rows={10}
        rowsPerPageOptions={[10, 25, 50, 100]}
        paginatorRight={totalRegistros}
        globalFilter={globalFilter}
        globalFilterFields={['legajo', 'apellido', 'nombre']}
        onValueChange={(data) => setVisibleCount(data.length)}
        header={tableHeader}
        footer={tableFooter}
        emptyMessage="No hay jornadas laborales registradas"
        size="small"
        stripedRows
        removableSort
      >
        <Column field="legajo" header="Legajo" sortable style={{ width: '90px' }} />
        <Column body={nombreTemplate} header="Apellido y Nombre" sortField="apellido" sortable />
        <Column body={horarioTemplate} header="Tipo de Horario" sortField="horario" sortable style={{ width: '140px' }} />
        <Column body={feriadosTemplate} header="Trabaja Feriados" sortField="feriados" sortable style={{ width: '140px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '90px', textAlign: 'center' }} />
      </DataTable>

      <Dialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        header={editMode ? 'Modificar jornada laboral' : 'Agregar jornada laboral'}
        footer={dialogFooter}
        style={{ width: '620px' }}
        modal
        draggable={false}
        resizable={false}
      >
        <TabView activeIndex={activeTab} onTabChange={e => setActiveTab(e.index)}>
          <TabPanel header="Jornada Laboral">
            <div className="form-grid">
              <div className="form-field form-field--full">
                <label>Empleado <span className="required">*</span></label>
                <Dropdown name="empleado" value={form.empleado} options={empleadoOptions}
                  onChange={handleChange} placeholder="Seleccionar" filter showClear disabled={editMode} />
              </div>
              <div className="form-field">
                <label>Horario</label>
                <Dropdown name="horario" value={form.horario} options={HORARIO_OPTIONS}
                  onChange={handleChange} placeholder="Seleccionar" showClear />
              </div>
              <div className="form-field">
                <label>Trabaja Feriados</label>
                <Dropdown name="feriados" value={form.feriados} options={SINO_OPTIONS}
                  onChange={handleChange} placeholder="Seleccionar" showClear />
              </div>
            </div>
          </TabPanel>
          <TabPanel header="Horarios">
            <DataTable value={form.horarios} size="small" stripedRows>
              <Column body={row => DIAS.find(d => d.value === row.dia)?.label} header="Día" style={{ width: '120px' }} />
              <Column
                header="Hora de Entrada"
                body={row => (
                  <Calendar value={row.entrada} onChange={e => handleHorarioChange(row.dia, 'entrada', e.value)}
                    timeOnly hourFormat="24" showIcon icon="fa-solid fa-clock" />
                )}
              />
              <Column
                header="Hora de Salida"
                body={row => (
                  <Calendar value={row.salida} onChange={e => handleHorarioChange(row.dia, 'salida', e.value)}
                    timeOnly hourFormat="24" showIcon icon="fa-solid fa-clock" />
                )}
              />
            </DataTable>
          </TabPanel>
        </TabView>
      </Dialog>
    </div>
  );
}
