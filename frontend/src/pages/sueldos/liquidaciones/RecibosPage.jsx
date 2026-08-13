import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import * as api from '../../../api/liquidaciones';
import FiltroTexto from './FiltroTexto';
import './liquidaciones.css';

const EMPTY_FILTRO = { periodo: '', legajo: '', convenio: '', categoria: '', grupo: '', estado: '' };

const money = v => v === null || v === undefined ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function RecibosPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [recibos, setRecibos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState({ ...EMPTY_FILTRO, periodo: searchParams.get('periodo') || '' });
  const [expandedRows, setExpandedRows] = useState(null);
  const [conceptosPorRecibo, setConceptosPorRecibo] = useState({});
  const toast = useRef(null);

  useEffect(() => { load(); }, []);

  function rowId(r) { return `${r.periodo}|${r.empleado}|${r.numero}`; }

  async function load(f = filtro) {
    setLoading(true);
    try {
      const res = await api.getRecibos(f);
      setRecibos(res.data.resultado.map(r => ({ ...r, _id: rowId(r) })));
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los recibos' });
    } finally {
      setLoading(false);
    }
  }

  function handleFiltroChange(e) {
    const { name, value } = e.target;
    setFiltro(prev => ({ ...prev, [name]: value }));
  }

  function limpiarFiltros() {
    setFiltro(EMPTY_FILTRO);
    load(EMPTY_FILTRO);
  }

  async function onRowToggle(e) {
    setExpandedRows(e.data);
    const nuevos = Object.keys(e.data).filter(id => !(id in conceptosPorRecibo));
    for (const id of nuevos) {
      const row = recibos.find(r => r._id === id);
      if (!row) continue;
      try {
        const res = await api.getConceptosRecibo(row.periodo, row.empleado, row.numero);
        setConceptosPorRecibo(prev => ({ ...prev, [id]: res.data.resultado }));
      } catch {
        setConceptosPorRecibo(prev => ({ ...prev, [id]: [] }));
      }
    }
  }

  function rowExpansionTemplate(row) {
    const conceptos = conceptosPorRecibo[row._id] ?? [];
    return (
      <div className="row-expansion">
        <DataTable value={conceptos} size="small" stripedRows emptyMessage="Este recibo no tiene conceptos cargados">
          <Column field="concepto" header="Concepto" style={{ width: '90px' }} />
          <Column field="concepto_desc" header="Descripción" />
          <Column field="columna" header="Columna" style={{ width: '150px' }} />
          <Column field="unidad" header="Unidad" style={{ width: '90px' }} />
          <Column body={c => money(c.importe)} header="Importe" style={{ width: '120px' }} />
        </DataTable>
      </div>
    );
  }

  function handleDelete(row) {
    confirmDialog({
      message: `¿Eliminar el recibo N° ${row.numero} de ${row.apellido}, ${row.nombre} (${row.periodo})?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteRecibo(row.periodo, row.empleado, row.numero);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Recibo eliminado' });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
        }
      },
    });
  }

  const nombreTemplate = row => `${row.apellido ?? ''}${row.apellido && row.nombre ? ', ' : ''}${row.nombre ?? ''}`;
  const fechaTemplate = row => row.fecha_recibo ? new Date(row.fecha_recibo).toLocaleDateString('es-AR') : '—';

  const accionesTemplate = (row) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-arrow-up-right-from-square" className="p-button-text p-button-sm" tooltip="Abrir recibo" tooltipOptions={{ position: 'top' }}
        onClick={() => navigate(`/sueldos/liquidaciones/recibo/${encodeURIComponent(row.periodo)}/${row.empleado}/${row.numero}`)} />
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar" tooltipOptions={{ position: 'top' }} onClick={() => handleDelete(row)} />
    </div>
  );

  const tableHeader = (
    <div className="filtros-toolbar">
      <div className="form-field">
        <label>Período</label>
        <FiltroTexto name="periodo" value={filtro.periodo} onChange={handleFiltroChange} />
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
      <Button label="Buscar" icon="fa-solid fa-magnifying-glass" size="small" onClick={() => load()} />
      <Button label="Limpiar" icon="fa-solid fa-eraser" size="small" className="p-button-outlined" onClick={limpiarFiltros} />
    </div>
  );

  const hasPaginator = recibos.length > 15;
  const totalRegistros = <span className="total-registros">Total: {recibos.length} registros</span>;
  const tableFooter = !hasPaginator && recibos.length > 0
    ? <div className="table-footer-right">{totalRegistros}</div>
    : null;

  return (
    <div className="page-liquidaciones">
      <Toast ref={toast} />
      <ConfirmDialog />

      <h2 className="page-title"><i className="fa-solid fa-file-invoice-dollar" /> Listado de Recibos</h2>

      {tableHeader}

      <DataTable
        value={recibos}
        loading={loading}
        paginator={hasPaginator}
        rows={15}
        rowsPerPageOptions={[15, 25, 50, 100]}
        paginatorRight={totalRegistros}
        footer={tableFooter}
        emptyMessage="No hay recibos para los filtros seleccionados"
        size="small"
        stripedRows
        removableSort
        expandedRows={expandedRows}
        onRowToggle={onRowToggle}
        rowExpansionTemplate={rowExpansionTemplate}
        dataKey="_id"
      >
        <Column expander style={{ width: '3rem' }} />
        <Column field="legajo" header="Legajo" sortable style={{ width: '80px' }} />
        <Column body={nombreTemplate} header="Apellido y Nombre" sortField="apellido" sortable />
        <Column field="periodo" header="Período" sortable style={{ width: '110px' }} />
        <Column body={fechaTemplate} header="Fecha" sortField="fecha_recibo" sortable style={{ width: '100px' }} />
        <Column body={r => money(r.remunerativo)} header="Remunerativo" style={{ width: '120px' }} />
        <Column body={r => money(r.no_remunerativo)} header="No Remunerativo" style={{ width: '130px' }} />
        <Column body={r => money(r.descuento)} header="Descuento" style={{ width: '110px' }} />
        <Column body={r => money(r.sueldo_neto)} header="Sueldo Neto" style={{ width: '120px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '90px', textAlign: 'center' }} />
      </DataTable>
    </div>
  );
}
