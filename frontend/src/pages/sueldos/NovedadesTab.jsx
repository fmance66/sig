import { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { toIsoDate } from '../../utils/dates';
import * as api from '../../api/novedades';

const EMPTY = { tipo_novedad: '', fecha: null, value: '' };

export default function NovedadesTab({ empleadoId, toast }) {
  const [novedades, setNovedades] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (empleadoId) load();
  }, [empleadoId]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getNovedades(empleadoId);
      setNovedades(res.data.resultado);
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las novedades' });
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setForm(EMPTY);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setForm(EMPTY);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    if (!form.tipo_novedad.trim() || !form.fecha) {
      toast.current?.show({ severity: 'warn', summary: 'Atención', detail: 'Tipo de novedad y fecha son requeridos' });
      return;
    }
    setSaving(true);
    try {
      await api.createNovedad({
        empleado: empleadoId,
        tipo_novedad: form.tipo_novedad,
        fecha: toIsoDate(form.fecha),
        value: form.value,
      });
      toast.current?.show({ severity: 'success', summary: 'OK', detail: 'Novedad agregada' });
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
      message: `¿Está seguro de eliminar la novedad "${row.tipo_novedad}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteNovedad(empleadoId, row.tipo_novedad, toIsoDate(row.fecha));
          toast.current?.show({ severity: 'success', summary: 'OK', detail: 'Novedad eliminada' });
          load();
        } catch {
          toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
        }
      },
    });
  }

  if (!empleadoId) {
    return (
      <div className="tab-empty-msg">
        <i className="fa-solid fa-circle-info" />
        <span>Guardá primero el legajo para administrar novedades.</span>
      </div>
    );
  }

  const fechaTemplate = (row) => row.fecha ? new Date(row.fecha).toLocaleDateString('es-AR') : '—';

  const accionesTemplate = (row) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar" tooltipOptions={{ position: 'top' }} onClick={() => handleDelete(row)} />
    </div>
  );

  return (
    <div className="sub-tab">
      <ConfirmDialog />

      {showForm && (
        <div className="sub-form">
          <div className="form-grid">
            <div className="form-field form-field--full">
              <label>Tipo de Novedad <span className="required">*</span></label>
              <InputText name="tipo_novedad" value={form.tipo_novedad} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label>Fecha <span className="required">*</span></label>
              <Calendar value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.value }))} dateFormat="dd/mm/yy" showIcon />
            </div>
            <div className="form-field">
              <label>Valor</label>
              <InputText name="value" value={form.value} onChange={handleChange} />
            </div>
          </div>
          <div className="sub-form-actions">
            <Button label="Cancelar" icon="fa-solid fa-xmark" className="p-button-text" onClick={cancelForm} disabled={saving} />
            <Button label="Agregar" icon="fa-solid fa-check" onClick={handleSave} loading={saving} />
          </div>
        </div>
      )}

      <div className="sub-tab-header">
        {!showForm && (
          <Button label="Nueva novedad" icon="fa-solid fa-plus" size="small" onClick={openNew} />
        )}
      </div>

      <DataTable
        value={novedades}
        loading={loading}
        emptyMessage="No hay novedades registradas"
        size="small"
        stripedRows
      >
        <Column field="tipo_novedad"     header="Novedad"     style={{ width: '140px' }} />
        <Column field="tipo_novedad_desc" header="Descripción" />
        <Column body={fechaTemplate}     header="Fecha"       style={{ width: '110px' }} />
        <Column field="value"            header="Valor" />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '70px', textAlign: 'center' }} />
      </DataTable>
    </div>
  );
}
