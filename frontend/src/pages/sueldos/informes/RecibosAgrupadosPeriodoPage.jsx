import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import InformeFiltro, { FILTRO_VACIO } from './InformeFiltro';
import RecibosConceptosTable from './RecibosConceptosTable';
import { useEmpresa } from '../../../context/EmpresaContext';
import * as api from '../../../api/liquidaciones';
import BotonVolver from '../../../components/BotonVolver';
import './informes.css';

const money = v => v === null || v === undefined ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const CAMPOS_SUMA = ['remunerativo', 'no_remunerativo', 'descuento', 'sueldo_neto', 'sueldo_bruto'];

function agruparPorPeriodo(recibos) {
  const periodos = new Map();
  for (const r of recibos) {
    if (!periodos.has(r.periodo)) {
      periodos.set(r.periodo, { id: r.periodo, items: [], totales: Object.fromEntries(CAMPOS_SUMA.map(c => [c, 0])) });
    }
    const grupo = periodos.get(r.periodo);
    grupo.items.push(r);
    for (const c of CAMPOS_SUMA) grupo.totales[c] += Number(r[c]) || 0;
  }
  return [...periodos.values()];
}

export default function RecibosAgrupadosPeriodoPage() {
  const { empresa } = useEmpresa();
  const [filtro, setFiltro] = useState(FILTRO_VACIO);
  const [periodos, setPeriodos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState(null);
  const toast = useRef(null);

  useEffect(() => { setPeriodos([]); }, [empresa?.id]);

  async function buscar(f = filtro) {
    setLoading(true);
    try {
      const res = await api.getRecibos({ ...f, empresa: empresa?.id });
      setPeriodos(agruparPorPeriodo(res.data.resultado));
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los recibos' });
    } finally {
      setLoading(false);
    }
  }

  function limpiar() {
    setFiltro(FILTRO_VACIO);
    buscar(FILTRO_VACIO);
  }

  const totalRegistros = <span className="total-registros">Total: {periodos.length} registros</span>;
  const tableFooter = periodos.length > 0 ? <div className="table-footer-right">{totalRegistros}</div> : null;

  return (
    <div className="page-informes">
      <Toast ref={toast} />
      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-calendar-days" /> Recibos Agrupados por Período</h2>
      </div>

      <InformeFiltro filtro={filtro} onChange={setFiltro} onBuscar={() => buscar()} onLimpiar={limpiar} loading={loading} />

      <DataTable
        value={periodos}
        loading={loading}
        expandedRows={expandedRows}
        onRowToggle={e => setExpandedRows(e.data)}
        rowExpansionTemplate={grupo => <div className="row-expansion"><RecibosConceptosTable recibos={grupo.items} /></div>}
        dataKey="id"
        size="small"
        stripedRows
        emptyMessage="Sin resultados para los filtros seleccionados"
        footer={tableFooter}
      >
        <Column expander style={{ width: '3rem' }} />
        <Column field="id" header="Período" style={{ width: '120px' }} />
        <Column body={g => g.items.length} header="N° Empleados" style={{ width: '120px' }} />
        <Column body={g => money(g.totales.remunerativo)} header="Remunerativo" style={{ width: '120px' }} />
        <Column body={g => money(g.totales.no_remunerativo)} header="No Remunerativo" style={{ width: '130px' }} />
        <Column body={g => money(g.totales.sueldo_bruto)} header="Sueldo Bruto" style={{ width: '120px' }} />
        <Column body={g => money(g.totales.descuento)} header="Descuento" style={{ width: '110px' }} />
        <Column body={g => money(g.totales.sueldo_neto)} header="Sueldo Neto" style={{ width: '120px' }} />
      </DataTable>
    </div>
  );
}
