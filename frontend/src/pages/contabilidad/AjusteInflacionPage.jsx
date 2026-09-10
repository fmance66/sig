import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { TabView, TabPanel } from 'primereact/tabview';
import { Toast } from 'primereact/toast';
import * as ejerciciosApi from '../../api/ejercicios';
import * as cuentasApi from '../../api/cuentas';
import { previewAjusteInflacion, generarAjusteInflacion } from '../../api/ajusteInflacion';
import { useEmpresa } from '../../context/EmpresaContext';
import { toDate, toIsoDate } from '../../utils/dates';
import BotonVolver from '../../components/BotonVolver';
import './contabilidad.css';

const money = v => v === null || v === undefined ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TIPO_OPTIONS = [
  { label: 'Manual', value: 'MANUAL' },
  { label: 'Apertura', value: 'APERTURA' },
  { label: 'Operativo', value: 'OPERATIVO' },
  { label: 'Ajuste', value: 'AJUSTE' },
  { label: 'Regularización', value: 'REGULARIZACION' },
  { label: 'Cierre', value: 'CIERRE' },
];

// Método directo (RT 6/17), granularidad mensual — ver el detalle del cálculo
// y por qué cnt_coeficiente no se pisa en backend/src/models/ajusteInflacion.js.
export default function AjusteInflacionPage() {
  const { empresa } = useEmpresa();
  const [ejercicios, setEjercicios] = useState([]);
  const [ejercicio, setEjercicio] = useState(null);
  const [cuentas, setCuentas] = useState([]);
  const [activeTab, setActiveTab] = useState(0);

  const [fechaCierre, setFechaCierre] = useState(null);
  const [fechaDesde, setFechaDesde] = useState(null);
  const [fechaHasta, setFechaHasta] = useState(null);
  const [tiposExcluir, setTiposExcluir] = useState(['AJUSTE']);
  const [cuentasSeleccionadas, setCuentasSeleccionadas] = useState(null); // null = default del backend (no monetarias imputables)

  const [fechaAsiento, setFechaAsiento] = useState(null);
  const [leyenda, setLeyenda] = useState('Ajuste por inflación');
  const [cuentaContrapartida, setCuentaContrapartida] = useState(null);

  const [resultado, setResultado] = useState(null);
  const [calculando, setCalculando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const toast = useRef(null);

  useEffect(() => {
    if (!empresa) return;
    cuentasApi.getCuentas(empresa.id).then(res => setCuentas(res.data.resultado)).catch(() => setCuentas([]));
    ejerciciosApi.getEjercicios(empresa.id).then(res => {
      const lista = res.data.resultado;
      setEjercicios(lista);
      const masReciente = [...lista].sort((a, b) => new Date(b.fecha_desde || 0) - new Date(a.fecha_desde || 0))[0];
      const activo = lista.find(e => e.estado === 'ACTIVO') || masReciente || null;
      setEjercicio(activo ? activo.id : null);
    }).catch(() => setEjercicios([]));
  }, [empresa?.id]);

  useEffect(() => {
    const ej = ejercicios.find(e => e.id === ejercicio);
    if (!ej) return;
    setFechaDesde(toDate(ej.fecha_desde));
    setFechaHasta(toDate(ej.fecha_hasta));
    setFechaCierre(toDate(ej.fecha_hasta));
    setFechaAsiento(toDate(ej.fecha_hasta));
    setResultado(null);
  }, [ejercicio]);

  const cuentasNoMonetarias = cuentas.filter(c => c.imputable && !c.monetaria);
  const cuentaOptions = cuentas.filter(c => c.imputable).map(c => ({ label: `${c.id} - ${c.descripcion ?? ''}`, value: c.id }));

  function filtrosActuales() {
    return {
      fechaCierre: toIsoDate(fechaCierre),
      fechaDesde: toIsoDate(fechaDesde),
      fechaHasta: toIsoDate(fechaHasta),
      tiposExcluir,
      cuentas: cuentasSeleccionadas ?? undefined,
    };
  }

  async function calcular() {
    if (!ejercicio) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Elegí un ejercicio' });
      return;
    }
    if (!fechaCierre) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'La fecha de cierre es requerida' });
      return;
    }
    setCalculando(true);
    setResultado(null);
    try {
      const res = await previewAjusteInflacion({ empresa: empresa.id, ejercicio, ...filtrosActuales() });
      setResultado(res.data.resultado);
    } catch (err) {
      toast.current.show({ severity: 'error', summary: 'Error', detail: err.response?.data?.mensaje || 'No se pudo calcular el ajuste' });
    } finally {
      setCalculando(false);
    }
  }

  async function generar() {
    if (!cuentaContrapartida) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Elegí la cuenta de contrapartida (RECPAM)' });
      return;
    }
    if (!fechaAsiento) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'La fecha del asiento es requerida' });
      return;
    }
    setGenerando(true);
    try {
      const res = await generarAjusteInflacion({
        empresa: empresa.id, ejercicio, ...filtrosActuales(),
        cuentaContrapartida, fecha: toIsoDate(fechaAsiento), leyenda,
      });
      toast.current.show({ severity: 'success', summary: 'OK', detail: `Asiento N° ${res.data.resultado.asiento.numero} generado` });
      setResultado(null);
    } catch (err) {
      toast.current.show({ severity: 'error', summary: 'Error', detail: err.response?.data?.mensaje || 'No se pudo generar el asiento' });
    } finally {
      setGenerando(false);
    }
  }

  const ejercicioOptions = [...ejercicios]
    .sort((a, b) => new Date(b.fecha_desde || 0) - new Date(a.fecha_desde || 0))
    .map(e => ({ label: `${e.id} - ${e.descripcion ?? ''}`, value: e.id }));

  const ej = ejercicios.find(e => e.id === ejercicio);
  const hayFaltantes = resultado?.periodosFaltantes?.length > 0;
  const puedeGenerar = resultado && !hayFaltantes && resultado.filas.length > 0;

  return (
    <div className="page-contabilidad">
      <Toast ref={toast} />

      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-arrow-trend-up" /> Ajuste por Inflación</h2>
      </div>

      <div className="filtros-toolbar">
        <div className="form-field">
          <label>Ejercicio</label>
          <Dropdown value={ejercicio} options={ejercicioOptions} onChange={e => setEjercicio(e.value)} style={{ width: '220px' }} />
        </div>
        <div className="form-field">
          <label>Fecha de Cierre <span className="required">*</span></label>
          <Calendar value={fechaCierre} onChange={e => setFechaCierre(e.value)} dateFormat="dd/mm/yy"
            minDate={toDate(ej?.fecha_desde)} maxDate={toDate(ej?.fecha_hasta)} showIcon />
        </div>
      </div>

      <TabView activeIndex={activeTab} onTabChange={e => setActiveTab(e.index)}>
        <TabPanel header="Filtros de Asiento">
          <div className="form-grid">
            <div className="form-field">
              <label>Fecha Desde</label>
              <Calendar value={fechaDesde} onChange={e => setFechaDesde(e.value)} dateFormat="dd/mm/yy" showIcon />
            </div>
            <div className="form-field">
              <label>Fecha Hasta</label>
              <Calendar value={fechaHasta} onChange={e => setFechaHasta(e.value)} dateFormat="dd/mm/yy" showIcon />
            </div>
            <div className="form-field form-field--full">
              <label>Excluir asientos de tipo</label>
              <MultiSelect value={tiposExcluir} options={TIPO_OPTIONS} onChange={e => setTiposExcluir(e.value)}
                display="chip" placeholder="Ninguno" />
            </div>
          </div>
        </TabPanel>
        <TabPanel header="Filtros de Cuenta">
          <div className="form-grid">
            <div className="form-field form-field--full">
              <label>Cuentas a reexpresar</label>
              <MultiSelect value={cuentasSeleccionadas ?? cuentasNoMonetarias.map(c => c.id)} options={cuentaOptions}
                onChange={e => setCuentasSeleccionadas(e.value)} filter display="chip"
                placeholder="Por defecto: cuentas no monetarias imputables" />
            </div>
          </div>
          <p className="tab-empty-msg" style={{ textAlign: 'left' }}>
            <i className="fa-solid fa-circle-info" /> Por defecto se incluyen todas las cuentas imputables no monetarias
            (las monetarias no se reexpresan porque ya están en moneda de cierre).
          </p>
        </TabPanel>
      </TabView>

      <div className="table-toolbar my-2">
        <Button label="Calcular vista previa" icon="fa-solid fa-calculator" size="small" onClick={calcular} loading={calculando} disabled={!ejercicio} />
      </div>

      {resultado && (
        <>
          {hayFaltantes && (
            <p className="tab-empty-msg" style={{ color: '#dc2626', textAlign: 'left' }}>
              <i className="fa-solid fa-triangle-exclamation" /> Faltan coeficientes cargados para los períodos: {resultado.periodosFaltantes.join(', ')}.
              Cargalos en Coeficientes antes de generar el asiento.
            </p>
          )}
          <DataTable value={resultado.filas} size="small" stripedRows emptyMessage="Ningún saldo cambia con los filtros elegidos">
            <Column field="cuenta" header="Cuenta" style={{ width: '110px' }} />
            <Column field="descripcion" header="Descripción" />
            <Column body={r => money(r.saldo_historico)} header="Saldo Histórico" style={{ width: '150px' }} />
            <Column body={r => money(r.ajuste)} header="Ajuste" style={{ width: '150px' }} />
            <Column body={r => money(r.saldo_ajustado)} header="Saldo Ajustado" style={{ width: '150px' }} />
          </DataTable>
          <div className="asiento-totales">
            <span>Total ajuste (contrapartida RECPAM): {money(resultado.totalAjuste)}</span>
          </div>

          <h3 className="page-title" style={{ fontSize: '1rem', marginTop: '1.5rem' }}>Generar Asiento de Ajuste</h3>
          <div className="form-grid">
            <div className="form-field">
              <label>Cuenta de Contrapartida (RECPAM) <span className="required">*</span></label>
              <Dropdown value={cuentaContrapartida} options={cuentaOptions} onChange={e => setCuentaContrapartida(e.value)} filter showClear />
            </div>
            <div className="form-field">
              <label>Fecha del Asiento <span className="required">*</span></label>
              <Calendar value={fechaAsiento} onChange={e => setFechaAsiento(e.value)} dateFormat="dd/mm/yy" showIcon />
            </div>
            <div className="form-field form-field--full">
              <label>Leyenda</label>
              <InputText value={leyenda} onChange={e => setLeyenda(e.target.value)} />
            </div>
          </div>
          <div className="dialog-footer-btns mt-2">
            <Button label="Generar Asiento" icon="fa-solid fa-check" onClick={generar} loading={generando} disabled={!puedeGenerar} />
          </div>
        </>
      )}
    </div>
  );
}
