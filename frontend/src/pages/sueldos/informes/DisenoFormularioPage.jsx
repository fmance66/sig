import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import BuscadorTabla from '../../../components/BuscadorTabla';
import './informes.css';

const ORIENTACION_OPTIONS = [{ label: 'Vertical', value: 'VERTICAL' }, { label: 'Horizontal', value: 'HORIZONTAL' }];
const PAGINA_OPTIONS = ['A4', 'A5', 'TICKET', 'LEGAL', 'LETTER', 'CUSTOM'].map(v => ({ label: v, value: v }));

const EMPTY_FORM = {
  id: '', descripcion: '', orientacion: 'VERTICAL', pagina: 'A4',
  margen_superior: '', margen_inferior: '', margen_izquierdo: '', margen_derecho: '',
  columnas: '', filas: '', copias: '', propiedad: '', etiquetas: false, orden: '',
};
const EMPTY_PARAM = { parametro: '', descripcion: '', texto: '', x: '', y: '', ancho: '', alto: '', orden: '' };

// Pantalla compartida por "Diseño de Recibos de Sueldo" y "Diseño de Libro
// de Sueldos" — mismo esquema de tablas (cabecera de formulario + grilla de
// parámetros con posición X/Y/Ancho/Alto). Por ahora es gestión de
// metadatos: el PDF real usa una plantilla fija en código (ver plan).
export default function DisenoFormularioPage({ api, titulo, icono }) {
  const [formularios, setFormularios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [parametros, setParametros] = useState([]);
  const [loadingParametros, setLoadingParametros] = useState(false);
  const [showParamForm, setShowParamForm] = useState(false);
  const [paramForm, setParamForm] = useState(EMPTY_PARAM);
  const [savingParam, setSavingParam] = useState(false);

  const toast = useRef(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getAll();
      setFormularios(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el listado' });
    } finally {
      setLoading(false);
    }
  }

  async function loadParametros(id) {
    if (!id) { setParametros([]); return; }
    setLoadingParametros(true);
    try {
      const res = await api.getParametros(id);
      setParametros(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los parámetros' });
    } finally {
      setLoadingParametros(false);
    }
  }

  function openNew() {
    setForm(EMPTY_FORM);
    setEditMode(false);
    setParametros([]);
    setShowParamForm(false);
    setDialogVisible(true);
  }

  function openEdit(row) {
    setForm({
      id: row.id, descripcion: row.descripcion ?? '', orientacion: row.orientacion ?? 'VERTICAL', pagina: row.pagina ?? 'A4',
      margen_superior: row.margen_superior ?? '', margen_inferior: row.margen_inferior ?? '',
      margen_izquierdo: row.margen_izquierdo ?? '', margen_derecho: row.margen_derecho ?? '',
      columnas: row.columnas ?? '', filas: row.filas ?? '', copias: row.copias ?? '',
      propiedad: row.propiedad ?? '', etiquetas: row.etiquetas ?? false, orden: row.orden ?? '',
    });
    setEditMode(true);
    setShowParamForm(false);
    setDialogVisible(true);
    loadParametros(row.id);
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
      const { id, ...payload } = form;
      if (editMode) {
        await api.update(form.id, payload);
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Formulario actualizado' });
      } else {
        await api.create(form);
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Formulario creado' });
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
      message: `¿Está seguro de eliminar el formulario "${row.descripcion || row.id}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.remove(row.id);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Formulario eliminado' });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
        }
      },
    });
  }

  function handleParamChange(e) {
    const { name, value } = e.target;
    setParamForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSaveParam() {
    if (!paramForm.parametro.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El parámetro es requerido' });
      return;
    }
    setSavingParam(true);
    try {
      await api.addParametro(form.id, paramForm);
      toast.current.show({ severity: 'success', summary: 'OK', detail: 'Parámetro agregado' });
      setShowParamForm(false);
      setParamForm(EMPTY_PARAM);
      loadParametros(form.id);
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al guardar';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setSavingParam(false);
    }
  }

  function handleDeleteParam(row) {
    confirmDialog({
      message: `¿Quitar el parámetro "${row.parametro}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.removeParametro(form.id, row.parametro);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Parámetro eliminado' });
          loadParametros(form.id);
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

  const accionesParamTemplate = (row) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar" tooltipOptions={{ position: 'top' }} onClick={() => handleDeleteParam(row)} />
    </div>
  );

  const tableHeader = (
    <div className="table-toolbar my-2">
      <BuscadorTabla value={globalFilter} onChange={setGlobalFilter} />
      <Button label="Agregar formulario" icon="fa-solid fa-plus" size="small" onClick={openNew} />
    </div>
  );

  const hasPaginator = formularios.length > 10;
  const totalRegistros = <span className="total-registros">Total: {formularios.length} registros</span>;

  const dialogFooter = (
    <div className="dialog-footer-btns mt-2">
      <Button label="Cerrar" icon="fa-solid fa-xmark" className="p-button-text" onClick={() => setDialogVisible(false)} disabled={saving} />
      <Button label="Guardar" icon="fa-solid fa-check" onClick={handleSave} loading={saving} />
    </div>
  );

  return (
    <div className="page-informes">
      <Toast ref={toast} />
      <ConfirmDialog />

      <h2 className="page-title"><i className={icono} /> {titulo}</h2>

      <DataTable
        value={formularios}
        loading={loading}
        paginator={hasPaginator}
        rows={10}
        rowsPerPageOptions={[10, 15, 25, 50]}
        paginatorRight={totalRegistros}
        globalFilter={globalFilter}
        globalFilterFields={['id', 'descripcion']}
        header={tableHeader}
        emptyMessage="No hay formularios registrados"
        size="small"
        stripedRows
        removableSort
      >
        <Column field="id" header="Formulario" sortable style={{ width: '160px' }} />
        <Column field="descripcion" header="Descripción" sortable />
        <Column field="orientacion" header="Orientación" style={{ width: '120px' }} />
        <Column field="pagina" header="Página" style={{ width: '100px' }} />
        <Column field="orden" header="Orden" sortable style={{ width: '90px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '100px', textAlign: 'center' }} />
      </DataTable>

      <Dialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        header={editMode ? `Modificar ${titulo.toLowerCase()}` : `Agregar ${titulo.toLowerCase()}`}
        footer={dialogFooter}
        style={{ width: '820px' }}
        contentStyle={{ maxHeight: '78vh', overflowY: 'auto' }}
        modal
        draggable={false}
        resizable={false}
      >
        <div className="form-grid">
          {!editMode && (
            <div className="form-field">
              <label>Formulario <span className="required">*</span></label>
              <InputText name="id" value={form.id} onChange={handleChange} />
            </div>
          )}
          <div className="form-field">
            <label>Descripción <span className="required">*</span></label>
            <InputText name="descripcion" value={form.descripcion} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label>Orientación</label>
            <Dropdown value={form.orientacion} options={ORIENTACION_OPTIONS} onChange={e => setForm(p => ({ ...p, orientacion: e.value }))} />
          </div>
          <div className="form-field">
            <label>Página</label>
            <Dropdown value={form.pagina} options={PAGINA_OPTIONS} onChange={e => setForm(p => ({ ...p, pagina: e.value }))} />
          </div>
          <div className="form-row-12">
            <div className="form-field" style={{ gridColumn: 'span 3' }}>
              <label>Margen Superior</label>
              <InputText name="margen_superior" value={form.margen_superior} onChange={handleChange} type="number" />
            </div>
            <div className="form-field" style={{ gridColumn: 'span 3' }}>
              <label>Margen Inferior</label>
              <InputText name="margen_inferior" value={form.margen_inferior} onChange={handleChange} type="number" />
            </div>
            <div className="form-field" style={{ gridColumn: 'span 3' }}>
              <label>Margen Izquierdo</label>
              <InputText name="margen_izquierdo" value={form.margen_izquierdo} onChange={handleChange} type="number" />
            </div>
            <div className="form-field" style={{ gridColumn: 'span 3' }}>
              <label>Margen Derecho</label>
              <InputText name="margen_derecho" value={form.margen_derecho} onChange={handleChange} type="number" />
            </div>
          </div>
          <div className="form-row-12">
            <div className="form-field" style={{ gridColumn: 'span 3' }}>
              <label>Columnas</label>
              <InputText name="columnas" value={form.columnas} onChange={handleChange} type="number" />
            </div>
            <div className="form-field" style={{ gridColumn: 'span 3' }}>
              <label>Filas</label>
              <InputText name="filas" value={form.filas} onChange={handleChange} type="number" />
            </div>
            <div className="form-field" style={{ gridColumn: 'span 3' }}>
              <label>Copias</label>
              <InputText name="copias" value={form.copias} onChange={handleChange} type="number" />
            </div>
            <div className="form-field form-field--checkbox" style={{ gridColumn: 'span 3' }}>
              <Checkbox inputId="etiquetas" checked={form.etiquetas} onChange={e => setForm(p => ({ ...p, etiquetas: e.checked }))} />
              <label htmlFor="etiquetas">Etiquetas</label>
            </div>
          </div>
          <div className="form-field">
            <label>Propiedad</label>
            <InputText name="propiedad" value={form.propiedad} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label>Orden</label>
            <InputText name="orden" value={form.orden} onChange={handleChange} type="number" />
          </div>
        </div>

        <div className="form-section-title">Parámetros del Formulario</div>

        {!editMode ? (
          <div className="tab-empty-msg">
            <i className="fa-solid fa-circle-info" />
            <span>Guardá primero el formulario para agregarle parámetros.</span>
          </div>
        ) : (
          <div className="sub-tab">
            {showParamForm && (
              <div className="sub-form">
                <div className="form-grid">
                  <div className="form-field">
                    <label>Parámetro <span className="required">*</span></label>
                    <InputText name="parametro" value={paramForm.parametro} onChange={handleParamChange} />
                  </div>
                  <div className="form-field">
                    <label>Descripción</label>
                    <InputText name="descripcion" value={paramForm.descripcion} onChange={handleParamChange} />
                  </div>
                  <div className="form-field form-field--full">
                    <label>Texto fijo</label>
                    <InputText name="texto" value={paramForm.texto} onChange={handleParamChange} />
                  </div>
                  <div className="form-row-12">
                    <div className="form-field" style={{ gridColumn: 'span 3' }}>
                      <label>X</label>
                      <InputText name="x" value={paramForm.x} onChange={handleParamChange} type="number" />
                    </div>
                    <div className="form-field" style={{ gridColumn: 'span 3' }}>
                      <label>Y</label>
                      <InputText name="y" value={paramForm.y} onChange={handleParamChange} type="number" />
                    </div>
                    <div className="form-field" style={{ gridColumn: 'span 3' }}>
                      <label>Ancho</label>
                      <InputText name="ancho" value={paramForm.ancho} onChange={handleParamChange} type="number" />
                    </div>
                    <div className="form-field" style={{ gridColumn: 'span 3' }}>
                      <label>Alto</label>
                      <InputText name="alto" value={paramForm.alto} onChange={handleParamChange} type="number" />
                    </div>
                  </div>
                </div>
                <div className="sub-form-actions">
                  <Button label="Cancelar" icon="fa-solid fa-xmark" className="p-button-text" onClick={() => { setShowParamForm(false); setParamForm(EMPTY_PARAM); }} disabled={savingParam} />
                  <Button label="Agregar" icon="fa-solid fa-check" onClick={handleSaveParam} loading={savingParam} />
                </div>
              </div>
            )}
            <div className="sub-tab-header">
              {!showParamForm && (
                <Button label="Nuevo parámetro" icon="fa-solid fa-plus" size="small" onClick={() => setShowParamForm(true)} />
              )}
            </div>
            <DataTable value={parametros} loading={loadingParametros} emptyMessage="Este formulario no tiene parámetros" size="small" stripedRows>
              <Column field="parametro" header="Parámetro" style={{ width: '140px' }} />
              <Column field="descripcion" header="Descripción" />
              <Column field="texto" header="Texto" />
              <Column field="x" header="X" style={{ width: '70px' }} />
              <Column field="y" header="Y" style={{ width: '70px' }} />
              <Column field="ancho" header="Ancho" style={{ width: '80px' }} />
              <Column field="alto" header="Alto" style={{ width: '80px' }} />
              <Column body={accionesParamTemplate} header="Acciones" alignHeader="center" style={{ width: '70px', textAlign: 'center' }} />
            </DataTable>
          </div>
        )}
      </Dialog>
    </div>
  );
}
