import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import BuscadorTabla from '../../components/BuscadorTabla';
import * as api from '../../api/ivaPeriodos';
import { useEmpresa } from '../../context/EmpresaContext';
import { toDate, toIsoDate } from '../../utils/dates';
import BotonVolver from '../../components/BotonVolver';
import './iva.css';

const ESTADO_OPTIONS = [
  { label: 'Abierta', value: 'ABIERTA' },
  { label: 'Cerrada', value: 'CERRADA' },
  { label: 'Activa', value: 'ACTIVA' },
];
const MODULO_OPTIONS = [
  { label: 'Compra', value: 'COMPRA' },
  { label: 'Venta', value: 'VENTA' },
];

const EMPTY_FORM = {
  periodo: '', fecha_desde: null, fecha_hasta: null,
  prorrateo: null, estado: 'ABIERTA', modulo_activo: 'COMPRA',
};

export default function PeriodosPage() {
  const { empresa } = useEmpresa();
  const [periodos, setPeriodos] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const toast = useRef(null);

  useEffect(() => { if (empresa) load(); }, [empresa?.id]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getPeriodos(empresa.id);
      setPeriodos(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el listado de períodos' });
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
      periodo: row.periodo,
      fecha_desde: toDate(row.fecha_desde),
      fecha_hasta: toDate(row.fecha_hasta),
      prorrateo: row.prorrateo ?? null,
      estado: row.estado ?? 'ABIERTA',
      modulo_activo: row.modulo_activo ?? 'COMPRA',
    });
    setEditMode(true);
    setDialogVisible(true);
  }

  function handleFieldChange(name, value) {
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    if (!editMode && !String(form.periodo).trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El período es requerido' });
      return;
    }
    if (!form.fecha_desde || !form.fecha_hasta) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Las fechas desde/hasta son requeridas' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        fecha_desde: toIsoDate(form.fecha_desde),
        fecha_hasta: toIsoDate(form.fecha_hasta),
        prorrateo: form.prorrateo,
        estado: form.estado,
        modulo_activo: form.modulo_activo,
      };
      if (editMode) {
        await api.updatePeriodo(form.periodo, empresa.id, payload);
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Período actualizado' });
      } else {
        await api.createPeriodo({ periodo: form.periodo, empresa: empresa.id, ...payload });
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Período creado' });
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
      message: `¿Está seguro de eliminar el período "${row.periodo}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deletePeriodo(row.periodo, empresa.id);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Período eliminado' });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
        }
      },
    });
  }

  const estadoTemplate = (row) => {
    const icon = row.estado === 'CERRADA' ? 'fa-lock' : 'fa-lock-open';
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
      <Button label="Agregar período" icon="fa-solid fa-plus" size="small" onClick={openNew} />
    </div>
  );

  const hasPaginator = periodos.length > 10;
  const totalRegistros = <span className="total-registros">Total: {visibleCount} registros</span>;

  const dialogFooter = (
    <div className="dialog-footer-btns mt-2">
      <Button label="Cancelar" icon="fa-solid fa-xmark" className="p-button-text" onClick={() => setDialogVisible(false)} disabled={saving} />
      <Button label="Guardar" icon="fa-solid fa-check" onClick={handleSave} loading={saving} />
    </div>
  );

  return (
    <div className="page-iva">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-calendar-days" /> Períodos</h2>
      </div>

      <DataTable
        value={periodos}
        loading={loading}
        paginator={hasPaginator}
        rows={10}
        rowsPerPageOptions={[10, 15, 25, 50]}
        paginatorRight={totalRegistros}
        globalFilter={globalFilter}
        globalFilterFields={['periodo']}
        onValueChange={(data) => setVisibleCount(data.length)}
        header={tableHeader}
        emptyMessage="No hay períodos registrados"
        size="small"
        stripedRows
        removableSort
      >
        <Column field="periodo" header="Período" sortable style={{ width: '120px' }} />
        <Column body={(row) => fechaTemplate(row, 'fecha_desde')} header="Fecha Desde" style={{ width: '120px' }} />
        <Column body={(row) => fechaTemplate(row, 'fecha_hasta')} header="Fecha Hasta" style={{ width: '120px' }} />
        <Column field="modulo_activo" header="Módulo Activo" style={{ width: '130px' }} />
        <Column body={estadoTemplate} header="Estado" style={{ width: '130px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '100px', textAlign: 'center' }} />
      </DataTable>

      <Dialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        header={editMode ? 'Modificar período' : 'Agregar período'}
        footer={dialogFooter}
        style={{ width: '650px' }}
        modal
        draggable={false}
        resizable={false}
      >
        <div className="form-grid">
          {!editMode && (
            <div className="form-field">
              <label>Período <span className="required">*</span></label>
              <InputText value={form.periodo} onChange={e => handleFieldChange('periodo', e.target.value)} placeholder="AAAAMM" />
            </div>
          )}
          <div className="form-field">
            <label>Fecha Desde <span className="required">*</span></label>
            <Calendar value={form.fecha_desde} onChange={e => handleFieldChange('fecha_desde', e.value)} dateFormat="dd/mm/yy" showIcon />
          </div>
          <div className="form-field">
            <label>Fecha Hasta <span className="required">*</span></label>
            <Calendar value={form.fecha_hasta} onChange={e => handleFieldChange('fecha_hasta', e.value)} dateFormat="dd/mm/yy" showIcon />
          </div>
          <div className="form-field">
            <label>Módulo Activo</label>
            <Dropdown value={form.modulo_activo} options={MODULO_OPTIONS} onChange={e => handleFieldChange('modulo_activo', e.value)} />
          </div>
          <div className="form-field">
            <label>Estado</label>
            <Dropdown value={form.estado} options={ESTADO_OPTIONS} onChange={e => handleFieldChange('estado', e.value)} />
          </div>
          <div className="form-field">
            <label>Prorrateo</label>
            <InputNumber value={form.prorrateo} suffix="%" minFractionDigits={0} maxFractionDigits={2}
              onValueChange={e => handleFieldChange('prorrateo', e.value)} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
