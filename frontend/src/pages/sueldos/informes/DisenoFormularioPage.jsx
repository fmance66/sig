import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { ColorPicker } from 'primereact/colorpicker';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useEmpresa } from '../../../context/EmpresaContext';
import BuscadorTabla from '../../../components/BuscadorTabla';
import BotonVolver from '../../../components/BotonVolver';
import './informes.css';

const ORIENTACION_OPTIONS = [{ label: 'Vertical', value: 'VERTICAL' }, { label: 'Horizontal', value: 'HORIZONTAL' }];
const PAGINA_OPTIONS = ['A4', 'A5', 'TICKET', 'LEGAL', 'LETTER', 'CUSTOM'].map(v => ({ label: v, value: v }));

const ALIGNMENT_OPTIONS = [
  { label: '(por defecto: izquierda)', value: '' },
  { label: 'Izquierda', value: 'LEFT' },
  { label: 'Centro', value: 'CENTER' },
  { label: 'Derecha', value: 'RIGHT' },
  { label: 'Justificado', value: 'JUSTIFIED' },
];
const FONT_FAMILIA_OPTIONS = [
  { label: '(por defecto: Helvetica)', value: '' },
  { label: 'Courier', value: 'COURIER' },
  { label: 'Times', value: 'TIMES' },
];
const FONT_PESO_OPTIONS = [{ label: 'Normal', value: '' }, { label: 'Negrita', value: 'BOLD' }];
const CONDICION_SUGERENCIAS = ['TIENE_CATEGORIA', 'ORIGINAL', 'DUPLICADO'];

const EMPTY_FORM = {
  nombre: '', descripcion: '', orientacion: 'VERTICAL', pagina: 'A4',
  margen_superior: '', margen_inferior: '', margen_izquierdo: '', margen_derecho: '',
  columnas: '', filas: '', copias: '', propiedad: '', etiquetas: false, orden: '', ley_27802: false,
};
const EMPTY_PARAM = {
  parametro: '', descripcion: '', texto: '', x: '', y: '', ancho: '', alto: '', orden: '',
  alignment: '', fontFamilia: '', fontPeso: '', fontTamano: '', fontColor: '',
  borderColor: '', backgroundColor: '', auto_height: false, print: true, condicion: '',
};

