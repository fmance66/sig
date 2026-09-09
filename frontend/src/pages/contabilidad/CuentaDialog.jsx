import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { TabView, TabPanel } from 'primereact/tabview';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import * as cuentasApi from '../../api/cuentas';
import * as centrosCostoApi from '../../api/centrosCosto';

const SALDO_OPTIONS = [{ label: 'Debe', value: 'DEBE' }, { label: 'Haber', value: 'HABER' }];
const NATURALEZA_OPTIONS = [{ label: 'Patrimonial', value: 'PATRIMONIAL' }, { label: 'Resultado', value: 'RESULTADO' }];

const EMPTY_FORM = {
  id: '', descripcion: '', saldo: null, naturaleza: null,
  imputable: true, monetaria: false, tipo: '', orden: '', id_padre: null,
};
const EMPTY_PRORRATEO = { centro_de_costo: null, porcentaje: '' };

// Modal compartido por ListadoCuentasPage y PlanDeCuentasPage. `cuenta` es la fila
// a editar (null = alta nueva); `cuentas` es el listado plano de la empresa, usado
// para el combo de Cuenta Padre.
export default function CuentaDialog({ visible, onHide, onSaved, empresa, cuenta, cuentas, toast }) {
  const editMode = !!cuenta;
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [centrosCosto, setCentrosCosto] = useState([]);
  const [prorrateo, setProrrateo] = useState([]);
  const [prorrateoForm, setProrrateoForm] = useState(EMPTY_PRORRATEO);
  const [loadingProrrateo, setLoadingProrrateo] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setActiveTab(0);
    setProrrateoForm(EMPTY_PRORRATEO);
    if (cuenta) {
      setForm({
        id: cuenta.id,
        descripcion: cuenta.descripcion ?? '',
        saldo: cuenta.saldo ?? null,
        naturaleza: cuenta.naturaleza ?? null,
        imputable: cuenta.imputable ?? true,
        monetaria: cuenta.monetaria ?? false,
        tipo: cuenta.tipo ?? '',
        orden: cuenta.orden ?? '',
        id_padre: cuenta.id_padre ?? null,
      });
      loadProrrateo(cuenta.id);
    } else {
      setForm(EMPTY_FORM);
      setProrrateo([]);
    }
    if (empresa) {
      centrosCostoApi.getCentrosCosto(empresa)
        .then(res => setCentrosCosto(res.data.resultado))
        .catch(() => setCentrosCosto([]));
    }
  }, [visible, cuenta, empresa]);

  async function loadProrrateo(cuentaId) {
    setLoadingProrrateo(true);
    try {
      const res = await cuentasApi.getCentrosCostoDeCuenta(cuentaId, empresa);
      setProrrateo(res.data.resultado);
    } catch {
      setProrrateo([]);
    } finally {
      setLoadingProrrateo(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleFieldChange(name, value) {
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function addProrrateo() {
    if (!prorrateoForm.centro_de_costo) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Elegí un centro de costo' });
      return;
    }
    if (prorrateo.some(p => p.centro_de_costo === prorrateoForm.centro_de_costo)) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Ese centro de costo ya está en la lista' });
      return;
    }
    const centro = centrosCosto.find(c => c.id === prorrateoForm.centro_de_costo);
    setProrrateo(prev => [...prev, {
      centro_de_costo: prorrateoForm.centro_de_costo,
      descripcion: centro?.descripcion,
      porcentaje: prorrateoForm.porcentaje || 0,
    }]);
    setProrrateoForm(EMPTY_PRORRATEO);
  }

  function removeProrrateo(row) {
    setProrrateo(prev => prev.filter(p => p.centro_de_costo !== row.centro_de_costo));
  }

  async function handleSave() {
    if (!editMode && !form.id.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El código de cuenta es requerido' });
      return;
    }
    if (!form.descripcion.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'La descripción es requerida' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        descripcion: form.descripcion,
        saldo: form.saldo,
        naturaleza: form.naturaleza,
        imputable: form.imputable,
        monetaria: form.monetaria,
        tipo: form.tipo,
        orden: form.orden,
        id_padre: form.id_padre,
      };
      const id = editMode ? cuenta.id : form.id;
      if (editMode) {
        await cuentasApi.updateCuenta(id, empresa, payload);
      } else {
        await cuentasApi.createCuenta({ id, empresa, ...payload });
      }
      await cuentasApi.setCentrosCostoDeCuenta(id, empresa, prorrateo.map(p => ({
        centro_de_costo: p.centro_de_costo, porcentaje: p.porcentaje,
      })));
      toast.current.show({ severity: 'success', summary: 'OK', detail: editMode ? 'Cuenta actualizada' : 'Cuenta creada' });
      onSaved();
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al guardar';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setSaving(false);
    }
  }

  const padreOptions = (cuentas || [])
    .filter(c => c.id !== form.id)
    .map(c => ({ label: `${c.id} - ${c.descripcion ?? ''}`, value: c.id }));

  const centroOptions = centrosCosto.map(c => ({ label: `${c.id} - ${c.descripcion ?? ''}`, value: c.id }));

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
      header={editMode ? 'Modificar cuenta' : 'Agregar cuenta'}
      footer={dialogFooter}
      style={{ width: '750px' }}
      modal
      draggable={false}
      resizable={false}
    >
      <TabView activeIndex={activeTab} onTabChange={e => setActiveTab(e.index)}>
        <TabPanel header="Cuenta">
          <div className="form-grid">
            {!editMode && (
              <div className="form-field">
                <label>Cuenta <span className="required">*</span></label>
                <InputText name="id" value={form.id} onChange={handleChange} />
              </div>
            )}
            <div className="form-field form-field--full">
              <label>Descripción <span className="required">*</span></label>
              <InputText name="descripcion" value={form.descripcion} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label>Cuenta Padre</label>
              <Dropdown value={form.id_padre} options={padreOptions} onChange={e => handleFieldChange('id_padre', e.value)}
                filter showClear placeholder="Sin cuenta padre (rubro raíz)" />
            </div>
            <div className="form-field">
              <label>Tipo</label>
              <InputText name="tipo" value={form.tipo} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label>Saldo Habitual</label>
              <Dropdown value={form.saldo} options={SALDO_OPTIONS} onChange={e => handleFieldChange('saldo', e.value)} showClear />
            </div>
            <div className="form-field">
              <label>Naturaleza</label>
              <Dropdown value={form.naturaleza} options={NATURALEZA_OPTIONS} onChange={e => handleFieldChange('naturaleza', e.value)} showClear />
            </div>
            <div className="form-field">
              <label>Orden</label>
              <InputText name="orden" value={form.orden} onChange={handleChange} type="number" />
            </div>
            <div className="form-field form-field--checkbox">
              <label className="checkbox-label">
                <Checkbox checked={!!form.imputable} onChange={e => handleFieldChange('imputable', e.checked)} />
                Imputable
              </label>
            </div>
            <div className="form-field form-field--checkbox">
              <label className="checkbox-label">
                <Checkbox checked={!!form.monetaria} onChange={e => handleFieldChange('monetaria', e.checked)} />
                Monetaria
              </label>
            </div>
          </div>
        </TabPanel>
        <TabPanel header="Centros de Costo">
          {!editMode && !form.id ? (
            <div className="tab-empty-msg">
              <i className="fa-solid fa-circle-info" />
              <span>Completá el código de la cuenta para poder asignarle centros de costo.</span>
            </div>
          ) : (
            <div className="sub-tab">
              <div className="sub-form">
                <div className="form-grid">
                  <div className="form-field">
                    <label>Centro de Costo</label>
                    <Dropdown value={prorrateoForm.centro_de_costo} options={centroOptions} filter showClear
                      onChange={e => setProrrateoForm(prev => ({ ...prev, centro_de_costo: e.value }))} />
                  </div>
                  <div className="form-field">
                    <label>Porcentaje</label>
                    <InputNumber value={prorrateoForm.porcentaje || null} suffix="%" minFractionDigits={0} maxFractionDigits={2}
                      onValueChange={e => setProrrateoForm(prev => ({ ...prev, porcentaje: e.value }))} />
                  </div>
                </div>
                <div className="sub-form-actions">
                  <Button label="Agregar" icon="fa-solid fa-plus" size="small" onClick={addProrrateo} />
                </div>
              </div>
              <DataTable value={prorrateo} loading={loadingProrrateo} size="small" stripedRows emptyMessage="Esta cuenta no tiene centros de costo asignados">
                <Column field="centro_de_costo" header="Centro de Costo" style={{ width: '160px' }} />
                <Column field="descripcion" header="Descripción" />
                <Column field="porcentaje" header="Porcentaje" style={{ width: '110px' }} body={row => `${row.porcentaje ?? 0}%`} />
                <Column body={row => (
                  <div className="acciones-col">
                    <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" onClick={() => removeProrrateo(row)} />
                  </div>
                )} header="Acciones" alignHeader="center" style={{ width: '80px', textAlign: 'center' }} />
              </DataTable>
            </div>
          )}
        </TabPanel>
      </TabView>
    </Dialog>
  );
}
