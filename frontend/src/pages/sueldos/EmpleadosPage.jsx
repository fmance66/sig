import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { TabView, TabPanel } from 'primereact/tabview';
import { useEmpresa } from '../../context/EmpresaContext';
import BuscadorTabla from '../../components/BuscadorTabla';
import * as api from '../../api/empleados';
import { toDate, toIsoDate } from '../../utils/dates';
import FamiliaresTab from './FamiliaresTab';
import NovedadesTab from './NovedadesTab';
import HistorialTab from './HistorialTab';
import ConceptosTab from './ConceptosTab';
import './EmpleadosPage.css';

const ESTADO_OPTIONS = [
  { label: 'Activo', value: 'activo' },
  { label: 'Inactivo', value: 'inactivo' },
  { label: 'Suspendido', value: 'suspendido' },
  { label: 'Licencia', value: 'licencia' },
];

const SEXO_OPTIONS = [
  { label: 'Masculino', value: 'M' },
  { label: 'Femenino', value: 'F' },
  { label: 'Otro', value: 'X' },
];

const ESTADO_CIVIL_OPTIONS = [
  'SOLTERO', 'CASADO', 'CONCUBINATO', 'DIVORCIADO', 'SEPARADO', 'VIUDO',
].map(v => ({ label: v.charAt(0) + v.slice(1).toLowerCase(), value: v }));

const JORNADA_OPTIONS = [
  { label: 'Completa', value: 'COMPLETA' },
  { label: 'Media', value: 'MEDIA' },
  { label: 'Reducida', value: 'REDUCIDA' },
];

const LIQUIDACION_OPTIONS = [
  { label: 'Mensual', value: 'MENSUAL' },
  { label: 'Jornal', value: 'JORNAL' },
];

const EMPTY_FORM = {
  legajo: '', apellido: '', nombre: '', cuil: '', grupo: '', estado: null, tarea: '',
  fecha_ingreso: null, fecha_egreso: null, fecha_antiguedad: null, antiguedad: '',
  sexo: null, fecha_nacimiento: null, nacionalidad: '', estado_civil: null,
  tipo_documento: '', numero_documento: '', direccion: '', localidad: '', provincia: '', cpa: '',
  telefono: '', email: '', orden: '',
  convenio: '', categoria: '', sueldo: '', adicional: '', auxiliar: '',
  dias: '', horas: '', porcentaje: '', jornada: null, proporcional: false, liquidacion: null, moneda: '',
  vacaciones: '', obra_social: '', sindicato: '', proyecto: '', empresa: '', lugar_trabajo: '',
  banco: '', cuenta: '', cbu: '', grupo_de_conceptos: '', observaciones: '',
  situacion: '', condicion: '', actividad: '', modalidad: '', incapacidad: '', codigo_zona: '',
  situacion_revista_1: '', dia_inicio_1: '', situacion_revista_2: '', dia_inicio_2: '',
  situacion_revista_3: '', dia_inicio_3: '',
};

const LSD_FIELDS = [
  'situacion', 'condicion', 'actividad', 'modalidad', 'incapacidad', 'codigo_zona',
  'situacion_revista_1', 'dia_inicio_1', 'situacion_revista_2', 'dia_inicio_2',
  'situacion_revista_3', 'dia_inicio_3',
];

