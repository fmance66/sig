import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import * as api from '../../api/informesContables';
import * as ejerciciosApi from '../../api/ejercicios';
import { useEmpresa } from '../../context/EmpresaContext';
import BotonVolver from '../../components/BotonVolver';
import './contabilidad.css';

const money = v => v === null || v === undefined ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function InformeBalanceSumasSaldosPage() {
  const { empresa } = useEmpresa();
  const [ejercicios, setEjercicios] = useState([]);
  const [ejercicio, setEjercicio] = useState(null);
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(false);
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
    if (!ejercicio) { setCuentas([]); return; }
    setLoading(true);
    try {
      const res = await api.getBalanceSumasSaldos({ empresa: empresa.id, ejercicio });
      setCuentas(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo obtener el Balance de Sumas y Saldos' });
    } finally {
      setLoading(false);
    }
  }

  const ejercicioOptions = [...ejercicios]
    .sort((a, b) => new Date(b.fecha_desde || 0) - new Date(a.fecha_desde || 0))
    .map(e => ({ label: `${e.id} - ${e.descripcion ?? ''}`, value: e.id }));

  return (
    <div className="page-contabilidad">
      <Toast ref={toast} />

      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-scale-balanced" /> Balance de Sumas y Saldos</h2>
      </div>

      <div className="filtros-toolbar">
        <div className="form-field">
          <label>Ejercicio</label>
          <Dropdown value={ejercicio} options={ejercicioOptions} onChange={e => setEjercicio(e.value)} style={{ width: '220px' }} />
        </div>
        <Button label="Buscar" icon="fa-solid fa-magnifying-glass" size="small" onClick={buscar} loading={loading} />
      </div>

      <DataTable
        value={cuentas}
        loading={loading}
        size="small"
        stripedRows
        emptyMessage={ejercicio ? 'No hay cuentas registradas' : 'Elegí un ejercicio'}
      >
        <Column field="id" header="Cuenta" style={{ width: '130px' }} />
        <Column field="descripcion" header="Descripción" />
        <Column body={r => money(r.debe)} header="Debe" style={{ width: '150px' }} />
        <Column body={r => money(r.haber)} header="Haber" style={{ width: '150px' }} />
        <Column body={r => money(r.saldo)} header="Saldo" style={{ width: '150px' }} />
      </DataTable>
    </div>
  );
}
