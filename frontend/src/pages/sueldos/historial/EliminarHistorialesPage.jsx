import { useState, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import * as api from '../../../api/historial';
import FiltroTexto from '../liquidaciones/FiltroTexto';
import { toIsoDate } from '../../../utils/dates';

const EMPTY_FILTRO = { campo: '' };

export default function EliminarHistorialesPage() {
  const [filtro, setFiltro] = useState(EMPTY_FILTRO);
  const [fechaDesde, setFechaDesde] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const toast = useRef(null);

  function handleFiltroChange(e) {
    const { name, value } = e.target;
    setFiltro(prev => ({ ...prev, [name]: value }));
  }

  function limpiarFiltros() {
    setFiltro(EMPTY_FILTRO);
    setFechaDesde(null);
    setRegistros([]);
  }

  async function buscar() {
    setLoading(true);
    try {
      const res = await api.getHistorialesList({ ...filtro, fechaDesde: toIsoDate(fechaDesde) });
      setRegistros(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo obtener la vista previa' });
    } finally {
      setLoading(false);
    }
  }

  function handleEliminar() {
    if (!registros.length) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'No hay historiales para eliminar con este filtro' });
      return;
    }
    confirmDialog({
      message: `Se eliminarán ${registros.length} registro(s) que matchean el filtro. ¿Confirma?`,
      header: 'Confirmar eliminación masiva',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        setEliminando(true);
        try {
          await api.deleteHistorialesMasivo({ ...filtro, fechaDesde: toIsoDate(fechaDesde) });
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Eliminación realizada' });
          setRegistros([]);
        } catch (err) {
          const msg = err.response?.data?.mensaje || 'No se pudo completar la eliminación';
          toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
        } finally {
          setEliminando(false);
        }
      },
    });
  }

  const fechaTemplate = (field) => (row) => row[field] ? new Date(row[field]).toLocaleDateString('es-AR') : '—';

  return (
    <div className="page-novedades">
      <Toast ref={toast} />
      <ConfirmDialog />
      <h2 className="page-title"><i className="fa-solid fa-trash" /> Eliminar Historiales</h2>

      <div className="filtros-toolbar">
        <div className="form-field">
          <label>Campo</label>
          <FiltroTexto name="campo" value={filtro.campo} onChange={handleFiltroChange} />
        </div>
        <div className="form-field">
          <label>Fecha Desde</label>
          <Calendar value={fechaDesde} onChange={e => setFechaDesde(e.value)} dateFormat="dd/mm/yy" showIcon showButtonBar />
        </div>
        <Button label="Vista previa" icon="fa-solid fa-magnifying-glass" size="small" onClick={buscar} loading={loading} />
        <Button label="Limpiar" icon="fa-solid fa-eraser" size="small" className="p-button-outlined" onClick={limpiarFiltros} />
      </div>

      <div className="candidatos-actions">
        <span className="total-registros">Total: {registros.length} registros</span>
        <Button label="Eliminar" icon="fa-solid fa-trash" size="small" className="p-button-danger" onClick={handleEliminar} loading={eliminando} />
      </div>

      <DataTable value={registros} loading={loading} size="small" stripedRows
        paginator={registros.length > 15} rows={15}
        paginatorRight={<span className="total-registros">Total: {registros.length} registros</span>}
        emptyMessage="Usá 'Vista previa' para ver qué se va a eliminar">
        <Column field="campo" header="Campo" style={{ width: '140px' }} />
        <Column field="campo_desc" header="Descripción" />
        <Column body={fechaTemplate('fecha_desde')} header="Fecha Desde" style={{ width: '110px' }} />
        <Column body={fechaTemplate('fecha_hasta')} header="Fecha Hasta" style={{ width: '110px' }} />
        <Column field="valor" header="Valor" style={{ width: '120px' }} />
      </DataTable>
    </div>
  );
}
