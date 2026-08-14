import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { toIsoDate } from '../../../utils/dates';
import * as api from '../../../api/tiposTabla';
import './conceptos.css';

const N_COLUMNAS = 9;

function columnasDefinidas(tabla) {
  if (!tabla) return [];
  return Array.from({ length: N_COLUMNAS }, (_, i) => {
    const n = i + 1;
    return {
      field: `value_${n}`,
      nombre: tabla[`column_${n}`],
      tipo: tabla[`data_type_${n}`],
    };
  }).filter(c => c.nombre);
}

function emptyValores(columnas) {
  const v = {};
  columnas.forEach(c => { v[c.field] = c.tipo === 'DATE' ? null : ''; });
  return v;
}

export default function TablasPage() {
  const [tablas, setTablas]         = useState([]);
  const [tablaId, setTablaId]       = useState(null);
  const [filas, setFilas]           = useState([]);
  const [loading, setLoading]       = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [valores, setValores]       = useState({});
  const [saving, setSaving]         = useState(false);
  const toast = useRef(null);

  const tablaSeleccionada = tablas.find(t => t.id === tablaId) ?? null;
  const columnas = columnasDefinidas(tablaSeleccionada);

  useEffect(() => {
    api.getTiposTabla()
      .then(res => setTablas(res.data.resultado))
      .catch(() => toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los tipos de tabla' }));
  }, []);

  useEffect(() => {
    setShowForm(false);
    if (tablaId) load();
    else setFilas([]);
  }, [tablaId]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getFilas(tablaId);
      setFilas(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las filas' });
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setValores(emptyValores(columnas));
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setValores({});
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {};
      columnas.forEach(c => {
        const v = valores[c.field];
        payload[c.field] = c.tipo === 'DATE' ? toIsoDate(v) : (v === '' ? null : v);
      });
      await api.createFila(tablaId, payload);
      toast.current.show({ severity: 'success', summary: 'OK', detail: 'Fila agregada' });
      cancelForm();
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
      message: `¿Está seguro de eliminar la fila ${row.fila}?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteFila(tablaId, row.fila);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Fila eliminada' });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
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
    <div className="page-conceptos">
      <Toast ref={toast} />
      <ConfirmDialog />

      <h2 className="page-title"><i className="fa-solid fa-table" /> Tablas</h2>

      <div className="form-grid" style={{ marginBottom: '1rem' }}>
        <div className="form-field">
          <label>Tabla</label>
          <Dropdown
            value={tablaId}
            options={tablas.map(t => ({ label: `${t.id} - ${t.descripcion ?? ''}`, value: t.id }))}
            onChange={e => setTablaId(e.value)}
            placeholder="Seleccionar tabla..."
            filter
            showClear
          />
        </div>
      </div>

      {!tablaId ? (
        <div className="tab-empty-msg">
          <i className="fa-solid fa-circle-info" />
          <span>Elegí una tabla para administrar sus filas.</span>
        </div>
      ) : columnas.length === 0 ? (
        <div className="tab-empty-msg">
          <i className="fa-solid fa-triangle-exclamation" />
          <span>Esta tabla no tiene columnas definidas. Configurala primero en "Tipo de Tabla".</span>
        </div>
      ) : (
        <>
          {showForm && (
            <div className="sub-form">
              <div className="form-grid">
                {columnas.map(c => (
                  <div key={c.field} className="form-field">
                    <label>{c.nombre}</label>
                    {c.tipo === 'DATE' ? (
                      <Calendar value={valores[c.field]} onChange={e => setValores(p => ({ ...p, [c.field]: e.value }))} dateFormat="dd/mm/yy" showIcon />
                    ) : (
                      <InputText
                        value={valores[c.field] ?? ''}
                        onChange={e => setValores(p => ({ ...p, [c.field]: e.target.value }))}
                        type={c.tipo === 'INTEGER' || c.tipo === 'DECIMAL' ? 'number' : 'text'}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="sub-form-actions">
                <Button label="Cancelar" icon="fa-solid fa-xmark" className="p-button-text" onClick={cancelForm} disabled={saving} />
                <Button label="Agregar" icon="fa-solid fa-check" onClick={handleSave} loading={saving} />
              </div>
            </div>
          )}

          <div className="sub-tab-header">
            {!showForm && (
              <Button label="Nueva fila" icon="fa-solid fa-plus" size="small" onClick={openNew} />
            )}
          </div>

          <DataTable value={filas} loading={loading} emptyMessage="Esta tabla no tiene filas cargadas" size="small" stripedRows>
            <Column field="fila" header="Fila" style={{ width: '70px' }} />
            {columnas.map(c => (
              <Column key={c.field} field={c.field} header={c.nombre} />
            ))}
            <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '80px', textAlign: 'center' }} />
          </DataTable>
        </>
      )}
    </div>
  );
}
