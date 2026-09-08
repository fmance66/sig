import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { TabView, TabPanel } from 'primereact/tabview';
import { Toast } from 'primereact/toast';
import * as api from '../../../api/liquidaciones';
import { getConceptos } from '../../../api/conceptos';
import FiltroTexto from './FiltroTexto';
import PeriodoSelect from '../../../components/PeriodoSelect';
import BotonVolver from '../../../components/BotonVolver';
import { useEmpresa } from '../../../context/EmpresaContext';
import './liquidaciones.css';

const money = v => v === null || v === undefined ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const EMPTY_FILTRO = { periodo: '', legajo: '', convenio: '', categoria: '', grupo: '', estado: '' };

export default function RecibosRecalculadosPage() {
  const navigate = useNavigate();
  const { empresa } = useEmpresa();
  const [filtro, setFiltro] = useState(EMPTY_FILTRO);
  const [recibos, setRecibos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recalculando, setRecalculando] = useState(false);
  const toast = useRef(null);

  const [conceptosCatalogo, setConceptosCatalogo] = useState([]);
  const [conceptoForm, setConceptoForm] = useState({ concepto: null, unidad_manual: '', importe_manual: '' });
  const [aplicando, setAplicando] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => { if (empresa) buscar(); }, [empresa?.id]);

  function handleFiltroChange(e) {
    const { name, value } = e.target;
    setFiltro(prev => ({ ...prev, [name]: value }));
  }

  async function buscar(f = filtro) {
    setLoading(true);
    try {
      const res = await api.getRecibosRecalculados({ ...f, empresa: empresa?.id });
      setRecibos(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron obtener los recibos' });
    } finally {
      setLoading(false);
    }
  }

  function limpiarFiltros() {
    setFiltro(EMPTY_FILTRO);
    buscar(EMPTY_FILTRO);
  }

  async function handleRecalcularLote() {
    setRecalculando(true);
    try {
      const res = await api.recalcularRecibosLote({ ...filtro, empresa: empresa?.id });
      toast.current.show({ severity: 'success', summary: 'OK', detail: `${res.data.registros} recibo(s) recalculado(s)` });
      buscar();
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo recalcular' });
    } finally {
      setRecalculando(false);
    }
  }

  function onTabChange(e) {
    setActiveTab(e.index);
    if (e.index === 1) {
      getConceptos(empresa?.id).then(res => setConceptosCatalogo(res.data.resultado)).catch(() => {});
    }
  }

  async function handleAplicarConcepto() {
    if (!conceptoForm.concepto) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Elegí un concepto' });
      return;
    }
    setAplicando(true);
    try {
      const res = await api.adicionarConceptoLote({ filtro: { ...filtro, empresa: empresa?.id }, ...conceptoForm });
      toast.current.show({ severity: 'success', summary: 'OK', detail: res.data.mensaje });
      setConceptoForm({ concepto: null, unidad_manual: '', importe_manual: '' });
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'No se pudo adicionar el concepto';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setAplicando(false);
    }
  }

  const conceptoOptions = conceptosCatalogo.map(c => ({ label: `${c.id} — ${c.descripcion}`, value: c.id }));

  const filtrosForm = (
    <div className="filtros-toolbar">
      <div className="form-field">
        <label>Período</label>
        <PeriodoSelect value={filtro.periodo} onChange={e => setFiltro(prev => ({ ...prev, periodo: e.value || '' }))} empresa={empresa?.id} placeholder="" style={{ width: '220px' }} />
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
  );

  const accionesTemplate = (row) => (
    <Button icon="fa-solid fa-arrow-up-right-from-square" className="p-button-text p-button-sm" tooltip="Abrir recibo" tooltipOptions={{ position: 'top' }}
      onClick={() => navigate(`/sueldos/liquidaciones/recibo/${encodeURIComponent(row.periodo)}/${row.empleado}/${row.numero}`)} />
  );

  return (
    <div className="page-liquidaciones page-recibos-recalculados">
      <Toast ref={toast} />
      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-rotate" /> Recibos Recalculados</h2>
      </div>
      <TabView className="conceptos-tabs" activeIndex={activeTab} onTabChange={onTabChange}>
        <TabPanel header="Filtros de Recibo">
          {filtrosForm}
          <div className="candidatos-actions" style={{ justifyContent: 'flex-end' }}>
            <Button label="Recalcular" icon="fa-solid fa-rotate" size="small" onClick={handleRecalcularLote} loading={recalculando} disabled={!recibos.length} />
          </div>
          <DataTable value={recibos} loading={loading} size="small" stripedRows paginator={recibos.length > 15} rows={15}
            paginatorRight={<span className="total-registros">Total: {recibos.length} registros</span>}
            footer={recibos.length > 0 && recibos.length <= 15
              ? <div className="table-footer-right"><span className="total-registros">Total: {recibos.length} registros</span></div>
              : null}
            emptyMessage="No hay recibos para los filtros seleccionados">
            <Column field="legajo" header="Legajo" style={{ width: '90px' }} />
            <Column body={r => `${r.apellido ?? ''}${r.apellido && r.nombre ? ', ' : ''}${r.nombre ?? ''}`} header="Apellido y Nombre" />
            <Column field="periodo" header="Período" style={{ width: '110px' }} />
            <Column body={r => r.fecha_recibo ? new Date(r.fecha_recibo).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'} header="Fecha" style={{ width: '100px' }} />
            <Column body={r => money(r.sueldo_neto)} header="Sueldo Neto" style={{ width: '120px' }} />
            <Column body={r => money(r.sueldo_bruto)} header="Sueldo Bruto" style={{ width: '120px' }} />
            <Column body={accionesTemplate} header="" style={{ width: '60px', textAlign: 'center' }} />
          </DataTable>
        </TabPanel>

        <TabPanel header="Adicionar Concepto">
          {filtrosForm}
          <p className="conceptos-subtitle">Se agrega (o actualiza) el concepto elegido en todos los recibos que matcheen el filtro de arriba, y se recalculan.</p>
          <div className="concepto-add-form">
            <div className="form-field">
              <label>Concepto</label>
              <Dropdown value={conceptoForm.concepto} options={conceptoOptions} filter showClear
                onChange={e => setConceptoForm(p => ({ ...p, concepto: e.value }))} placeholder="Seleccionar" style={{ width: '280px' }}
                panelClassName="liquidaciones-dropdown-panel" />
            </div>
            <div className="form-field">
              <label>Unidad</label>
              <InputText value={conceptoForm.unidad_manual} type="number"
                onChange={e => setConceptoForm(p => ({ ...p, unidad_manual: e.target.value }))} />
            </div>
            <div className="form-field">
              <label>Importe</label>
              <InputText value={conceptoForm.importe_manual} type="number"
                onChange={e => setConceptoForm(p => ({ ...p, importe_manual: e.target.value }))} />
            </div>
            <Button label="Aplicar" icon="fa-solid fa-check" size="small" onClick={handleAplicarConcepto} loading={aplicando} />
          </div>
        </TabPanel>
      </TabView>
    </div>
  );
}
