import { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { toDate, toIsoDate } from '../../utils/dates';
import * as api from '../../api/familiares';

const PARENTESCO_OPTIONS = ['CONYUGE', 'HIJO', 'PRENATAL', 'FAMILIAR', 'OTRO']
  .map(v => ({ label: v.charAt(0) + v.slice(1).toLowerCase(), value: v }));

const ESTUDIO_OPTIONS = ['PREESCOLAR', 'PRIMARIA', 'SECUNDARIA', 'TERCIARIA', 'UNIVERSIDAD']
  .map(v => ({ label: v.charAt(0) + v.slice(1).toLowerCase(), value: v }));

const ESTADO_ACADEMICO_OPTIONS = [
  { label: 'En curso', value: 'EN_CURSO' },
  { label: 'Completo', value: 'COMPLETO' },
  { label: 'Incompleto', value: 'INCOMPLETO' },
];

const SI_NO_OPTIONS = [{ label: 'Sí', value: 'SI' }, { label: 'No', value: 'NO' }];

const EMPTY = {
  parentesco: '', apellido: '', nombre: '', fecha_alta: null, cuil: '',
  sexo: '', fecha_nacimiento: null, nacionalidad: '', tipo_documento: '', numero_documento: '',
  estudio: '', estado_academico: '', anio_academico: '',
  discapacidad: 'NO', adopcion: 'NO', adherente: 'NO', deducible: 'SI', porcentaje: '',
};

function edad(fechaNacimiento) {
  if (!fechaNacimiento) return '—';
  const nac = new Date(fechaNacimiento);
  const hoy = new Date();
  let e = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--;
  return e;
}

export default function FamiliaresTab({ empleadoId, toast }) {
  const [familiares, setFamiliares] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [form, setForm]             = useState(EMPTY);
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (empleadoId) load();
  }, [empleadoId]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getFamiliares(empleadoId);
      setFamiliares(res.data.resultado);
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los familiares' });
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
      parentesco: row.parentesco ?? '', apellido: row.apellido ?? '', nombre: row.nombre ?? '',
      fecha_alta: toDate(row.fecha_alta), cuil: row.cuil ?? '',
      sexo: row.sexo ?? '', fecha_nacimiento: toDate(row.fecha_nacimiento),
      nacionalidad: row.nacionalidad ?? '', tipo_documento: row.tipo_documento ?? '',
      numero_documento: row.numero_documento ?? '',
      estudio: row.estudio ?? '', estado_academico: row.estado_academico ?? '',
      anio_academico: row.anio_academico ?? '',
      discapacidad: row.discapacidad ?? 'NO', adopcion: row.adopcion ?? 'NO',
      adherente: row.adherente ?? 'NO', deducible: row.deducible ?? 'SI',
      porcentaje: row.porcentaje ?? '',
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
    if (!form.apellido.trim()) {
      toast.current?.show({ severity: 'warn', summary: 'Atención', detail: 'El apellido es requerido' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        fecha_alta: toIsoDate(form.fecha_alta),
        fecha_nacimiento: toIsoDate(form.fecha_nacimiento),
      };
      if (editingId) {
        await api.updateFamiliar(empleadoId, editingId, payload);
        toast.current?.show({ severity: 'success', summary: 'OK', detail: 'Familiar actualizado' });
      } else {
        await api.createFamiliar({ ...payload, empleado: empleadoId });
        toast.current?.show({ severity: 'success', summary: 'OK', detail: 'Familiar agregado' });
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
      message: `¿Está seguro de eliminar a "${row.apellido}, ${row.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteFamiliar(empleadoId, row.id);
          toast.current?.show({ severity: 'success', summary: 'OK', detail: 'Familiar eliminado' });
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
        <span>Guardá primero el legajo para administrar familiares.</span>
      </div>
    );
  }

  const edadTemplate = (row) => edad(row.fecha_nacimiento);

  const accionesTemplate = (row) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-pen"   className="p-button-text p-button-sm" tooltip="Modificar" tooltipOptions={{ position: 'top' }} onClick={() => openEdit(row)} />
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar" tooltipOptions={{ position: 'top' }} onClick={() => handleDelete(row)} />
    </div>
  );

  return (
    <div className="sub-tab">
      <ConfirmDialog />

      {showForm && (
        <div className="sub-form">
          <div className="form-grid">
            <div className="form-field">
              <label>Parentesco</label>
              <Dropdown name="parentesco" value={form.parentesco} options={PARENTESCO_OPTIONS}
                onChange={handleChange} placeholder="Seleccionar" showClear />
            </div>
            <div className="form-field">
              <label>Apellido <span className="required">*</span></label>
              <InputText name="apellido" value={form.apellido} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label>Nombre</label>
              <InputText name="nombre" value={form.nombre} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label>Fecha de Alta</label>
              <Calendar value={form.fecha_alta} onChange={e => setForm(p => ({ ...p, fecha_alta: e.value }))} dateFormat="dd/mm/yy" showIcon />
            </div>
            <div className="form-field">
              <label>Fecha de Nacimiento</label>
              <Calendar value={form.fecha_nacimiento} onChange={e => setForm(p => ({ ...p, fecha_nacimiento: e.value }))} dateFormat="dd/mm/yy" showIcon />
            </div>
            <div className="form-field">
              <label>C.U.I.L.</label>
              <InputText name="cuil" value={form.cuil} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label>Nacionalidad</label>
              <InputText name="nacionalidad" value={form.nacionalidad} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label>Tipo Documento</label>
              <InputText name="tipo_documento" value={form.tipo_documento} onChange={handleChange} placeholder="DNI" />
            </div>
            <div className="form-field">
              <label>Número Documento</label>
              <InputText name="numero_documento" value={form.numero_documento} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label>Estudio</label>
              <Dropdown name="estudio" value={form.estudio} options={ESTUDIO_OPTIONS}
                onChange={handleChange} placeholder="Seleccionar" showClear />
            </div>
            <div className="form-field">
              <label>Estado Académico</label>
              <Dropdown name="estado_academico" value={form.estado_academico} options={ESTADO_ACADEMICO_OPTIONS}
                onChange={handleChange} placeholder="Seleccionar" showClear />
            </div>
            <div className="form-field">
              <label>Año Académico</label>
              <InputText name="anio_academico" value={form.anio_academico} onChange={handleChange} type="number" />
            </div>
            <div className="form-field">
              <label>Adherente Obra Social</label>
              <Dropdown name="adherente" value={form.adherente} options={SI_NO_OPTIONS} onChange={handleChange} showClear />
            </div>
            <div className="form-field">
              <label>Discapacidad</label>
              <Dropdown name="discapacidad" value={form.discapacidad} options={SI_NO_OPTIONS} onChange={handleChange} showClear />
            </div>
            <div className="form-field">
              <label>Adopción</label>
              <Dropdown name="adopcion" value={form.adopcion} options={SI_NO_OPTIONS} onChange={handleChange} showClear />
            </div>
            <div className="form-field">
              <label>Deducible</label>
              <Dropdown name="deducible" value={form.deducible} options={SI_NO_OPTIONS} onChange={handleChange} showClear />
            </div>
            <div className="form-field">
              <label>Porcentaje</label>
              <InputText name="porcentaje" value={form.porcentaje} onChange={handleChange} type="number" />
            </div>
          </div>
          <div className="sub-form-actions">
            <Button label="Cancelar" icon="fa-solid fa-xmark" className="p-button-text" onClick={cancelForm} disabled={saving} />
            <Button label={editingId ? 'Guardar' : 'Agregar'} icon="fa-solid fa-check" onClick={handleSave} loading={saving} />
          </div>
        </div>
      )}

      <div className="sub-tab-header">
        {!showForm && (
          <Button label="Nuevo familiar" icon="fa-solid fa-plus" size="small" onClick={openNew} />
        )}
      </div>

      <DataTable
        value={familiares}
        loading={loading}
        emptyMessage="No hay familiares registrados"
        size="small"
        stripedRows
      >
        <Column field="id"         header="Familiar"   style={{ width: '90px' }} />
        <Column field="parentesco" header="Parentesco"  sortable style={{ width: '130px' }} />
        <Column field="apellido"   header="Apellido"    sortable />
        <Column field="nombre"     header="Nombre"      sortable />
        <Column body={edadTemplate} header="Edad"       style={{ width: '80px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '90px', textAlign: 'center' }} />
      </DataTable>
    </div>
  );
}
