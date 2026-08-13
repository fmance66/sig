import { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { toIsoDate } from '../../utils/dates';
import * as api from '../../api/historial';

const EMPTY = { campo: '', fecha_desde: null, fecha_hasta: null, valor: '' };

export default function HistorialTab({ empleadoId, toast }) {
  const [historial, setHistorial] = useState([]);
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
      const res = await api.getHistorial(empleadoId);
      setHistorial(res.data.resultado);
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el historial' });
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
    if (!form.campo.trim() || !form.fecha_desde) {
      toast.current?.show({ severity: 'warn', summary: 'Atención', detail: 'Campo y fecha desde son requeridos' });
      return;
    }
    setSaving(true);
    try {
      await api.createHistorial({
        empleado: empleadoId,
        campo: form.campo,
        fecha_desde: toIsoDate(form.fecha_desde),
        fecha_hasta: toIsoDate(form.fecha_hasta),
        valor: form.valor,
      });
      toast.current?.show({ severity: 'success', summary: 'OK', detail: 'Registro agregado' });
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
      message: `¿Está seguro de eliminar el registro de "${row.campo}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteHistorial(empleadoId, row.campo, toIsoDate(row.fecha_desde));
          toast.current?.show({ severity: 'success', summary: 'OK', detail: 'Registro eliminado' });
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
        <span>Guardá primero el legajo para ver el historial.</span>
      </div>
    );
  }

  const fechaTemplate = (field) => (row) => row[field] ? new Date(row[field]).toLocaleDateString('es-AR') : '—';

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
              <label>Campo <span className="required">*</span></label>
              <InputText name="campo" value={form.campo} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label>Fecha Desde <span className="required">*</span></label>
              <Calendar value={form.fecha_desde} onChange={e => setForm(p => ({ ...p, fecha_desde: e.value }))} dateFormat="dd/mm/yy" showIcon />
            </div>
            <div className="form-field">
              <label>Fecha Hasta</label>
              <Calendar value={form.fecha_hasta} onChange={e => setForm(p => ({ ...p, fecha_hasta: e.value }))} dateFormat="dd/mm/yy" showIcon />
            </div>
            <div className="form-field form-field--full">
              <label>Valor</label>
              <InputText name="valor" value={form.valor} onChange={handleChange} />
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
          <Button label="Nuevo registro" icon="fa-solid fa-plus" size="small" onClick={openNew} />
        )}
      </div>

      <DataTable
        value={historial}
        loading={loading}
        emptyMessage="No hay historial registrado"
        size="small"
        stripedRows
      >
        <Column field="campo"       header="Campo"        style={{ width: '130px' }} />
        <Column field="campo_desc"  header="Descripción" />
        <Column body={fechaTemplate('fecha_desde')} header="Fecha Desde" style={{ width: '110px' }} />
        <Column body={fechaTemplate('fecha_hasta')} header="Fecha Hasta" style={{ width: '110px' }} />
        <Column field="valor"       header="Valor" />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '70px', textAlign: 'center' }} />
      </DataTable>
    </div>
  );
}
