import { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { toIsoDate } from '../../utils/dates';
import * as api from '../../api/conceptos';

const LIQUIDACION_OPTIONS = [
  'MENSUAL', 'QUINCENA_1', 'QUINCENA_2', 'AGUINALDO', 'VACACIONES', 'RENUNCIA', 'DESPIDO', 'OTROS',
].map(v => ({ label: v.replace('_', ' '), value: v }));

const EMPTY = {
  concepto: '', liquidacion: 'MENSUAL', unidad_manual: '', importe_manual: '',
  vigencia_desde: null, vigencia_hasta: null,
};

function vigenciaTemplate(row) {
  const desde = row.vigencia_desde ? new Date(row.vigencia_desde).toLocaleDateString('es-AR') : '';
  const hasta = row.vigencia_hasta ? new Date(row.vigencia_hasta).toLocaleDateString('es-AR') : '';
  if (!desde && !hasta) return '—';
  return `${desde} - ${hasta}`;
}

export default function ConceptosTab({ empleadoId, grupoDeConceptos, toast }) {
  const [grupales, setGrupales]     = useState([]);
  const [loadingGrupales, setLoadingGrupales] = useState(false);
  const [individuales, setIndividuales] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(EMPTY);
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (empleadoId) loadIndividuales();
  }, [empleadoId]);

  useEffect(() => {
    loadGrupales();
  }, [grupoDeConceptos]);

  async function loadIndividuales() {
    setLoading(true);
    try {
      const res = await api.getConceptosEmpleado(empleadoId);
      setIndividuales(res.data.resultado);
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los conceptos' });
    } finally {
      setLoading(false);
    }
  }

  async function loadGrupales() {
    if (!grupoDeConceptos) {
      setGrupales([]);
      return;
    }
    setLoadingGrupales(true);
    try {
      const res = await api.getConceptosGrupo(grupoDeConceptos);
      setGrupales(res.data.resultado);
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los conceptos grupales' });
    } finally {
      setLoadingGrupales(false);
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
    if (!form.concepto.trim()) {
      toast.current?.show({ severity: 'warn', summary: 'Atención', detail: 'El concepto es requerido' });
      return;
    }
    setSaving(true);
    try {
      await api.createConceptoEmpleado({
        empleado: empleadoId,
        concepto: form.concepto,
        liquidacion: form.liquidacion,
        unidad_manual: form.unidad_manual,
        importe_manual: form.importe_manual,
        vigencia_desde: toIsoDate(form.vigencia_desde),
        vigencia_hasta: toIsoDate(form.vigencia_hasta),
      });
      toast.current?.show({ severity: 'success', summary: 'OK', detail: 'Concepto agregado' });
      cancelForm();
      loadIndividuales();
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al guardar';
      toast.current?.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(row) {
    confirmDialog({
      message: `¿Está seguro de eliminar el concepto "${row.concepto}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteConceptoEmpleado(empleadoId, row.concepto, row.liquidacion, row.recibo);
          toast.current?.show({ severity: 'success', summary: 'OK', detail: 'Concepto eliminado' });
          loadIndividuales();
        } catch {
          toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
        }
      },
    });
  }

  const accionesTemplate = (row) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar" tooltipOptions={{ position: 'top' }} onClick={() => handleDelete(row)} />
    </div>
  );

  return (
    <div className="sub-tab">
      <ConfirmDialog />

      <div className="form-section-title">Conceptos Grupales</div>
      <DataTable
        value={grupales}
        loading={loadingGrupales}
        emptyMessage={grupoDeConceptos ? 'No hay conceptos para este grupo' : 'El empleado no tiene grupo de conceptos asignado'}
        size="small"
        stripedRows
      >
        <Column field="concepto"      header="Concepto"    style={{ width: '110px' }} />
        <Column field="concepto_desc" header="Descripción" />
        <Column field="simbolo_unidad" header="Unidad"     style={{ width: '90px' }} />
        <Column field="importe_manual" header="Importe"    style={{ width: '110px' }} />
        <Column field="liquidacion"   header="Liquidación"  style={{ width: '130px' }} />
        <Column body={vigenciaTemplate} header="Vigencia"  style={{ width: '170px' }} />
      </DataTable>

      <div className="form-section-title">Conceptos Individuales</div>

      {!empleadoId ? (
        <div className="tab-empty-msg">
          <i className="fa-solid fa-circle-info" />
          <span>Guardá primero el legajo para administrar conceptos individuales.</span>
        </div>
      ) : (
        <>
          {showForm && (
            <div className="sub-form">
              <div className="form-grid">
                <div className="form-field">
                  <label>Concepto <span className="required">*</span></label>
                  <InputText name="concepto" value={form.concepto} onChange={handleChange} />
                </div>
                <div className="form-field">
                  <label>Liquidación</label>
                  <Dropdown name="liquidacion" value={form.liquidacion} options={LIQUIDACION_OPTIONS} onChange={handleChange} />
                </div>
                <div className="form-field">
                  <label>Unidad</label>
                  <InputText name="unidad_manual" value={form.unidad_manual} onChange={handleChange} type="number" />
                </div>
                <div className="form-field">
                  <label>Importe</label>
                  <InputText name="importe_manual" value={form.importe_manual} onChange={handleChange} type="number" />
                </div>
                <div className="form-field">
                  <label>Desde</label>
                  <Calendar value={form.vigencia_desde} onChange={e => setForm(p => ({ ...p, vigencia_desde: e.value }))} dateFormat="dd/mm/yy" showIcon />
                </div>
                <div className="form-field">
                  <label>Hasta</label>
                  <Calendar value={form.vigencia_hasta} onChange={e => setForm(p => ({ ...p, vigencia_hasta: e.value }))} dateFormat="dd/mm/yy" showIcon />
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
              <Button label="Nuevo concepto" icon="fa-solid fa-plus" size="small" onClick={openNew} />
            )}
          </div>

          <DataTable
            value={individuales}
            loading={loading}
            emptyMessage="No hay conceptos individuales registrados"
            size="small"
            stripedRows
          >
            <Column field="concepto"      header="Concepto"    style={{ width: '110px' }} />
            <Column field="concepto_desc" header="Descripción" />
            <Column field="unidad_manual" header="Unidad"      style={{ width: '90px' }} />
            <Column field="importe_manual" header="Importe"    style={{ width: '110px' }} />
            <Column field="liquidacion"   header="Liquidación" style={{ width: '130px' }} />
            <Column body={vigenciaTemplate} header="Vigencia"  style={{ width: '170px' }} />
            <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '70px', textAlign: 'center' }} />
          </DataTable>
        </>
      )}
    </div>
  );
}
