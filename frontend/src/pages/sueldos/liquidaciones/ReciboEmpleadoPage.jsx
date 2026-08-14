import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Checkbox } from 'primereact/checkbox';
import { TabView, TabPanel } from 'primereact/tabview';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import * as api from '../../../api/liquidaciones';
import { getConceptos } from '../../../api/conceptos';
import { getEmpleados } from '../../../api/empleados';
import { toDate, toIsoDate } from '../../../utils/dates';
import NovedadesTab from '../NovedadesTab';
import './liquidaciones.css';

const money = v => v === null || v === undefined ? '0,00' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMPTY_HEADER = {
  periodo_recibo: '', fecha_recibo: null, fecha_pago: null, moneda: '', cotizacion: '',
  proyecto: '', orden: '', mail: false, visible: true, observaciones: '',
};

const EMPTY_ADD = { concepto: null, unidad_manual: '', importe_manual: '' };

export default function ReciboEmpleadoPage() {
  const { periodo, empleado, numero } = useParams();
  const navigate = useNavigate();
  const isNew = !periodo;

  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [header, setHeader] = useState(EMPTY_HEADER);
  const [saving, setSaving] = useState(false);
  const [recalculando, setRecalculando] = useState(false);
  const [conceptosCatalogo, setConceptosCatalogo] = useState([]);
  const [addForm, setAddForm] = useState(EMPTY_ADD);
  const [adding, setAdding] = useState(false);

  const [liquidaciones, setLiquidaciones] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [nuevoPeriodo, setNuevoPeriodo] = useState(null);
  const [nuevoEmpleado, setNuevoEmpleado] = useState(null);
  const [creando, setCreando] = useState(false);

  const toast = useRef(null);

  const load = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const res = await api.getRecibo(periodo, empleado, numero);
      const b = res.data.resultado;
      setBundle(b);
      setHeader({
        periodo_recibo: b.recibo.periodo_recibo ?? '',
        fecha_recibo: toDate(b.recibo.fecha_recibo),
        fecha_pago: toDate(b.recibo.fecha_pago),
        moneda: b.recibo.moneda ?? '',
        cotizacion: b.recibo.cotizacion ?? '',
        proyecto: b.recibo.proyecto ?? '',
        orden: b.recibo.orden ?? '',
        mail: b.recibo.mail ?? false,
        visible: b.recibo.visible ?? true,
        observaciones: b.recibo.observaciones ?? '',
      });
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el recibo' });
    } finally {
      setLoading(false);
    }
  }, [isNew, periodo, empleado, numero]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getConceptos().then(res => setConceptosCatalogo(res.data.resultado)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isNew) return;
    api.getLiquidaciones().then(res => setLiquidaciones(res.data.resultado)).catch(() => {});
    getEmpleados(undefined, 'activo').then(res => setEmpleados(res.data.resultado)).catch(() => {});
  }, [isNew]);

  async function handleCrear() {
    if (!nuevoPeriodo || !nuevoEmpleado) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Elegí un período y un empleado' });
      return;
    }
    setCreando(true);
    try {
      const res = await api.createRecibo({ periodo: nuevoPeriodo, empleado: nuevoEmpleado });
      const r = res.data.resultado;
      navigate(`/sueldos/liquidaciones/recibo/${encodeURIComponent(r.periodo)}/${r.empleado}/${r.numero}`, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'No se pudo crear el recibo';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setCreando(false);
    }
  }

  function handleHeaderChange(e) {
    const { name, value } = e.target;
    setHeader(prev => ({ ...prev, [name]: value }));
  }

  async function handleGuardar() {
    setSaving(true);
    try {
      const payload = {
        ...header,
        fecha_recibo: toIsoDate(header.fecha_recibo),
        fecha_pago: toIsoDate(header.fecha_pago),
      };
      await api.updateRecibo(periodo, empleado, numero, payload);
      toast.current.show({ severity: 'success', summary: 'OK', detail: 'Recibo actualizado' });
      load();
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al guardar';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setSaving(false);
    }
  }

  async function handleRecalcular() {
    setRecalculando(true);
    try {
      await api.recalcularRecibo(periodo, empleado, numero);
      toast.current.show({ severity: 'success', summary: 'OK', detail: 'Recibo recalculado' });
      load();
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo recalcular' });
    } finally {
      setRecalculando(false);
    }
  }

  async function handleAgregarConcepto() {
    if (!addForm.concepto) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Elegí un concepto' });
      return;
    }
    setAdding(true);
    try {
      await api.addConceptoRecibo(periodo, empleado, numero, addForm);
      await api.recalcularRecibo(periodo, empleado, numero);
      setAddForm(EMPTY_ADD);
      toast.current.show({ severity: 'success', summary: 'OK', detail: 'Concepto agregado' });
      load();
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'No se pudo agregar el concepto';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setAdding(false);
    }
  }

  function handleEliminarConcepto(row) {
    confirmDialog({
      message: `¿Eliminar el concepto "${row.concepto_desc || row.concepto}" del recibo?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteConceptoRecibo(periodo, empleado, numero, row.concepto);
          await api.recalcularRecibo(periodo, empleado, numero);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Concepto eliminado' });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
        }
      },
    });
  }

  const estadoConceptoTemplate = (row) => {
    if (row.error) return <i className="fa-solid fa-circle-xmark error-icon" title={row.message} />;
    if (row.warning) return <i className="fa-solid fa-triangle-exclamation warning-icon" title={row.message} />;
    if (!row.condicion) return <i className="fa-solid fa-minus" style={{ color: '#9ca3af' }} title="No cumple la condición" />;
    return <i className="fa-solid fa-circle-check ok-icon" />;
  };

  const accionesConceptoTemplate = (row) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar" tooltipOptions={{ position: 'top' }} onClick={() => handleEliminarConcepto(row)} />
    </div>
  );

  const conceptoOptions = conceptosCatalogo.map(c => ({ label: `${c.id} — ${c.descripcion}`, value: c.id }));
  const empleadoOptions = empleados.map(e => ({ label: `${e.legajo} — ${e.apellido}, ${e.nombre}`, value: e.id }));
  const periodoOptions = liquidaciones.map(l => ({ label: `${l.periodo} — ${l.descripcion || ''}`, value: l.periodo }));

  if (isNew) {
    return (
      <div className="page-liquidaciones">
        <Toast ref={toast} />
        <h2 className="page-title"><i className="fa-solid fa-file-invoice-dollar" /> Nuevo Recibo</h2>
        <div className="form-grid recibo-header-form">
          <div className="form-field">
            <label>Período <span className="required">*</span></label>
            <Dropdown value={nuevoPeriodo} options={periodoOptions} onChange={e => setNuevoPeriodo(e.value)} filter showClear placeholder="Seleccionar período" style={{ width: '320px' }} panelClassName="liquidaciones-dropdown-panel" />
          </div>
          <div className="form-field">
            <label>Empleado <span className="required">*</span></label>
            <Dropdown value={nuevoEmpleado} options={empleadoOptions} onChange={e => setNuevoEmpleado(e.value)} filter showClear placeholder="Seleccionar empleado" style={{ width: '320px' }} panelClassName="liquidaciones-dropdown-panel" />
          </div>
        </div>
        <Button label="Crear recibo" icon="fa-solid fa-check" size="small" onClick={handleCrear} loading={creando} className="mt-2" />
      </div>
    );
  }

  if (loading || !bundle) {
    return <div className="page-liquidaciones"><Toast ref={toast} /><p>Cargando recibo...</p></div>;
  }

  const conceptosPrincipales = bundle.conceptos.filter(c => ['REMUNERATIVO', 'NO_REMUNERATIVO', 'DESCUENTO'].includes(c.columna));

  return (
    <div className="page-liquidaciones">
      <Toast ref={toast} />
      <ConfirmDialog />

      <h2 className="page-title">
        <i className="fa-solid fa-file-invoice-dollar" />
        {bundle.recibo.apellido}, {bundle.recibo.nombre} — CCT {bundle.recibo.convenio || 's/convenio'} — {bundle.recibo.tarea}
      </h2>

      <div className="recibo-layout">
        <div>
          <div className="form-grid recibo-header-form">
            <div className="form-field">
              <label>Período</label>
              <InputText value={periodo} disabled />
            </div>
            <div className="form-field">
              <label>Legajo</label>
              <InputText value={bundle.recibo.legajo ?? ''} disabled />
            </div>
            <div className="form-field">
              <label>N° de Recibo</label>
              <InputText value={numero} disabled />
            </div>
            <div className="form-field">
              <label>Descripción del Período</label>
              <InputText name="periodo_recibo" value={header.periodo_recibo} onChange={handleHeaderChange} />
            </div>
            <div className="form-field">
              <label>Fecha del Recibo</label>
              <Calendar value={header.fecha_recibo} onChange={e => setHeader(p => ({ ...p, fecha_recibo: e.value }))} dateFormat="dd/mm/yy" showIcon />
            </div>
            <div className="form-field">
              <label>Fecha de Pago</label>
              <Calendar value={header.fecha_pago} onChange={e => setHeader(p => ({ ...p, fecha_pago: e.value }))} dateFormat="dd/mm/yy" showIcon />
            </div>
            <div className="form-row-12">
              <div className="form-field" style={{ gridColumn: 'span 8' }}>
                <label>Orden</label>
                <InputText name="orden" value={header.orden} onChange={handleHeaderChange} type="number" />
              </div>
              <div className="form-field form-field--checkbox" style={{ gridColumn: 'span 2' }}>
                <Checkbox inputId="visible" checked={header.visible} onChange={e => setHeader(p => ({ ...p, visible: e.checked }))} />
                <label htmlFor="visible">Visible</label>
              </div>
              <div className="form-field form-field--checkbox" style={{ gridColumn: 'span 2' }}>
                <Checkbox inputId="mail" checked={header.mail} onChange={e => setHeader(p => ({ ...p, mail: e.checked }))} />
                <label htmlFor="mail">Enviado por mail</label>
              </div>
            </div>
          </div>
          <div className="dialog-footer-btns" style={{ justifyContent: 'flex-start', gap: '0.6rem' }}>
            <Button label="Guardar" icon="fa-solid fa-check" size="small" onClick={handleGuardar} loading={saving} />
            <Button label="Recalcular" icon="fa-solid fa-rotate" size="small" className="p-button-outlined" onClick={handleRecalcular} loading={recalculando} />
          </div>

          <TabView className="conceptos-tabs mt-3">
            <TabPanel header="Conceptos">
              <div className="concepto-add-form">
                <div className="form-field">
                  <label>Concepto</label>
                  <Dropdown value={addForm.concepto} options={conceptoOptions} filter showClear
                    onChange={e => setAddForm(p => ({ ...p, concepto: e.value }))} placeholder="Seleccionar" style={{ width: '260px' }}
                    panelClassName="liquidaciones-dropdown-panel" />
                </div>
                <div className="form-field">
                  <label>Unidad</label>
                  <InputText value={addForm.unidad_manual} type="number"
                    onChange={e => setAddForm(p => ({ ...p, unidad_manual: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label>Importe</label>
                  <InputText value={addForm.importe_manual} type="number"
                    onChange={e => setAddForm(p => ({ ...p, importe_manual: e.target.value }))} />
                </div>
                <Button label="Agregar" icon="fa-solid fa-plus" size="small" onClick={handleAgregarConcepto} loading={adding} />
              </div>
              <DataTable value={conceptosPrincipales} size="small" stripedRows emptyMessage="No hay conceptos cargados">
                <Column field="concepto" header="Código" style={{ width: '80px' }} />
                <Column field="concepto_desc" header="Concepto" />
                <Column field="columna" header="Columna" style={{ width: '140px' }} />
                <Column field="unidad" header="Unidad" style={{ width: '90px' }} />
                <Column body={c => money(c.importe)} header="Importe" style={{ width: '110px' }} />
                <Column body={estadoConceptoTemplate} header="" style={{ width: '50px', textAlign: 'center' }} />
                <Column body={accionesConceptoTemplate} header="" style={{ width: '60px', textAlign: 'center' }} />
              </DataTable>
            </TabPanel>

            <TabPanel header="Contribuciones">
              <DataTable value={bundle.contribuciones} size="small" stripedRows emptyMessage="Sin contribuciones">
                <Column field="concepto" header="Código" style={{ width: '80px' }} />
                <Column field="concepto_desc" header="Concepto" />
                <Column field="unidad" header="Unidad" style={{ width: '90px' }} />
                <Column body={c => money(c.importe)} header="Importe" style={{ width: '110px' }} />
              </DataTable>
            </TabPanel>

            <TabPanel header="Conceptos Auxiliares">
              <DataTable value={bundle.auxiliares} size="small" stripedRows emptyMessage="Sin conceptos auxiliares">
                <Column field="concepto" header="Código" style={{ width: '80px' }} />
                <Column field="concepto_desc" header="Concepto" />
                <Column field="unidad" header="Unidad" style={{ width: '90px' }} />
                <Column body={c => money(c.importe)} header="Importe" style={{ width: '110px' }} />
              </DataTable>
            </TabPanel>

            <TabPanel header="Novedades">
              <NovedadesTab empleadoId={bundle.recibo.empleado} toast={toast} />
            </TabPanel>

            <TabPanel header="Observaciones">
              <div className="form-grid">
                <div className="form-field form-field--full">
                  <InputTextarea name="observaciones" value={header.observaciones} onChange={handleHeaderChange} rows={10} autoResize={false} />
                </div>
              </div>
            </TabPanel>
          </TabView>
        </div>

        <div className="recibo-totales">
          <div className="total-row"><span>Total Remunerativo</span><span>{money(bundle.recibo.remunerativo)}</span></div>
          <div className="total-row"><span>Total No Remunerativo</span><span>{money(bundle.recibo.no_remunerativo)}</span></div>
          <div className="total-row total-row--main"><span>Sueldo Bruto</span><span>{money(bundle.recibo.sueldo_bruto)}</span></div>
          <div className="total-row"><span>Total Descuento</span><span>{money(bundle.recibo.descuento)}</span></div>
          <div className="total-row total-row--main"><span>Sueldo Neto</span><span>{money(bundle.recibo.sueldo_neto)}</span></div>
          <div className="total-row"><span>Total Contribuciones</span><span>{money(bundle.recibo.contribucion)}</span></div>
          <div className="total-row total-row--main"><span>Costo Laboral</span><span>{money(bundle.recibo.costo_laboral)}</span></div>
        </div>
      </div>
    </div>
  );
}
