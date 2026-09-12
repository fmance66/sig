import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import * as api from '../../api/ivaInformes';
import * as periodosApi from '../../api/ivaPeriodos';
import { useEmpresa } from '../../context/EmpresaContext';
import BotonVolver from '../../components/BotonVolver';
import './iva.css';

const MODULO_OPTIONS = [
  { label: 'Compra', value: 'COMPRA' },
  { label: 'Venta', value: 'VENTA' },
];

const money = v => v === null || v === undefined ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const cantidad = v => v === null || v === undefined ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 4 });

export default function InformeItemsPorComprobantePage() {
  const { empresa } = useEmpresa();
  const [periodos, setPeriodos] = useState([]);
  const [modulo, setModulo] = useState('COMPRA');
  const [periodo, setPeriodo] = useState(null);
  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useRef(null);

  useEffect(() => {
    if (!empresa) return;
    periodosApi.getPeriodos(empresa.id).then(res => {
      const lista = res.data.resultado;
      setPeriodos(lista);
      const activo = lista.find(p => p.estado === 'ACTIVA') || lista[0] || null;
      setPeriodo(activo ? activo.periodo : null);
    }).catch(() => setPeriodos([]));
  }, [empresa?.id]);

  useEffect(() => { if (periodo) buscar(); }, [periodo, modulo]);

  async function buscar() {
    if (!periodo) { setFilas([]); return; }
    setLoading(true);
    try {
      const res = await api.getItemsPorComprobanteIva({ modulo, empresa: empresa.id, periodo });
      setFilas(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo obtener el Informe de Ítems por Comprobante' });
    } finally {
      setLoading(false);
    }
  }

  const fechaTemplate = row => row.fecha ? new Date(row.fecha).toLocaleDateString('es-AR') : '—';
  const periodoOptions = periodos.map(p => ({ label: p.periodo, value: p.periodo }));

  return (
    <div className="page-iva">
      <Toast ref={toast} />

      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-list-check" /> Informe de Ítems por Comprobante</h2>
      </div>

      <div className="filtros-toolbar">
        <div className="form-field">
          <label>Módulo</label>
          <Dropdown value={modulo} options={MODULO_OPTIONS} onChange={e => setModulo(e.value)} style={{ width: '150px' }} />
        </div>
        <div className="form-field">
          <label>Período</label>
          <Dropdown value={periodo} options={periodoOptions} onChange={e => setPeriodo(e.value)} style={{ width: '150px' }} />
        </div>
        <Button label="Buscar" icon="fa-solid fa-magnifying-glass" size="small" onClick={buscar} loading={loading} />
      </div>

      <DataTable
        value={filas}
        loading={loading}
        size="small"
        stripedRows
        paginator={filas.length > 20}
        rows={20}
        paginatorRight={<span className="total-registros">Total: {filas.length} registros</span>}
        emptyMessage={periodo ? 'No hay ítems para el período seleccionado' : 'Elegí un período'}
      >
        <Column body={fechaTemplate} header="Fecha" style={{ width: '110px' }} />
        <Column field="tipo_descripcion" header="Tipo" style={{ width: '130px' }} />
        <Column field="comprobante" header="Comprobante" style={{ width: '130px' }} />
        <Column field="item_descripcion" header="Ítem" />
        <Column field="unidad" header="Unidad" style={{ width: '90px' }} />
        <Column body={r => cantidad(r.cantidad)} header="Cantidad" style={{ width: '100px' }} />
        <Column body={r => money(r.precio)} header="Precio" style={{ width: '110px' }} />
        <Column body={r => r.alicuota != null ? `${r.alicuota}%` : '—'} header="Alícuota" style={{ width: '90px' }} />
        <Column body={r => money(r.importe)} header="Importe" style={{ width: '120px' }} />
        <Column body={r => money(r.iva)} header="IVA" style={{ width: '110px' }} />
      </DataTable>
    </div>
  );
}
