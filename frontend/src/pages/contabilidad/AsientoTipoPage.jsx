import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import * as api from '../../api/asientos';
import * as ejerciciosApi from '../../api/ejercicios';
import * as cuentasApi from '../../api/cuentas';
import { useEmpresa } from '../../context/EmpresaContext';
import BotonVolver from '../../components/BotonVolver';
import AsientoDialog from './AsientoDialog';
import './contabilidad.css';

const money = v => v === null || v === undefined ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Base compartida por Asiento de Apertura y Asiento de Cierre (menú
// Ejercicios): son el mismo Listado de Asientos, pero acotado a un `tipo`
// fijo — cnt_asiento.tipo ya distingue APERTURA/CIERRE (ver migración 006),
// no hace falta una tabla ni un modelo nuevos.
export default function AsientoTipoPage({ tipo, titulo, icono }) {
  const { empresa } = useEmpresa();
  const [ejercicios, setEjercicios] = useState([]);
  const [ejercicio, setEjercicio] = useState(null);
  const [asientos, setAsientos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState(null);
  const [movimientosPorAsiento, setMovimientosPorAsiento] = useState({});
  const [dialogVisible, setDialogVisible] = useState(false);
  const [asientoEditando, setAsientoEditando] = useState(null);
  const toast = useRef(null);

  useEffect(() => {
    if (!empresa) return;
    cuentasApi.getCuentas(empresa.id).then(res => setCuentas(res.data.resultado)).catch(() => setCuentas([]));
    ejerciciosApi.getEjercicios(empresa.id).then(res => {
      const lista = res.data.resultado;
      setEjercicios(lista);
      const masReciente = [...lista].sort((a, b) => new Date(b.fecha_desde || 0) - new Date(a.fecha_desde || 0))[0];
      const activo = lista.find(e => e.estado === 'ACTIVO') || masReciente || null;
      setEjercicio(activo ? activo.id : null);
    }).catch(() => setEjercicios([]));
  }, [empresa?.id]);

  useEffect(() => { if (ejercicio) buscar(); }, [ejercicio]);

  async function buscar() {
    if (!ejercicio) { setAsientos([]); return; }
    setLoading(true);
    try {
      const res = await api.getAsientos({ empresa: empresa.id, ejercicio, tipo });
      setAsientos(res.data.resultado);
      setExpandedRows(null);
      setMovimientosPorAsiento({});
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: `No se pudo obtener el ${titulo.toLowerCase()}` });
    } finally {
      setLoading(false);
    }
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
    setDialogVisible(true);
  }

  function openEdit(row) {
    setAsientoEditando(row);
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

  const accionesTemplate = (row) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-pen" className="p-button-text p-button-sm" tooltip="Modificar" tooltipOptions={{ position: 'top' }} onClick={() => openEdit(row)} />
      <Button icon="fa-solid fa-trash" className="p-button-text p-button-sm p-button-danger" tooltip="Eliminar" tooltipOptions={{ position: 'top' }} onClick={() => handleDelete(row)} />
    </div>
  );

  const ejercicioOptions = [...ejercicios]
    .sort((a, b) => new Date(b.fecha_desde || 0) - new Date(a.fecha_desde || 0))
    .map(e => ({ label: `${e.id} - ${e.descripcion ?? ''}`, value: e.id }));

  return (
    <div className="page-contabilidad">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className={icono} /> {titulo}</h2>
      </div>

      <div className="filtros-toolbar">
        <div className="form-field">
          <label>Ejercicio</label>
          <Dropdown value={ejercicio} options={ejercicioOptions} onChange={e => setEjercicio(e.value)} style={{ width: '220px' }} />
        </div>
        <Button label="Buscar" icon="fa-solid fa-magnifying-glass" size="small" onClick={buscar} loading={loading} />
        <Button label="Agregar" icon="fa-solid fa-plus" size="small" className="ml-auto" onClick={openNew} disabled={!ejercicio} />
      </div>

      <DataTable
        value={asientos}
        loading={loading}
        size="small"
        stripedRows
        emptyMessage={ejercicio ? `No hay asientos de este tipo para el ejercicio elegido` : 'Elegí un ejercicio para buscar'}
        expandedRows={expandedRows}
        onRowToggle={onRowToggle}
        rowExpansionTemplate={rowExpansionTemplate}
        dataKey="numero"
      >
        <Column expander style={{ width: '3rem' }} />
        <Column field="numero" header="Asiento" style={{ width: '100px' }} />
        <Column body={fechaTemplate} header="Fecha" style={{ width: '110px' }} />
        <Column field="leyenda" header="Leyenda" />
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
        movimientosIniciales={null}
        cuentas={cuentas}
        toast={toast}
        tipoFijo={tipo}
      />
    </div>
  );
}
