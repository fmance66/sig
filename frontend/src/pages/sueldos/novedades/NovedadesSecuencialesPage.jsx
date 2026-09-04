import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { TabView, TabPanel } from 'primereact/tabview';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useEmpresa } from '../../../context/EmpresaContext';
import { createCatalogoApi } from '../../../api/catalogo';
import * as empleadosApi from '../../../api/empleados';
import * as api from '../../../api/novedades';
import { toIsoDate } from '../../../utils/dates';
import BotonVolver from '../../../components/BotonVolver';

const tiposApi = createCatalogoApi('/tipos-novedad');
const EMPTY_FORM = { tipo_novedad: null, fecha: null, empleado: null, value: '' };

export default function NovedadesSecuencialesPage() {
  const { empresa } = useEmpresa();
  const [activeTab, setActiveTab] = useState(0);
  const [empleados, setEmpleados] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useRef(null);

  useEffect(() => { if (empresa) empleadosApi.getEmpleados(empresa.id, 'activo').then(res => setEmpleados(res.data.resultado)).catch(() => {}); }, [empresa?.id]);
  useEffect(() => { tiposApi.getAll().then(res => setTipos(res.data.resultado)).catch(() => {}); }, []);
  useEffect(() => { setForm(EMPTY_FORM); setFilas([]); }, [empresa?.id]);

  function handleTabChange(e) {
    setActiveTab(e.index);
    setForm(EMPTY_FORM);
    setFilas([]);
  }

  async function recargar(base) {
    setLoading(true);
    try {
      const res = await api.getNovedadesList({ ...base, empresa: empresa?.id });
      setFilas(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo recargar el listado' });
    } finally {
      setLoading(false);
    }
  }

  async function handleAgregar() {
    if (!form.tipo_novedad || !form.fecha || !form.empleado) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Novedad, fecha y empleado son requeridos' });
      return;
    }
    setSaving(true);
    try {
      const fecha = toIsoDate(form.fecha);
      await api.createNovedad({ empleado: form.empleado, tipo_novedad: form.tipo_novedad, fecha, value: form.value });
      toast.current.show({ severity: 'success', summary: 'OK', detail: 'Novedad agregada' });
      if (activeTab === 0) {
        setForm(prev => ({ ...prev, empleado: null, value: '' }));
        await recargar({ tipoNovedad: form.tipo_novedad, fecha });
      } else {
        setForm(prev => ({ ...prev, fecha: null, value: '' }));
        await recargar({ tipoNovedad: form.tipo_novedad, empleado: form.empleado });
      }
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al guardar';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setSaving(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
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
          if (activeTab === 0) recargar({ tipoNovedad: form.tipo_novedad, fecha: toIsoDate(form.fecha) });
          else recargar({ tipoNovedad: form.tipo_novedad, empleado: form.empleado });
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
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
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar" tooltipOptions={{ position: 'top' }} onClick={() => handleDelete(row)} />
    </div>
  );

  function renderForm() {
    return (
      <div className="filtros-toolbar">
        <div className="form-field">
          <label>Novedad <span className="required">*</span></label>
          <Dropdown name="tipo_novedad" value={form.tipo_novedad} options={tipoOptions}
            onChange={handleChange} placeholder="Seleccionar" filter showClear style={{ width: '220px' }} />
        </div>
        <div className="form-field">
          <label>Fecha <span className="required">*</span></label>
          <Calendar value={form.fecha} onChange={e => setForm(prev => ({ ...prev, fecha: e.value }))}
            dateFormat="dd/mm/yy" showIcon />
        </div>
        <div className="form-field">
          <label>Empleado <span className="required">*</span></label>
          <Dropdown name="empleado" value={form.empleado} options={empleadoOptions}
            onChange={handleChange} placeholder="Seleccionar" filter showClear style={{ width: '260px' }} />
        </div>
        <div className="form-field">
          <label>Valor</label>
          <InputText name="value" value={form.value} onChange={handleChange}
            onKeyDown={e => { if (e.key === 'Enter') handleAgregar(); }} />
        </div>
        <Button label="Agregar" icon="fa-solid fa-plus" size="small" onClick={handleAgregar} loading={saving} />
      </div>
    );
  }

  function renderGrid() {
    return (
      <DataTable value={filas} loading={loading} size="small" stripedRows
        emptyMessage="Completá los datos y agregá la primera novedad">
        <Column field="tipo_novedad" header="Novedad" style={{ width: '140px' }} />
        <Column field="tipo_novedad_desc" header="Descripción" />
        <Column body={fechaTemplate} header="Fecha" style={{ width: '110px' }} />
        <Column field="legajo" header="Legajo" style={{ width: '90px' }} />
        <Column body={nombreTemplate} header="Apellido y Nombre" />
        <Column field="value" header="Valor" style={{ width: '120px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '70px', textAlign: 'center' }} />
      </DataTable>
    );
  }

  return (
    <div className="page-novedades">
      <Toast ref={toast} />
      <ConfirmDialog />
      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-list-check" /> Novedades Secuenciales</h2>
      </div>

      <TabView activeIndex={activeTab} onTabChange={handleTabChange}>
        <TabPanel header="Novedades por Empleado">
          {renderForm()}
          {renderGrid()}
        </TabPanel>
        <TabPanel header="Novedades por Fecha">
          {renderForm()}
          {renderGrid()}
        </TabPanel>
      </TabView>
    </div>
  );
}
