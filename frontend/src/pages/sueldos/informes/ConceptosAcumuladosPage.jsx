import { useState, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import InformeFiltro, { FILTRO_VACIO } from './InformeFiltro';
import { useEmpresa } from '../../../context/EmpresaContext';
import * as api from '../../../api/informes';
import BotonVolver from '../../../components/BotonVolver';
import './informes.css';

const money = v => v === null || v === undefined ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ConceptosAcumuladosPage() {
  const { empresa } = useEmpresa();
  const [filtro, setFiltro] = useState(FILTRO_VACIO);
  const [conceptos, setConceptos] = useState([]);
  const [totales, setTotales] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useRef(null);

  async function buscar(f = filtro) {
    setLoading(true);
    try {
      const res = await api.getConceptosAcumulados({ ...f, empresa: empresa?.id });
      setConceptos(res.data.resultado.conceptos);
      setTotales(res.data.resultado.totales);
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

  const filaTotal = totales ? [{ ...totales, concepto: '', concepto_desc: 'Totales', _total: true }] : [];
  const totalRegistros = <span className="total-registros">Total: {conceptos.length} registros</span>;
  const tableFooter = conceptos.length > 0 ? <div className="table-footer-right">{totalRegistros}</div> : null;

  return (
    <div className="page-informes">
      <Toast ref={toast} />
      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-sitemap" /> Conceptos Acumulados</h2>
      </div>

      <InformeFiltro filtro={filtro} onChange={setFiltro} onBuscar={() => buscar()} onLimpiar={limpiar} loading={loading} />

      <DataTable
        value={[...conceptos, ...filaTotal]}
        loading={loading}
        size="small"
        stripedRows
        emptyMessage="Sin resultados para los filtros seleccionados"
        rowClassName={row => row._total ? 'informe-fila-total' : ''}
        footer={tableFooter}
      >
        <Column field="concepto" header="Concepto" style={{ width: '90px' }} />
        <Column field="concepto_desc" header="Descripción" />
        <Column body={c => money(c.unidad)} header="Unidad" style={{ width: '100px' }} />
        <Column body={c => money(c.remunerativo)} header="Remunerativo" style={{ width: '120px' }} />
        <Column body={c => money(c.no_remunerativo)} header="No Remunerativo" style={{ width: '130px' }} />
        <Column body={c => money(c.sueldo_bruto)} header="Sueldo Bruto" style={{ width: '120px' }} />
        <Column body={c => money(c.descuento)} header="Descuento" style={{ width: '110px' }} />
        <Column body={c => money(c.sueldo_neto)} header="Sueldo Neto" style={{ width: '120px' }} />
        <Column body={c => money(c.contribucion)} header="Contribución" style={{ width: '120px' }} />
        <Column body={c => money(c.auxiliar)} header="Auxiliar" style={{ width: '100px' }} />
      </DataTable>
    </div>
  );
}
