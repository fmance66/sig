import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Checkbox } from 'primereact/checkbox';
import * as api from '../../api/sucursales';

const EMPTY = {
  sucursal: '', nombre_fantasia: '', direccion: '', localidad: '',
  provincia: '', cpa: '', codigo_zona: '', telefono: '', email: '',
  login: false, orden: '',
};

export default function SucursalesTab({ empresaId, toast }) {
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [form, setForm]             = useState(EMPTY);
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (empresaId) load();
  }, [empresaId]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getSucursales(empresaId);
      setSucursales(res.data.resultado);
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las sucursales' });
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setForm(EMPTY);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(row) {
    setForm({
      sucursal:       row.sucursal       ?? '',
      nombre_fantasia:row.nombre_fantasia?? '',
      direccion:      row.direccion      ?? '',
      localidad:      row.localidad      ?? '',
      provincia:      row.provincia      ?? '',
      cpa:            row.cpa            ?? '',
      codigo_zona:    row.codigo_zona    ?? '',
      telefono:       row.telefono       ?? '',
      email:          row.email          ?? '',
      login:          row.login          ?? false,
      orden:          row.orden          ?? '',
    });
    setEditingId(row.id);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editingId) {
        await api.updateSucursal(editingId, form);
        toast.current?.show({ severity: 'success', summary: 'OK', detail: 'Sucursal actualizada' });
      } else {
        await api.createSucursal({ ...form, empresa: empresaId });
        toast.current?.show({ severity: 'success', summary: 'OK', detail: 'Sucursal agregada' });
      }
      cancelForm();
      load();
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al guardar';
      toast.current?.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(row) {
    confirmDialog({
      message: `¿Está seguro de eliminar la sucursal "${row.sucursal || row.nombre_fantasia}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteSucursal(row.id);
          toast.current?.show({ severity: 'success', summary: 'OK', detail: 'Sucursal eliminada' });
          load();
        } catch {
          toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
        }
      },
    });
  }

  if (!empresaId) {
    return (
      <div className="tab-empty-msg">
        <i className="fa-solid fa-circle-info" />
        <span>Guardá primero la empresa para administrar sucursales.</span>
      </div>
    );
  }

  const accionesTemplate = (row) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-pen"   className="p-button-text p-button-sm" tooltip="Modificar" tooltipOptions={{ position: 'top' }} onClick={() => openEdit(row)} />
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar" tooltipOptions={{ position: 'top' }} onClick={() => handleDelete(row)} />
    </div>
  );

  return (
    <div className="sucursales-tab">
      <ConfirmDialog />

      {showForm && (
        <div className="sucursal-form">
          <div className="form-grid">
            <div className="form-field">
              <label>Sucursal</label>
              <InputText name="sucursal" value={form.sucursal} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label>Nombre de Fantasía</label>
              <InputText name="nombre_fantasia" value={form.nombre_fantasia} onChange={handleChange} />
            </div>
            <div className="form-field form-field--full">
              <label>Dirección</label>
              <InputText name="direccion" value={form.direccion} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label>Localidad</label>
              <InputText name="localidad" value={form.localidad} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label>Provincia</label>
              <InputText name="provincia" value={form.provincia} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label>Código Postal</label>
              <InputText name="cpa" value={form.cpa} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label>Código de Zona</label>
              <InputText name="codigo_zona" value={form.codigo_zona} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label>Teléfono</label>
              <InputText name="telefono" value={form.telefono} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label>Email</label>
              <InputText name="email" value={form.email} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label>Orden</label>
              <InputText name="orden" value={form.orden} onChange={handleChange} type="number" />
            </div>
            <div className="form-field form-field--checkbox">
              <Checkbox inputId="login" checked={form.login} onChange={e => setForm(prev => ({ ...prev, login: e.checked }))} />
              <label htmlFor="login">Login</label>
            </div>
          </div>
          <div className="sucursal-form-actions">
            <Button label="Cancelar" icon="fa-solid fa-xmark" className="p-button-text" onClick={cancelForm} disabled={saving} />
            <Button label={editingId ? 'Guardar' : 'Agregar'} icon="fa-solid fa-check" onClick={handleSave} loading={saving} />
          </div>
        </div>
      )}

      <div className="sucursales-table-header">
        {!showForm && (
          <Button label="Nueva sucursal" icon="fa-solid fa-plus" size="small" onClick={openNew} />
        )}
      </div>

      <DataTable
        value={sucursales}
        loading={loading}
        emptyMessage="No hay sucursales registradas"
        size="small"
        stripedRows
      >
        <Column field="sucursal"        header="Sucursal"          sortable />
        <Column field="nombre_fantasia" header="Nombre de Fantasía" sortable />
        <Column field="localidad"       header="Localidad"          sortable style={{ width: '130px' }} />
        <Column field="provincia"       header="Provincia"          sortable style={{ width: '120px' }} />
        <Column field="telefono"        header="Teléfono"           style={{ width: '110px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '90px', textAlign: 'center' }} />
      </DataTable>
    </div>
  );
}
