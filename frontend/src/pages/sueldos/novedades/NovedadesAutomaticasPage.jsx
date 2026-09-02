import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { InputText } from 'primereact/inputtext';
import { Toast } from 'primereact/toast';
import { createCatalogoApi } from '../../../api/catalogo';
import * as api from '../../../api/novedadesAutomaticas';
import FiltroTexto from '../liquidaciones/FiltroTexto';
import { toIsoDate } from '../../../utils/dates';
import BotonVolver from '../../../components/BotonVolver';

const tiposApi = createCatalogoApi('/tipos-novedad');
const EMPTY_FILTRO = { legajo: '', convenio: '', grupo: '', categoria: '', estado: '', provincia: '' };

export default function NovedadesAutomaticasPage() {
  const [tipos, setTipos] = useState([]);
  const [tipoNovedad, setTipoNovedad] = useState(null);
  const [fecha, setFecha] = useState(null);
  const [value, setValue] = useState('');
  const [filtro, setFiltro] = useState(EMPTY_FILTRO);
  const [empleados, setEmpleados] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generando, setGenerando] = useState(false);
  const toast = useRef(null);

  useEffect(() => {
    tiposApi.getAll().then(res => setTipos(res.data.resultado)).catch(() => {});
    buscar();
  }, []);

  async function buscar(f = filtro) {
    setLoading(true);
    try {
      const res = await api.getEmpleadosCandidatos(f);
      setEmpleados(res.data.resultado);
      setSeleccionados([]);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron obtener los empleados' });
    } finally {
      setLoading(false);
    }
  }

  function handleFiltroChange(e) {
    const { name, value: v } = e.target;
    setFiltro(prev => ({ ...prev, [name]: v }));
  }

  function limpiarFiltros() {
    setFiltro(EMPTY_FILTRO);
    buscar(EMPTY_FILTRO);
  }

  async function handleGenerar() {
    if (!tipoNovedad) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Elegí una novedad' });
      return;
    }
    if (!fecha) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Elegí una fecha' });
      return;
    }
    if (!seleccionados.length) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Seleccioná al menos un empleado' });
      return;
    }
    setGenerando(true);
    try {
      const res = await api.generarNovedadesAutomaticas({
        tipoNovedad, fecha: toIsoDate(fecha), value, empleados: seleccionados.map(e => e.id),
      });
      const r = res.data.resultado;
      toast.current.show({
        severity: 'success', summary: 'Novedades generadas',
        detail: `Creadas: ${r.creados} · Actualizadas: ${r.actualizados} · Errores: ${r.errores.length}`,
        life: 6000,
      });
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'No se pudieron generar las novedades';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setGenerando(false);
    }
  }

  const tipoOptions = tipos.map(t => ({ label: `${t.id} - ${t.descripcion ?? ''}`, value: t.id }));
  const nombreTemplate = e => `${e.apellido ?? ''}${e.apellido && e.nombre ? ', ' : ''}${e.nombre ?? ''}`;

  return (
    <div className="page-novedades">
      <Toast ref={toast} />
      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-bolt" /> Crear Novedades de Forma Automática</h2>
      </div>

      <div className="filtros-toolbar">
        <div className="form-field">
          <label>Novedad <span className="required">*</span></label>
          <Dropdown value={tipoNovedad} options={tipoOptions} onChange={e => setTipoNovedad(e.value)}
            filter showClear placeholder="Seleccionar" style={{ width: '220px' }} />
        </div>
        <div className="form-field">
          <label>Fecha <span className="required">*</span></label>
          <Calendar value={fecha} onChange={e => setFecha(e.value)} dateFormat="dd/mm/yy" showIcon />
        </div>
        <div className="form-field">
          <label>Valor</label>
          <InputText value={value} onChange={e => setValue(e.target.value)} />
        </div>
      </div>

      <div className="filtros-toolbar">
        <div className="form-field">
          <label>Legajo</label>
          <FiltroTexto name="legajo" value={filtro.legajo} onChange={handleFiltroChange} />
        </div>
        <div className="form-field">
          <label>Convenio</label>
          <FiltroTexto name="convenio" value={filtro.convenio} onChange={handleFiltroChange} />
        </div>
        <div className="form-field">
          <label>Categoría</label>
          <FiltroTexto name="categoria" value={filtro.categoria} onChange={handleFiltroChange} />
        </div>
        <div className="form-field">
          <label>Grupo</label>
          <FiltroTexto name="grupo" value={filtro.grupo} onChange={handleFiltroChange} />
        </div>
        <div className="form-field">
          <label>Provincia</label>
          <FiltroTexto name="provincia" value={filtro.provincia} onChange={handleFiltroChange} />
        </div>
        <Button label="Buscar" icon="fa-solid fa-magnifying-glass" size="small" onClick={() => buscar()} loading={loading} />
        <Button label="Limpiar" icon="fa-solid fa-eraser" size="small" className="p-button-outlined" onClick={limpiarFiltros} />
      </div>

      <div className="candidatos-actions">
        <span className="total-registros">Total: {empleados.length} registros</span>
        <Button label={`Generar (${seleccionados.length})`} icon="fa-solid fa-bolt" size="small" onClick={handleGenerar} loading={generando} disabled={!seleccionados.length} />
      </div>

      <DataTable
        value={empleados}
        loading={loading}
        selection={seleccionados}
        onSelectionChange={e => setSeleccionados(e.value)}
        dataKey="id"
        size="small"
        stripedRows
        emptyMessage="Buscá empleados para generarles la novedad"
        paginator={empleados.length > 15}
        rows={15}
        paginatorRight={<span className="total-registros">Total: {empleados.length} registros</span>}
      >
        <Column selectionMode="multiple" style={{ width: '3rem' }} />
        <Column field="legajo" header="Legajo" sortable style={{ width: '90px' }} />
        <Column body={nombreTemplate} header="Apellido y Nombre" sortable sortField="apellido" />
        <Column field="grupo" header="Grupo" style={{ width: '110px' }} />
        <Column field="tarea" header="Tarea" />
        <Column field="convenio" header="Convenio" style={{ width: '130px' }} />
        <Column field="categoria" header="Categoría" style={{ width: '130px' }} />
      </DataTable>
    </div>
  );
}
