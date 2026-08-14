import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import BuscadorTabla from '../../../components/BuscadorTabla';
import * as api from '../../../api/liquidaciones';
import { toDate, toIsoDate } from '../../../utils/dates';
import './liquidaciones.css';

const TIPO_OPTIONS = [
  'MENSUAL', 'QUINCENA_1', 'QUINCENA_2', 'AGUINALDO', 'VACACIONES', 'RENUNCIA', 'DESPIDO', 'OTROS',
].map(v => ({ label: v.replaceAll('_', ' '), value: v }));

const ESTADO_OPTIONS = [
  { label: 'Abierta', value: 'ABIERTA' },
  { label: 'Cerrada', value: 'CERRADA' },
  { label: 'Activa', value: 'ACTIVA' },
];

const CONCEPTO_PREDEF_OPTIONS = [
  'TODO', 'GRUPAL', 'INDIVIDUAL', 'GENERAL', 'GRUPAL_INDIVIDUAL', 'GRUPAL_GENERAL', 'INDIVIDUAL_GENERAL',
].map(v => ({ label: v.replaceAll('_', ' + '), value: v }));

function periodoToDate(periodo) {
  const [mm, aaaa] = (periodo || '').split('/');
  if (!mm || !aaaa) return null;
  return new Date(Number(aaaa), Number(mm) - 1, 1);
}

function dateToPeriodo(date) {
  if (!date) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function mesAnteriorPeriodo() {
  const hoy = new Date();
  return dateToPeriodo(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1));
}

const EMPTY_FORM = {
  periodo: '', tipo: 'MENSUAL', estado: 'ABIERTA', fecha: null, fecha_desde: null, fecha_hasta: null,
  descripcion: '', concepto_predef: 'TODO', fecha_pago: null, lugar_pago: '',
  fecha_deposito: null, periodo_deposito: '', banco_deposito: '', orden: '',
};

