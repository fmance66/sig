import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import * as api from '../../api/asientos';
import * as ejerciciosApi from '../../api/ejercicios';
import { useEmpresa } from '../../context/EmpresaContext';
import BotonVolver from '../../components/BotonVolver';
import './contabilidad.css';

const money = v => v === null || v === undefined ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ORDEN_OPTIONS = [{ label: 'Fecha', value: 'fecha' }, { label: 'Número actual', value: 'numero' }];

export default function RenumeracionAsientosPage() {
  const { empresa } = useEmpresa();
  const [ejercicios, setEjercicios] = useState([]);
  const [ejercicio, setEjercicio] = useState(null);
  const [asientos, setAsientos] = useState([]);
  const [numeroInicial, setNumeroInicial] = useState(1);
  const [incremento, setIncremento] = useState(1);
  const [orden, setOrden] = useState('fecha');
  const [loading, setLoading] = useState(false);
  const [renumerando, setRenumerando] = useState(false);
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

  async function buscar() {
    if (!ejercicio) { setAsientos([]); return; }
    setLoading(true);
    try {
      const res = await api.getAsientos({ empresa: empresa.id, ejercicio });
      setAsientos(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo obtener el listado de asientos' });
    } finally {
      setLoading(false);
    }
  }

  function handleRenumerar() {
    confirmDialog({
      message: `¿Renumerar los ${asientos.length} asientos del ejercicio ${ejercicio} empezando en ${numeroInicial} de a ${incremento}, ordenados por ${orden === 'fecha' ? 'fecha' : 'número actual'}?`,
      header: 'Confirmar renumeración',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Renumerar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        setRenumerando(true);
        try {
          await api.renumerarAsientos({ ejercicio, empresa: empresa.id, numeroInicial, incremento, orden });
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Asientos renumerados' });
          buscar();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo renumerar' });
        } finally {
          setRenumerando(false);
        }
      },
    });
  }

  const fechaTemplate = row => row.fecha ? new Date(row.fecha).toLocaleDateString('es-AR') : '—';
  const ejercicioOptions = [...ejercicios]
    .sort((a, b) => new Date(b.fecha_desde || 0) - new Date(a.fecha_desde || 0))
    .map(e => ({ label: `${e.id} - ${e.descripcion ?? ''}`, value: e.id }));

  return (
    <div className="page-contabilidad">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-arrow-down-1-9" /> Renumeración de Asientos</h2>
      </div>

      <div className="filtros-toolbar">
        <div className="form-field">
          <label>Ejercicio</label>
          <Dropdown value={ejercicio} options={ejercicioOptions} onChange={e => setEjercicio(e.value)} style={{ width: '220px' }} />
        </div>
        <div className="form-field">
          <label>Número inicial</label>
          <InputNumber value={numeroInicial} onValueChange={e => setNumeroInicial(e.value ?? 1)} min={1} showButtons buttonLayout="horizontal" style={{ width: '140px' }} />
        </div>
        <div className="form-field">
          <label>Incremento</label>
          <InputNumber value={incremento} onValueChange={e => setIncremento(e.value ?? 1)} min={1} showButtons buttonLayout="horizontal" style={{ width: '140px' }} />
        </div>
        <div className="form-field">
          <label>Ordenamiento</label>
          <Dropdown value={orden} options={ORDEN_OPTIONS} onChange={e => setOrden(e.value)} />
        </div>
        <Button label="Renumerar" icon="fa-solid fa-arrow-down-1-9" size="small" onClick={handleRenumerar} loading={renumerando} disabled={!ejercicio || !asientos.length} />
      </div>

      <DataTable
        value={asientos}
        loading={loading}
        size="small"
        stripedRows
        paginator={asientos.length > 15}
        rows={15}
        paginatorRight={<span className="total-registros">Total: {asientos.length} registros</span>}
        emptyMessage={ejercicio ? 'No hay asientos en este ejercicio' : 'Elegí un ejercicio'}
      >
        <Column field="numero" header="Asiento" style={{ width: '100px' }} />
        <Column body={fechaTemplate} header="Fecha" style={{ width: '110px' }} />
        <Column field="leyenda" header="Leyenda" />
        <Column body={r => money(r.saldo)} header="Saldo" style={{ width: '130px' }} />
      </DataTable>
    </div>
  );
}
