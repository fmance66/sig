import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { TabView, TabPanel } from 'primereact/tabview';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import * as api from '../../api/formulaAsiento';

const SALDO_OPTIONS = [{ label: 'Debe', value: 'DEBE' }, { label: 'Haber', value: 'HABER' }];
const ASIENTO_NEGATIVO_OPTIONS = [{ label: 'Negativo', value: 'NEGATIVO' }, { label: 'Invertir', value: 'INVERTIR' }];
const FECHA_OPTIONS = [{ label: 'Fecha del comprobante', value: 'FECHA' }, { label: 'Fecha de ejercicio', value: 'FECHA_EJERCICIO' }];
export const GRUPO_LABELS = { IVA_VENTA: 'Venta', IVA_COMPRA: 'Compra', COBRO: 'Cobro', PAGO: 'Pago' };

const EMPTY_FORM = {
  id: '', descripcion: '', fecha: 'FECHA', leyenda: '', condicion: '',
  asiento_negativo: 'NEGATIVO', orden: null,
  pesificar: false, unir_asientos: true, combinar_cuentas: true,
  dividir_rubro: false, dividir_proyecto: false, dividir_imputable: false,
};
const EMPTY_MOVIMIENTO = { movimiento: null, cuenta: null, saldo: null, formula: '', leyenda: '' };
const EMPTY_CENTRO_COSTO = { movimiento: null, centro_de_costo: null, porcentaje: '' };
const EMPTY_PROYECTO = { proyecto: null, condicion: '' };