// "r,g,b" (formato legacy, columnas border_color/background_color/color de fuente) <-> hex
// (formato que espera ColorPicker de PrimeReact). Ver disenoComun.js#parseColor en el backend.
function rgbToHex(rgb) {
  const partes = (rgb || '').split(',').map(Number);
  if (partes.length !== 3 || partes.some(Number.isNaN)) return '';
  return partes.map(n => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')).join('');
}
function hexToRgb(hex) {
  if (!hex) return null;
  const h = hex.replace('#', '');
  if (h.length !== 6) return null;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r},${g},${b}`;
}
// font: "FAMILIA|PESO|TAMANO|COLOR" — ver disenoComun.js#parseFont en el backend.
function parseFontString(raw) {
  const [familia, peso, tamano, color] = (raw || '').split('|');
  return { fontFamilia: familia || '', fontPeso: peso || '', fontTamano: tamano || '', fontColor: rgbToHex(color) };
}
function composeFontString({ fontFamilia, fontPeso, fontTamano, fontColor }) {
  if (!fontFamilia && !fontPeso && !fontTamano && !fontColor) return null;
  const color = fontColor ? hexToRgb(fontColor) : '';
  return [fontFamilia, fontPeso, fontTamano, color || ''].join('|');
}

// Pantalla compartida por "Diseño de Recibos de Sueldo" y "Diseño de Libro
// de Sueldos" — mismo esquema de tablas (cabecera de formulario + grilla de
// parámetros con posición X/Y/Ancho/Alto y estilo). El PDF real interpreta
// estas filas (ver backend/src/pdf/reciboInterprete.js, libroInterprete.js,
// disenoComun.js) — no es solo metadato.
export default function DisenoFormularioPage({ api, titulo, icono, soportaActivo = false }) {
  const { empresa } = useEmpresa();
  const [formularios, setFormularios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activando, setActivando] = useState(null);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [parametros, setParametros] = useState([]);
  const [loadingParametros, setLoadingParametros] = useState(false);
  const [showParamForm, setShowParamForm] = useState(false);
  const [paramForm, setParamForm] = useState(EMPTY_PARAM);
  const [savingParam, setSavingParam] = useState(false);
  const [editParamMode, setEditParamMode] = useState(false);
  const [editParamKey, setEditParamKey] = useState(null);

  const toast = useRef(null);
  const paramFormRef = useRef(null);

  useEffect(() => { if (empresa) load(); }, [empresa?.id]);

  // Al abrir el formulario de un parámetro (nuevo o editar), el modal puede estar
  // scrolleado más abajo (la sub-tabla de parámetros) — sin esto, el form aparece
  // arriba de la tabla y no se nota que se abrió.
  useEffect(() => {
    if (showParamForm) paramFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [showParamForm, editParamKey]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getAll(empresa.id);
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
    setEditId(null);
    setParametros([]);
    closeParamForm();
    setDialogVisible(true);
  }

  function openEdit(row) {
    setForm({
      nombre: row.nombre, descripcion: row.descripcion ?? '', orientacion: row.orientacion ?? 'VERTICAL', pagina: row.pagina ?? 'A4',
      margen_superior: row.margen_superior ?? '', margen_inferior: row.margen_inferior ?? '',
      margen_izquierdo: row.margen_izquierdo ?? '', margen_derecho: row.margen_derecho ?? '',
      columnas: row.columnas ?? '', filas: row.filas ?? '', copias: row.copias ?? '',
      propiedad: row.propiedad ?? '', etiquetas: row.etiquetas ?? false, orden: row.orden ?? '',
      ley_27802: row.ley_27802 ?? false,
    });
    setEditMode(true);
    setEditId(row.id);
    closeParamForm();
    setDialogVisible(true);
    loadParametros(row.id);
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
    if (!form.descripcion.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'La descripción es requerida' });
      return;
    }
    setSaving(true);
    try {
      if (editMode) {
        await api.update(editId, form);
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Formulario actualizado' });
      } else {
        const res = await api.create({ ...form, empresa: empresa.id });
        setEditId(res.data.resultado.id);
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
      message: `¿Está seguro de eliminar el formulario "${row.descripcion || row.nombre}"?`,
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

  function closeParamForm() {
    setShowParamForm(false);
    setParamForm(EMPTY_PARAM);
    setEditParamMode(false);
    setEditParamKey(null);
  }

  function openNewParam() {
    setParamForm(EMPTY_PARAM);
    setEditParamMode(false);
    setEditParamKey(null);
    setShowParamForm(true);
  }

  function openEditParam(row) {
    setParamForm({
      parametro: row.parametro, descripcion: row.descripcion ?? '', texto: row.texto ?? '',
      x: row.x ?? '', y: row.y ?? '', ancho: row.ancho ?? '', alto: row.alto ?? '', orden: row.orden ?? '',
      alignment: row.alignment ?? '', ...parseFontString(row.font),
      borderColor: rgbToHex(row.border_color), backgroundColor: rgbToHex(row.background_color),
      auto_height: row.auto_height ?? false, print: row.print ?? true, condicion: row.condicion ?? '',
    });
    setEditParamMode(true);
    setEditParamKey(row.parametro);
    setShowParamForm(true);
  }

  async function handleSaveParam() {
    if (!paramForm.parametro.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'El parámetro es requerido' });
      return;
    }
    const payload = {
      parametro: paramForm.parametro, descripcion: paramForm.descripcion, texto: paramForm.texto,
      x: paramForm.x, y: paramForm.y, ancho: paramForm.ancho, alto: paramForm.alto, orden: paramForm.orden,
      alignment: paramForm.alignment, font: composeFontString(paramForm),
      border_color: hexToRgb(paramForm.borderColor), background_color: hexToRgb(paramForm.backgroundColor),
      auto_height: paramForm.auto_height, print: paramForm.print, condicion: paramForm.condicion,
    };
    setSavingParam(true);
    try {
      if (editParamMode) {
        await api.updateParametro(editId, editParamKey, payload);
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Parámetro actualizado' });
      } else {
        await api.addParametro(editId, payload);
        toast.current.show({ severity: 'success', summary: 'OK', detail: 'Parámetro agregado' });
      }
      closeParamForm();
      loadParametros(editId);
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al guardar';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setSavingParam(false);
    }
  }

  async function handleActivar(row) {
    setActivando(row.id);
    try {
      await api.activar(row.id);
      toast.current.show({ severity: 'success', summary: 'OK', detail: `"${row.descripcion || row.nombre}" ahora es el diseño en uso` });
      load();
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo activar el diseño' });
    } finally {
      setActivando(null);
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
          await api.removeParametro(editId, row.parametro);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Parámetro eliminado' });
          loadParametros(editId);
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

  const enUsoTemplate = (row) => (
    <Checkbox
      checked={row.activo}
      disabled={row.activo || activando === row.id}
      onChange={() => handleActivar(row)}
    />
  );

  const accionesParamTemplate = (row) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-pen" className="p-button-text p-button-sm" tooltip="Modificar" tooltipOptions={{ position: 'top' }} onClick={() => openEditParam(row)} />
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

      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className={icono} /> {titulo}</h2>
      </div>

      <DataTable
        value={formularios}
        loading={loading}
        paginator={hasPaginator}
        rows={10}
        rowsPerPageOptions={[10, 15, 25, 50]}
        paginatorRight={totalRegistros}
        globalFilter={globalFilter}
        globalFilterFields={['nombre', 'descripcion']}
        header={tableHeader}
        emptyMessage="No hay formularios registrados"
        size="small"
        stripedRows
        removableSort
      >
        <Column field="nombre" header="Formulario" sortable style={{ width: '160px' }} />
        <Column field="descripcion" header="Descripción" sortable />
        {soportaActivo && <Column body={enUsoTemplate} header="Activo" alignHeader="center" style={{ width: '80px', textAlign: 'center' }} />}
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
        style={{ width: '1020px' }}
        contentStyle={{ maxHeight: '88vh', overflowY: 'auto' }}
        modal
        draggable={false}
        resizable={false}
      >
        <div className="form-grid">
          <div className="form-field">
            <label>Nombre <span className="required">*</span></label>
            <InputText name="nombre" value={form.nombre} onChange={handleChange} />
          </div>
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
          {soportaActivo && (
            <div className="form-field form-field--full form-field--checkbox">
              <Checkbox inputId="ley_27802" checked={form.ley_27802} onChange={e => setForm(p => ({ ...p, ley_27802: e.checked }))} />
              <label htmlFor="ley_27802">Formato Ley 27.802 (Decreto 407/2026)</label>
            </div>
          )}
        </div>

        <div className="form-section-title">Parámetros del Formulario</div>

        {form.ley_27802 ? (
          <div className="tab-empty-msg">
            <i className="fa-solid fa-circle-info" />
            <span>Este formato usa un diseño fijo por ley — no se configura con parámetros de posición.</span>
          </div>
        ) : !editMode ? (
          <div className="tab-empty-msg">
            <i className="fa-solid fa-circle-info" />
            <span>Guardá primero el formulario para agregarle parámetros.</span>
          </div>
        ) : (
          <div className="sub-tab">
            {showParamForm && (
              <div className="sub-form" ref={paramFormRef}>
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
                  <div className="form-row-12">
                    <div className="form-field" style={{ gridColumn: 'span 3' }}>
                      <label>Alineación</label>
                      <Dropdown value={paramForm.alignment} options={ALIGNMENT_OPTIONS} onChange={e => setParamForm(p => ({ ...p, alignment: e.value }))} />
                    </div>
                    <div className="form-field" style={{ gridColumn: 'span 3' }}>
                      <label>Fuente</label>
                      <Dropdown value={paramForm.fontFamilia} options={FONT_FAMILIA_OPTIONS} onChange={e => setParamForm(p => ({ ...p, fontFamilia: e.value }))} />
                    </div>
                    <div className="form-field" style={{ gridColumn: 'span 3' }}>
                      <label>Peso</label>
                      <Dropdown value={paramForm.fontPeso} options={FONT_PESO_OPTIONS} onChange={e => setParamForm(p => ({ ...p, fontPeso: e.value }))} />
                    </div>
                    <div className="form-field" style={{ gridColumn: 'span 3' }}>
                      <label>Tamaño</label>
                      <InputText name="fontTamano" value={paramForm.fontTamano} onChange={handleParamChange} type="number" />
                    </div>
                  </div>
                  <div className="form-row-12">
                    <div className="form-field" style={{ gridColumn: 'span 3' }}>
                      <label>Color de texto</label>
                      <ColorPicker value={paramForm.fontColor} onChange={e => setParamForm(p => ({ ...p, fontColor: e.value }))} />
                    </div>
                    <div className="form-field" style={{ gridColumn: 'span 3' }}>
                      <label>Color de borde</label>
                      <ColorPicker value={paramForm.borderColor} onChange={e => setParamForm(p => ({ ...p, borderColor: e.value }))} />
                    </div>
                    <div className="form-field" style={{ gridColumn: 'span 3' }}>
                      <label>Color de fondo</label>
                      <ColorPicker value={paramForm.backgroundColor} onChange={e => setParamForm(p => ({ ...p, backgroundColor: e.value }))} />
                    </div>
                    <div className="form-field" style={{ gridColumn: 'span 3' }}>
                      <label>Condición</label>
                      <Dropdown value={paramForm.condicion} options={CONDICION_SUGERENCIAS.map(v => ({ label: v, value: v }))} onChange={e => setParamForm(p => ({ ...p, condicion: e.value }))} editable showClear placeholder="(siempre)" />
                    </div>
                  </div>
                  <div className="form-row-12">
                    <div className="form-field form-field--checkbox" style={{ gridColumn: 'span 3' }}>
                      <Checkbox inputId="auto_height" checked={paramForm.auto_height} onChange={e => setParamForm(p => ({ ...p, auto_height: e.checked }))} />
                      <label htmlFor="auto_height">Alto automático</label>
                    </div>
                    <div className="form-field form-field--checkbox" style={{ gridColumn: 'span 3' }}>
                      <Checkbox inputId="print" checked={paramForm.print} onChange={e => setParamForm(p => ({ ...p, print: e.checked }))} />
                      <label htmlFor="print">Imprimir</label>
                    </div>
                  </div>
                </div>
                <div className="sub-form-actions">
                  <Button label="Cancelar" icon="fa-solid fa-xmark" className="p-button-text" onClick={closeParamForm} disabled={savingParam} />
                  <Button label={editParamMode ? 'Guardar' : 'Agregar'} icon="fa-solid fa-check" onClick={handleSaveParam} loading={savingParam} />
                </div>
              </div>
            )}
            <div className="sub-tab-header">
              {!showParamForm && (
                <Button label="Nuevo parámetro" icon="fa-solid fa-plus" size="small" onClick={openNewParam} />
              )}
            </div>
            <div className="table-scroll-x">
              <DataTable value={parametros} loading={loadingParametros} emptyMessage="Este formulario no tiene parámetros" size="small" stripedRows>
                <Column field="parametro" header="Parámetro" style={{ width: '130px' }} />
                <Column field="descripcion" header="Descripción" style={{ maxWidth: '160px' }} className="col-ellipsis" />
                <Column field="texto" header="Texto" style={{ maxWidth: '200px' }} className="col-ellipsis" />
                <Column field="x" header="X" style={{ width: '65px' }} />
                <Column field="y" header="Y" style={{ width: '65px' }} />
                <Column field="ancho" header="Ancho" style={{ width: '75px' }} />
                <Column field="alto" header="Alto" style={{ width: '75px' }} />
                <Column body={accionesParamTemplate} header="Acciones" alignHeader="center" style={{ width: '70px', textAlign: 'center' }} />
              </DataTable>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
