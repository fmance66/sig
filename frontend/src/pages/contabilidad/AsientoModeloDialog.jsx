import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import * as api from '../../api/asientoModelo';

const SALDO_OPTIONS = [{ label: 'Debe', value: 'DEBE' }, { label: 'Haber', value: 'HABER' }];
const EMPTY_FORM = { id: '', descripcion: '', leyenda: '' };
const EMPTY_LINEA = { cuenta: null, saldo: null, leyenda: '' };

// Modal de alta/edición de un Asiento Modelo — mismo patrón sub-form + tabla que
// la pestaña "Centros de Costo" de CuentaDialog.jsx.
export default function AsientoModeloDialog({ visible, onHide, onSaved, empresa, modelo, cuentas, toast }) {
  const editMode = !!modelo;
  const [form, setForm] = useState(EMPTY_FORM);
  const [lineas, setLineas] = useState([]);
  const [lineaForm, setLineaForm] = useState(EMPTY_LINEA);
  const [saving, setSaving] = useState(false);
  const [loadingLineas, setLoadingLineas] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLineaForm(EMPTY_LINEA);
    if (modelo) {
      setForm({ id: modelo.id, descripcion: modelo.descripcion ?? '', leyenda: modelo.leyenda ?? '' });
      loadLineas(modelo.id);
    } else {
      setForm(EMPTY_FORM);
      setLineas([]);
    }
  }, [visible, modelo]);

  async function loadLineas(id) {
    setLoadingLineas(true);
    try {
      const res = await api.getLineasModelo(id, empresa);
      setLineas(res.data.resultado.map(l => ({ cuenta: l.cuenta, saldo: l.saldo, leyenda: l.leyenda ?? '' })));
    } catch {
      setLineas([]);
    } finally {
      setLoadingLineas(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function addLinea() {
    if (!lineaForm.cuenta) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Elegí una cuenta' });
      return;
    }
    if (!lineaForm.saldo) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Elegí si la línea va en Debe o en Haber' });
      return;
    }
    setLineas(prev => [...prev, { ...lineaForm }]);
    setLineaForm(EMPTY_LINEA);
  }

  function removeLinea(idx) {
    setLineas(prev => prev.filter((_, i) => i !== idx));
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
      const payload = { descripcion: form.descripcion, leyenda: form.leyenda };
      const id = editMode ? modelo.id : form.id;
      if (editMode) {
        await api.updateModelo(id, empresa, payload);
      } else {
        await api.createModelo({ id, empresa, ...payload });
      }
      await api.setLineasModelo(id, empresa, lineas);
      toast.current.show({ severity: 'success', summary: 'OK', detail: editMode ? 'Asiento modelo actualizado' : 'Asiento modelo creado' });
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
      header={editMode ? 'Modificar asiento modelo' : 'Agregar asiento modelo'}
      footer={dialogFooter}
      style={{ width: '750px' }}
      modal
      draggable={false}
      resizable={false}
    >
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
        <div className="form-field form-field--full">
          <label>Leyenda</label>
          <InputText name="leyenda" value={form.leyenda} onChange={handleChange} />
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
              <label>Saldo</label>
              <Dropdown value={lineaForm.saldo} options={SALDO_OPTIONS} onChange={e => setLineaForm(prev => ({ ...prev, saldo: e.value }))} />
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
        <DataTable value={lineas} loading={loadingLineas} size="small" stripedRows emptyMessage="Este modelo todavía no tiene líneas cargadas">
          <Column field="cuenta" header="Cuenta" style={{ width: '110px' }} />
          <Column body={l => cuentaDescripcion(l.cuenta)} header="Descripción" />
          <Column field="saldo" header="Saldo" style={{ width: '100px' }} />
          <Column field="leyenda" header="Leyenda" />
          <Column body={(row, { rowIndex }) => (
            <div className="acciones-col">
              <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" onClick={() => removeLinea(rowIndex)} />
            </div>
          )} header="Acciones" alignHeader="center" style={{ width: '80px', textAlign: 'center' }} />
        </DataTable>
      </div>
    </Dialog>
  );
}
