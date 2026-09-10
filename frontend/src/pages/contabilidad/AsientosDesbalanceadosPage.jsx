import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import * as api from '../../api/asientos';
import * as ejerciciosApi from '../../api/ejercicios';
import * as cuentasApi from '../../api/cuentas';
import { useEmpresa } from '../../context/EmpresaContext';
import BotonVolver from '../../components/BotonVolver';
import AsientoDialog from './AsientoDialog';
import './contabilidad.css';

const money = v => v === null || v === undefined ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AsientosDesbalanceadosPage() {
  const { empresa } = useEmpresa();
  const [ejercicios, setEjercicios] = useState([]);
  const [ejercicio, setEjercicio] = useState(null);
  const [asientos, setAsientos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(false);
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
      const res = await api.getDesbalanceados({ empresa: empresa.id, ejercicio });
      setAsientos(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo obtener el listado' });
    } finally {
      setLoading(false);
    }
  }

  function handleSaved() {
    setDialogVisible(false);
    buscar();
  }

  const fechaTemplate = row => row.fecha ? new Date(row.fecha).toLocaleDateString('es-AR') : '—';
  const diferenciaTemplate = row => money((Number(row.debe) || 0) - (Number(row.haber) || 0));

  const accionesTemplate = (row) => (
    <div className="acciones-col">
      <Button icon="fa-solid fa-pen" className="p-button-text p-button-sm" tooltip="Corregir" tooltipOptions={{ position: 'top' }}
        onClick={() => { setAsientoEditando(row); setDialogVisible(true); }} />
    </div>
  );

  const ejercicioOptions = [...ejercicios]
    .sort((a, b) => new Date(b.fecha_desde || 0) - new Date(a.fecha_desde || 0))
    .map(e => ({ label: `${e.id} - ${e.descripcion ?? ''}`, value: e.id }));

  return (
    <div className="page-contabilidad">
      <Toast ref={toast} />

      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-scale-unbalanced" /> Asientos Desbalanceados</h2>
      </div>

      <div className="filtros-toolbar">
        <div className="form-field">
          <label>Ejercicio</label>
          <Dropdown value={ejercicio} options={ejercicioOptions} onChange={e => setEjercicio(e.value)} style={{ width: '220px' }} />
        </div>
        <Button label="Buscar" icon="fa-solid fa-magnifying-glass" size="small" onClick={buscar} loading={loading} />
      </div>

      <DataTable
        value={asientos}
        loading={loading}
        size="small"
        stripedRows
        paginator={asientos.length > 15}
        rows={15}
        paginatorRight={<span className="total-registros">Total: {asientos.length} registros</span>}
        emptyMessage={ejercicio ? 'No hay asientos desbalanceados en este ejercicio' : 'Elegí un ejercicio'}
      >
        <Column field="numero" header="Asiento" style={{ width: '100px' }} />
        <Column body={fechaTemplate} header="Fecha" style={{ width: '110px' }} />
        <Column field="leyenda" header="Leyenda" />
        <Column body={r => money(r.debe)} header="Debe" style={{ width: '130px' }} />
        <Column body={r => money(r.haber)} header="Haber" style={{ width: '130px' }} />
        <Column body={diferenciaTemplate} header="Diferencia" style={{ width: '130px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '90px', textAlign: 'center' }} />
      </DataTable>

      <AsientoDialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        onSaved={handleSaved}
        empresa={empresa?.id}
        ejercicio={ejercicios.find(e => e.id === ejercicio)}
        asiento={asientoEditando}
        cuentas={cuentas}
        toast={toast}
      />
    </div>
  );
}
