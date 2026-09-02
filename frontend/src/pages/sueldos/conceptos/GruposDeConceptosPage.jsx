import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { TabView, TabPanel } from 'primereact/tabview';
import BuscadorTabla from '../../../components/BuscadorTabla';
import * as api from '../../../api/gruposDeConceptos';
import { getConceptosGrupo } from '../../../api/conceptos';
import { useEmpresa } from '../../../context/EmpresaContext';
import ConceptosDeGrupoTab from './ConceptosDeGrupoTab';
import BotonVolver from '../../../components/BotonVolver';
import './conceptos.css';

const EMPTY_FORM = { id: '', descripcion: '', orden: '' };

export default function GruposDeConceptosPage() {
  const { empresa } = useEmpresa();
  const [grupos, setGrupos]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [expandedRows, setExpandedRows] = useState(null);
  const [conceptosPorGrupo, setConceptosPorGrupo] = useState({});
  const toast = useRef(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getGruposDeConceptos();
      setGrupos(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el listado de grupos de conceptos' });
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

  function openEdit(row) {
    setForm({ id: row.id, descripcion: row.descripcion ?? '', orden: row.orden ?? '' });
    setEditMode(true);
    setActiveTab(0);
    setDialogVisible(true);
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
        await api.updateGrupoDeConceptos(form.id, payload);
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Grupo de conceptos actualizado' });
      } else {
        await api.createGrupoDeConceptos({ id: form.id, ...payload });
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Grupo de conceptos creado' });
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
      message: `¿Está seguro de eliminar el grupo "${row.descripcion || row.id}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteGrupoDeConceptos(row.id);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Grupo de conceptos eliminado' });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
        }
      },
    });
  }

  async function onRowToggle(e) {
    setExpandedRows(e.data);
    const nuevos = Object.keys(e.data).filter(id => !(id in conceptosPorGrupo));
    for (const id of nuevos) {
      try {
        const res = await getConceptosGrupo(id, empresa.id);
        setConceptosPorGrupo(prev => ({ ...prev, [id]: res.data.resultado }));
      } catch {
        setConceptosPorGrupo(prev => ({ ...prev, [id]: [] }));
      }
    }
  }

  function rowExpansionTemplate(row) {
    const conceptos = conceptosPorGrupo[row.id] ?? [];
    return (
      <div className="row-expansion">
        <DataTable value={conceptos} size="small" stripedRows emptyMessage="Este grupo no tiene conceptos">
          <Column field="concepto"      header="Concepto"    style={{ width: '110px' }} />
          <Column field="concepto_desc" header="Descripción" />
          <Column field="unidad_manual" header="Unidad"      style={{ width: '90px' }} />
          <Column field="importe_manual" header="Importe"    style={{ width: '110px' }} />
          <Column field="liquidacion"   header="Liquidación" style={{ width: '130px' }} />
        </DataTable>
      </div>
    );
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
      <Button label="Agregar grupo de conceptos" icon="fa-solid fa-plus" size="small" onClick={openNew} />
    </div>
  );

  const hasPaginator = grupos.length > 10;
  const totalRegistros = <span className="total-registros">Total: {grupos.length} registros</span>;

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
        <h2 className="page-title"><i className="fa-solid fa-layer-group" /> Grupos de Conceptos</h2>
      </div>

      <DataTable
        value={grupos}
        loading={loading}
        paginator={hasPaginator}
        rows={10}
        rowsPerPageOptions={[10, 15, 25, 50]}
        paginatorRight={totalRegistros}
        globalFilter={globalFilter}
        globalFilterFields={['id', 'descripcion']}
        header={tableHeader}
        emptyMessage="No hay grupos de conceptos registrados"
        size="small"
        stripedRows
        removableSort
        expandedRows={expandedRows}
        onRowToggle={onRowToggle}
        rowExpansionTemplate={rowExpansionTemplate}
        dataKey="id"
      >
        <Column expander style={{ width: '3rem' }} />
        <Column field="id" header="Código" sortable style={{ width: '160px' }} />
        <Column field="descripcion" header="Descripción" sortable />
        <Column field="orden" header="Orden" sortable style={{ width: '100px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '100px', textAlign: 'center' }} />
      </DataTable>

      <Dialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        header={editMode ? 'Modificar grupo de conceptos' : 'Agregar grupo de conceptos'}
        footer={dialogFooter}
        style={{ width: '750px' }}
        modal
        draggable={false}
        resizable={false}
      >
        <TabView activeIndex={activeTab} onTabChange={e => setActiveTab(e.index)} className="conceptos-tabs">
          <TabPanel header="Grupo de Conceptos">
            <div className="form-grid">
              {!editMode && (
                <div className="form-field">
                  <label>Código <span className="required">*</span></label>
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
          </TabPanel>
          <TabPanel header="Conceptos">
            <ConceptosDeGrupoTab grupoId={editMode ? form.id : null} empresa={empresa?.id} toast={toast} />
          </TabPanel>
        </TabView>
      </Dialog>
    </div>
  );
}
