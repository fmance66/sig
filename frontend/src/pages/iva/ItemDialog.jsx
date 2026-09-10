import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Checkbox } from 'primereact/checkbox';
import * as itemsApi from '../../api/ivaItems';

const EMPTY_FORM = {
  id: '', descripcion: '', grupo: '', unidad: '', ivainc: false,
  alicuota: null, rubro: '', calcular: true, orden: '',
};

// Modal compartido por Ítem de Compra (modulo COMPRA) y Ítem de Venta
// (modulo VENTA) — misma tabla iva_item, mismo formulario.
export default function ItemDialog({ visible, onHide, onSaved, empresa, modulo, item, toast }) {
  const editMode = !!item;
  const etiqueta = modulo === 'VENTA' ? 'ítem de venta' : 'ítem de compra';
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (item) {
      setForm({
        id: item.id,
        descripcion: item.descripcion ?? '',
        grupo: item.grupo ?? '',
        unidad: item.unidad ?? '',
        ivainc: item.ivainc ?? false,
        alicuota: item.alicuota ?? null,
        rubro: item.rubro ?? '',
        calcular: item.calcular ?? true,
        orden: item.orden ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [visible, item]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleFieldChange(name, value) {
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    if (!editMode && !form.id.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El código es requerido' });
      return;
    }
    if (!form.descripcion.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'La descripción es requerida' });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.id;
      if (editMode) {
        await itemsApi.updateItem(modulo, item.id, empresa, payload);
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Ítem actualizado' });
      } else {
        await itemsApi.createItem({ modulo, id: form.id, empresa, ...payload });
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Ítem creado' });
      }
      onSaved();
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al guardar';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setSaving(false);
    }
  }

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
      header={editMode ? `Modificar ${etiqueta}` : `Agregar ${etiqueta}`}
      footer={dialogFooter}
      style={{ width: '650px' }}
      modal
      draggable={false}
      resizable={false}
    >
      <div className="form-grid">
        {!editMode && (
          <div className="form-field">
            <label>Código <span className="required">*</span></label>
            <InputText name="id" value={form.id} onChange={handleChange} />
          </div>
        )}
        <div className="form-field form-field--full">
          <label>Descripción <span className="required">*</span></label>
          <InputText name="descripcion" value={form.descripcion} onChange={handleChange} />
        </div>
        <div className="form-field">
          <label>Grupo</label>
          <InputText name="grupo" value={form.grupo} onChange={handleChange} />
        </div>
        <div className="form-field">
          <label>Unidad</label>
          <InputText name="unidad" value={form.unidad} onChange={handleChange} />
        </div>
        <div className="form-field">
          <label>Rubro</label>
          <InputText name="rubro" value={form.rubro} onChange={handleChange} />
        </div>
        <div className="form-row-12">
          <div className="form-field" style={{ gridColumn: 'span 6' }}>
            <label>Alícuota</label>
            <InputNumber value={form.alicuota} suffix="%" minFractionDigits={0} maxFractionDigits={2}
              onValueChange={e => handleFieldChange('alicuota', e.value)} />
          </div>
          <div className="form-field form-field--checkbox" style={{ gridColumn: 'span 3' }}>
            <Checkbox inputId="ivainc" checked={!!form.ivainc} onChange={e => handleFieldChange('ivainc', e.checked)} />
            <label htmlFor="ivainc">IVA incluido</label>
          </div>
          <div className="form-field form-field--checkbox" style={{ gridColumn: 'span 3' }}>
            <Checkbox inputId="calcular" checked={!!form.calcular} onChange={e => handleFieldChange('calcular', e.checked)} />
            <label htmlFor="calcular">Calcular</label>
          </div>
        </div>
        <div className="form-field">
          <label>Orden</label>
          <InputText name="orden" value={form.orden} onChange={handleChange} type="number" />
        </div>
      </div>
    </Dialog>
  );
}