export default function EmpleadosPage() {
  const { empresa } = useEmpresa();
  const [searchParams] = useSearchParams();
  const mostrarInactivos = searchParams.get('estado') === 'inactivo';
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editMode, setEditMode]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const toast = useRef(null);

  useEffect(() => { if (empresa) load(); }, [empresa?.id, mostrarInactivos]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getEmpleados(empresa.id, mostrarInactivos ? 'inactivo' : 'activo');
      setEmpleados(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los empleados' });
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setForm({ ...EMPTY_FORM, empresa: empresa?.id ?? '' });
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
      const [empRes, lsdRes] = await Promise.all([
        api.getEmpleado(row.id),
        api.getEmpleadoLsd(row.id),
      ]);
      const emp = empRes.data.resultado;
      const lsd = lsdRes.data.resultado ?? {};
      setForm({
        id: emp.id ?? '',
        legajo: emp.legajo ?? '',
        apellido: emp.apellido ?? '', nombre: emp.nombre ?? '', cuil: emp.cuil ?? '',
        grupo: emp.grupo ?? '', estado: emp.estado ?? null, tarea: emp.tarea ?? '',
        fecha_ingreso: toDate(emp.fecha_ingreso), fecha_egreso: toDate(emp.fecha_egreso),
        fecha_antiguedad: toDate(emp.fecha_antiguedad), antiguedad: emp.antiguedad ?? '',
        sexo: emp.sexo ?? null, fecha_nacimiento: toDate(emp.fecha_nacimiento),
        nacionalidad: emp.nacionalidad ?? '', estado_civil: emp.estado_civil ?? null,
        tipo_documento: emp.tipo_documento ?? '', numero_documento: emp.numero_documento ?? '',
        direccion: emp.direccion ?? '', localidad: emp.localidad ?? '', provincia: emp.provincia ?? '',
        cpa: emp.cpa ?? '', telefono: emp.telefono ?? '', email: emp.email ?? '', orden: emp.orden ?? '',
        convenio: emp.convenio ?? '', categoria: emp.categoria ?? '', sueldo: emp.sueldo ?? '',
        adicional: emp.adicional ?? '', auxiliar: emp.auxiliar ?? '', dias: emp.dias ?? '',
        horas: emp.horas ?? '', porcentaje: emp.porcentaje ?? '', jornada: emp.jornada ?? null,
        proporcional: emp.proporcional ?? false, liquidacion: emp.liquidacion ?? null, moneda: emp.moneda ?? '',
        vacaciones: emp.vacaciones ?? '', obra_social: emp.obra_social ?? '', sindicato: emp.sindicato ?? '',
        proyecto: emp.proyecto ?? '', empresa: emp.empresa ?? '', lugar_trabajo: emp.lugar_trabajo ?? '',
        banco: emp.banco ?? '', cuenta: emp.cuenta ?? '', cbu: emp.cbu ?? '',
        grupo_de_conceptos: emp.grupo_de_conceptos ?? '', observaciones: emp.observaciones ?? '',
        situacion: lsd.situacion ?? '', condicion: lsd.condicion ?? '', actividad: lsd.actividad ?? '',
        modalidad: lsd.modalidad ?? '', incapacidad: lsd.incapacidad ?? '', codigo_zona: lsd.codigo_zona ?? '',
        situacion_revista_1: lsd.situacion_revista_1 ?? '', dia_inicio_1: lsd.dia_inicio_1 ?? '',
        situacion_revista_2: lsd.situacion_revista_2 ?? '', dia_inicio_2: lsd.dia_inicio_2 ?? '',
        situacion_revista_3: lsd.situacion_revista_3 ?? '', dia_inicio_3: lsd.dia_inicio_3 ?? '',
      });
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el empleado' });
      setDialogVisible(false);
    } finally {
      setLoadingForm(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleDateChange(name, value) {
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    if (!form.apellido.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El apellido es requerido' });
      return;
    }
    if (!form.legajo.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El legajo es requerido' });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.id;
      LSD_FIELDS.forEach(f => delete payload[f]);
      payload.fecha_ingreso    = toIsoDate(form.fecha_ingreso);
      payload.fecha_egreso     = toIsoDate(form.fecha_egreso);
      payload.fecha_antiguedad = toIsoDate(form.fecha_antiguedad);
      payload.fecha_nacimiento = toIsoDate(form.fecha_nacimiento);

      let empleadoId = form.id;
      if (editMode) {
        await api.updateEmpleado(form.id, payload);
      } else {
        const res = await api.createEmpleado(payload);
        empleadoId = res.data.data.id;
      }

      const lsdPayload = {};
      LSD_FIELDS.forEach(f => { lsdPayload[f] = form[f] === '' ? null : form[f]; });
      await api.updateEmpleadoLsd(empleadoId, lsdPayload);

      toast.current.show({ severity: 'success', summary: 'OK', detail: editMode ? 'Empleado actualizado' : 'Empleado creado' });
      setDialogVisible(false);
      load();
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al guardar';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(emp) {
    confirmDialog({
      message: `¿Está seguro de eliminar a "${emp.apellido}, ${emp.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteEmpleado(emp.id);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Empleado eliminado' });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el empleado' });
        }
      },
    });
  }

  function nombreTemplate(row) {
    return `${row.apellido ?? ''}${row.apellido && row.nombre ? ', ' : ''}${row.nombre ?? ''}`;
  }

  function fechaTemplate(row) {
    if (!row.fecha_ingreso) return '—';
    return new Date(row.fecha_ingreso).toLocaleDateString('es-AR');
  }

  const accionesTemplate = (row) => (
    <div className="acciones-col">
      <Button
        icon="fa-solid fa-pen"
        className="p-button-text p-button-sm"
        tooltip="Modificar"
        tooltipOptions={{ position: 'top' }}
        onClick={() => openEdit(row)}
      />
      <Button
        icon="fa-solid fa-trash"
        className="p-button-text p-button-sm p-button-danger"
        tooltip="Eliminar"
        tooltipOptions={{ position: 'top' }}
        onClick={() => handleDelete(row)}
      />
    </div>
  );

  const tableHeader = (
    <div className="table-toolbar my-2">
      <BuscadorTabla value={globalFilter} onChange={setGlobalFilter} />
      {!mostrarInactivos && (
        <Button label="Agregar empleado" icon="fa-solid fa-plus" size="small" onClick={openNew} />
      )}
    </div>
  );

  const hasPaginator = empleados.length > 10;
  const totalRegistros = <span className="total-registros">Total: {empleados.length} registros</span>;
  const tableFooter = !hasPaginator && empleados.length > 0
    ? <div className="table-footer-right">{totalRegistros}</div>
    : null;

  const dialogFooter = (
    <div className="dialog-footer-btns mt-2">
      <Button
        label="Cancelar"
        icon="fa-solid fa-xmark"
        className="p-button-text"
        onClick={() => setDialogVisible(false)}
        disabled={saving}
      />
      <Button
        label="Aceptar"
        icon="fa-solid fa-check"
        onClick={handleSave}
        loading={saving}
        disabled={loadingForm}
      />
    </div>
  );

  return (
    <div className="page-empleados">
      <Toast ref={toast} />
      <ConfirmDialog />

      <h2 className="page-title">
        <i className={mostrarInactivos ? 'fa-solid fa-user-slash' : 'fa-solid fa-user'} />
        {mostrarInactivos ? 'Empleados inactivos' : 'Empleados activos'}
      </h2>

      <DataTable
        value={empleados}
        loading={loading}
        paginator={hasPaginator}
        rows={10}
        rowsPerPageOptions={[10, 25, 50, 100]}
        paginatorRight={totalRegistros}
        globalFilter={globalFilter}
        globalFilterFields={['legajo', 'apellido', 'nombre', 'cuil', 'convenio', 'categoria']}
        header={tableHeader}
        footer={tableFooter}
        emptyMessage={mostrarInactivos ? 'No hay empleados inactivos' : 'No hay empleados registrados'}
        size="small"
        stripedRows
        removableSort
      >
        <Column field="legajo"   header="Legajo"           sortable style={{ width: '80px' }} />
        <Column body={nombreTemplate}  header="Apellido y Nombre" sortField="apellido" sortable />
        <Column field="cuil"     header="CUIL"             sortable style={{ width: '140px' }} />
        <Column body={fechaTemplate}   header="Ingreso"    sortField="fecha_ingreso" sortable style={{ width: '100px' }} />
        <Column field="convenio" header="Convenio"         sortable style={{ width: '130px' }} />
        <Column field="categoria" header="Categoría"       sortable style={{ width: '100px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '90px', textAlign: 'center' }} />
      </DataTable>

      <Dialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        header={editMode ? 'Modificar empleado' : 'Agregar empleado'}
        footer={dialogFooter}
        style={{ width: '900px' }}
        contentStyle={{ maxHeight: '78vh', overflowY: 'auto' }}
        onShow={() => document.querySelector('.p-dialog-content')?.scrollTo(0, 0)}
        modal
        draggable={false}
        resizable={false}
      >
        <TabView activeIndex={activeTab} onTabChange={e => setActiveTab(e.index)} className="empleado-tabs">

          <TabPanel header="Empleado">
            <div className="form-grid">
              <div className="form-field">
                <label>Legajo <span className="required">*</span></label>
                <InputText name="legajo" value={form.legajo} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Apellido <span className="required">*</span></label>
                <InputText name="apellido" value={form.apellido} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Nombre</label>
                <InputText name="nombre" value={form.nombre} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>C.U.I.L.</label>
                <InputText name="cuil" value={form.cuil} onChange={handleChange} placeholder="20-00000000-0" />
              </div>
              <div className="form-field">
                <label>Grupo</label>
                <InputText name="grupo" value={form.grupo} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Estado</label>
                <Dropdown name="estado" value={form.estado} options={ESTADO_OPTIONS}
                  onChange={handleChange} placeholder="Seleccionar" showClear />
              </div>
              <div className="form-field form-field--full">
                <label>Tarea</label>
                <InputText name="tarea" value={form.tarea} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Fecha de Ingreso</label>
                <Calendar value={form.fecha_ingreso} onChange={e => handleDateChange('fecha_ingreso', e.value)}
                  dateFormat="dd/mm/yy" showIcon />
              </div>
              <div className="form-field">
                <label>Fecha de Egreso</label>
                <Calendar value={form.fecha_egreso} onChange={e => handleDateChange('fecha_egreso', e.value)}
                  dateFormat="dd/mm/yy" showIcon />
              </div>
              <div className="form-field">
                <label>Fecha de Antigüedad</label>
                <Calendar value={form.fecha_antiguedad} onChange={e => handleDateChange('fecha_antiguedad', e.value)}
                  dateFormat="dd/mm/yy" showIcon />
              </div>
              <div className="form-field">
                <label>Antigüedad</label>
                <InputText name="antiguedad" value={form.antiguedad} onChange={handleChange} type="number" />
              </div>
              <div className="form-field">
                <label>Fecha de Nacimiento</label>
                <Calendar value={form.fecha_nacimiento} onChange={e => handleDateChange('fecha_nacimiento', e.value)}
                  dateFormat="dd/mm/yy" showIcon />
              </div>
              <div className="form-field">
                <label>Nacionalidad</label>
                <InputText name="nacionalidad" value={form.nacionalidad} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Sexo</label>
                <Dropdown name="sexo" value={form.sexo} options={SEXO_OPTIONS}
                  onChange={handleChange} placeholder="Seleccionar" showClear />
              </div>
              <div className="form-field">
                <label>Estado Civil</label>
                <Dropdown name="estado_civil" value={form.estado_civil} options={ESTADO_CIVIL_OPTIONS}
                  onChange={handleChange} placeholder="Seleccionar" showClear />
              </div>
              <div className="form-field">
                <label>Tipo Documento</label>
                <InputText name="tipo_documento" value={form.tipo_documento} onChange={handleChange} placeholder="DNI" />
              </div>
              <div className="form-field">
                <label>Número Documento</label>
                <InputText name="numero_documento" value={form.numero_documento} onChange={handleChange} />
              </div>
              <div className="form-field form-field--full">
                <label>Dirección</label>
                <InputText name="direccion" value={form.direccion} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Provincia</label>
                <InputText name="provincia" value={form.provincia} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Localidad</label>
                <InputText name="localidad" value={form.localidad} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Código Postal</label>
                <InputText name="cpa" value={form.cpa} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Teléfono</label>
                <InputText name="telefono" value={form.telefono} onChange={handleChange} />
              </div>
              <div className="form-row-12">
                <div className="form-field" style={{ gridColumn: 'span 8' }}>
                  <label>e-mail</label>
                  <InputText name="email" value={form.email} onChange={handleChange} />
                </div>
                <div className="form-field" style={{ gridColumn: 'span 4' }}>
                  <label>Orden</label>
                  <InputText name="orden" value={form.orden} onChange={handleChange} type="number" />
                </div>
              </div>
            </div>
          </TabPanel>

          <TabPanel header="Convenio">
            <div className="form-section-title">Salario</div>
            <div className="form-grid">
              <div className="form-field">
                <label>Convenio</label>
                <InputText name="convenio" value={form.convenio} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Categoría</label>
                <InputText name="categoria" value={form.categoria} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Jornada</label>
                <Dropdown name="jornada" value={form.jornada} options={JORNADA_OPTIONS}
                  onChange={handleChange} placeholder="Seleccionar" showClear />
              </div>
              <div className="form-field">
                <label>Horas</label>
                <InputText name="horas" value={form.horas} onChange={handleChange} type="number" />
              </div>
              <div className="form-field">
                <label>Porcentaje</label>
                <InputText name="porcentaje" value={form.porcentaje} onChange={handleChange} type="number" />
              </div>
              <div className="form-field">
                <label>Liquidación</label>
                <Dropdown name="liquidacion" value={form.liquidacion} options={LIQUIDACION_OPTIONS}
                  onChange={handleChange} placeholder="Seleccionar" showClear />
              </div>
              <div className="form-field">
                <label>Días</label>
                <InputText name="dias" value={form.dias} onChange={handleChange} type="number" />
              </div>
              <div className="form-field">
                <label>Vacaciones</label>
                <InputText name="vacaciones" value={form.vacaciones} onChange={handleChange} type="number" />
              </div>
              <div className="form-field">
                <label>Sueldo Pactado</label>
                <InputText name="sueldo" value={form.sueldo} onChange={handleChange} type="number" />
              </div>
              <div className="form-field">
                <label>Moneda</label>
                <InputText name="moneda" value={form.moneda} onChange={handleChange} />
              </div>
              <div className="form-row-12">
                <div className="form-field" style={{ gridColumn: 'span 5' }}>
                  <label>Adicional</label>
                  <InputText name="adicional" value={form.adicional} onChange={handleChange} type="number" />
                </div>
                <div className="form-field" style={{ gridColumn: 'span 5' }}>
                  <label>Auxiliar</label>
                  <InputText name="auxiliar" value={form.auxiliar} onChange={handleChange} type="number" />
                </div>
                <div className="form-field form-field--checkbox" style={{ gridColumn: 'span 2' }}>
                  <Checkbox inputId="proporcional" checked={form.proporcional}
                    onChange={e => setForm(prev => ({ ...prev, proporcional: e.checked }))} />
                  <label htmlFor="proporcional">Proporcional</label>
                </div>
              </div>
            </div>

            <div className="form-section-title">Otros Datos</div>
            <div className="form-grid">
              <div className="form-field">
                <label>Obra Social</label>
                <InputText name="obra_social" value={form.obra_social} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Sindicato</label>
                <InputText name="sindicato" value={form.sindicato} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Proyecto</label>
                <InputText name="proyecto" value={form.proyecto} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Grupo de Conceptos</label>
                <InputText name="grupo_de_conceptos" value={form.grupo_de_conceptos} onChange={handleChange} />
              </div>
              <div className="form-field form-field--full">
                <label>Lugar de Trabajo</label>
                <InputText name="lugar_trabajo" value={form.lugar_trabajo} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Banco</label>
                <InputText name="banco" value={form.banco} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Cuenta Bancaria</label>
                <InputText name="cuenta" value={form.cuenta} onChange={handleChange} />
              </div>
              <div className="form-field form-field--full">
                <label>CBU</label>
                <InputText name="cbu" value={form.cbu} onChange={handleChange} />
              </div>
            </div>
          </TabPanel>

          <TabPanel header="Conceptos">
            <ConceptosTab
              empleadoId={editMode ? form.id : null}
              grupoDeConceptos={form.grupo_de_conceptos}
              toast={toast}
            />
          </TabPanel>

          <TabPanel header="LSD">
            <div className="form-grid">
              <div className="form-field">
                <label>Situación</label>
                <InputText name="situacion" value={form.situacion} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Condición</label>
                <InputText name="condicion" value={form.condicion} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Actividad</label>
                <InputText name="actividad" value={form.actividad} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Modalidad</label>
                <InputText name="modalidad" value={form.modalidad} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Incapacidad</label>
                <InputText name="incapacidad" value={form.incapacidad} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Código de Zona</label>
                <InputText name="codigo_zona" value={form.codigo_zona} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Situación de Revista 1</label>
                <InputText name="situacion_revista_1" value={form.situacion_revista_1} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Día Inicio 1</label>
                <InputText name="dia_inicio_1" value={form.dia_inicio_1} onChange={handleChange} type="number" />
              </div>
              <div className="form-field">
                <label>Situación de Revista 2</label>
                <InputText name="situacion_revista_2" value={form.situacion_revista_2} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Día Inicio 2</label>
                <InputText name="dia_inicio_2" value={form.dia_inicio_2} onChange={handleChange} type="number" />
              </div>
              <div className="form-field">
                <label>Situación de Revista 3</label>
                <InputText name="situacion_revista_3" value={form.situacion_revista_3} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Día Inicio 3</label>
                <InputText name="dia_inicio_3" value={form.dia_inicio_3} onChange={handleChange} type="number" />
              </div>
            </div>
          </TabPanel>

          <TabPanel header="Familiares">
            <FamiliaresTab empleadoId={editMode ? form.id : null} toast={toast} />
          </TabPanel>

          <TabPanel header="Novedades">
            <NovedadesTab empleadoId={editMode ? form.id : null} toast={toast} />
          </TabPanel>

          <TabPanel header="Historial">
            <HistorialTab empleadoId={editMode ? form.id : null} toast={toast} />
          </TabPanel>

          <TabPanel header="Observaciones">
            <div className="form-grid">
              <div className="form-field form-field--full">
                <InputTextarea name="observaciones" value={form.observaciones} onChange={handleChange}
                  rows={12} autoResize={false} />
              </div>
            </div>
          </TabPanel>

        </TabView>
      </Dialog>
    </div>
  );
}
