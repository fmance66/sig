import { useState, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import InformeFiltro, { FILTRO_VACIO } from './InformeFiltro';
import FiltroTexto from '../liquidaciones/FiltroTexto';
import * as api from '../../../api/informes';
import './informes.css';

const money = v => v === null || v === undefined ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ORDEN_OPTIONS = [
  { label: 'Empleado', value: 'empleado' },
  { label: 'Concepto', value: 'concepto' },
  { label: 'Período', value: 'periodo' },
];

export default function ConceptosPorReciboPage() {
  const [filtro, setFiltro] = useState({ ...FILTRO_VACIO, concepto: '', orden: 'empleado' });
  const [lineas, setLineas] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useRef(null);

  async function buscar(f = filtro) {
    setLoading(true);
    try {
      const res = await api.getConceptosPorRecibo(f);
      setLineas(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo generar el informe' });
    } finally {
      setLoading(false);
    }
  }

  function limpiar() {
    const vacio = { ...FILTRO_VACIO, concepto: '', orden: 'empleado' };
    setFiltro(vacio);
    buscar(vacio);
  }

  const nombreTemplate = row => `${row.apellido ?? ''}${row.apellido && row.nombre ? ', ' : ''}${row.nombre ?? ''}`;

  return (
    <div className="page-informes">
      <Toast ref={toast} />
      <h2 className="page-title"><i className="fa-solid fa-receipt" /> Conceptos por Recibo</h2>

      <InformeFiltro filtro={filtro} onChange={setFiltro} onBuscar={() => buscar()} onLimpiar={limpiar} loading={loading}>
        <div className="form-field informe-toolbar-extra">
          <label>Concepto</label>
          <FiltroTexto name="concepto" value={filtro.concepto} onChange={e => setFiltro(prev => ({ ...prev, concepto: e.target.value }))} />
        </div>
        <div className="form-field informe-toolbar-extra">
          <label>Orden</label>
          <Dropdown value={filtro.orden} options={ORDEN_OPTIONS} onChange={e => setFiltro(prev => ({ ...prev, orden: e.value }))} />
        </div>
      </InformeFiltro>

      <DataTable
        value={lineas}
        loading={loading}
        paginator={lineas.length > 20}
        rows={20}
        rowsPerPageOptions={[20, 50, 100]}
        size="small"
        stripedRows
        emptyMessage="Sin resultados para los filtros seleccionados"
      >
        <Column field="legajo" header="Legajo" style={{ width: '90px' }} />
        <Column body={nombreTemplate} header="Apellido y Nombre" />
        <Column field="periodo" header="Período" style={{ width: '100px' }} />
        <Column field="concepto" header="Concepto" style={{ width: '90px' }} />
        <Column field="concepto_desc" header="Descripción" />
        <Column body={l => money(l.unidad)} header="Unidad" style={{ width: '100px' }} />
        <Column body={l => money(l.remunerativo)} header="Remunerativo" style={{ width: '120px' }} />
        <Column body={l => money(l.no_remunerativo)} header="No Remunerativo" style={{ width: '130px' }} />
        <Column body={l => money(l.descuento)} header="Descuento" style={{ width: '110px' }} />
      </DataTable>
    </div>
  );
}
