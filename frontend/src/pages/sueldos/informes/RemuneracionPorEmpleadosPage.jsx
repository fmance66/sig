import { useState, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import InformeFiltro, { FILTRO_VACIO } from './InformeFiltro';
import * as api from '../../../api/informes';
import './informes.css';

const money = v => v === null || v === undefined ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fecha = v => v ? new Date(v).toLocaleDateString('es-AR') : '—';
const CAMPOS_SUMA = ['remunerativo', 'no_remunerativo', 'descuento', 'sueldo_neto'];

// El backend devuelve la lista plana de recibos (mismo shape que
// recibos.list()); se agrupa por empleado acá para reusar el mismo diseño
// de tabla con subtotal que Conceptos por Grupo / Remuneración por Grupos.
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

export default function RemuneracionPorEmpleadosPage() {
  const [filtro, setFiltro] = useState(FILTRO_VACIO);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState(null);
  const toast = useRef(null);

  async function buscar(f = filtro) {
    setLoading(true);
    try {
      const res = await api.getRemuneracionPorEmpleados(f);
      setEmpleados(agruparPorEmpleado(res.data.resultado.recibos));
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo generar el informe' });
    } finally {
      setLoading(false);
    }
  }

  function limpiar() {
    setFiltro(FILTRO_VACIO);
    buscar(FILTRO_VACIO);
  }

  function detalleTemplate(emp) {
    return (
      <div className="row-expansion">
        <DataTable value={emp.items} size="small" stripedRows emptyMessage="Sin recibos">
          <Column field="periodo" header="Período" style={{ width: '100px' }} />
          <Column body={r => fecha(r.fecha_recibo)} header="Fecha" style={{ width: '100px' }} />
          <Column body={r => money(r.remunerativo)} header="Remunerativo" style={{ width: '120px' }} />
          <Column body={r => money(r.no_remunerativo)} header="No Remunerativo" style={{ width: '130px' }} />
          <Column body={r => money(r.descuento)} header="Descuento" style={{ width: '110px' }} />
          <Column body={r => money(r.sueldo_neto)} header="Sueldo Neto" style={{ width: '120px' }} />
          <Column body={r => money(r.sueldo_bruto)} header="Sueldo Bruto" style={{ width: '120px' }} />
        </DataTable>
      </div>
    );
  }

  return (
    <div className="page-informes">
      <Toast ref={toast} />
      <h2 className="page-title"><i className="fa-solid fa-users" /> Remuneración por Empleados</h2>

      <InformeFiltro filtro={filtro} onChange={setFiltro} onBuscar={() => buscar()} onLimpiar={limpiar} loading={loading} />

      <DataTable
        value={empleados}
        loading={loading}
        expandedRows={expandedRows}
        onRowToggle={e => setExpandedRows(e.data)}
        rowExpansionTemplate={detalleTemplate}
        dataKey="id"
        size="small"
        stripedRows
        emptyMessage="Sin resultados para los filtros seleccionados"
      >
        <Column expander style={{ width: '3rem' }} />
        <Column field="legajo" header="Legajo" style={{ width: '90px' }} />
        <Column field="apellido" header="Apellido" />
        <Column field="nombre" header="Nombre" />
        <Column body={e => e.items.length} header="N° Recibos" style={{ width: '110px' }} />
        <Column body={e => money(e.totales.remunerativo)} header="Remunerativo" style={{ width: '120px' }} />
        <Column body={e => money(e.totales.no_remunerativo)} header="No Remunerativo" style={{ width: '130px' }} />
        <Column body={e => money(e.totales.descuento)} header="Descuento" style={{ width: '110px' }} />
        <Column body={e => money(e.totales.sueldo_neto)} header="Sueldo Neto" style={{ width: '120px' }} />
      </DataTable>
    </div>
  );
}
