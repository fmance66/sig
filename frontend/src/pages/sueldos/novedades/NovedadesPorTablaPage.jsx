import { useState, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { Toast } from 'primereact/toast';
import FiltroTexto from '../liquidaciones/FiltroTexto';
import * as api from '../../../api/novedades';
import { toIsoDate } from '../../../utils/dates';

export default function NovedadesPorTablaPage() {
  const [fecha, setFecha] = useState(null);
  const [empleado, setEmpleado] = useState('');
  const [tipoNovedad, setTipoNovedad] = useState('');
  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useRef(null);

  async function buscar() {
    if (!fecha) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Elegí una fecha' });
      return;
    }
    setLoading(true);
    try {
      const res = await api.getMatriz({ fecha: toIsoDate(fecha), empleado, tipoNovedad });
      setFilas(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la matriz' });
    } finally {
      setLoading(false);
    }
  }

  async function guardarCambios() {
    setSaving(true);
    try {
      const payload = filas.map(f => ({ empleado: f.empleado, tipo_novedad: f.tipo_novedad, value: f.value ?? '' }));
      await api.saveMatriz(toIsoDate(fecha), payload);
      toast.current.show({ severity: 'success', summary: 'OK', detail: 'Cambios guardados' });
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'No se pudieron guardar los cambios';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setSaving(false);
    }
  }

  function onCellEditComplete(e) {
    const { rowData, newValue } = e;
    setFilas(prev => prev.map(f =>
      f.empleado === rowData.empleado && f.tipo_novedad === rowData.tipo_novedad
        ? { ...f, value: newValue }
        : f
    ));
  }

  function valorEditor(options) {
    return (
      <InputText
        value={options.value ?? ''}
        onChange={e => options.editorCallback(e.target.value)}
        onKeyDown={e => e.stopPropagation()}
      />
    );
  }

  const nombreTemplate = row => `${row.apellido ?? ''}${row.apellido && row.nombre ? ', ' : ''}${row.nombre ?? ''}`;

  return (
    <div className="page-novedades">
      <Toast ref={toast} />
      <h2 className="page-title"><i className="fa-solid fa-table" /> Novedades por Tabla</h2>

      <div className="filtros-toolbar">
        <div className="form-field">
          <label>Fecha <span className="required">*</span></label>
          <Calendar value={fecha} onChange={e => setFecha(e.value)} dateFormat="dd/mm/yy" showIcon />
        </div>
        <div className="form-field">
          <label>Empleado</label>
          <FiltroTexto name="empleado" value={empleado} onChange={e => setEmpleado(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Tipo de Novedad</label>
          <FiltroTexto name="tipoNovedad" value={tipoNovedad} onChange={e => setTipoNovedad(e.target.value)} />
        </div>
        <Button label="Buscar" icon="fa-solid fa-magnifying-glass" size="small" onClick={buscar} loading={loading} />
      </div>

      <div className="candidatos-actions">
        <span className="total-registros">Total: {filas.length} registros</span>
        <Button label="Guardar cambios" icon="fa-solid fa-floppy-disk" size="small" onClick={guardarCambios} loading={saving} disabled={!filas.length} />
      </div>

      <DataTable
        value={filas}
        loading={loading}
        editMode="cell"
        size="small"
        stripedRows
        paginator={filas.length > 15}
        rows={15}
        emptyMessage="Elegí una fecha y buscá para cargar la matriz"
      >
        <Column field="legajo" header="Legajo" style={{ width: '90px' }} />
        <Column body={nombreTemplate} header="Apellido y Nombre" />
        <Column field="tipo_novedad" header="Novedad" style={{ width: '160px' }} />
        <Column field="tipo_novedad_desc" header="Descripción" />
        <Column field="value" header="Valor" style={{ width: '140px' }}
          editor={valorEditor} onCellEditComplete={onCellEditComplete} />
      </DataTable>
    </div>
  );
}
