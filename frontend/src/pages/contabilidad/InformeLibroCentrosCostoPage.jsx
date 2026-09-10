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

export default function InformeLibroCentrosCostoPage() {
  const { empresa } = useEmpresa();
  const [ejercicios, setEjercicios] = useState([]);
  const [ejercicio, setEjercicio] = useState(null);
  const [centros, setCentros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState(null);
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
    if (!ejercicio) { setCentros([]); return; }
    setLoading(true);
    try {
      const res = await api.getLibroCentrosCosto({ empresa: empresa.id, ejercicio });
      setCentros(res.data.resultado);
      setExpandedRows(null);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo obtener el Libro de Centros de Costo' });
    } finally {
      setLoading(false);
    }
  }

  function rowExpansionTemplate(row) {
    return (
      <div className="row-expansion">
        <DataTable value={row.movimientos} size="small" stripedRows emptyMessage="Sin movimientos">
          <Column body={m => new Date(m.fecha).toLocaleDateString('es-AR')} header="Fecha" style={{ width: '110px' }} />
          <Column field="numero" header="Asiento" style={{ width: '90px' }} />
          <Column field="cuenta" header="Cuenta" style={{ width: '110px' }} />
          <Column field="cuenta_descripcion" header="Descripción" />
          <Column body={m => money(m.debe)} header="Debe" style={{ width: '120px' }} />
          <Column body={m => money(m.haber)} header="Haber" style={{ width: '120px' }} />
          <Column body={m => money(m.saldoAcumulado)} header="Saldo Acumulado" style={{ width: '140px' }} />
        </DataTable>
      </div>
    );
  }

  const ejercicioOptions = [...ejercicios]
    .sort((a, b) => new Date(b.fecha_desde || 0) - new Date(a.fecha_desde || 0))
    .map(e => ({ label: `${e.id} - ${e.descripcion ?? ''}`, value: e.id }));

  return (
    <div className="page-contabilidad">
      <Toast ref={toast} />

      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-layer-group" /> Libro de Centros de Costo</h2>
      </div>

      <div className="filtros-toolbar">
        <div className="form-field">
          <label>Ejercicio</label>
          <Dropdown value={ejercicio} options={ejercicioOptions} onChange={e => setEjercicio(e.value)} style={{ width: '220px' }} />
        </div>
        <Button label="Buscar" icon="fa-solid fa-magnifying-glass" size="small" onClick={buscar} loading={loading} />
      </div>

      <DataTable
        value={centros}
        loading={loading}
        size="small"
        stripedRows
        emptyMessage={ejercicio ? 'No hay movimientos prorrateados a centros de costo en este ejercicio' : 'Elegí un ejercicio'}
        expandedRows={expandedRows}
        onRowToggle={e => setExpandedRows(e.data)}
        rowExpansionTemplate={rowExpansionTemplate}
        dataKey="centro_de_costo"
      >
        <Column expander style={{ width: '3rem' }} />
        <Column field="centro_de_costo" header="Centro de Costo" style={{ width: '150px' }} />
        <Column field="descripcion" header="Descripción" />
        <Column body={r => money(r.debe)} header="Debe" style={{ width: '140px' }} />
        <Column body={r => money(r.haber)} header="Haber" style={{ width: '140px' }} />
        <Column body={r => money(r.saldo)} header="Saldo" style={{ width: '140px' }} />
      </DataTable>
    </div>
  );
}
