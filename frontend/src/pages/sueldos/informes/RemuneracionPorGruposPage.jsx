import { useState, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import InformeFiltro, { FILTRO_VACIO } from './InformeFiltro';
import { AGRUPADO_POR_OPTIONS } from './dimensiones';
import * as api from '../../../api/informes';
import './informes.css';

const money = v => v === null || v === undefined ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fecha = v => v ? new Date(v).toLocaleDateString('es-AR') : '—';

export default function RemuneracionPorGruposPage() {
  const [filtro, setFiltro] = useState({ ...FILTRO_VACIO, agrupadoPor: 'proyecto' });
  const [grupos, setGrupos] = useState([]);
  const [totales, setTotales] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState(null);
  const toast = useRef(null);

  async function buscar(f = filtro) {
    setLoading(true);
    try {
      const res = await api.getRemuneracionPorGrupos(f);
      setGrupos(res.data.resultado.grupos);
      setTotales(res.data.resultado.totales);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo generar el informe' });
    } finally {
      setLoading(false);
    }
  }

  function limpiar() {
    const vacio = { ...FILTRO_VACIO, agrupadoPor: 'proyecto' };
    setFiltro(vacio);
    buscar(vacio);
  }

  const nombreTemplate = row => `${row.apellido ?? ''}${row.apellido && row.nombre ? ', ' : ''}${row.nombre ?? ''}`;

  function detalleTemplate(grupo) {
    return (
      <div className="row-expansion">
        <DataTable value={grupo.items} size="small" stripedRows emptyMessage="Sin empleados">
          <Column field="legajo" header="Legajo" style={{ width: '90px' }} />
          <Column body={nombreTemplate} header="Empleado" />
          <Column field="periodo" header="Período" style={{ width: '100px' }} />
          <Column body={r => fecha(r.fecha_recibo)} header="Fecha" style={{ width: '100px' }} />
          <Column body={r => money(r.remunerativo)} header="Remunerativo" style={{ width: '120px' }} />
          <Column body={r => money(r.no_remunerativo)} header="No Remunerativo" style={{ width: '130px' }} />
          <Column body={r => money(r.descuento)} header="Descuento" style={{ width: '110px' }} />
          <Column body={r => money(r.sueldo_neto)} header="Sueldo Neto" style={{ width: '120px' }} />
        </DataTable>
      </div>
    );
  }

  return (
    <div className="page-informes">
      <Toast ref={toast} />
      <h2 className="page-title"><i className="fa-solid fa-people-group" /> Remuneración por Grupos</h2>

      <InformeFiltro filtro={filtro} onChange={setFiltro} onBuscar={() => buscar()} onLimpiar={limpiar} loading={loading}>
        <div className="form-field informe-toolbar-extra">
          <label>Agrupado por</label>
          <Dropdown value={filtro.agrupadoPor} options={AGRUPADO_POR_OPTIONS}
            onChange={e => setFiltro(prev => ({ ...prev, agrupadoPor: e.value }))} />
        </div>
      </InformeFiltro>

      <DataTable
        value={grupos}
        loading={loading}
        expandedRows={expandedRows}
        onRowToggle={e => setExpandedRows(e.data)}
        rowExpansionTemplate={detalleTemplate}
        dataKey="id"
        size="small"
        stripedRows
        emptyMessage="Sin resultados para los filtros seleccionados"
        footer={totales && (
          <div className="table-footer-right" style={{ gap: '1.5rem', fontWeight: 700, color: '#1d4ed8' }}>
            <span>Total Remunerativo: {money(totales.remunerativo)}</span>
            <span>Total No Remunerativo: {money(totales.no_remunerativo)}</span>
            <span>Total Descuento: {money(totales.descuento)}</span>
            <span>Total Sueldo Neto: {money(totales.sueldo_neto)}</span>
          </div>
        )}
      >
        <Column expander style={{ width: '3rem' }} />
        <Column field="id" header="Grupo" style={{ width: '120px' }} />
        <Column field="descripcion" header="Descripción" />
        <Column field="empleados" header="N° Empleados" style={{ width: '120px' }} />
        <Column body={g => money(g.totales.remunerativo)} header="Remunerativo" style={{ width: '120px' }} />
        <Column body={g => money(g.totales.no_remunerativo)} header="No Remunerativo" style={{ width: '130px' }} />
        <Column body={g => money(g.totales.descuento)} header="Descuento" style={{ width: '110px' }} />
        <Column body={g => money(g.totales.sueldo_neto)} header="Sueldo Neto" style={{ width: '120px' }} />
      </DataTable>
    </div>
  );
}
