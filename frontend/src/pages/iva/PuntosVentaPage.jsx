import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Checkbox } from 'primereact/checkbox';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import BuscadorTabla from '../../components/BuscadorTabla';
import * as api from '../../api/ivaPuntosVenta';
import { useEmpresa } from '../../context/EmpresaContext';
import BotonVolver from '../../components/BotonVolver';
import './iva.css';

const EMPTY_FORM = {
  punto: '', nombre: '', rubro: '', rubro_auto: false,
  condicion: '', condicion_auto: false, activo: true,
};

const SI_NO = v => v ? 'Sí' : 'No';

export default function PuntosVentaPage() {
  const { empresa } = useEmpresa();
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const toast = useRef(null);

  useEffect(() => { if (empresa) load(); }, [empresa?.id]);
  useEffect(() => { setVisibleCount(registros.length); }, [registros]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getPuntosVenta(empresa.id);
      setRegistros(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el listado de puntos de venta' });
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
      punto: row.punto,
      nombre: row.nombre ?? '',
      rubro: row.rubro ?? '',
      rubro_auto: row.rubro_auto ?? false,
      condicion: row.condicion ?? '',
      condicion_auto: row.condicion_auto ?? false,
      activo: row.activo ?? true,
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
    if (!editMode && !String(form.punto).trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El punto de venta es requerido' });
      return;
    }
    if (!form.nombre.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El nombre es requerido' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre,
        rubro: form.rubro,
        rubro_auto: form.rubro_auto,
        condicion: form.condicion,
        condicion_auto: form.condicion_auto,
        activo: form.activo,
      };
      if (editMode) {
        await api.updatePuntoVenta(form.punto, empresa.id, payload);
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Punto de venta actualizado' });
      } else {
        await api.createPuntoVenta({ punto: form.punto, empresa: empresa.id, ...payload });
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Punto de venta creado' });
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
      message: `¿Está seguro de eliminar el punto de venta "${row.punto} - ${row.nombre ?? ''}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deletePuntoVenta(row.punto, empresa.id);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Punto de venta eliminado' });
          load();
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

  const tableHeader = (
    <div className="table-toolbar my-2">
      <BuscadorTabla value={globalFilter} onChange={setGlobalFilter} />
      <Button label="Agregar punto de venta" icon="fa-solid fa-plus" size="small" onClick={openNew} />
    </div>
  );

  const hasPaginator = registros.length > 10;
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
        <h2 className="page-title"><i className="fa-solid fa-store" /> Punto de Venta</h2>
      </div>

      <DataTable
        value={registros}
        loading={loading}
        paginator={hasPaginator}
        rows={10}
        rowsPerPageOptions={[10, 15, 25, 50]}
        paginatorRight={totalRegistros}
        globalFilter={globalFilter}
        globalFilterFields={['punto', 'nombre']}
        onValueChange={(data) => setVisibleCount(data.length)}
        header={tableHeader}
        emptyMessage="No hay puntos de venta registrados"
        size="small"
        stripedRows
        removableSort
      >
        <Column field="punto" header="Punto" sortable style={{ width: '90px' }} />
        <Column field="nombre" header="Nombre" sortable />
        <Column field="rubro" header="Rubro" style={{ width: '140px' }} />
        <Column field="condicion" header="Condición" style={{ width: '140px' }} />
        <Column body={r => SI_NO(r.activo)} header="Activo" style={{ width: '90px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '100px', textAlign: 'center' }} />
      </DataTable>

      <Dialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        header={editMode ? 'Modificar punto de venta' : 'Agregar punto de venta'}
        footer={dialogFooter}
        style={{ width: '600px' }}
        modal
        draggable={false}
        resizable={false}
      >
        <div className="form-grid">
          {!editMode && (
            <div className="form-field">
              <label>Punto <span className="required">*</span></label>
              <InputText name="punto" value={form.punto} onChange={handleChange} type="number" />
            </div>
          )}
          <div className="form-field form-field--full">
            <label>Nombre <span className="required">*</span></label>
            <InputText name="nombre" value={form.nombre} onChange={handleChange} />
          </div>
          <div className="form-row-12">
            <div className="form-field" style={{ gridColumn: 'span 10' }}>
              <label>Rubro</label>
              <InputText name="rubro" value={form.rubro} onChange={handleChange} />
            </div>
            <div className="form-field form-field--checkbox" style={{ gridColumn: 'span 2' }}>
              <Checkbox inputId="rubro_auto" checked={!!form.rubro_auto} onChange={e => handleFieldChange('rubro_auto', e.checked)} />
              <label htmlFor="rubro_auto">Auto</label>
            </div>
          </div>
          <div className="form-row-12">
            <div className="form-field" style={{ gridColumn: 'span 6' }}>
              <label>Condición</label>
              <InputText name="condicion" value={form.condicion} onChange={handleChange} />
            </div>
            <div className="form-field form-field--checkbox" style={{ gridColumn: 'span 2' }}>
              <Checkbox inputId="condicion_auto" checked={!!form.condicion_auto} onChange={e => handleFieldChange('condicion_auto', e.checked)} />
              <label htmlFor="condicion_auto">Auto</label>
            </div>
            <div className="form-field form-field--checkbox" style={{ gridColumn: 'span 4' }}>
              <Checkbox inputId="activo" checked={!!form.activo} onChange={e => handleFieldChange('activo', e.checked)} />
              <label htmlFor="activo">Activo</label>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
