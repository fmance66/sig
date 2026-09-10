import { useState, useEffect, useRef } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import * as api from '../../api/ivaInformes';
import * as periodosApi from '../../api/ivaPeriodos';
import { useEmpresa } from '../../context/EmpresaContext';
import BotonVolver from '../../components/BotonVolver';
import './iva.css';

const money = v => '$' + (v === null || v === undefined ? '0,00' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export default function InformeDeclaracionJuradaIvaPage() {
  const { empresa } = useEmpresa();
  const [periodos, setPeriodos] = useState([]);
  const [periodo, setPeriodo] = useState(null);
  const [data, setData] = useState(null);
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

  useEffect(() => { if (periodo) buscar(); }, [periodo]);

  async function buscar() {
    if (!periodo) { setData(null); return; }
    setLoading(true);
    try {
      const res = await api.getDdjjIva({ empresa: empresa.id, periodo });
      setData(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo obtener la Declaración Jurada de IVA' });
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const periodoOptions = periodos.map(p => ({ label: p.periodo, value: p.periodo }));

  // Nombres de campo defensivos: el backend los describe como "descriptivos"
  // sin fijar el nombre exacto (ver contrato) — se prueban alias razonables.
  const debito = data?.total_debito_fiscal ?? data?.debito_fiscal ?? data?.debitoFiscal ?? 0;
  const credito = data?.total_credito_fiscal ?? data?.credito_fiscal ?? data?.creditoFiscal ?? 0;
  const saldo = data?.saldo_tecnico ?? data?.saldoTecnico ?? (debito - credito);

  return (
    <div className="page-iva">
      <Toast ref={toast} />

      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-file-contract" /> Declaración Jurada IVA</h2>
      </div>

      <div className="filtros-toolbar">
        <div className="form-field">
          <label>Período</label>
          <Dropdown value={periodo} options={periodoOptions} onChange={e => setPeriodo(e.value)} style={{ width: '150px' }} />
        </div>
        <Button label="Buscar" icon="fa-solid fa-magnifying-glass" size="small" onClick={buscar} loading={loading} />
      </div>

      {!data && !loading && (
        <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>
          {periodo ? 'No hay datos para el período seleccionado.' : 'Elegí un período.'}
        </p>
      )}

      {data && (
        <div className="ddjj-grid">
          <div className="ddjj-card">
            <div className="ddjj-card-label">Débito Fiscal (Ventas)</div>
            <div className="ddjj-card-value">{money(debito)}</div>
          </div>
          <div className="ddjj-card">
            <div className="ddjj-card-label">Crédito Fiscal (Compras)</div>
            <div className="ddjj-card-value">{money(credito)}</div>
          </div>
          <div className="ddjj-card ddjj-card--saldo">
            <div className="ddjj-card-label">Saldo Técnico</div>
            <div className="ddjj-card-value">{money(saldo)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
