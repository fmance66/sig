import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { RadioButton } from 'primereact/radiobutton';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import * as api from '../../../api/liquidaciones';
import FiltroTexto from './FiltroTexto';
import PeriodoSelect from '../../../components/PeriodoSelect';
import BotonVolver from '../../../components/BotonVolver';
import { useEmpresa } from '../../../context/EmpresaContext';
import './liquidaciones.css';

const money = v => v === null || v === undefined ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const EMPTY_FILTRO = { periodo: '', legajo: '', convenio: '', categoria: '', grupo: '' };

export default function EliminacionMasivaPage() {
  const { empresa } = useEmpresa();
  const [filtro, setFiltro] = useState(EMPTY_FILTRO);
  const [modo, setModo] = useState('recibos'); // 'recibos' | 'liquidacion'
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const toast = useRef(null);

  useEffect(() => { setRegistros([]); }, [empresa?.id]);

  function handleFiltroChange(e) {
    const { name, value } = e.target;
    setFiltro(prev => ({ ...prev, [name]: value }));
  }

  function limpiarFiltros() {
    setFiltro(EMPTY_FILTRO);
    setRegistros([]);
  }

  async function buscar() {
    setLoading(true);
    try {
      const res = await api.getRecibos({ ...filtro, empresa: empresa?.id });
      setRegistros(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo obtener la vista previa' });
    } finally {
      setLoading(false);
    }
  }

  function handleEliminar() {
    if (!registros.length) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'No hay recibos para eliminar con este filtro' });
      return;
    }
    const mensaje = modo === 'liquidacion'
      ? `Se eliminarán todos los recibos de esta empresa en el período "${filtro.periodo}" (el período en sí solo se borra si ninguna otra empresa le quedó recibos ahí). ¿Confirma?`
      : `Se eliminarán ${registros.length} recibo(s) que matchean el filtro. La liquidación se mantiene. ¿Confirma?`;

    if (modo === 'liquidacion' && !filtro.periodo.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Para eliminar la liquidación completa indicá un período exacto' });
      return;
    }

    confirmDialog({
      message: mensaje,
      header: 'Confirmar eliminación masiva',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        setEliminando(true);
        try {
          if (modo === 'liquidacion') {
            await api.deleteLiquidacion(filtro.periodo, empresa?.id);
          } else {
            await api.deleteRecibosMasivo({ ...filtro, empresa: empresa?.id });
          }
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

  const nombreTemplate = row => `${row.apellido ?? ''}${row.apellido && row.nombre ? ', ' : ''}${row.nombre ?? ''}`;

  return (
    <div className="page-liquidaciones">
      <Toast ref={toast} />
      <ConfirmDialog />
      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-triangle-exclamation" /> Eliminación Masiva</h2>
      </div>

      <div className="filtros-toolbar">
        <div className="form-field">
          <label>Período</label>
          <PeriodoSelect value={filtro.periodo} onChange={e => setFiltro(prev => ({ ...prev, periodo: e.value || '' }))} empresa={empresa?.id} placeholder="" style={{ width: '220px' }} />
        </div>
        <div className="form-field">
          <label>Legajo</label>
          <FiltroTexto name="legajo" value={filtro.legajo} onChange={handleFiltroChange} />
        </div>
        <div className="form-field">
          <label>Convenio</label>
          <FiltroTexto name="convenio" value={filtro.convenio} onChange={handleFiltroChange} />
        </div>
        <div className="form-field">
          <label>Categoría</label>
          <FiltroTexto name="categoria" value={filtro.categoria} onChange={handleFiltroChange} />
        </div>
        <div className="form-field">
          <label>Grupo</label>
          <FiltroTexto name="grupo" value={filtro.grupo} onChange={handleFiltroChange} />
        </div>
        <Button label="Vista previa" icon="fa-solid fa-magnifying-glass" size="small" onClick={buscar} loading={loading} />
        <Button label="Limpiar" icon="fa-solid fa-eraser" size="small" className="p-button-outlined" onClick={limpiarFiltros} />
      </div>

      <div className="candidatos-actions">
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div className="form-field form-field--checkbox">
            <RadioButton inputId="modoRecibos" value="recibos" onChange={e => setModo(e.value)} checked={modo === 'recibos'} />
            <label htmlFor="modoRecibos" style={{ marginLeft: '0.4rem' }}>Solo recibos</label>
          </div>
          <div className="form-field form-field--checkbox">
            <RadioButton inputId="modoLiquidacion" value="liquidacion" onChange={e => setModo(e.value)} checked={modo === 'liquidacion'} />
            <label htmlFor="modoLiquidacion" style={{ marginLeft: '0.4rem' }}>Liquidación completa (requiere período exacto)</label>
          </div>
        </div>
        <Button label="Eliminar" icon="fa-solid fa-trash" size="small" className="p-button-danger" onClick={handleEliminar} loading={eliminando} />
      </div>

      <DataTable value={registros} loading={loading} size="small" stripedRows paginator={registros.length > 15} rows={15}
        paginatorRight={<span className="total-registros">Total: {registros.length} registros</span>}
        footer={registros.length > 0 && registros.length <= 15
          ? <div className="table-footer-right"><span className="total-registros">Total: {registros.length} registros</span></div>
          : null}
        emptyMessage="Usá 'Vista previa' para ver qué se va a eliminar">
        <Column field="legajo" header="Legajo" style={{ width: '90px' }} />
        <Column body={nombreTemplate} header="Apellido y Nombre" />
        <Column field="periodo" header="Período" style={{ width: '110px' }} />
        <Column body={r => money(r.sueldo_neto)} header="Sueldo Neto" style={{ width: '120px' }} />
      </DataTable>
    </div>
  );
}
