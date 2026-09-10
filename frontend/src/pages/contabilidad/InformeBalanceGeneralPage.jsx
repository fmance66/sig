import { useState, useEffect, useRef } from 'react';
import { TreeTable } from 'primereact/treetable';
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

export default function InformeBalanceGeneralPage() {
  const { empresa } = useEmpresa();
  const [ejercicios, setEjercicios] = useState([]);
  const [ejercicio, setEjercicio] = useState(null);
  const [arbol, setArbol] = useState([]);
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
    if (!ejercicio) { setArbol([]); return; }
    setLoading(true);
    try {
      const res = await api.getBalanceGeneral({ empresa: empresa.id, ejercicio });
      setArbol(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo obtener el Balance General' });
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
        <h2 className="page-title"><i className="fa-solid fa-sitemap" /> Balance General</h2>
      </div>

      <div className="filtros-toolbar">
        <div className="form-field">
          <label>Ejercicio</label>
          <Dropdown value={ejercicio} options={ejercicioOptions} onChange={e => setEjercicio(e.value)} style={{ width: '220px' }} />
        </div>
        <Button label="Buscar" icon="fa-solid fa-magnifying-glass" size="small" onClick={buscar} loading={loading} />
      </div>

      <TreeTable
        value={arbol}
        loading={loading}
        emptyMessage={ejercicio ? 'No hay cuentas registradas' : 'Elegí un ejercicio'}
        size="small"
        stripedRows
        scrollable
        scrollHeight="65vh"
      >
        <Column field="id" header="Cuenta" expander style={{ width: '220px' }} body={node => node.data.id} />
        <Column header="Descripción" body={node => node.data.descripcion} />
        <Column header="Debe" style={{ width: '150px' }} body={node => money(node.data.debe)} />
        <Column header="Haber" style={{ width: '150px' }} body={node => money(node.data.haber)} />
        <Column header="Saldo" style={{ width: '150px' }} body={node => money(node.data.saldo)} />
      </TreeTable>
    </div>
  );
}
