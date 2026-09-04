import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import * as api from '../../../api/liquidaciones';
import FiltroTexto from './FiltroTexto';
import PeriodoSelect from '../../../components/PeriodoSelect';
import BotonVolver from '../../../components/BotonVolver';
import { useEmpresa } from '../../../context/EmpresaContext';
import './liquidaciones.css';

const money = v => v === null || v === undefined ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const EMPTY_FILTRO = { periodo: '', legajo: '', convenio: '', categoria: '', grupo: '', estado: '' };

export default function ContribucionesPage({ columna = 'CONTRIBUCION' }) {
  const { empresa } = useEmpresa();
  const [filtro, setFiltro] = useState(EMPTY_FILTRO);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState(null);
  const [detallePorRecibo, setDetallePorRecibo] = useState({});
  const toast = useRef(null);

  useEffect(() => { if (empresa) buscar(); }, [columna, empresa?.id]);

  function rowId(r) { return `${r.periodo}|${r.empleado}|${r.numero}`; }

  function handleFiltroChange(e) {
    const { name, value } = e.target;
    setFiltro(prev => ({ ...prev, [name]: value }));
  }

  async function buscar(f = filtro) {
    setLoading(true);
    try {
      const res = await api.getListadoContribuciones({ ...f, columna, empresa: empresa?.id });
      setRegistros(res.data.resultado.map(r => ({ ...r, _id: rowId(r) })));
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo obtener el listado' });
    } finally {
      setLoading(false);
    }
  }

  function limpiarFiltros() {
    setFiltro(EMPTY_FILTRO);
    buscar(EMPTY_FILTRO);
  }

  async function onRowToggle(e) {
    setExpandedRows(e.data);
    const nuevos = Object.keys(e.data).filter(id => !(id in detallePorRecibo));
    for (const id of nuevos) {
      const row = registros.find(r => r._id === id);
      if (!row) continue;
      try {
        const res = await api.getDetalleContribuciones(row.periodo, row.empleado, row.numero, columna);
        setDetallePorRecibo(prev => ({ ...prev, [id]: res.data.resultado }));
      } catch {
        setDetallePorRecibo(prev => ({ ...prev, [id]: [] }));
      }
    }
  }

  function rowExpansionTemplate(row) {
    const detalle = detallePorRecibo[row._id] ?? [];
    return (
      <div className="row-expansion">
        <DataTable value={detalle} size="small" stripedRows emptyMessage="Sin renglones">
          <Column field="concepto" header="Código" style={{ width: '90px' }} />
          <Column field="descripcion" header="Descripción" />
          <Column field="unidad" header="Unidades" style={{ width: '100px' }} />
          <Column body={c => money(c.importe)} header="Importe" style={{ width: '120px' }} />
        </DataTable>
      </div>
    );
  }

  const nombreTemplate = row => `${row.apellido ?? ''}${row.apellido && row.nombre ? ', ' : ''}${row.nombre ?? ''}`;
  const fechaTemplate = row => row.fecha_recibo ? new Date(row.fecha_recibo).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

  const esContribucion = columna === 'CONTRIBUCION';
  const titulo = esContribucion ? 'Listado de Contribuciones' : 'Listado de Auxiliares';
  const icono = esContribucion ? 'fa-solid fa-building-columns' : 'fa-solid fa-list-check';

  return (
    <div className="page-liquidaciones">
      <Toast ref={toast} />
      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className={icono} /> {titulo}</h2>
      </div>

      <div className="filtros-toolbar">
        <div className="form-field">
          <label>Período</label>
          <PeriodoSelect value={filtro.periodo} onChange={e => setFiltro(prev => ({ ...prev, periodo: e.value || '' }))} placeholder="" style={{ width: '220px' }} />
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
        <Button label="Buscar" icon="fa-solid fa-magnifying-glass" size="small" onClick={() => buscar()} loading={loading} />
        <Button label="Limpiar" icon="fa-solid fa-eraser" size="small" className="p-button-outlined" onClick={limpiarFiltros} />
      </div>

      <DataTable
        value={registros}
        loading={loading}
        size="small"
        stripedRows
        paginator={registros.length > 15}
        rows={15}
        paginatorRight={<span className="total-registros">Total: {registros.length} registros</span>}
        footer={registros.length > 0 && registros.length <= 15
          ? <div className="table-footer-right"><span className="total-registros">Total: {registros.length} registros</span></div>
          : null}
        emptyMessage="No hay registros para los filtros seleccionados"
        expandedRows={expandedRows}
        onRowToggle={onRowToggle}
        rowExpansionTemplate={rowExpansionTemplate}
        dataKey="_id"
      >
        <Column expander style={{ width: '3rem' }} />
        <Column field="legajo" header="Legajo" style={{ width: '90px' }} />
        <Column body={nombreTemplate} header="Apellido y Nombre" />
        <Column field="periodo" header="Período" style={{ width: '110px' }} />
        <Column body={fechaTemplate} header="Fecha" style={{ width: '100px' }} />
        <Column body={r => money(r.total)} header={esContribucion ? 'Contribución' : 'Auxiliar'} style={{ width: '130px' }} />
        {esContribucion && <Column body={r => money(r.costo_laboral)} header="Costo Laboral" style={{ width: '130px' }} />}
      </DataTable>
    </div>
  );
}
