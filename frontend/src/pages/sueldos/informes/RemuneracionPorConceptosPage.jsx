import { useState, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import InformeFiltro, { FILTRO_VACIO } from './InformeFiltro';
import FiltroTexto from '../liquidaciones/FiltroTexto';
import { useEmpresa } from '../../../context/EmpresaContext';
import * as api from '../../../api/informes';
import './informes.css';

const money = v => v === null || v === undefined ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function RemuneracionPorConceptosPage() {
  const { empresa } = useEmpresa();
  const [filtro, setFiltro] = useState({ ...FILTRO_VACIO, concepto: '' });
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useRef(null);

  async function buscar(f = filtro) {
    setLoading(true);
    try {
      const res = await api.getRemuneracionPorConceptos({ ...f, empresa: empresa?.id });
      setEmpleados(res.data.resultado);
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

  const nombreTemplate = row => `${row.apellido ?? ''}${row.apellido && row.nombre ? ', ' : ''}${row.nombre ?? ''}`;

  const hasPaginator = empleados.length > 20;
  const totalRegistros = <span className="total-registros">Total: {empleados.length} registros</span>;
  const tableFooter = !hasPaginator && empleados.length > 0 ? <div className="table-footer-right">{totalRegistros}</div> : null;

  return (
    <div className="page-informes">
      <Toast ref={toast} />
      <h2 className="page-title"><i className="fa-solid fa-sack-dollar" /> Remuneración por Conceptos</h2>

      <InformeFiltro filtro={filtro} onChange={setFiltro} onBuscar={() => buscar()} onLimpiar={limpiar} loading={loading}>
        <div className="form-field informe-toolbar-extra">
          <label>Concepto</label>
          <FiltroTexto name="concepto" value={filtro.concepto} onChange={e => setFiltro(prev => ({ ...prev, concepto: e.target.value }))} />
        </div>
      </InformeFiltro>

      <DataTable
        value={empleados}
        loading={loading}
        paginator={hasPaginator}
        rows={20}
        rowsPerPageOptions={[20, 50, 100]}
        paginatorRight={totalRegistros}
        footer={tableFooter}
        size="small"
        stripedRows
        removableSort
        emptyMessage="Sin resultados para los filtros seleccionados"
      >
        <Column field="legajo" header="Legajo" sortable style={{ width: '90px' }} />
        <Column body={nombreTemplate} header="Empleado" sortField="apellido" sortable />
        <Column field="grupo" header="Grupo" style={{ width: '120px' }} />
        <Column body={e => e.antiguedad ?? '—'} header="Antigüedad" style={{ width: '110px' }} />
        <Column body={e => e.edad ?? '—'} header="Edad" style={{ width: '80px' }} />
        <Column field="tarea" header="Tarea" />
        <Column body={e => money(e.sueldo_neto)} header="Sueldo Neto" style={{ width: '120px' }} />
        <Column field="orden" header="Orden" style={{ width: '90px' }} />
      </DataTable>
    </div>
  );
}
