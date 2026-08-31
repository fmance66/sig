import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Checkbox } from 'primereact/checkbox';
import { Tag } from 'primereact/tag';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import BuscadorTabla from '../../components/BuscadorTabla';
import * as api from '../../api/usuarios';
import './UsuariosPage.css';

const EMPTY_FORM = { id: null, usuario: '', nombre: '', password: '', activo: true };

const fechaTemplate = v => v ? new Date(v).toLocaleString('es-AR') : '—';

export default function UsuariosPage() {
  const [usuarios, setUsuarios]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editMode, setEditMode]       = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);
  const toast = useRef(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getUsuarios();
      setUsuarios(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los usuarios' });
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
    setForm({ id: row.id, usuario: row.usuario, nombre: row.nombre, password: '', activo: row.activo });
    setEditMode(true);
    setDialogVisible(true);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    if (!form.usuario.trim() || !form.nombre.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Usuario y nombre son requeridos' });
      return;
    }
    if (!editMode && !form.password) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'La contraseña es requerida' });
      return;
    }
    setSaving(true);
    try {
      if (editMode) {
        await api.updateUsuario(form.id, form);
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Usuario actualizado' });
      } else {
        await api.createUsuario(form);
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Usuario creado' });
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
      message: `¿Está seguro de eliminar el usuario "${row.usuario}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteUsuario(row.id);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Usuario eliminado' });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el usuario' });
        }
      },
    });
  }

  const tableHeader = (
    <div className="table-toolbar my-2">
      <BuscadorTabla value={globalFilter} onChange={setGlobalFilter} />
      <Button label="Agregar usuario" icon="fa-solid fa-plus" onClick={openNew} size="small" />
    </div>
  );

  const hasPaginator = usuarios.length > 10;
  const totalRegistros = <span className="total-registros">Total: {usuarios.length} registros</span>;
  const tableFooter = !hasPaginator && usuarios.length > 0
    ? <div className="table-footer-right">{totalRegistros}</div>
    : null;

  const activoTemplate = row => (
    <Tag value={row.activo ? 'Activo' : 'Inactivo'} severity={row.activo ? 'success' : 'danger'} />
  );

  const accionesTemplate = row => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-pen" className="p-button-text p-button-sm" tooltip="Modificar"
        tooltipOptions={{ position: 'top' }} onClick={() => openEdit(row)} />
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar"
        tooltipOptions={{ position: 'top' }} onClick={() => handleDelete(row)} />
    </div>
  );

  const dialogFooter = (
    <div className="dialog-footer-btns mt-2">
      <Button label="Cancelar" icon="fa-solid fa-xmark" className="p-button-text" onClick={() => setDialogVisible(false)} disabled={saving} />
      <Button label="Aceptar" icon="fa-solid fa-check" onClick={handleSave} loading={saving} />
    </div>
  );

  return (
    <div className="page-usuarios">
      <Toast ref={toast} />
      <ConfirmDialog />

      <h2 className="page-title"><i className="fa-solid fa-user" /> Usuarios</h2>

      <DataTable
        value={usuarios}
        loading={loading}
        paginator={hasPaginator}
        rows={10}
        rowsPerPageOptions={[10, 15, 25, 50]}
        paginatorRight={totalRegistros}
        globalFilter={globalFilter}
        globalFilterFields={['usuario', 'nombre']}
        header={tableHeader}
        footer={tableFooter}
        emptyMessage="No hay usuarios registrados"
        size="small"
        stripedRows
        removableSort
      >
        <Column field="usuario" header="Usuario" sortable style={{ width: '160px' }} />
        <Column field="nombre" header="Nombre" sortable />
        <Column body={activoTemplate} header="Estado" style={{ width: '110px' }} />
        <Column body={row => fechaTemplate(row.ultimo_login)} header="Último acceso" sortable sortField="ultimo_login" style={{ width: '180px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '100px', textAlign: 'center' }} />
      </DataTable>

      <Dialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        header={editMode ? 'Modificar usuario' : 'Agregar usuario'}
        footer={dialogFooter}
        style={{ width: '420px' }}
        modal
        draggable={false}
        resizable={false}
      >
        <div className="form-grid">
          <div className="form-field form-field--full">
            <label>Usuario <span className="required">*</span></label>
            <InputText name="usuario" value={form.usuario} onChange={handleChange} />
          </div>
          <div className="form-field form-field--full">
            <label>Nombre <span className="required">*</span></label>
            <InputText name="nombre" value={form.nombre} onChange={handleChange} />
          </div>
          <div className="form-field form-field--full">
            <label>{editMode ? 'Restablecer contraseña' : 'Contraseña'} {!editMode && <span className="required">*</span>}</label>
            <Password
              name="password" value={form.password} onChange={handleChange}
              feedback={false} toggleMask inputClassName="usuarios-password-input"
              placeholder={editMode ? 'Dejar en blanco para no cambiarla' : ''}
            />
          </div>
          <div className="form-field form-field--checkbox form-field--full">
            <Checkbox inputId="activo" checked={form.activo} onChange={e => setForm(prev => ({ ...prev, activo: e.checked }))} />
            <label htmlFor="activo">Usuario activo</label>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
