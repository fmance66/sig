import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import BuscadorTabla from '../../../components/BuscadorTabla';
import { informesPersonalizados, getCamposDisponibles } from '../../../api/informes';
import BotonVolver from '../../../components/BotonVolver';
import './informes.css';

const TABLA_OPTIONS = ['RECIBO', 'RECIBO_CONCEPTO', 'EMPLEADO', 'FAMILIAR'].map(v => ({ label: v, value: v }));
const AGRUPACION_OPTIONS = ['EMPLEADO', 'GRUPO', 'CONVENIO', 'CATEGORIA', 'OBRA_SOCIAL', 'CENTRO_DE_COSTO', 'MODALIDAD', 'PERIODO'].map(v => ({ label: v, value: v }));
const ORDENAMIENTO_OPTIONS = ['LEGAJO', 'APELLIDO', 'FECHA_ASC', 'FECHA_DES', 'CONCEPTO'].map(v => ({ label: v, value: v }));

const EMPTY_FORM = { id: '', descripcion: '', tabla: null, agrupacion: null, ordenamiento: 'LEGAJO', orden: '' };
const EMPTY_CAMPO = { campo_clave: null };

export default function DisenoInformesPersonalizadosPage() {
  const [informes, setInformes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);

  const [campos, setCampos] = useState([]);
  const [loadingCampos, setLoadingCampos] = useState(false);
  const [camposDisponibles, setCamposDisponibles] = useState([]);
  const [showCampoForm, setShowCampoForm] = useState(false);
  const [campoForm, setCampoForm] = useState(EMPTY_CAMPO);
  const [savingCampo, setSavingCampo] = useState(false);

  const toast = useRef(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await informesPersonalizados.getAll();
      setInformes(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el listado' });
    } finally {
      setLoading(false);
    }
  }

  async function loadCampos(id) {
    if (!id) { setCampos([]); return; }
    setLoadingCampos(true);
    try {
      const res = await informesPersonalizados.getCampos(id);
      setCampos(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los campos' });
    } finally {
      setLoadingCampos(false);
    }
  }

  function openNew() {
    setForm(EMPTY_FORM);
    setEditMode(false);
    setCampos([]);
    setCamposDisponibles([]);
    setShowCampoForm(false);
    setDialogVisible(true);
  }

  async function openEdit(row) {
    setForm({ id: row.id, descripcion: row.descripcion ?? '', tabla: row.tabla, agrupacion: row.agrupacion, ordenamiento: row.ordenamiento ?? 'LEGAJO', orden: row.orden ?? '' });
    setEditMode(true);
    setShowCampoForm(false);
    setDialogVisible(true);
    loadCampos(row.id);
    if (row.tabla) {
      const res = await getCamposDisponibles(row.tabla);
      setCamposDisponibles(res.data.resultado);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleTablaChange(tabla) {
    setForm(prev => ({ ...prev, tabla }));
    const res = await getCamposDisponibles(tabla);
    setCamposDisponibles(res.data.resultado);
  }

  async function handleSave() {
    if (!editMode && !form.id.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El código es requerido' });
      return;
    }
    if (!form.tabla) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'La tabla es requerida' });
      return;
    }
    setSaving(true);
    try {
      const payload = { descripcion: form.descripcion, tabla: form.tabla, agrupacion: form.agrupacion, ordenamiento: form.ordenamiento, orden: form.orden };
      if (editMode) {
        await informesPersonalizados.update(form.id, payload);
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Informe actualizado' });
      } else {
        await informesPersonalizados.create({ id: form.id, ...payload });
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Informe creado' });
        setEditMode(true);
      }
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
      message: `¿Está seguro de eliminar el informe "${row.descripcion || row.id}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await informesPersonalizados.remove(row.id);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Informe eliminado' });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
        }
      },
    });
  }

  async function handleSaveCampo() {
    if (!campoForm.campo_clave) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Elegí un campo' });
      return;
    }
    setSavingCampo(true);
    try {
      await informesPersonalizados.addCampo(form.id, campoForm);
      toast.current.show({ severity: 'success', summary: 'OK', detail: 'Campo agregado' });
      setShowCampoForm(false);
      setCampoForm(EMPTY_CAMPO);
      loadCampos(form.id);
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al guardar';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setSavingCampo(false);
    }
  }

  function handleDeleteCampo(row) {
    confirmDialog({
      message: `¿Quitar el campo "${row.descripcion}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await informesPersonalizados.removeCampo(form.id, row.campo);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Campo eliminado' });
          loadCampos(form.id);
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
        }
      },
    });
  }

  const accionesTemplate = (row) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-pen" className="p-button-text p-button-sm" tooltip="Modificar" tooltipOptions={{ position: 'top' }} onClick={() => openEdit(row)} />
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar" tooltipOptions={{ position: 'top' }} onClick={() => handleDelete(row)} />
    </div>
  );

  const accionesCampoTemplate = (row) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar" tooltipOptions={{ position: 'top' }} onClick={() => handleDeleteCampo(row)} />
    </div>
  );

  const tableHeader = (
    <div className="table-toolbar my-2">
      <BuscadorTabla value={globalFilter} onChange={setGlobalFilter} />
      <Button label="Agregar informe" icon="fa-solid fa-plus" size="small" onClick={openNew} />
    </div>
  );

  const hasPaginator = informes.length > 10;
  const totalRegistros = <span className="total-registros">Total: {visibleCount} registros</span>;

  const dialogFooter = (
    <div className="dialog-footer-btns mt-2">
      <Button label="Cerrar" icon="fa-solid fa-xmark" className="p-button-text" onClick={() => setDialogVisible(false)} disabled={saving} />
      <Button label="Guardar" icon="fa-solid fa-check" onClick={handleSave} loading={saving} />
    </div>
  );

  const campoOptions = camposDisponibles
    .filter(c => !campos.some(existing => existing.campo_clave === c.clave))
    .map(c => ({ label: c.label, value: c.clave }));

  return (
    <div className="page-informes">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-drafting-compass" /> Diseño de Informes Personalizados</h2>
      </div>

      <DataTable
        value={informes}
        loading={loading}
        paginator={hasPaginator}
        rows={10}
        rowsPerPageOptions={[10, 15, 25, 50]}
        paginatorRight={totalRegistros}
        globalFilter={globalFilter}
        globalFilterFields={['id', 'descripcion']}
        onValueChange={(data) => setVisibleCount(data.length)}
        header={tableHeader}
        emptyMessage="No hay informes personalizados registrados"
        size="small"
        stripedRows
        removableSort
      >
        <Column field="id" header="Informe" sortable style={{ width: '160px' }} />
        <Column field="descripcion" header="Descripción" sortable />
        <Column field="tabla" header="Tabla" style={{ width: '150px' }} />
        <Column field="agrupacion" header="Agrupación" style={{ width: '150px' }} />
        <Column field="orden" header="Orden" sortable style={{ width: '90px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '100px', textAlign: 'center' }} />
      </DataTable>

      <Dialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        header={editMode ? 'Modificar informe personalizado' : 'Agregar informe personalizado'}
        footer={dialogFooter}
        style={{ width: '760px' }}
        contentStyle={{ maxHeight: '78vh', overflowY: 'auto' }}
        modal
        draggable={false}
        resizable={false}
      >
        <div className="form-grid">
          {!editMode && (
            <div className="form-field">
              <label>Informe <span className="required">*</span></label>
              <InputText name="id" value={form.id} onChange={handleChange} />
            </div>
          )}
          <div className="form-field">
            <label>Descripción</label>
            <InputText name="descripcion" value={form.descripcion} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label>Tabla <span className="required">*</span></label>
            <Dropdown value={form.tabla} options={TABLA_OPTIONS} onChange={e => handleTablaChange(e.value)} placeholder="Seleccionar" disabled={editMode} />
          </div>
          <div className="form-field">
            <label>Agrupación</label>
            <Dropdown value={form.agrupacion} options={AGRUPACION_OPTIONS} onChange={e => setForm(p => ({ ...p, agrupacion: e.value }))} placeholder="Sin agrupar" showClear />
          </div>
          <div className="form-field">
            <label>Ordenamiento</label>
            <Dropdown value={form.ordenamiento} options={ORDENAMIENTO_OPTIONS} onChange={e => setForm(p => ({ ...p, ordenamiento: e.value }))} />
          </div>
          <div className="form-field">
            <label>Orden</label>
            <InputText name="orden" value={form.orden} onChange={handleChange} type="number" />
          </div>
        </div>

        <div className="form-section-title">Campos del Informe</div>

        {!editMode ? (
          <div className="tab-empty-msg">
            <i className="fa-solid fa-circle-info" />
            <span>Guardá primero el informe para agregarle campos.</span>
          </div>
        ) : (
          <div className="sub-tab">
            {showCampoForm && (
              <div className="sub-form">
                <div className="form-grid">
                  <div className="form-field form-field--full">
                    <label>Campo <span className="required">*</span></label>
                    <Dropdown value={campoForm.campo_clave} options={campoOptions}
                      onChange={e => setCampoForm({ campo_clave: e.value })} placeholder="Seleccionar campo" filter />
                  </div>
                </div>
                <div className="sub-form-actions">
                  <Button label="Cancelar" icon="fa-solid fa-xmark" className="p-button-text" onClick={() => { setShowCampoForm(false); setCampoForm(EMPTY_CAMPO); }} disabled={savingCampo} />
                  <Button label="Agregar" icon="fa-solid fa-check" onClick={handleSaveCampo} loading={savingCampo} />
                </div>
              </div>
            )}
            <div className="sub-tab-header">
              {!showCampoForm && (
                <Button label="Nuevo campo" icon="fa-solid fa-plus" size="small" onClick={() => setShowCampoForm(true)} />
              )}
            </div>
            <DataTable value={campos} loading={loadingCampos} emptyMessage="Este informe no tiene campos" size="small" stripedRows>
              <Column field="campo" header="#" style={{ width: '50px' }} />
              <Column field="descripcion" header="Descripción" />
              <Column field="campo_clave" header="Campo" style={{ width: '160px' }} />
              <Column field="data_type" header="Tipo de Dato" style={{ width: '120px' }} />
              <Column body={accionesCampoTemplate} header="Acciones" alignHeader="center" style={{ width: '70px', textAlign: 'center' }} />
            </DataTable>
          </div>
        )}
      </Dialog>
    </div>
  );
}
