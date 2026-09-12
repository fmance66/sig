import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import BuscadorTabla from '../../components/BuscadorTabla';
import * as api from '../../api/ejercicios';
import { useEmpresa } from '../../context/EmpresaContext';
import { toDate, toIsoDate } from '../../utils/dates';
import BotonVolver from '../../components/BotonVolver';
import './contabilidad.css';

const ESTADO_OPTIONS = [
  { label: 'Abierto', value: 'ABIERTO' },
  { label: 'Cerrado', value: 'CERRADO' },
  { label: 'Activo', value: 'ACTIVO' },
];
const CODIFICACION_OPTIONS = [
  { label: 'Jerarquía', value: 'JERARQUIA' },
  { label: 'Cuenta', value: 'CUENTA' },
];
const ORDENAMIENTO_OPTIONS = [
  { label: 'Jerarquía', value: 'JERARQUIA' },
  { label: 'Movimiento', value: 'MOVIMIENTO' },
];

const EMPTY_FORM = {
  id: '', descripcion: '', fecha_desde: null, fecha_hasta: null,
  estado: 'ABIERTO', codificacion: 'JERARQUIA', ordenamiento: 'MOVIMIENTO',
  leyenda_asiento: true, leyenda_cuenta: false, secuencia: '',
};

export default function EjerciciosPage() {
  const { empresa } = useEmpresa();
  const [ejercicios, setEjercicios] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const toast = useRef(null);

  useEffect(() => { if (empresa) load(); }, [empresa?.id]);
  useEffect(() => { setVisibleCount(ejercicios.length); }, [ejercicios]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getEjercicios(empresa.id);
      setEjercicios(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el listado de ejercicios' });
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setForm(EMPTY_FORM);
    setEditMode(false);
    setDialogVisible(true);
  }

  function openEdit(row) {
    setForm({
      id: row.id,
      descripcion: row.descripcion ?? '',
      fecha_desde: toDate(row.fecha_desde),
      fecha_hasta: toDate(row.fecha_hasta),
      estado: row.estado ?? 'ABIERTO',
      codificacion: row.codificacion ?? 'JERARQUIA',
      ordenamiento: row.ordenamiento ?? 'MOVIMIENTO',
      leyenda_asiento: row.leyenda_asiento ?? true,
      leyenda_cuenta: row.leyenda_cuenta ?? false,
      secuencia: row.secuencia ?? '',
    });
    setEditMode(true);
    setDialogVisible(true);
  }

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
    if (!form.fecha_desde || !form.fecha_hasta) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Las fechas desde/hasta son requeridas' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        descripcion: form.descripcion,
        fecha_desde: toIsoDate(form.fecha_desde),
        fecha_hasta: toIsoDate(form.fecha_hasta),
        estado: form.estado,
        codificacion: form.codificacion,
        ordenamiento: form.ordenamiento,
        leyenda_asiento: form.leyenda_asiento,
        leyenda_cuenta: form.leyenda_cuenta,
        secuencia: form.secuencia,
      };
      if (editMode) {
        await api.updateEjercicio(form.id, empresa.id, payload);
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Ejercicio actualizado' });
      } else {
        await api.createEjercicio({ id: form.id, empresa: empresa.id, ...payload });
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Ejercicio creado' });
      }
      setDialogVisible(false);
      load();
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al guardar';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(row) {
    confirmDialog({
      message: `¿Está seguro de eliminar el ejercicio "${row.descripcion || row.id}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteEjercicio(row.id, empresa.id);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Ejercicio eliminado' });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
        }
      },
    });
  }

  const estadoTemplate = (row) => {
    const icon = row.estado === 'CERRADO' ? 'fa-lock' : 'fa-lock-open';
    return <span><i className={`fa-solid ${icon}`} style={{ marginRight: '0.4rem' }} />{row.estado}</span>;
  };

  const fechaTemplate = (row, field) => row[field] ? new Date(row[field]).toLocaleDateString('es-AR') : '—';

  const accionesTemplate = (row) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-pen" className="p-button-text p-button-sm" tooltip="Modificar" tooltipOptions={{ position: 'top' }} onClick={() => openEdit(row)} />
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar" tooltipOptions={{ position: 'top' }} onClick={() => handleDelete(row)} />
    </div>
  );

  const tableHeader = (
    <div className="table-toolbar my-2">
      <BuscadorTabla value={globalFilter} onChange={setGlobalFilter} />
      <Button label="Agregar ejercicio" icon="fa-solid fa-plus" size="small" onClick={openNew} />
    </div>
  );

  const hasPaginator = ejercicios.length > 10;
  const totalRegistros = <span className="total-registros">Total: {visibleCount} registros</span>;

  const dialogFooter = (
    <div className="dialog-footer-btns mt-2">
      <Button label="Cancelar" icon="fa-solid fa-xmark" className="p-button-text" onClick={() => setDialogVisible(false)} disabled={saving} />
      <Button label="Guardar" icon="fa-solid fa-check" onClick={handleSave} loading={saving} />
    </div>
  );

  return (
    <div className="page-contabilidad">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-table-cells" /> Ejercicios</h2>
      </div>

      <DataTable
        value={ejercicios}
        loading={loading}
        paginator={hasPaginator}
        rows={10}
        rowsPerPageOptions={[10, 15, 25, 50]}
        paginatorRight={totalRegistros}
        globalFilter={globalFilter}
        globalFilterFields={['id', 'descripcion']}
        onValueChange={(data) => setVisibleCount(data.length)}
        header={tableHeader}
        emptyMessage="No hay ejercicios registrados"
        size="small"
        stripedRows
        removableSort
      >
        <Column field="id" header="Ejercicio" sortable style={{ width: '120px' }} />
        <Column field="descripcion" header="Descripción" sortable />
        <Column body={(row) => fechaTemplate(row, 'fecha_desde')} header="Fecha Desde" style={{ width: '120px' }} />
        <Column body={(row) => fechaTemplate(row, 'fecha_hasta')} header="Fecha Hasta" style={{ width: '120px' }} />
        <Column body={estadoTemplate} header="Estado" style={{ width: '130px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '100px', textAlign: 'center' }} />
      </DataTable>

      <Dialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        header={editMode ? 'Modificar ejercicio' : 'Agregar ejercicio'}
        footer={dialogFooter}
        style={{ width: '700px' }}
        modal
        draggable={false}
        resizable={false}
      >
        <div className="form-grid">
          {!editMode && (
            <div className="form-field">
              <label>Ejercicio <span className="required">*</span></label>
              <InputText name="id" value={form.id} onChange={handleChange} />
            </div>
          )}
          <div className="form-field">
            <label>Descripción</label>
            <InputText name="descripcion" value={form.descripcion} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label>Fecha Desde <span className="required">*</span></label>
            <Calendar value={form.fecha_desde} onChange={e => handleFieldChange('fecha_desde', e.value)} dateFormat="dd/mm/yy" showIcon />
          </div>
          <div className="form-field">
            <label>Fecha Hasta <span className="required">*</span></label>
            <Calendar value={form.fecha_hasta} onChange={e => handleFieldChange('fecha_hasta', e.value)} dateFormat="dd/mm/yy" showIcon />
          </div>
          <div className="form-field">
            <label>Estado</label>
            <Dropdown value={form.estado} options={ESTADO_OPTIONS} onChange={e => handleFieldChange('estado', e.value)} />
          </div>
          <div className="form-field">
            <label>Secuencia</label>
            <InputText name="secuencia" value={form.secuencia} onChange={handleChange} type="number" />
          </div>
          <div className="form-field">
            <label>Codificación</label>
            <Dropdown value={form.codificacion} options={CODIFICACION_OPTIONS} onChange={e => handleFieldChange('codificacion', e.value)} />
          </div>
          <div className="form-field">
            <label>Ordenamiento</label>
            <Dropdown value={form.ordenamiento} options={ORDENAMIENTO_OPTIONS} onChange={e => handleFieldChange('ordenamiento', e.value)} />
          </div>
          <div className="form-field form-field--checkbox">
            <label className="checkbox-label">
              <Checkbox checked={!!form.leyenda_asiento} onChange={e => handleFieldChange('leyenda_asiento', e.checked)} />
              Leyenda por asiento
            </label>
          </div>
          <div className="form-field form-field--checkbox">
            <label className="checkbox-label">
              <Checkbox checked={!!form.leyenda_cuenta} onChange={e => handleFieldChange('leyenda_cuenta', e.checked)} />
              Leyenda por cuenta
            </label>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
