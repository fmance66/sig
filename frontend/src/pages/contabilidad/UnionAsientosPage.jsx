import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Checkbox } from 'primereact/checkbox';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import * as api from '../../api/asientos';
import * as ejerciciosApi from '../../api/ejercicios';
import { useEmpresa } from '../../context/EmpresaContext';
import { toIsoDate } from '../../utils/dates';
import BotonVolver from '../../components/BotonVolver';
import './contabilidad.css';

const money = v => v === null || v === undefined ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const EMPTY_FILTRO = { cuenta: '', leyenda: '' };
const EMPTY_ACCION = { fecha: null, leyenda: '', unirLeyendas: false };

export default function UnionAsientosPage() {
  const { empresa } = useEmpresa();
  const [ejercicios, setEjercicios] = useState([]);
  const [ejercicio, setEjercicio] = useState(null);
  const [filtro, setFiltro] = useState(EMPTY_FILTRO);
  const [asientos, setAsientos] = useState([]);
  const [seleccion, setSeleccion] = useState([]);
  const [accion, setAccion] = useState(EMPTY_ACCION);
  const [loading, setLoading] = useState(false);
  const [uniendo, setUniendo] = useState(false);
  const toast = useRef(null);

  useEffect(() => {
    if (!empresa) return;
    ejerciciosApi.getEjercicios(empresa.id).then(res => {
      const lista = res.data.resultado;
      setEjercicios(lista);
      const masReciente = [...lista].sort((a, b) => new Date(b.fecha_desde || 0) - new Date(a.fecha_desde || 0))[0];
      const activo = lista.find(e => e.estado === 'ACTIVO') || masReciente || null;
      setEjercicio(activo ? activo.id : null);
    }).catch(() => setEjercicios([]));
  }, [empresa?.id]);

  useEffect(() => { if (ejercicio) buscar(); }, [ejercicio]);

  function handleFiltroChange(e) {
    const { name, value } = e.target;
    setFiltro(prev => ({ ...prev, [name]: value }));
  }

  async function buscar(f = filtro) {
    if (!ejercicio) { setAsientos([]); return; }
    setLoading(true);
    try {
      const res = await api.getAsientos({ empresa: empresa.id, ejercicio, cuenta: f.cuenta, leyenda: f.leyenda });
      setAsientos(res.data.resultado);
      setSeleccion([]);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo obtener el listado de asientos' });
    } finally {
      setLoading(false);
    }
  }

  function limpiarFiltros() {
    setFiltro(EMPTY_FILTRO);
    buscar(EMPTY_FILTRO);
  }

  function handleUnir() {
    confirmDialog({
      message: `¿Unir los ${seleccion.length} asientos seleccionados? Quedarán agrupados bajo el asiento N° ${Math.min(...seleccion.map(a => a.numero))}.`,
      header: 'Confirmar unión',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Unir',
      rejectLabel: 'Cancelar',
      accept: async () => {
        setUniendo(true);
        try {
          await api.unirAsientos({
            ejercicio,
            empresa: empresa.id,
            numeros: seleccion.map(a => a.numero),
            fecha: toIsoDate(accion.fecha),
            leyenda: accion.leyenda || null,
            unirLeyendas: accion.unirLeyendas,
          });
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Asientos unidos' });
          setAccion(EMPTY_ACCION);
          buscar();
        } catch (err) {
          const msg = err.response?.data?.mensaje || 'No se pudo unir los asientos';
          toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
        } finally {
          setUniendo(false);
        }
      },
    });
  }

  const fechaTemplate = row => row.fecha ? new Date(row.fecha).toLocaleDateString('es-AR') : '—';
  // Más nuevo primero — mismo criterio que PeriodoSelect.jsx (ordena por fecha, no por el texto de `id`).
  const ejercicioOptions = [...ejercicios]
    .sort((a, b) => new Date(b.fecha_desde || 0) - new Date(a.fecha_desde || 0))
    .map(e => ({ label: `${e.id} - ${e.descripcion ?? ''}`, value: e.id }));

  return (
    <div className="page-contabilidad">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-code-merge" /> Unión de Asientos</h2>
      </div>

      <div className="filtros-toolbar">
        <div className="form-field">
          <label>Ejercicio</label>
          <Dropdown value={ejercicio} options={ejercicioOptions} onChange={e => setEjercicio(e.value)} style={{ width: '220px' }} />
        </div>
        <div className="form-field">
          <label>Cuenta</label>
          <InputText name="cuenta" value={filtro.cuenta} onChange={handleFiltroChange} />
        </div>
        <div className="form-field">
          <label>Leyenda</label>
          <InputText name="leyenda" value={filtro.leyenda} onChange={handleFiltroChange} />
        </div>
        <Button label="Buscar" icon="fa-solid fa-magnifying-glass" size="small" onClick={() => buscar()} loading={loading} />
        <Button label="Limpiar" icon="fa-solid fa-eraser" size="small" className="p-button-outlined" onClick={limpiarFiltros} />
      </div>

      <DataTable
        value={asientos}
        loading={loading}
        size="small"
        stripedRows
        paginator={asientos.length > 15}
        rows={15}
        paginatorRight={<span className="total-registros">Total: {asientos.length} registros</span>}
        emptyMessage={ejercicio ? 'No hay asientos para los filtros seleccionados' : 'Elegí un ejercicio para buscar asientos'}
        selection={seleccion}
        onSelectionChange={e => setSeleccion(e.value)}
        dataKey="numero"
      >
        <Column selectionMode="multiple" style={{ width: '3rem' }} />
        <Column field="numero" header="Asiento" style={{ width: '100px' }} />
        <Column body={fechaTemplate} header="Fecha" style={{ width: '110px' }} />
        <Column field="leyenda" header="Leyenda" />
        <Column body={r => money(r.saldo)} header="Saldo" style={{ width: '130px' }} />
      </DataTable>

      <div className="sub-form mt-3">
        <div className="form-grid">
          <div className="form-field">
            <label>Fecha nueva</label>
            <Calendar value={accion.fecha} onChange={e => setAccion(prev => ({ ...prev, fecha: e.value }))} dateFormat="dd/mm/yy" showIcon showButtonBar />
          </div>
          <div className="form-field form-field--full">
            <label>Leyenda nueva</label>
            <InputText value={accion.leyenda} onChange={e => setAccion(prev => ({ ...prev, leyenda: e.target.value }))} />
          </div>
          <div className="form-field form-field--checkbox">
            <label className="checkbox-label">
              <Checkbox checked={accion.unirLeyendas} onChange={e => setAccion(prev => ({ ...prev, unirLeyendas: e.checked }))} />
              Aplicar también a los renglones de cada asiento
            </label>
          </div>
        </div>
        <div className="sub-form-actions">
          <Button label={`Unir asientos (${seleccion.length})`} icon="fa-solid fa-code-merge" size="small"
            onClick={handleUnir} loading={uniendo} disabled={seleccion.length < 2} />
        </div>
      </div>
    </div>
  );
}