// Modal de alta/edición de una Fórmula de Asiento (cnt_modelo_asiento) — mismo
// patrón sub-form + tabla que AsientoModeloDialog.jsx, con 3 sub-recursos en
// vez de 1 (Movimientos/Centros de Costo/Proyectos) y campos de fórmula
// (DSL evaluado por backend/src/lib/formulaEngineAsiento.js) en vez de texto libre.
export default function FormulaAsientoDialog({ visible, onHide, onSaved, empresa, grupo, modelo, cuentas, centrosCosto, proyectos, toast }) {
  const editMode = !!modelo;
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [movimientos, setMovimientosState] = useState([]);
  const [movimientoForm, setMovimientoForm] = useState(EMPTY_MOVIMIENTO);
  const [centrosCostoRows, setCentrosCostoRows] = useState([]);
  const [centroCostoForm, setCentroCostoForm] = useState(EMPTY_CENTRO_COSTO);
  const [proyectosRows, setProyectosRows] = useState([]);
  const [proyectoForm, setProyectoForm] = useState(EMPTY_PROYECTO);
  const [saving, setSaving] = useState(false);
  const [loadingSub, setLoadingSub] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setActiveTab(0);
    setMovimientoForm(EMPTY_MOVIMIENTO);
    setCentroCostoForm(EMPTY_CENTRO_COSTO);
    setProyectoForm(EMPTY_PROYECTO);
    if (modelo) {
      setForm({
        id: modelo.id, descripcion: modelo.descripcion ?? '', fecha: modelo.fecha ?? 'FECHA',
        leyenda: modelo.leyenda ?? '', condicion: modelo.condicion ?? '',
        asiento_negativo: modelo.asiento_negativo ?? 'NEGATIVO', orden: modelo.orden ?? null,
        pesificar: !!modelo.pesificar, unir_asientos: modelo.unir_asientos !== false,
        combinar_cuentas: modelo.combinar_cuentas !== false,
        dividir_rubro: !!modelo.dividir_rubro, dividir_proyecto: !!modelo.dividir_proyecto,
        dividir_imputable: !!modelo.dividir_imputable,
      });
      loadSub(modelo.id);
    } else {
      setForm(EMPTY_FORM);
      setMovimientosState([]);
      setCentrosCostoRows([]);
      setProyectosRows([]);
    }
  }, [visible, modelo]);

  async function loadSub(id) {
    setLoadingSub(true);
    try {
      const [movRes, ccRes, pyRes] = await Promise.all([
        api.getMovimientos(id, empresa),
        api.getCentrosCosto(id, empresa),
        api.getProyectosModelo(id, empresa),
      ]);
      setMovimientosState(movRes.data.resultado.map(m => ({ ...m, formula: m.formula ?? '', leyenda: m.leyenda ?? '' })));
      setCentrosCostoRows(ccRes.data.resultado.map(c => ({ ...c, porcentaje: c.porcentaje ?? '' })));
      setProyectosRows(pyRes.data.resultado.map(p => ({ ...p, condicion: p.condicion ?? '' })));
    } catch {
      setMovimientosState([]);
      setCentrosCostoRows([]);
      setProyectosRows([]);
    } finally {
      setLoadingSub(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function toggleCheck(name) {
    setForm(prev => ({ ...prev, [name]: !prev[name] }));
  }

  function addMovimiento() {
    if (!movimientoForm.movimiento) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Indicá el número de movimiento' });
      return;
    }
    if (!movimientoForm.cuenta) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Elegí una cuenta' });
      return;
    }
    if (!movimientoForm.saldo) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Elegí si la línea va en Debe o en Haber' });
      return;
    }
    setMovimientosState(prev => [...prev, { ...movimientoForm }].sort((a, b) => a.movimiento - b.movimiento));
    setMovimientoForm(EMPTY_MOVIMIENTO);
  }

  function removeMovimiento(idx) {
    setMovimientosState(prev => prev.filter((_, i) => i !== idx));
  }

  function addCentroCosto() {
    if (!centroCostoForm.movimiento) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Elegí a qué movimiento corresponde' });
      return;
    }
    if (!centroCostoForm.centro_de_costo) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Elegí un centro de costo' });
      return;
    }
    setCentrosCostoRows(prev => [...prev, { ...centroCostoForm }]);
    setCentroCostoForm(EMPTY_CENTRO_COSTO);
  }

  function removeCentroCosto(idx) {
    setCentrosCostoRows(prev => prev.filter((_, i) => i !== idx));
  }

  function addProyecto() {
    if (!proyectoForm.proyecto) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Elegí un proyecto' });
      return;
    }
    setProyectosRows(prev => [...prev, { ...proyectoForm }]);
    setProyectoForm(EMPTY_PROYECTO);
  }

  function removeProyecto(idx) {
    setProyectosRows(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!editMode && !form.id.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El código del modelo es requerido' });
      return;
    }
    if (!form.descripcion.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'La descripción es requerida' });
      return;
    }
    setSaving(true);
    try {
      const id = editMode ? modelo.id : form.id;
      const payload = { ...form };
      delete payload.id;
      if (editMode) {
        await api.updateModelo(id, empresa, payload);
      } else {
        await api.createModelo({ id, empresa, grupo, ...payload });
      }
      await api.setMovimientos(id, empresa, movimientos);
      await api.setCentrosCosto(id, empresa, centrosCostoRows);
      await api.setProyectosModelo(id, empresa, proyectosRows);
      toast.current.show({ severity: 'success', summary: 'OK', detail: editMode ? 'Fórmula de asiento actualizada' : 'Fórmula de asiento creada' });
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
  const cuentaDescripcion = id => cuentas.find(c => c.id === id)?.descripcion ?? '';

  const centroCostoOptions = (centrosCosto || []).map(c => ({ label: `${c.id} - ${c.descripcion ?? ''}`, value: c.id }));
  const centroCostoDescripcion = id => centrosCosto.find(c => c.id === id)?.descripcion ?? '';

  const proyectoOptions = (proyectos || []).map(p => ({ label: `${p.id} - ${p.descripcion ?? ''}`, value: p.id }));
  const proyectoDescripcion = id => proyectos.find(p => p.id === id)?.descripcion ?? '';

  const movimientoOptions = movimientos.map(m => ({ label: `${m.movimiento} - ${cuentaDescripcion(m.cuenta)}`, value: m.movimiento }));

  const dialogFooter = (
    <div className="dialog-footer-btns mt-2">
      <Button label="Cancelar" icon="fa-solid fa-xmark" className="p-button-text" onClick={onHide} disabled={saving} />
      <Button label="Guardar" icon="fa-solid fa-check" onClick={handleSave} loading={saving} />
    </div>
  );

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={editMode ? `Modificar fórmula de asiento — ${GRUPO_LABELS[grupo] ?? grupo ?? ''}` : `Agregar fórmula de asiento — ${GRUPO_LABELS[grupo] ?? grupo ?? ''}`}
      footer={dialogFooter}
      style={{ width: '850px' }}
      modal
      draggable={false}
      resizable={false}
    >
      <TabView className="iva-tabs" activeIndex={activeTab} onTabChange={e => setActiveTab(e.index)}>
        <TabPanel header="Asiento">
          <div className="form-grid">
            {!editMode && (
              <div className="form-field">
                <label>Modelo <span className="required">*</span></label>
                <InputText name="id" value={form.id} onChange={handleChange} />
              </div>
            )}
            <div className="form-field form-field--full">
              <label>Descripción <span className="required">*</span></label>
              <InputText name="descripcion" value={form.descripcion} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label>Fecha del asiento</label>
              <Dropdown name="fecha" value={form.fecha} options={FECHA_OPTIONS} editable
                onChange={e => setForm(prev => ({ ...prev, fecha: e.value }))} />
            </div>
            <div className="form-field">
              <label>Signo</label>
              <Dropdown name="asiento_negativo" value={form.asiento_negativo} options={ASIENTO_NEGATIVO_OPTIONS}
                onChange={e => setForm(prev => ({ ...prev, asiento_negativo: e.value }))} />
            </div>
            <div className="form-field">
              <label>Orden</label>
              <InputNumber value={form.orden} onValueChange={e => setForm(prev => ({ ...prev, orden: e.value }))} showButtons={false} />
            </div>
            <div className="form-field form-field--full">
              <label>Leyenda (fórmula)</label>
              <InputTextarea name="leyenda" value={form.leyenda} onChange={handleChange} rows={2} autoResize
                placeholder='PERIODO+" Venta N° "+COMPROBANTE' />
            </div>
            <div className="form-field form-field--full">
              <label>Condición (fórmula, opcional)</label>
              <InputTextarea name="condicion" value={form.condicion} onChange={handleChange} rows={2} autoResize />
            </div>
            {[
              ['pesificar', 'Pesificar'],
              ['unir_asientos', 'Unir asientos'],
              ['combinar_cuentas', 'Combinar cuentas'],
              ['dividir_rubro', 'Dividir por rubro'],
              ['dividir_proyecto', 'Dividir por proyecto'],
              ['dividir_imputable', 'Dividir por cuenta imputable'],
            ].map(([name, label]) => (
              <div className="form-field form-field--checkbox" key={name}>
                <div className="form-field-label-row">
                  <Checkbox inputId={name} checked={form[name]} onChange={() => toggleCheck(name)} />
                  <label htmlFor={name}>{label}</label>
                </div>
              </div>
            ))}
          </div>
        </TabPanel>

        <TabPanel header="Movimientos">
          <div className="sub-tab">
            <div className="sub-form">
              <div className="form-grid">
                <div className="form-field">
                  <label>N°</label>
                  <InputNumber value={movimientoForm.movimiento} onValueChange={e => setMovimientoForm(prev => ({ ...prev, movimiento: e.value }))} showButtons={false} />
                </div>
                <div className="form-field">
                  <label>Cuenta</label>
                  <Dropdown value={movimientoForm.cuenta} options={cuentaOptions} filter showClear
                    onChange={e => setMovimientoForm(prev => ({ ...prev, cuenta: e.value }))} />
                </div>
                <div className="form-field">
                  <label>Saldo</label>
                  <Dropdown value={movimientoForm.saldo} options={SALDO_OPTIONS} onChange={e => setMovimientoForm(prev => ({ ...prev, saldo: e.value }))} />
                </div>
                <div className="form-field form-field--full">
                  <label>Fórmula del importe</label>
                  <InputTextarea value={movimientoForm.formula} onChange={e => setMovimientoForm(prev => ({ ...prev, formula: e.target.value }))} rows={2} autoResize
                    placeholder="IVA_TOTAL, IMPUESTOS(IIBB), NETO_TOTAL+NOGRAVADO_TOTAL+EXENTO_TOTAL..." />
                </div>
                <div className="form-field form-field--full">
                  <label>Leyenda de la línea</label>
                  <InputText value={movimientoForm.leyenda} onChange={e => setMovimientoForm(prev => ({ ...prev, leyenda: e.target.value }))} />
                </div>
              </div>
              <div className="sub-form-actions">
                <Button label="Agregar movimiento" icon="fa-solid fa-plus" size="small" onClick={addMovimiento} />
              </div>
            </div>
            <DataTable value={movimientos} loading={loadingSub} size="small" stripedRows emptyMessage="Esta fórmula todavía no tiene movimientos cargados">
              <Column field="movimiento" header="N°" style={{ width: '60px' }} />
              <Column field="cuenta" header="Cuenta" style={{ width: '110px' }} />
              <Column body={m => cuentaDescripcion(m.cuenta)} header="Descripción" />
              <Column field="saldo" header="Saldo" style={{ width: '90px' }} />
              <Column field="formula" header="Fórmula" />
              <Column body={(row, { rowIndex }) => (
                <div className="acciones-col">
                  <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" onClick={() => removeMovimiento(rowIndex)} />
                </div>
              )} header="Acciones" alignHeader="center" style={{ width: '80px', textAlign: 'center' }} />
            </DataTable>
          </div>
        </TabPanel>

        <TabPanel header="Centros de Costo">
          <div className="sub-tab">
            <div className="sub-form">
              <div className="form-grid">
                <div className="form-field">
                  <label>Movimiento</label>
                  <Dropdown value={centroCostoForm.movimiento} options={movimientoOptions} showClear
                    onChange={e => setCentroCostoForm(prev => ({ ...prev, movimiento: e.value }))} />
                </div>
                <div className="form-field">
                  <label>Centro de costo</label>
                  <Dropdown value={centroCostoForm.centro_de_costo} options={centroCostoOptions} filter showClear
                    onChange={e => setCentroCostoForm(prev => ({ ...prev, centro_de_costo: e.value }))} />
                </div>
                <div className="form-field form-field--full">
                  <label>Porcentaje (fórmula)</label>
                  <InputText value={centroCostoForm.porcentaje} onChange={e => setCentroCostoForm(prev => ({ ...prev, porcentaje: e.target.value }))} />
                </div>
              </div>
              <div className="sub-form-actions">
                <Button label="Agregar centro de costo" icon="fa-solid fa-plus" size="small" onClick={addCentroCosto} />
              </div>
            </div>
            <DataTable value={centrosCostoRows} loading={loadingSub} size="small" stripedRows emptyMessage="Esta fórmula todavía no divide por centros de costo">
              <Column field="movimiento" header="Mov. N°" style={{ width: '80px' }} />
              <Column field="centro_de_costo" header="Centro de costo" style={{ width: '140px' }} />
              <Column body={c => centroCostoDescripcion(c.centro_de_costo)} header="Descripción" />
              <Column field="porcentaje" header="Porcentaje" />
              <Column body={(row, { rowIndex }) => (
                <div className="acciones-col">
                  <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" onClick={() => removeCentroCosto(rowIndex)} />
                </div>
              )} header="Acciones" alignHeader="center" style={{ width: '80px', textAlign: 'center' }} />
            </DataTable>
          </div>
        </TabPanel>

        <TabPanel header="Proyectos">
          <div className="sub-tab">
            <div className="sub-form">
              <div className="form-grid">
                <div className="form-field">
                  <label>Proyecto</label>
                  <Dropdown value={proyectoForm.proyecto} options={proyectoOptions} filter showClear
                    onChange={e => setProyectoForm(prev => ({ ...prev, proyecto: e.value }))} />
                </div>
                <div className="form-field form-field--full">
                  <label>Condición (fórmula, opcional)</label>
                  <InputText value={proyectoForm.condicion} onChange={e => setProyectoForm(prev => ({ ...prev, condicion: e.target.value }))} />
                </div>
              </div>
              <div className="sub-form-actions">
                <Button label="Agregar proyecto" icon="fa-solid fa-plus" size="small" onClick={addProyecto} />
              </div>
            </div>
            <DataTable value={proyectosRows} loading={loadingSub} size="small" stripedRows emptyMessage="Esta fórmula todavía no tiene proyectos asociados">
              <Column field="proyecto" header="Proyecto" style={{ width: '140px' }} />
              <Column body={p => proyectoDescripcion(p.proyecto)} header="Descripción" />
              <Column field="condicion" header="Condición" />
              <Column body={(row, { rowIndex }) => (
                <div className="acciones-col">
                  <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" onClick={() => removeProyecto(rowIndex)} />
                </div>
              )} header="Acciones" alignHeader="center" style={{ width: '80px', textAlign: 'center' }} />
            </DataTable>
          </div>
        </TabPanel>
      </TabView>
    </Dialog>
  );
}
