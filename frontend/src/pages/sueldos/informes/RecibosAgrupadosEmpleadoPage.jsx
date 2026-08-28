import { useState, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import InformeFiltro, { FILTRO_VACIO } from './InformeFiltro';
import RecibosConceptosTable from './RecibosConceptosTable';
import { useEmpresa } from '../../../context/EmpresaContext';
import * as api from '../../../api/liquidaciones';
import './informes.css';

const money = v => v === null || v === undefined ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const CAMPOS_SUMA = ['remunerativo', 'no_remunerativo', 'descuento', 'sueldo_neto', 'sueldo_bruto'];

function agruparPorEmpleado(recibos) {
  const empleados = new Map();
  for (const r of recibos) {
    if (!empleados.has(r.legajo)) {
      empleados.set(r.legajo, {
        id: r.legajo, legajo: r.legajo, apellido: r.apellido, nombre: r.nombre, items: [],
        totales: Object.fromEntries(CAMPOS_SUMA.map(c => [c, 0])),
      });
    }
    const grupo = empleados.get(r.legajo);
    grupo.items.push(r);
    for (const c of CAMPOS_SUMA) grupo.totales[c] += Number(r[c]) || 0;
  }
  return [...empleados.values()];
}

export default function RecibosAgrupadosEmpleadoPage() {
  const { empresa } = useEmpresa();
  const [filtro, setFiltro] = useState(FILTRO_VACIO);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState(null);
  const toast = useRef(null);

  async function buscar(f = filtro) {
    setLoading(true);
    try {
      const res = await api.getRecibos({ ...f, empresa: empresa?.id });
      setEmpleados(agruparPorEmpleado(res.data.resultado));
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

  const totalRegistros = <span className="total-registros">Total: {empleados.length} registros</span>;
  const tableFooter = empleados.length > 0 ? <div className="table-footer-right">{totalRegistros}</div> : null;

  return (
    <div className="page-informes">
      <Toast ref={toast} />
      <h2 className="page-title"><i className="fa-solid fa-user-clock" /> Recibos Agrupados por Empleado</h2>

      <InformeFiltro filtro={filtro} onChange={setFiltro} onBuscar={() => buscar()} onLimpiar={limpiar} loading={loading} />

      <DataTable
        value={empleados}
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
        <Column field="legajo" header="Legajo" style={{ width: '90px' }} />
        <Column field="apellido" header="Apellido" />
        <Column field="nombre" header="Nombre" />
        <Column body={g => g.items.length} header="N° Recibos" style={{ width: '110px' }} />
        <Column body={g => money(g.totales.sueldo_bruto)} header="Sueldo Bruto" style={{ width: '120px' }} />
        <Column body={g => money(g.totales.sueldo_neto)} header="Sueldo Neto" style={{ width: '120px' }} />
      </DataTable>
    </div>
  );
}
