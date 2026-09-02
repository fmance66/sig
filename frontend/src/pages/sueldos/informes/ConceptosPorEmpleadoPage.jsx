import { useState, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import InformeFiltro, { FILTRO_VACIO } from './InformeFiltro';
import FiltroTexto from '../liquidaciones/FiltroTexto';
import { useEmpresa } from '../../../context/EmpresaContext';
import * as api from '../../../api/informes';
import BotonVolver from '../../../components/BotonVolver';
import './informes.css';

const fecha = v => v ? new Date(v).toLocaleDateString('es-AR') : '—';

export default function ConceptosPorEmpleadoPage() {
  const { empresa } = useEmpresa();
  const [filtro, setFiltro] = useState({ ...FILTRO_VACIO, concepto: '' });
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState(null);
  const toast = useRef(null);

  async function buscar(f = filtro) {
    setLoading(true);
    try {
      const res = await api.getConceptosPorEmpleado({ ...f, empresa: empresa?.id });
      setEmpleados(res.data.resultado.empleados);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo generar el informe' });
    } finally {
      setLoading(false);
    }
  }

  function limpiar() {
    const vacio = { ...FILTRO_VACIO, concepto: '' };
    setFiltro(vacio);
    buscar(vacio);
  }

  const totalRegistros = <span className="total-registros">Total: {empleados.length} registros</span>;
  const tableFooter = empleados.length > 0 ? <div className="table-footer-right">{totalRegistros}</div> : null;

  function detalleTemplate(emp) {
    return (
      <div className="row-expansion">
        <DataTable value={emp.conceptos} size="small" stripedRows emptyMessage="Sin conceptos asignados">
          <Column field="concepto" header="Concepto" style={{ width: '90px' }} />
          <Column field="concepto_desc" header="Descripción" />
          <Column field="columna" header="Columna" style={{ width: '160px' }} />
          <Column body={c => fecha(c.vigencia_desde)} header="Vigencia Desde" style={{ width: '130px' }} />
          <Column body={c => fecha(c.vigencia_hasta)} header="Vigencia Hasta" style={{ width: '130px' }} />
          <Column field="orden" header="Orden" style={{ width: '90px' }} />
        </DataTable>
      </div>
    );
  }

  return (
    <div className="page-informes">
      <Toast ref={toast} />
      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-user-tag" /> Conceptos por Empleado</h2>
      </div>

      <InformeFiltro filtro={filtro} onChange={setFiltro} onBuscar={() => buscar()} onLimpiar={limpiar} loading={loading} ocultar={['periodo', 'estado']}>
        <div className="form-field informe-toolbar-extra">
          <label>Concepto</label>
          <FiltroTexto name="concepto" value={filtro.concepto} onChange={e => setFiltro(prev => ({ ...prev, concepto: e.target.value }))} />
        </div>
      </InformeFiltro>

      <DataTable
        value={empleados}
        loading={loading}
        expandedRows={expandedRows}
        onRowToggle={e => setExpandedRows(e.data)}
        rowExpansionTemplate={detalleTemplate}
        dataKey="empleado"
        size="small"
        stripedRows
        emptyMessage="Sin resultados para los filtros seleccionados"
        footer={tableFooter}
      >
        <Column expander style={{ width: '3rem' }} />
        <Column field="legajo" header="Legajo" style={{ width: '90px' }} />
        <Column field="apellido" header="Apellido" />
        <Column field="nombre" header="Nombre" />
        <Column body={e => e.conceptos.length} header="N° Conceptos" style={{ width: '120px' }} />
      </DataTable>
    </div>
  );
}
