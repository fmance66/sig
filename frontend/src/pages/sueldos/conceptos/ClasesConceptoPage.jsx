import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import BuscadorTabla from '../../../components/BuscadorTabla';
import * as api from '../../../api/clasesConcepto';
import BotonVolver from '../../../components/BotonVolver';
import './conceptos.css';

const EMPTY_FORM = { id: '', descripcion: '', orden: '' };
const EMPTY_GRUPO = { grupo: '', orden: '' };

export default function ClasesConceptoPage() {
  const [clases, setClases]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);

  const [grupos, setGrupos]         = useState([]);
  const [loadingGrupos, setLoadingGrupos] = useState(false);
  const [showGrupoForm, setShowGrupoForm] = useState(false);
  const [grupoForm, setGrupoForm]   = useState(EMPTY_GRUPO);
  const [savingGrupo, setSavingGrupo] = useState(false);

  const toast = useRef(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getClasesConcepto();
      setClases(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el listado de clases' });
    } finally {
      setLoading(false);
    }
  }

  async function loadGrupos(claseId) {
    if (!claseId) { setGrupos([]); return; }
    setLoadingGrupos(true);
    try {
      const res = await api.getGruposDeClase(claseId);
      setGrupos(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los grupos de la clase' });
    } finally {
      setLoadingGrupos(false);
    }
  }

  function openNew() {
    setForm(EMPTY_FORM);
    setEditMode(false);
    setGrupos([]);
    setShowGrupoForm(false);
    setDialogVisible(true);
  }

  function openEdit(row) {
    setForm({ id: row.id, descripcion: row.descripcion ?? '', orden: row.orden ?? '' });
    setEditMode(true);
    setShowGrupoForm(false);
    setDialogVisible(true);
    loadGrupos(row.id);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    if (!editMode && !form.id.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El código es requerido' });
      return;
    }
    if (!form.descripcion.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'La descripción es requerida' });
      return;
    }
    setSaving(true);
    try {
      const payload = { descripcion: form.descripcion, orden: form.orden };
      if (editMode) {
        await api.updateClaseConcepto(form.id, payload);
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Clase actualizada' });
      } else {
        await api.createClaseConcepto({ id: form.id, ...payload });
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Clase creada' });
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
      message: `¿Está seguro de eliminar la clase "${row.descripcion || row.id}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteClaseConcepto(row.id);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Clase eliminada' });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
        }
      },
    });
  }

  function handleGrupoChange(e) {
    const { name, value } = e.target;
    setGrupoForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSaveGrupo() {
    if (!grupoForm.grupo.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El grupo es requerido' });
      return;
    }
    setSavingGrupo(true);
    try {
      await api.addGrupoAClase(form.id, grupoForm);
      toast.current.show({ severity: 'success', summary: 'OK', detail: 'Grupo agregado' });
      setShowGrupoForm(false);
      setGrupoForm(EMPTY_GRUPO);
      loadGrupos(form.id);
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al guardar';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setSavingGrupo(false);
    }
  }

  function handleDeleteGrupo(row) {
    confirmDialog({
      message: `¿Está seguro de quitar el grupo "${row.grupo}" de esta clase?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.removeGrupoDeClase(form.id, row.grupo);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Grupo eliminado' });
          loadGrupos(form.id);
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

  const accionesGrupoTemplate = (row) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar" tooltipOptions={{ position: 'top' }} onClick={() => handleDeleteGrupo(row)} />
    </div>
  );

  const tableHeader = (
    <div className="table-toolbar my-2">
      <BuscadorTabla value={globalFilter} onChange={setGlobalFilter} />
      <Button label="Agregar clase" icon="fa-solid fa-plus" size="small" onClick={openNew} />
    </div>
  );

  const hasPaginator = clases.length > 10;
  const totalRegistros = <span className="total-registros">Total: {clases.length} registros</span>;

  const dialogFooter = (
    <div className="dialog-footer-btns mt-2">
      <Button label="Cerrar" icon="fa-solid fa-xmark" className="p-button-text" onClick={() => setDialogVisible(false)} disabled={saving} />
      <Button label="Guardar" icon="fa-solid fa-check" onClick={handleSave} loading={saving} />
    </div>
  );

  return (
    <div className="page-conceptos">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-lock" /> Clases de Concepto</h2>
      </div>

      <DataTable
        value={clases}
        loading={loading}
        paginator={hasPaginator}
        rows={10}
        rowsPerPageOptions={[10, 15, 25, 50]}
        paginatorRight={totalRegistros}
        globalFilter={globalFilter}
        globalFilterFields={['id', 'descripcion']}
        header={tableHeader}
        emptyMessage="No hay clases de concepto registradas"
        size="small"
        stripedRows
        removableSort
      >
        <Column field="id" header="Clase" sortable style={{ width: '180px' }} />
        <Column field="descripcion" header="Descripción" sortable />
        <Column field="orden" header="Orden" sortable style={{ width: '100px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '100px', textAlign: 'center' }} />
      </DataTable>

      <Dialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        header={editMode ? 'Modificar clase de concepto' : 'Agregar clase de concepto'}
        footer={dialogFooter}
        style={{ width: '700px' }}
        modal
        draggable={false}
        resizable={false}
      >
        <div className="form-grid">
          {!editMode && (
            <div className="form-field">
              <label>Clase <span className="required">*</span></label>
              <InputText name="id" value={form.id} onChange={handleChange} />
            </div>
          )}
          <div className="form-field">
            <label>Descripción <span className="required">*</span></label>
            <InputText name="descripcion" value={form.descripcion} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label>Orden</label>
            <InputText name="orden" value={form.orden} onChange={handleChange} type="number" />
          </div>
        </div>

        <div className="form-section-title">Grupos de la Clase</div>

        {!editMode ? (
          <div className="tab-empty-msg">
            <i className="fa-solid fa-circle-info" />
            <span>Guardá primero la clase para asignarle grupos.</span>
          </div>
        ) : (
          <div className="sub-tab">
            {showGrupoForm && (
              <div className="sub-form">
                <div className="form-grid">
                  <div className="form-field">
                    <label>Grupo <span className="required">*</span></label>
                    <InputText name="grupo" value={grupoForm.grupo} onChange={handleGrupoChange} />
                  </div>
                  <div className="form-field">
                    <label>Orden</label>
                    <InputText name="orden" value={grupoForm.orden} onChange={handleGrupoChange} type="number" />
                  </div>
                </div>
                <div className="sub-form-actions">
                  <Button label="Cancelar" icon="fa-solid fa-xmark" className="p-button-text" onClick={() => { setShowGrupoForm(false); setGrupoForm(EMPTY_GRUPO); }} disabled={savingGrupo} />
                  <Button label="Agregar" icon="fa-solid fa-check" onClick={handleSaveGrupo} loading={savingGrupo} />
                </div>
              </div>
            )}
            <div className="sub-tab-header">
              {!showGrupoForm && (
                <Button label="Nuevo grupo" icon="fa-solid fa-plus" size="small" onClick={() => setShowGrupoForm(true)} />
              )}
            </div>
            <DataTable value={grupos} loading={loadingGrupos} emptyMessage="Esta clase no tiene grupos asignados" size="small" stripedRows>
              <Column field="grupo" header="Grupo" style={{ width: '160px' }} />
              <Column field="descripcion" header="Descripción" />
              <Column field="orden" header="Orden" style={{ width: '100px' }} />
              <Column body={accionesGrupoTemplate} header="Acciones" alignHeader="center" style={{ width: '70px', textAlign: 'center' }} />
            </DataTable>
          </div>
        )}
      </Dialog>
    </div>
  );
}
