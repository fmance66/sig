import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import { Toast } from 'primereact/toast';
import * as api from '../../../api/liquidaciones';
import FiltroTexto from './FiltroTexto';
import BotonVolver from '../../../components/BotonVolver';
import PeriodoSelect from '../../../components/PeriodoSelect';
import { useEmpresa } from '../../../context/EmpresaContext';
import './liquidaciones.css';

const EMPTY_FILTRO = { legajo: '', convenio: '', grupo: '', categoria: '', estado: '', provincia: '' };

export default function RecibosAutomaticosPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { empresa } = useEmpresa();
  const [periodo, setPeriodo] = useState(searchParams.get('periodo') || null);
  const [filtro, setFiltro] = useState(EMPTY_FILTRO);
  const [empleados, setEmpleados] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [saldoCero, setSaldoCero] = useState(false);
  const [conceptosIndividuales, setConceptosIndividuales] = useState(true);
  const toast = useRef(null);

  useEffect(() => { if (empresa) buscar(); }, [empresa?.id]);

  async function buscar(f = filtro) {
    if (!periodo) { setEmpleados([]); return; }
    setLoading(true);
    try {
      const res = await api.getEmpleadosCandidatos({ ...f, empresa: empresa?.id });
      setEmpleados(res.data.resultado);
      setSeleccionados([]);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron obtener los empleados' });
    } finally {
      setLoading(false);
    }
  }

  function handleFiltroChange(e) {
    const { name, value } = e.target;
    setFiltro(prev => ({ ...prev, [name]: value }));
  }

  function limpiarFiltros() {
    setPeriodo(null);
    setFiltro(EMPTY_FILTRO);
    buscar(EMPTY_FILTRO);
  }

  async function handleGenerar() {
    if (!periodo) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Elegí un período' });
      return;
    }
    if (!seleccionados.length) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Seleccioná al menos un empleado' });
      return;
    }
    setGenerando(true);
    try {
      const res = await api.generarRecibosAutomaticos({
        periodo, empresa: empresa?.id, empleados: seleccionados.map(e => e.id), conceptosIndividuales, saldoCero,
      });
      const r = res.data.resultado;
      toast.current.show({
        severity: 'success', summary: 'Recibos generados',
        detail: `Creados: ${r.creados} · Actualizados: ${r.actualizados} · Omitidos: ${r.omitidos} · Errores: ${r.errores.length}`,
        life: 6000,
      });
      if (!r.errores.length) navigate(`/sueldos/liquidaciones/recibos?periodo=${encodeURIComponent(periodo)}`);
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'No se pudieron generar los recibos';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="page-liquidaciones">
      <Toast ref={toast} />
      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-bolt" /> Crear Recibos de Forma Automática</h2>
      </div>

      <div className="filtros-toolbar">
        <div className="form-field">
          <label>Período <span className="required">*</span></label>
          <PeriodoSelect value={periodo} onChange={e => setPeriodo(e.value)} empresa={empresa?.id} style={{ width: '280px' }} />
        </div>
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
        <Button label="Buscar" icon="fa-solid fa-magnifying-glass" size="small" onClick={() => {
          if (!periodo) { toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Elegí un período' }); return; }
          buscar();
        }} loading={loading} />
        <Button label="Limpiar" icon="fa-solid fa-eraser" size="small" className="p-button-outlined" onClick={limpiarFiltros} />
      </div>

      <div className="candidatos-actions">
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div className="form-field form-field--checkbox">
            <InputSwitch checked={saldoCero} onChange={e => setSaldoCero(e.value)} />
            <label style={{ marginLeft: '0.4rem' }}>Saldo Cero</label>
          </div>
          <div className="form-field form-field--checkbox">
            <InputSwitch checked={conceptosIndividuales} onChange={e => setConceptosIndividuales(e.value)} />
            <label style={{ marginLeft: '0.4rem' }}>Conceptos Individuales</label>
          </div>
        </div>
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
        emptyMessage={periodo ? 'Buscá empleados para generar sus recibos' : 'Elegí un período para buscar empleados'}
        paginator={empleados.length > 15}
        rows={15}
        paginatorRight={<span className="total-registros">Total: {empleados.length} registros</span>}
        footer={empleados.length > 0 && empleados.length <= 15
          ? <div className="table-footer-right"><span className="total-registros">Total: {empleados.length} registros</span></div>
          : null}
      >
        <Column selectionMode="multiple" style={{ width: '3rem' }} />
        <Column field="legajo" header="Legajo" sortable style={{ width: '90px' }} />
        <Column body={e => `${e.apellido ?? ''}${e.apellido && e.nombre ? ', ' : ''}${e.nombre ?? ''}`} header="Apellido y Nombre" sortable sortField="apellido" />
        <Column field="grupo" header="Grupo" style={{ width: '110px' }} />
        <Column field="tarea" header="Tarea" />
        <Column field="lugar_trabajo" header="Lugar" />
        <Column field="convenio" header="Convenio" style={{ width: '130px' }} />
        <Column field="categoria" header="Categoría" style={{ width: '130px' }} />
      </DataTable>
    </div>
  );
}
