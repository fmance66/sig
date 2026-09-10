import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import BuscadorTabla from '../../components/BuscadorTabla';
import * as api from '../../api/ivaComprobantes';
import * as periodosApi from '../../api/ivaPeriodos';
import * as personasApi from '../../api/ivaPersonas';
import * as condicionesVentaApi from '../../api/ivaCondicionesVenta';
import { useEmpresa } from '../../context/EmpresaContext';
import BotonVolver from '../../components/BotonVolver';
import ComprobanteDialog from './ComprobanteDialog';
import './iva.css';

const money = v => v === null || v === undefined ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const EMPTY_FILTRO = { periodo: null, persona: null, provincia: '', rubro: '', condicionVenta: null };

// Compartido por "Listado de Comprobantes de Compra" (modulo COMPRA) y
// "Listado de Comprobantes de Venta" (modulo VENTA). `autoOpen` es usado por
// los ítems de menú "Comprobante de Compra/Venta" (alta directa): en vez de
// una pantalla propia, abren este listado con el modal de alta ya disparado.
export default function ListadoComprobantesIvaPage({ modulo, autoOpen = false }) {
  const { empresa } = useEmpresa();
  const etiqueta = modulo === 'VENTA' ? 'venta' : 'compra';
  const etiquetaTitulo = modulo === 'VENTA' ? 'Comprobantes de Venta' : 'Comprobantes de Compra';

  const [filtro, setFiltro] = useState(EMPTY_FILTRO);
  const [comprobantes, setComprobantes] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [condicionesVenta, setCondicionesVenta] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [visibleCount, setVisibleCount] = useState(0);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [comprobanteRef, setComprobanteRef] = useState(null);
  const toast = useRef(null);
  const autoOpenDone = useRef(false);

  useEffect(() => {
    if (!empresa) return;
    periodosApi.getPeriodos(empresa.id).then(res => setPeriodos(res.data.resultado)).catch(() => setPeriodos([]));
    personasApi.getPersonas(modulo, empresa.id).then(res => setPersonas(res.data.resultado)).catch(() => setPersonas([]));
    condicionesVentaApi.getCondicionesVenta(empresa.id).then(res => setCondicionesVenta(res.data.resultado)).catch(() => setCondicionesVenta([]));
    buscar(EMPTY_FILTRO);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresa?.id, modulo]);

  useEffect(() => {
    if (autoOpen && !autoOpenDone.current) {
      autoOpenDone.current = true;
      openNew();
    }
  }, [autoOpen]);

  async function buscar(f = filtro) {
    if (!empresa) return;
    setLoading(true);
    try {
      const res = await api.getComprobantes({
        modulo, empresa: empresa.id, periodo: f.periodo, persona: f.persona,
        provincia: f.provincia || undefined, rubro: f.rubro || undefined, condicionVenta: f.condicionVenta || undefined,
      });
      setComprobantes(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: `No se pudo obtener el listado de ${etiquetaTitulo.toLowerCase()}` });
    } finally {
      setLoading(false);
    }
  }

  function limpiarFiltros() {
    setFiltro(EMPTY_FILTRO);
    buscar(EMPTY_FILTRO);
  }

  function openNew() {
    setComprobanteRef(null);
    setDialogVisible(true);
  }

  function openEdit(row) {
    setComprobanteRef(row);
    setDialogVisible(true);
  }

  function handleClose() {
    setDialogVisible(false);
    buscar();
  }

  const fechaTemplate = row => row.fecha ? new Date(row.fecha).toLocaleDateString('es-AR') : '—';

  const comprobanteTemplate = row => `${row.letra ?? ''}${row.punto ? ' ' + row.punto : ''} - ${row.comprobante}`;

  const tableHeader = (
    <div className="table-toolbar my-2">
      <BuscadorTabla value={globalFilter} onChange={setGlobalFilter} placeholder="Buscar por razón social o número..." />
      <Button label={`Nuevo comprobante de ${etiqueta}`} icon="fa-solid fa-plus" size="small" onClick={openNew} />
    </div>
  );

  const hasPaginator = comprobantes.length > 15;
  const totalRegistros = <span className="total-registros">Total: {visibleCount} registros</span>;

  const periodoOptions = periodos.map(p => ({ label: p.periodo, value: p.periodo }));
  const personaOptions = personas.map(p => ({ label: `${p.id} — ${p.razon_social}`, value: p.id }));
  const condicionVentaOptions = condicionesVenta.map(c => ({ label: c.descripcion, value: c.id }));

  return (
    <div className="page-iva">
      <Toast ref={toast} />

      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-list" /> Listado de {etiquetaTitulo}</h2>
      </div>

      <div className="filtros-toolbar">
        <div className="form-field">
          <label>Período</label>
          <Dropdown value={filtro.periodo} options={periodoOptions} onChange={e => setFiltro(p => ({ ...p, periodo: e.value }))} showClear style={{ width: '150px' }} />
        </div>
        <div className="form-field">
          <label>Persona</label>
          <Dropdown value={filtro.persona} options={personaOptions} onChange={e => setFiltro(p => ({ ...p, persona: e.value }))} filter showClear style={{ width: '220px' }} />
        </div>
        <div className="form-field">
          <label>Provincia</label>
          <InputText value={filtro.provincia} onChange={e => setFiltro(p => ({ ...p, provincia: e.target.value }))} />
        </div>
        <div className="form-field">
          <label>Rubro</label>
          <InputText value={filtro.rubro} onChange={e => setFiltro(p => ({ ...p, rubro: e.target.value }))} />
        </div>
        <div className="form-field">
          <label>Condición</label>
          <Dropdown value={filtro.condicionVenta} options={condicionVentaOptions} onChange={e => setFiltro(p => ({ ...p, condicionVenta: e.value }))} showClear style={{ width: '180px' }} />
        </div>
        <Button label="Buscar" icon="fa-solid fa-magnifying-glass" size="small" onClick={() => buscar()} loading={loading} />
        <Button label="Limpiar" icon="fa-solid fa-eraser" size="small" className="p-button-outlined" onClick={limpiarFiltros} />
      </div>

      <DataTable
        value={comprobantes}
        loading={loading}
        size="small"
        stripedRows
        paginator={hasPaginator}
        rows={15}
        rowsPerPageOptions={[15, 25, 50]}
        paginatorRight={totalRegistros}
        globalFilter={globalFilter}
        globalFilterFields={['razon_social', 'comprobante']}
        onValueChange={(data) => setVisibleCount(data.length)}
        header={tableHeader}
        emptyMessage={`No hay ${etiquetaTitulo.toLowerCase()} para los filtros seleccionados`}
        onRowClick={e => openEdit(e.data)}
        rowHover
        className="comprobantes-tabla"
      >
        <Column field="razon_social" header="Razón Social" sortable />
        <Column field="tipo_descripcion" header="Tipo" body={row => row.tipo_descripcion ?? row.tipo} style={{ width: '160px' }} />
        <Column body={comprobanteTemplate} header="Comprobante" style={{ width: '140px' }} />
        <Column body={fechaTemplate} header="Fecha" style={{ width: '110px' }} />
        <Column body={r => money(r.neto)} header="Neto" style={{ width: '120px' }} />
        <Column body={r => money(r.iva)} header="IVA" style={{ width: '120px' }} />
        <Column body={r => money(r.total)} header="Total" style={{ width: '120px' }} />
      </DataTable>

      <ComprobanteDialog
        visible={dialogVisible}
        onHide={handleClose}
        empresa={empresa?.id}
        modulo={modulo}
        comprobanteRef={comprobanteRef}
        toast={toast}
      />
    </div>
  );
}
