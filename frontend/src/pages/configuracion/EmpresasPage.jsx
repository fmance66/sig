import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { TabView, TabPanel } from 'primereact/tabview';
import SucursalesTab from './SucursalesTab';
import MailTab from './MailTab';
import * as api from '../../api/empresas';
import './EmpresasPage.css';

const EMPTY_FORM = {
  razon_social: '', nombre_comercial: '', cuit: '',
  condicion_iva: '', actividad: '', direccion: '', localidad: '',
  provincia: '', cpa: '', zona: '', telefono: '', email: '',
  webpage: '', observaciones: '', orden: '',
  mail_address: '', mail_account: '', mail_username: '', mail_password: '',
  smtp_host: '', smtp_port: '',
};

export default function EmpresasPage() {
  const [empresas, setEmpresas]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editMode, setEditMode]       = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);
  const [activeTab, setActiveTab]     = useState(0);
  const toast = useRef(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getEmpresas();
      setEmpresas(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las empresas' });
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setForm(EMPTY_FORM);
    setEditMode(false);
    setActiveTab(0);
    setDialogVisible(true);
  }

  function openEdit(empresa) {
    setForm({
      id:              empresa.id              ?? '',
      razon_social:    empresa.razon_social    ?? '',
      nombre_comercial:empresa.nombre_comercial?? '',
      cuit:            empresa.cuit            ?? '',
      condicion_iva:   empresa.condicion_iva   ?? '',
      actividad:       empresa.actividad       ?? '',
      direccion:       empresa.direccion       ?? '',
      localidad:       empresa.localidad       ?? '',
      provincia:       empresa.provincia       ?? '',
      cpa:             empresa.cpa             ?? '',
      zona:            empresa.zona            ?? '',
      telefono:        empresa.telefono        ?? '',
      email:           empresa.email           ?? '',
      webpage:         empresa.webpage         ?? '',
      observaciones:   empresa.observaciones   ?? '',
      orden:           empresa.orden           ?? '',
      mail_address:    empresa.mail_address    ?? '',
      mail_account:    empresa.mail_account    ?? '',
      mail_username:   empresa.mail_username   ?? '',
      mail_password:   empresa.mail_password   ?? '',
      smtp_host:       empresa.smtp_host       ?? '',
      smtp_port:       empresa.smtp_port       ?? '',
    });
    setEditMode(true);
    setActiveTab(0);
    setDialogVisible(true);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    if (!form.razon_social.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'La razón social es requerida' });
      return;
    }
    setSaving(true);
    try {
      if (editMode) {
        await api.updateEmpresa(form.id, form);
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Empresa actualizada' });
      } else {
        await api.createEmpresa(form);
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Empresa creada' });
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

  function handleDelete(empresa) {
    confirmDialog({
      message: `¿Está seguro de eliminar "${empresa.razon_social}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteEmpresa(empresa.id);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Empresa eliminada' });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la empresa' });
        }
      },
    });
  }

  const tableHeader = (
    <div className="table-toolbar my-2">
      <IconField iconPosition="left">
        <InputIcon className="fa-solid fa-magnifying-glass" />
        <InputText
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          placeholder="Buscar..."
        />
      </IconField>
      <Button label="Agregar empresa" icon="fa-solid fa-plus" onClick={openNew} size="small" />
    </div>
  );

  const hasPaginator = empresas.length > 10;
  const totalRegistros = <span className="total-registros">Total: {empresas.length} registros</span>;
  const tableFooter = !hasPaginator && empresas.length > 0
    ? <div className="table-footer-right">{totalRegistros}</div>
    : null;

  const accionesTemplate = (row) => (
    <div className="acciones-col">
      <Button
        icon="fa-solid fa-pen"
        className="p-button-text p-button-sm"
        tooltip="Modificar"
        tooltipOptions={{ position: 'top' }}
        onClick={() => openEdit(row)}
      />
      <Button
        icon="fa-solid fa-trash"
        className="p-button-text p-button-sm p-button-danger"
        tooltip="Eliminar"
        tooltipOptions={{ position: 'top' }}
        onClick={() => handleDelete(row)}
      />
    </div>
  );

  const dialogFooter = (
    <div className="dialog-footer-btns mt-2">
      <Button
        label="Cancelar"
        icon="fa-solid fa-xmark"
        className="p-button-text"
        onClick={() => setDialogVisible(false)}
        disabled={saving}
      />
      <Button
        label="Aceptar"
        icon="fa-solid fa-check"
        onClick={handleSave}
        loading={saving}
      />
    </div>
  );

  return (
    <div className="page-empresas">
      <Toast ref={toast} />
      <ConfirmDialog />

      <h2 className="page-title"><i className="fa-solid fa-building" /> Empresas</h2>

      <DataTable
        value={empresas}
        loading={loading}
        paginator={hasPaginator}
        rows={10}
        rowsPerPageOptions={[10, 15, 25, 50]}
        paginatorRight={totalRegistros}
        globalFilter={globalFilter}
        globalFilterFields={['cuit', 'razon_social', 'telefono']}
        header={tableHeader}
        footer={tableFooter}
        emptyMessage="No hay empresas registradas"
        size="small"
        stripedRows
        removableSort
      >
        <Column field="cuit"             header="CUIT"             sortable style={{ width: '160px' }} />
        <Column field="razon_social"     header="Razón Social"     sortable />
        <Column field="nombre_comercial" header="Nombre Comercial" sortable />
        <Column field="telefono"         header="Teléfono"         sortable style={{ width: '150px' }} />
        <Column body={accionesTemplate}  header="Acciones"  style={{ width: '100px', textAlign: 'center' }} />
      </DataTable>

      <Dialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        header={editMode ? 'Modificar empresa' : 'Agregar empresa'}
        footer={dialogFooter}
        style={{ width: '850px' }}
        modal
        draggable={false}
        resizable={false}
      >
        <TabView activeIndex={activeTab} onTabChange={e => setActiveTab(e.index)} className="empresa-tabs">

          <TabPanel header="Empresa">
            <div className="form-grid">
              <div className="form-field form-field--full">
                <label>Razón Social <span className="required">*</span></label>
                <InputText name="razon_social" value={form.razon_social} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Nombre Comercial</label>
                <InputText name="nombre_comercial" value={form.nombre_comercial} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>CUIT</label>
                <InputText name="cuit" value={form.cuit} onChange={handleChange} placeholder="30-00000000-0" />
              </div>
              <div className="form-field">
                <label>Condición IVA</label>
                <InputText name="condicion_iva" value={form.condicion_iva} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Teléfono</label>
                <InputText name="telefono" value={form.telefono} onChange={handleChange} />
              </div>
              <div className="form-field form-field--full">
                <label>Dirección</label>
                <InputText name="direccion" value={form.direccion} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Localidad</label>
                <InputText name="localidad" value={form.localidad} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Provincia</label>
                <InputText name="provincia" value={form.provincia} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Código Postal</label>
                <InputText name="cpa" value={form.cpa} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Email</label>
                <InputText name="email" value={form.email} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Página Web</label>
                <InputText name="webpage" value={form.webpage} onChange={handleChange} placeholder="https://..." />
              </div>
              <div className="form-field">
                <label>Actividad</label>
                <InputText name="actividad" value={form.actividad} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Orden</label>
                <InputText name="orden" value={form.orden} onChange={handleChange} type="number" />
              </div>
              <div className="form-field form-field--full">
                <label>Observaciones</label>
                <InputText name="observaciones" value={form.observaciones} onChange={handleChange} />
              </div>
            </div>
          </TabPanel>

          <TabPanel header="Sucursales">
            <SucursalesTab empresaId={editMode ? form.id : null} toast={toast} />
          </TabPanel>

          <TabPanel header="E-mail">
            <MailTab form={form} onChange={handleChange} />
          </TabPanel>

        </TabView>
      </Dialog>
    </div>
  );
}
