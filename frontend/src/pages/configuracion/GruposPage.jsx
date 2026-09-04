import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Checkbox } from 'primereact/checkbox';
import { TabView, TabPanel } from 'primereact/tabview';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import BuscadorTabla from '../../components/BuscadorTabla';
import * as api from '../../api/grupos';
import BotonVolver from '../../components/BotonVolver';
import './GruposPage.css';

const EMPTY_FORM = { id: null, nombre: '', descripcion: '', orden: null };

export default function GruposPage() {
  const [grupos, setGrupos]           = useState([]);
  const [loading, setLoading]         = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editMode, setEditMode]       = useState(false);
  const [activeTab, setActiveTab]     = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);
  const [usuariosGrupo, setUsuariosGrupo] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [savingUsuarios, setSavingUsuarios] = useState(false);
  const toast = useRef(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getGrupos();
      setGrupos(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los grupos' });
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setForm(EMPTY_FORM);
    setEditMode(false);
    setActiveTab(0);
    setUsuariosGrupo([]);
    setDialogVisible(true);
  }

  function openEdit(row) {
    setForm({ id: row.id, nombre: row.nombre, descripcion: row.descripcion ?? '', orden: row.orden });
    setEditMode(true);
    setActiveTab(0);
    setDialogVisible(true);
    cargarUsuariosGrupo(row.id);
  }

  async function cargarUsuariosGrupo(grupoId) {
    setLoadingUsuarios(true);
    try {
      const res = await api.getGrupoUsuarios(grupoId);
      setUsuariosGrupo(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los usuarios del grupo' });
    } finally {
      setLoadingUsuarios(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    if (!form.nombre.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El nombre es requerido' });
      return;
    }
    setSaving(true);
    try {
      if (editMode) {
        await api.updateGrupo(form.id, form);
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Grupo actualizado' });
      } else {
        await api.createGrupo(form);
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Grupo creado' });
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

  function toggleUsuario(usuarioId, asignado) {
    setUsuariosGrupo(prev => prev.map(u => u.id === usuarioId ? { ...u, asignado } : u));
  }

  async function guardarUsuarios() {
    setSavingUsuarios(true);
    try {
      const usuarioIds = usuariosGrupo.filter(u => u.asignado).map(u => u.id);
      await api.setGrupoUsuarios(form.id, usuarioIds);
      toast.current.show({ severity: 'success', summary: 'OK', detail: 'Usuarios del grupo actualizados' });
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la asignación' });
    } finally {
      setSavingUsuarios(false);
    }
  }

  function handleDelete(row) {
    confirmDialog({
      message: `¿Está seguro de eliminar el grupo "${row.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteGrupo(row.id);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Grupo eliminado' });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el grupo' });
        }
      },
    });
  }

  const tableHeader = (
    <div className="table-toolbar my-2">
      <BuscadorTabla value={globalFilter} onChange={setGlobalFilter} />
      <Button label="Agregar grupo" icon="fa-solid fa-plus" onClick={openNew} size="small" />
    </div>
  );

  const hasPaginator = grupos.length > 10;
  const totalRegistros = <span className="total-registros">Total: {visibleCount} registros</span>;
  const tableFooter = !hasPaginator && grupos.length > 0
    ? <div className="table-footer-right">{totalRegistros}</div>
    : null;

  const accionesTemplate = row => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-pen" className="p-button-text p-button-sm" tooltip="Modificar"
        tooltipOptions={{ position: 'top' }} onClick={() => openEdit(row)} />
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar"
        tooltipOptions={{ position: 'top' }} onClick={() => handleDelete(row)} />
    </div>
  );

  const dialogFooter = activeTab === 0 ? (
    <div className="dialog-footer-btns mt-2">
      <Button label="Cancelar" icon="fa-solid fa-xmark" className="p-button-text" onClick={() => setDialogVisible(false)} disabled={saving} />
      <Button label="Aceptar" icon="fa-solid fa-check" onClick={handleSave} loading={saving} />
    </div>
  ) : null;

  return (
    <div className="page-grupos">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-user-group" /> Grupos</h2>
      </div>

      <DataTable
        value={grupos}
        loading={loading}
        paginator={hasPaginator}
        rows={10}
        rowsPerPageOptions={[10, 15, 25, 50]}
        paginatorRight={totalRegistros}
        globalFilter={globalFilter}
        globalFilterFields={['nombre', 'descripcion']}
        onValueChange={(data) => setVisibleCount(data.length)}
        header={tableHeader}
        footer={tableFooter}
        emptyMessage="No hay grupos registrados"
        size="small"
        stripedRows
        removableSort
      >
        <Column field="nombre" header="Nombre" sortable style={{ width: '220px' }} />
        <Column field="descripcion" header="Descripción" sortable />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '100px', textAlign: 'center' }} />
      </DataTable>

      <Dialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        header={editMode ? 'Modificar grupo' : 'Agregar grupo'}
        footer={dialogFooter}
        style={{ width: '480px' }}
        modal
        draggable={false}
        resizable={false}
      >
        <TabView activeIndex={activeTab} onTabChange={e => setActiveTab(e.index)}>
          <TabPanel header="Grupo">
            <div className="form-grid">
              <div className="form-field form-field--full">
                <label>Nombre <span className="required">*</span></label>
                <InputText name="nombre" value={form.nombre} onChange={handleChange} />
              </div>
              <div className="form-field form-field--full">
                <label>Descripción</label>
                <InputText name="descripcion" value={form.descripcion} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Orden</label>
                <InputNumber value={form.orden} onValueChange={e => setForm(prev => ({ ...prev, orden: e.value }))} />
              </div>
            </div>
          </TabPanel>
          <TabPanel header="Usuarios" disabled={!editMode}>
            <div className="sub-tab">
              {loadingUsuarios ? (
                <p className="tab-empty-msg"><i className="fa-solid fa-spinner fa-spin" /> Cargando...</p>
              ) : (
                <ul className="grupo-usuarios-list">
                  {usuariosGrupo.map(u => (
                    <li key={u.id} className="grupo-usuarios-item">
                      <Checkbox inputId={`u-${u.id}`} checked={u.asignado} onChange={e => toggleUsuario(u.id, e.checked)} />
                      <label htmlFor={`u-${u.id}`}>{u.nombre} <span className="grupo-usuarios-login">({u.usuario})</span></label>
                    </li>
                  ))}
                </ul>
              )}
              <div className="sub-form-actions">
                <Button label="Guardar asignación" icon="fa-solid fa-check" size="small" onClick={guardarUsuarios} loading={savingUsuarios} />
              </div>
            </div>
          </TabPanel>
        </TabView>
      </Dialog>
    </div>
  );
}
