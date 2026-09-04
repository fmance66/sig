import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import InformeFiltro, { FILTRO_VACIO } from './InformeFiltro';
import { AGRUPADO_POR_OPTIONS } from './dimensiones';
import { useEmpresa } from '../../../context/EmpresaContext';
import * as api from '../../../api/informes';
import BotonVolver from '../../../components/BotonVolver';
import './informes.css';

const money = v => v === null || v === undefined ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ConceptosPorGrupoPage() {
  const { empresa } = useEmpresa();
  const [filtro, setFiltro] = useState({ ...FILTRO_VACIO, agrupadoPor: 'proyecto' });
  const [grupos, setGrupos] = useState([]);
  const [totales, setTotales] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState(null);
  const toast = useRef(null);

  useEffect(() => { setGrupos([]); setTotales(null); }, [empresa?.id]);

  async function buscar(f = filtro) {
    setLoading(true);
    try {
      const res = await api.getConceptosPorGrupo({ ...f, empresa: empresa?.id });
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

  function detalleTemplate(grupo) {
    return (
      <div className="row-expansion">
        <DataTable value={grupo.items} size="small" stripedRows emptyMessage="Sin conceptos">
          <Column field="concepto" header="Concepto" style={{ width: '90px' }} />
          <Column field="concepto_desc" header="Descripción" />
          <Column body={c => money(c.unidad)} header="Unidad" style={{ width: '100px' }} />
          <Column body={c => money(c.remunerativo)} header="Remunerativo" style={{ width: '130px' }} />
          <Column body={c => money(c.no_remunerativo)} header="No Remunerativo" style={{ width: '140px' }} />
          <Column body={c => money(c.descuento)} header="Descuento" style={{ width: '120px' }} />
        </DataTable>
      </div>
    );
  }

  return (
    <div className="page-informes">
      <Toast ref={toast} />
      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-object-group" /> Conceptos por Grupos</h2>
      </div>

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
          <div className="table-footer-right" style={{ gap: '1.5rem' }}>
            <span className="total-registros">Total: {grupos.length} registros</span>
            <span style={{ fontWeight: 700, color: '#1d4ed8' }}>Total Remunerativo: {money(totales.remunerativo)}</span>
            <span style={{ fontWeight: 700, color: '#1d4ed8' }}>Total No Remunerativo: {money(totales.no_remunerativo)}</span>
            <span style={{ fontWeight: 700, color: '#1d4ed8' }}>Total Descuento: {money(totales.descuento)}</span>
          </div>
        )}
      >
        <Column expander style={{ width: '3rem' }} />
        <Column field="id" header="Grupo" style={{ width: '120px' }} />
        <Column field="descripcion" header="Descripción" />
        <Column body={g => g.items.length} header="N° Conceptos" style={{ width: '120px' }} />
        <Column body={g => money(g.totales.remunerativo)} header="Remunerativo" style={{ width: '130px' }} />
        <Column body={g => money(g.totales.no_remunerativo)} header="No Remunerativo" style={{ width: '140px' }} />
        <Column body={g => money(g.totales.descuento)} header="Descuento" style={{ width: '120px' }} />
      </DataTable>
    </div>
  );
}
