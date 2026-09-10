import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { Calendar } from 'primereact/calendar';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import BuscadorTabla from '../../components/BuscadorTabla';
import api from '../../api/coeficientes';
import { toDate } from '../../utils/dates';
import BotonVolver from '../../components/BotonVolver';
import './contabilidad.css';

function toIsoMonth(d) {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-01`;
}

const EMPTY_FORM = { periodo: null, indice: null, indice_cierre: null, coeficiente: null };

// Serie de índices de inflación (IPIM) usada por "Ajuste por Inflación" para
// reexpresar saldos. indice_cierre/coeficiente son informativos acá (el
// proceso de ajuste calcula su propio coeficiente según la fecha de cierre
// que elija cada ejercicio, sin pisar esta tabla — ver ajusteInflacion.js).
export default function CoeficientesPage() {
  const [coeficientes, setCoeficientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const toast = useRef(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getAll();
      setCoeficientes(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los coeficientes' });
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
      periodo: toDate(row.id),
      indice: row.indice !== null ? Number(row.indice) : null,
      indice_cierre: row.indice_cierre !== null ? Number(row.indice_cierre) : null,
      coeficiente: row.coeficiente !== null ? Number(row.coeficiente) : null,
    });
    setEditMode(true);
    setDialogVisible(true);
  }

  function handleFieldChange(name, value) {
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    if (!form.periodo) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El período es requerido' });
      return;
    }
    if (form.indice === null || form.indice === undefined) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El índice es requerido' });
      return;
    }
    setSaving(true);
    try {
      const periodo = toIsoMonth(form.periodo);
      const payload = { indice: form.indice, indice_cierre: form.indice_cierre, coeficiente: form.coeficiente };
      if (editMode) {
        await api.update(periodo, payload);
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Coeficiente actualizado' });
      } else {
        await api.create({ id: periodo, ...payload });
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Coeficiente creado' });
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
      message: `¿Está seguro de eliminar el coeficiente del período "${periodoTemplate(row)}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.remove(row.id);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Coeficiente eliminado' });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
        }
      },
    });
  }

  const periodoTemplate = row => row.id
    ? new Date(row.id).toLocaleDateString('es-AR', { month: '2-digit', year: 'numeric' })
    : '—';
  const numeroTemplate = v => v === null || v === undefined ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

  const accionesTemplate = (row) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-pen" className="p-button-text p-button-sm" tooltip="Modificar" tooltipOptions={{ position: 'top' }} onClick={() => openEdit(row)} />
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar" tooltipOptions={{ position: 'top' }} onClick={() => handleDelete(row)} />
    </div>
  );

  const tableHeader = (
    <div className="table-toolbar my-2">
      <BuscadorTabla value={globalFilter} onChange={setGlobalFilter} />
      <Button label="Agregar coeficiente" icon="fa-solid fa-plus" size="small" onClick={openNew} />
    </div>
  );

  const hasPaginator = coeficientes.length > 15;
  const totalRegistros = <span className="total-registros">Total: {visibleCount} registros</span>;
  const tableFooter = !hasPaginator && coeficientes.length > 0
    ? <div className="table-footer-right">{totalRegistros}</div>
    : null;

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
        <h2 className="page-title"><i className="fa-solid fa-percent" /> Coeficientes</h2>
      </div>

      <DataTable
        value={coeficientes}
        loading={loading}
        paginator={hasPaginator}
        rows={15}
        rowsPerPageOptions={[15, 25, 50, 100]}
        paginatorRight={totalRegistros}
        footer={tableFooter}
        globalFilter={globalFilter}
        globalFilterFields={['indice']}
        onValueChange={(data) => setVisibleCount(data.length)}
        header={tableHeader}
        emptyMessage="No hay coeficientes cargados"
        size="small"
        stripedRows
        removableSort
      >
        <Column body={periodoTemplate} header="Período" sortField="id" sortable style={{ width: '140px' }} />
        <Column body={r => numeroTemplate(r.indice)} header="Índice" sortable sortField="indice" style={{ width: '140px' }} />
        <Column body={r => numeroTemplate(r.indice_cierre)} header="Índice de Cierre" style={{ width: '160px' }} />
        <Column body={r => numeroTemplate(r.coeficiente)} header="Coeficiente" style={{ width: '160px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '100px', textAlign: 'center' }} />
      </DataTable>

      <Dialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        header={editMode ? 'Modificar coeficiente' : 'Agregar coeficiente'}
        footer={dialogFooter}
        style={{ width: '480px' }}
        modal
        draggable={false}
        resizable={false}
      >
        <div className="form-grid">
          <div className="form-field">
            <label>Período <span className="required">*</span></label>
            <Calendar value={form.periodo} onChange={e => handleFieldChange('periodo', e.value)}
              view="month" dateFormat="mm/yy" showIcon disabled={editMode} />
          </div>
          <div className="form-field">
            <label>Índice <span className="required">*</span></label>
            <InputNumber value={form.indice} onValueChange={e => handleFieldChange('indice', e.value)} minFractionDigits={2} maxFractionDigits={4} />
          </div>
          <div className="form-field">
            <label>Índice de Cierre</label>
            <InputNumber value={form.indice_cierre} onValueChange={e => handleFieldChange('indice_cierre', e.value)} minFractionDigits={2} maxFractionDigits={4} />
          </div>
          <div className="form-field">
            <label>Coeficiente</label>
            <InputNumber value={form.coeficiente} onValueChange={e => handleFieldChange('coeficiente', e.value)} minFractionDigits={2} maxFractionDigits={12} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