export default function LiquidacionesPage() {
  const navigate = useNavigate();
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const toast = useRef(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getLiquidaciones();
      setLiquidaciones(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las liquidaciones' });
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setForm({ ...EMPTY_FORM, periodo: mesAnteriorPeriodo() });
    setEditMode(false);
    setDialogVisible(true);
  }

  function openEdit(row) {
    setForm({
      periodo: row.periodo, tipo: row.tipo ?? 'MENSUAL', estado: row.estado ?? 'ABIERTA',
      fecha: toDate(row.fecha), fecha_desde: toDate(row.fecha_desde), fecha_hasta: toDate(row.fecha_hasta),
      descripcion: row.descripcion ?? '', concepto_predef: row.concepto_predef ?? 'TODO',
      fecha_pago: toDate(row.fecha_pago), lugar_pago: row.lugar_pago ?? '',
      fecha_deposito: toDate(row.fecha_deposito), periodo_deposito: row.periodo_deposito ?? '',
      banco_deposito: row.banco_deposito ?? '', orden: row.orden ?? '',
    });
    setEditMode(true);
    setDialogVisible(true);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    if (!form.periodo.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El período es requerido' });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.periodo;
      payload.fecha = toIsoDate(form.fecha);
      payload.fecha_desde = toIsoDate(form.fecha_desde);
      payload.fecha_hasta = toIsoDate(form.fecha_hasta);
      payload.fecha_pago = toIsoDate(form.fecha_pago);
      payload.fecha_deposito = toIsoDate(form.fecha_deposito);

      if (editMode) {
        await api.updateLiquidacion(form.periodo, payload);
      } else {
        await api.createLiquidacion({ periodo: form.periodo, ...payload });
      }
      toast.current.show({ severity: 'success', summary: 'OK', detail: editMode ? 'Liquidación actualizada' : 'Liquidación creada' });
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
      message: `¿Está seguro de eliminar la liquidación "${row.periodo}"? Se eliminarán también todos sus recibos.`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteLiquidacion(row.periodo);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Liquidación eliminada' });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
        }
      },
    });
  }

  const fechaTemplate = field => (row) => row[field] ? new Date(row[field]).toLocaleDateString('es-AR') : '—';

  const estadoTemplate = (row) => {
    const cls = row.estado ? `estado-badge estado-badge--${row.estado.toLowerCase()}` : 'estado-badge';
    return <span className={cls}>{row.estado ?? '—'}</span>;
  };

  const accionesTemplate = (row) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-list" className="p-button-text p-button-sm" tooltip="Ver recibos" tooltipOptions={{ position: 'top' }}
        onClick={() => navigate(`/sueldos/liquidaciones/recibos?periodo=${encodeURIComponent(row.periodo)}`)} />
      <Button icon="fa-solid fa-bolt" className="p-button-text p-button-sm" tooltip="Generar recibos automáticos" tooltipOptions={{ position: 'top' }}
        onClick={() => navigate(`/sueldos/liquidaciones/recibos-automaticos?periodo=${encodeURIComponent(row.periodo)}`)} />
      <Button icon="fa-solid fa-pen" className="p-button-text p-button-sm" tooltip="Modificar" tooltipOptions={{ position: 'top' }} onClick={() => openEdit(row)} />
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar" tooltipOptions={{ position: 'top' }} onClick={() => handleDelete(row)} />
    </div>
  );

  const tableHeader = (
    <div className="table-toolbar my-2">
      <BuscadorTabla value={globalFilter} onChange={setGlobalFilter} />
      <Button label="Nueva liquidación" icon="fa-solid fa-plus" size="small" onClick={openNew} />
    </div>
  );

  const hasPaginator = liquidaciones.length > 10;
  const totalRegistros = <span className="total-registros">Total: {liquidaciones.length} registros</span>;
  const tableFooter = !hasPaginator && liquidaciones.length > 0
    ? <div className="table-footer-right">{totalRegistros}</div>
    : null;

  const dialogFooter = (
    <div className="dialog-footer-btns mt-2">
      <Button label="Cancelar" icon="fa-solid fa-xmark" className="p-button-text" onClick={() => setDialogVisible(false)} disabled={saving} />
      <Button label="Guardar" icon="fa-solid fa-check" onClick={handleSave} loading={saving} />
    </div>
  );

  return (
    <div className="page-liquidaciones">
      <Toast ref={toast} />
      <ConfirmDialog />

      <h2 className="page-title"><i className="fa-solid fa-calculator" /> Liquidaciones</h2>

      <DataTable
        value={liquidaciones}
        loading={loading}
        paginator={hasPaginator}
        rows={15}
        rowsPerPageOptions={[15, 25, 50, 100]}
        paginatorRight={totalRegistros}
        footer={tableFooter}
        globalFilter={globalFilter}
        globalFilterFields={['periodo', 'descripcion']}
        header={tableHeader}
        emptyMessage="No hay liquidaciones registradas"
        size="small"
        stripedRows
        removableSort
      >
        <Column field="periodo" header="Período" sortable style={{ width: '150px' }} />
        <Column field="descripcion" header="Descripción" sortable />
        <Column body={fechaTemplate('fecha')} header="Fecha" sortField="fecha" sortable style={{ width: '100px' }} />
        <Column body={fechaTemplate('fecha_desde')} header="Fecha Desde" sortField="fecha_desde" sortable style={{ width: '110px' }} />
        <Column body={fechaTemplate('fecha_hasta')} header="Fecha Hasta" sortField="fecha_hasta" sortable style={{ width: '110px' }} />
        <Column body={estadoTemplate} header="Estado" sortField="estado" sortable style={{ width: '110px' }} />
        <Column field="orden" header="Orden" sortable style={{ width: '80px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '160px', textAlign: 'center' }} />
      </DataTable>

      <Dialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        header={editMode ? 'Modificar liquidación' : 'Nueva liquidación'}
        footer={dialogFooter}
        style={{ width: '750px' }}
        modal
        draggable={false}
        resizable={false}
      >
        <div className="form-grid">
          <div className="form-row-12">
            <div className="form-field" style={{ gridColumn: 'span 4' }}>
              <label>Período <span className="required">*</span></label>
              <Calendar
                value={periodoToDate(form.periodo)}
                onChange={e => setForm(p => ({ ...p, periodo: dateToPeriodo(e.value) }))}
                view="month"
                dateFormat="mm/yy"
                disabled={editMode}
                placeholder="08/2026"
                showIcon
              />
            </div>
            <div className="form-field" style={{ gridColumn: 'span 4' }}>
              <label>Tipo</label>
              <Dropdown name="tipo" value={form.tipo} options={TIPO_OPTIONS} onChange={handleChange} showClear />
            </div>
            <div className="form-field" style={{ gridColumn: 'span 4' }}>
              <label>Estado</label>
              <Dropdown name="estado" value={form.estado} options={ESTADO_OPTIONS} onChange={handleChange} showClear />
            </div>
          </div>
          <div className="form-field form-field--full">
            <label>Descripción</label>
            <InputText name="descripcion" value={form.descripcion} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label>Fecha</label>
            <Calendar value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.value }))} dateFormat="dd/mm/yy" showIcon />
          </div>
          <div className="form-field">
            <label>Fecha Desde</label>
            <Calendar value={form.fecha_desde} onChange={e => setForm(p => ({ ...p, fecha_desde: e.value }))} dateFormat="dd/mm/yy" showIcon />
          </div>
          <div className="form-field">
            <label>Fecha Hasta</label>
            <Calendar value={form.fecha_hasta} onChange={e => setForm(p => ({ ...p, fecha_hasta: e.value }))} dateFormat="dd/mm/yy" showIcon />
          </div>
          <div className="form-field">
            <label>Fecha de Pago</label>
            <Calendar value={form.fecha_pago} onChange={e => setForm(p => ({ ...p, fecha_pago: e.value }))} dateFormat="dd/mm/yy" showIcon />
          </div>
          <div className="form-field form-field--full">
            <label>Lugar de Pago</label>
            <InputText name="lugar_pago" value={form.lugar_pago} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label>Conceptos</label>
            <Dropdown name="concepto_predef" value={form.concepto_predef} options={CONCEPTO_PREDEF_OPTIONS} onChange={handleChange} showClear />
          </div>
          <div className="form-field">
            <label>Orden</label>
            <InputText name="orden" value={form.orden} onChange={handleChange} type="number" />
          </div>
          <div className="form-field">
            <label>Último Depósito</label>
            <Calendar value={form.fecha_deposito} onChange={e => setForm(p => ({ ...p, fecha_deposito: e.value }))} dateFormat="dd/mm/yy" showIcon />
          </div>
          <div className="form-field">
            <label>Período Depósito</label>
            <InputText name="periodo_deposito" value={form.periodo_deposito} onChange={handleChange} />
          </div>
          <div className="form-field form-field--full">
            <label>Banco</label>
            <InputText name="banco_deposito" value={form.banco_deposito} onChange={handleChange} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
