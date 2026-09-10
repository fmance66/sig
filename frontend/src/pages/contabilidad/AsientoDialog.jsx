import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import * as asientosApi from '../../api/asientos';
import * as monedasApi from '../../api/monedas';
import * as proyectosApi from '../../api/proyectos';
import { toDate, toIsoDate } from '../../utils/dates';

const TIPO_OPTIONS = [
  { label: 'Manual', value: 'MANUAL' },
  { label: 'Apertura', value: 'APERTURA' },
  { label: 'Operativo', value: 'OPERATIVO' },
  { label: 'Ajuste', value: 'AJUSTE' },
  { label: 'Regularización', value: 'REGULARIZACION' },
  { label: 'Cierre', value: 'CIERRE' },
];

const money = v => v === null || v === undefined ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMPTY_FORM = { fecha: new Date(), leyenda: '', tipo: 'MANUAL', moneda: null, cotizacion: 1, proyecto: null };
const EMPTY_LINEA = { cuenta: null, debe: null, haber: null, leyenda: '' };

// Modal de alta/edición de un asiento — Ejercicio y Empresa vienen fijos del
// filtro activo de ListadoAsientosPage, no son editables acá.
export default function AsientoDialog({ visible, onHide, onSaved, empresa, ejercicio, asiento, movimientosIniciales, cuentas, toast }) {
  const editMode = !!asiento;
  const [form, setForm] = useState(EMPTY_FORM);
  const [movimientos, setMovimientos] = useState([]);
  const [lineaForm, setLineaForm] = useState(EMPTY_LINEA);
  const [monedas, setMonedas] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLineaForm(EMPTY_LINEA);
    if (asiento) {
      setForm({
        fecha: toDate(asiento.fecha),
        leyenda: asiento.leyenda ?? '',
        tipo: asiento.tipo ?? 'MANUAL',
        moneda: asiento.moneda ?? null,
        cotizacion: asiento.cotizacion ?? 1,
        proyecto: asiento.proyecto ?? null,
      });
      loadMovimientos(asiento.numero);
    } else {
      setForm(EMPTY_FORM);
      setMovimientos(movimientosIniciales ?? []);
    }
    monedasApi.getMonedas().then(res => setMonedas(res.data.resultado)).catch(() => setMonedas([]));
    proyectosApi.getProyectos().then(res => setProyectos(res.data.resultado)).catch(() => setProyectos([]));
  }, [visible, asiento, movimientosIniciales]);

  async function loadMovimientos(numero) {
    setLoadingMovimientos(true);
    try {
      const res = await asientosApi.getMovimientos(ejercicio.id, numero, empresa);
      setMovimientos(res.data.resultado.map(m => ({ cuenta: m.cuenta, debe: m.debe, haber: m.haber, leyenda: m.leyenda ?? '' })));
    } catch {
      setMovimientos([]);
    } finally {
      setLoadingMovimientos(false);
    }
  }

  function handleFieldChange(name, value) {
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function addLinea() {
    if (!lineaForm.cuenta) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Elegí una cuenta' });
      return;
    }
    const debe = Number(lineaForm.debe) || 0;
    const haber = Number(lineaForm.haber) || 0;
    if ((debe > 0) === (haber > 0)) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Cargá un importe en Debe o en Haber, no en ambos' });
      return;
    }
    setMovimientos(prev => [...prev, { cuenta: lineaForm.cuenta, debe, haber, leyenda: lineaForm.leyenda || form.leyenda }]);
    setLineaForm({ ...EMPTY_LINEA, leyenda: form.leyenda });
  }

  function removeLinea(idx) {
    setMovimientos(prev => prev.filter((_, i) => i !== idx));
  }

  // Edición inline de Debe/Haber en la tabla — necesaria para el flujo "Desde
  // modelo", donde las líneas llegan precargadas en 0 y el usuario completa el
  // importe real acá en vez de tener que borrar y recargar desde el sub-form.
  function editarImporte(idx, campo, valor) {
    setMovimientos(prev => prev.map((m, i) => i === idx ? { ...m, [campo]: Number(valor) || 0 } : m));
  }

  const totalDebe = movimientos.reduce((acc, m) => acc + (Number(m.debe) || 0), 0);
  const totalHaber = movimientos.reduce((acc, m) => acc + (Number(m.haber) || 0), 0);
  const balanceado = movimientos.length >= 2 && totalDebe > 0 && Math.round((totalDebe - totalHaber) * 100) === 0;

  async function handleSave() {
    if (!form.fecha) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'La fecha es requerida' });
      return;
    }
    if (!form.leyenda.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'La leyenda es requerida' });
      return;
    }
    if (!balanceado) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El asiento debe tener al menos 2 líneas con Debe y Haber balanceados' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        fecha: toIsoDate(form.fecha),
        leyenda: form.leyenda,
        tipo: form.tipo,
        moneda: form.moneda,
        cotizacion: form.cotizacion,
        proyecto: form.proyecto,
        movimientos: movimientos.map(m => ({ cuenta: m.cuenta, debe: m.debe, haber: m.haber, leyenda: m.leyenda })),
      };
      if (editMode) {
        await asientosApi.updateAsiento(ejercicio.id, asiento.numero, empresa, payload);
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Asiento actualizado' });
      } else {
        await asientosApi.createAsiento({ ejercicio: ejercicio.id, empresa, ...payload });
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Asiento creado' });
      }
      onSaved();
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al guardar';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setSaving(false);
    }
  }

  const cuentaOptions = (cuentas || [])
    .filter(c => c.imputable)
    .map(c => ({ label: `${c.id} - ${c.descripcion ?? ''}`, value: c.id }));
  const monedaOptions = monedas.map(m => ({ label: `${m.id} - ${m.nombre ?? ''}`, value: m.id }));
  const proyectoOptions = proyectos.map(p => ({ label: `${p.id} - ${p.descripcion ?? ''}`, value: p.id }));
  const cuentaDescripcion = id => cuentas.find(c => c.id === id)?.descripcion ?? '';

  const dialogFooter = (
    <div className="dialog-footer-btns mt-2">
      <Button label="Cancelar" icon="fa-solid fa-xmark" className="p-button-text" onClick={onHide} disabled={saving} />
      <Button label="Guardar" icon="fa-solid fa-check" onClick={handleSave} loading={saving} disabled={!balanceado} />
    </div>
  );

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={editMode ? `Modificar asiento N° ${asiento?.numero}` : 'Agregar asiento'}
      footer={dialogFooter}
      style={{ width: '900px' }}
      modal
      draggable={false}
      resizable={false}
    >
      <div className="form-grid">
        <div className="form-field">
          <label>Ejercicio</label>
          <InputText value={ejercicio ? `${ejercicio.id} - ${ejercicio.descripcion ?? ''}` : ''} disabled />
        </div>
        <div className="form-field">
          <label>Fecha <span className="required">*</span></label>
          <Calendar value={form.fecha} onChange={e => handleFieldChange('fecha', e.value)} dateFormat="dd/mm/yy"
            minDate={toDate(ejercicio?.fecha_desde)} maxDate={toDate(ejercicio?.fecha_hasta)} showIcon />
        </div>
        <div className="form-field">
          <label>Tipo</label>
          <Dropdown value={form.tipo} options={TIPO_OPTIONS} onChange={e => handleFieldChange('tipo', e.value)} />
        </div>
        <div className="form-field form-field--full">
          <label>Leyenda <span className="required">*</span></label>
          <InputText value={form.leyenda} onChange={e => handleFieldChange('leyenda', e.target.value)} />
        </div>
        <div className="form-field">
          <label>Moneda</label>
          <Dropdown value={form.moneda} options={monedaOptions} onChange={e => handleFieldChange('moneda', e.value)} filter showClear />
        </div>
        <div className="form-field">
          <label>Cotización</label>
          <InputNumber value={form.cotizacion} onValueChange={e => handleFieldChange('cotizacion', e.value)}
            minFractionDigits={2} maxFractionDigits={4} disabled={!form.moneda} />
        </div>
        <div className="form-field">
          <label>Proyecto</label>
          <Dropdown value={form.proyecto} options={proyectoOptions} onChange={e => handleFieldChange('proyecto', e.value)} filter showClear />
        </div>
      </div>

      <div className="sub-tab">
        <div className="sub-form">
          <div className="form-grid">
            <div className="form-field">
              <label>Cuenta</label>
              <Dropdown value={lineaForm.cuenta} options={cuentaOptions} filter showClear
                onChange={e => setLineaForm(prev => ({ ...prev, cuenta: e.value }))} />
            </div>
            <div className="form-field">
              <label>Debe</label>
              <InputNumber value={lineaForm.debe} minFractionDigits={2} maxFractionDigits={2}
                onValueChange={e => setLineaForm(prev => ({ ...prev, debe: e.value, haber: e.value ? null : prev.haber }))} />
            </div>
            <div className="form-field">
              <label>Haber</label>
              <InputNumber value={lineaForm.haber} minFractionDigits={2} maxFractionDigits={2}
                onValueChange={e => setLineaForm(prev => ({ ...prev, haber: e.value, debe: e.value ? null : prev.debe }))} />
            </div>
            <div className="form-field form-field--full">
              <label>Leyenda de la línea</label>
              <InputText value={lineaForm.leyenda} onChange={e => setLineaForm(prev => ({ ...prev, leyenda: e.target.value }))} />
            </div>
          </div>
          <div className="sub-form-actions">
            <Button label="Agregar línea" icon="fa-solid fa-plus" size="small" onClick={addLinea} />
          </div>
        </div>
        <DataTable value={movimientos} loading={loadingMovimientos} size="small" stripedRows emptyMessage="El asiento todavía no tiene líneas cargadas"
          editMode="cell">
          <Column field="cuenta" header="Cuenta" style={{ width: '110px' }} />
          <Column body={m => cuentaDescripcion(m.cuenta)} header="Descripción" />
          <Column field="debe" header="Debe" style={{ width: '120px' }}
            body={m => money(m.debe)}
            editor={options => (
              <InputNumber value={options.value} minFractionDigits={2} maxFractionDigits={2}
                onValueChange={e => options.editorCallback(e.value)} />
            )}
            onCellEditComplete={e => editarImporte(e.rowIndex, 'debe', e.newValue)} />
          <Column field="haber" header="Haber" style={{ width: '120px' }}
            body={m => money(m.haber)}
            editor={options => (
              <InputNumber value={options.value} minFractionDigits={2} maxFractionDigits={2}
                onValueChange={e => options.editorCallback(e.value)} />
            )}
            onCellEditComplete={e => editarImporte(e.rowIndex, 'haber', e.newValue)} />
          <Column field="leyenda" header="Leyenda" />
          <Column body={(row, { rowIndex }) => (
            <div className="acciones-col">
              <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" onClick={() => removeLinea(rowIndex)} />
            </div>
          )} header="Acciones" alignHeader="center" style={{ width: '80px', textAlign: 'center' }} />
        </DataTable>
        <div className={`asiento-totales${balanceado ? '' : ' asiento-totales--error'}`}>
          <span>Debe: {money(totalDebe)}</span>
          <span>Haber: {money(totalHaber)}</span>
        </div>
      </div>
    </Dialog>
  );
}
