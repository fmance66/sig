import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import * as api from '../../api/asientos';
import * as ejerciciosApi from '../../api/ejercicios';
import * as cuentasApi from '../../api/cuentas';
import * as modelosApi from '../../api/asientoModelo';
import { useEmpresa } from '../../context/EmpresaContext';
import BotonVolver from '../../components/BotonVolver';
import AsientoDialog from './AsientoDialog';
import './contabilidad.css';

const money = v => v === null || v === undefined ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const EMPTY_FILTRO = { cuenta: '', leyenda: '' };

export default function ListadoAsientosPage() {
  const { empresa } = useEmpresa();
  const [ejercicios, setEjercicios] = useState([]);
  const [ejercicio, setEjercicio] = useState(null);
  const [filtro, setFiltro] = useState(EMPTY_FILTRO);
  const [asientos, setAsientos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState(null);
  const [movimientosPorAsiento, setMovimientosPorAsiento] = useState({});
  const [dialogVisible, setDialogVisible] = useState(false);
  const [asientoEditando, setAsientoEditando] = useState(null);
  const [movimientosIniciales, setMovimientosIniciales] = useState(null);
  const [modelos, setModelos] = useState([]);
  const [seleccion, setSeleccion] = useState([]);
  const [eliminando, setEliminando] = useState(false);
  const toast = useRef(null);

  useEffect(() => {
    if (!empresa) return;
    cuentasApi.getCuentas(empresa.id).then(res => setCuentas(res.data.resultado)).catch(() => setCuentas([]));
    modelosApi.getModelos(empresa.id).then(res => setModelos(res.data.resultado)).catch(() => setModelos([]));
    ejerciciosApi.getEjercicios(empresa.id).then(res => {
      const lista = res.data.resultado;
      setEjercicios(lista);
      const masReciente = [...lista].sort((a, b) => new Date(b.fecha_desde || 0) - new Date(a.fecha_desde || 0))[0];
      const activo = lista.find(e => e.estado === 'ACTIVO') || masReciente || null;
      setEjercicio(activo ? activo.id : null);
    }).catch(() => setEjercicios([]));
  }, [empresa?.id]);

  useEffect(() => { if (ejercicio) buscar(); }, [ejercicio]);

  const cuentaDescripcion = id => cuentas.find(c => c.id === id)?.descripcion ?? '';

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
      setExpandedRows(null);
      setMovimientosPorAsiento({});
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

  async function onRowToggle(e) {
    setExpandedRows(e.data);
    const nuevos = Object.keys(e.data).filter(numero => !(numero in movimientosPorAsiento));
    for (const numero of nuevos) {
      try {
        const res = await api.getMovimientos(ejercicio, numero, empresa.id);
        setMovimientosPorAsiento(prev => ({ ...prev, [numero]: res.data.resultado }));
      } catch {
        setMovimientosPorAsiento(prev => ({ ...prev, [numero]: [] }));
      }
    }
  }

  function openNew() {
    setAsientoEditando(null);
    setMovimientosIniciales(null);
    setDialogVisible(true);
  }

  async function openDesdeModelo(modeloId) {
    try {
      const res = await modelosApi.getLineasModelo(modeloId, empresa.id);
      setMovimientosIniciales(res.data.resultado.map(l => ({
        cuenta: l.cuenta,
        debe: l.saldo === 'DEBE' ? 0 : null,
        haber: l.saldo === 'HABER' ? 0 : null,
        leyenda: l.leyenda || '',
      })));
      setAsientoEditando(null);
      setDialogVisible(true);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el asiento modelo' });
    }
  }

  function openEdit(row) {
    setAsientoEditando(row);
    setMovimientosIniciales(null);
    setDialogVisible(true);
  }

  function handleSaved() {
    setDialogVisible(false);
    buscar();
  }

  function handleDelete(row) {
    confirmDialog({
      message: `¿Está seguro de eliminar el asiento N° ${row.numero} "${row.leyenda || ''}"?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteAsiento(ejercicio, row.numero, empresa.id);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Asiento eliminado' });
          buscar();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
        }
      },
    });
  }

  function handleDeleteSeleccionados() {
    confirmDialog({
      message: `¿Está seguro de eliminar los ${seleccion.length} asientos seleccionados?`,
      header: 'Confirmar eliminación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        setEliminando(true);
        try {
          await Promise.all(seleccion.map(row => api.deleteAsiento(ejercicio, row.numero, empresa.id)));
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Asientos eliminados' });
          setSeleccion([]);
          buscar();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar alguno de los asientos' });
        } finally {
          setEliminando(false);
        }
      },
    });
  }

  function rowExpansionTemplate(row) {
    const detalle = movimientosPorAsiento[row.numero] ?? [];
    return (
      <div className="row-expansion">
        <DataTable value={detalle} size="small" stripedRows emptyMessage="Sin renglones">
          <Column field="linea" header="Línea" style={{ width: '70px' }} />
          <Column field="cuenta" header="Cuenta" style={{ width: '110px' }} />
          <Column field="cuenta_descripcion" header="Descripción" />
          <Column body={m => money(m.debe)} header="Debe" style={{ width: '130px' }} />
          <Column body={m => money(m.haber)} header="Haber" style={{ width: '130px' }} />
          <Column field="leyenda" header="Leyenda" />
        </DataTable>
      </div>
    );
  }

  const fechaTemplate = row => row.fecha ? new Date(row.fecha).toLocaleDateString('es-AR') : '—';

  const numeroTemplate = row => (
    <span>
      {row.numero}
      {row.asiento_union && (
        <i className="fa-solid fa-link" style={{ marginLeft: '0.4rem', color: '#94a3b8' }}
          title={`Unido a asiento N° ${row.asiento_union}`} />
      )}
    </span>
  );

  const accionesTemplate = (row) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-pen" className="p-button-text p-button-sm" tooltip="Modificar" tooltipOptions={{ position: 'top' }} onClick={() => openEdit(row)} />
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar" tooltipOptions={{ position: 'top' }} onClick={() => handleDelete(row)} />
    </div>
  );

  // Más nuevo primero — se ordena por fecha_desde, no por el texto de `id`
  // (ver PeriodoSelect.jsx, mismo criterio para no depender de que el código sea comparable como string).
  const ejercicioOptions = [...ejercicios]
    .sort((a, b) => new Date(b.fecha_desde || 0) - new Date(a.fecha_desde || 0))
    .map(e => ({ label: `${e.id} - ${e.descripcion ?? ''}`, value: e.id }));

  return (
    <div className="page-contabilidad">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-file-invoice" /> Listado de Asientos</h2>
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
        <Button label={`Eliminar seleccionados (${seleccion.length})`} icon="fa-solid fa-trash" size="small" className="p-button-danger p-button-outlined"
          onClick={handleDeleteSeleccionados} loading={eliminando} disabled={!seleccion.length} />
        <div className="form-field ml-auto">
          <Dropdown value={null} options={modelos.map(m => ({ label: `${m.id} - ${m.descripcion ?? ''}`, value: m.id }))}
            onChange={e => e.value && openDesdeModelo(e.value)} placeholder="Desde modelo" showClear={false}
            disabled={!ejercicio || !modelos.length} style={{ width: '180px' }} />
        </div>
        <Button label="Agregar asiento" icon="fa-solid fa-plus" size="small" onClick={openNew} disabled={!ejercicio} />
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
        expandedRows={expandedRows}
        onRowToggle={onRowToggle}
        rowExpansionTemplate={rowExpansionTemplate}
        selection={seleccion}
        onSelectionChange={e => setSeleccion(e.value)}
        dataKey="numero"
      >
        <Column selectionMode="multiple" style={{ width: '3rem' }} />
        <Column expander style={{ width: '3rem' }} />
        <Column body={numeroTemplate} header="Asiento" style={{ width: '100px' }} />
        <Column body={fechaTemplate} header="Fecha" style={{ width: '110px' }} />
        <Column field="leyenda" header="Leyenda" />
        <Column field="tipo" header="Tipo" style={{ width: '130px' }} />
        <Column body={r => money(r.saldo)} header="Saldo" style={{ width: '130px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '100px', textAlign: 'center' }} />
      </DataTable>

      <AsientoDialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        onSaved={handleSaved}
        empresa={empresa?.id}
        ejercicio={ejercicios.find(e => e.id === ejercicio)}
        asiento={asientoEditando}
        movimientosIniciales={movimientosIniciales}
        cuentas={cuentas}
        toast={toast}
      />
    </div>
  );
}
