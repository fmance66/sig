import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import FiltroTexto from '../liquidaciones/FiltroTexto';
import PeriodoSelect from '../../../components/PeriodoSelect';
import { informesPersonalizados, ejecutarInformePersonalizado } from '../../../api/informes';
import BotonVolver from '../../../components/BotonVolver';
import './informes.css';

export default function InformesPersonalizadosPage() {
  const [informes, setInformes] = useState([]);
  const [informeId, setInformeId] = useState(null);
  const [legajo, setLegajo] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [resultado, setResultado] = useState({ columnas: [], filas: [] });
  const [loading, setLoading] = useState(false);
  const toast = useRef(null);

  useEffect(() => {
    informesPersonalizados.getAll().then(res => setInformes(res.data.resultado)).catch(() => {});
  }, []);

  async function ejecutar() {
    if (!informeId) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Elegí un informe' });
      return;
    }
    setLoading(true);
    try {
      const res = await ejecutarInformePersonalizado(informeId, { legajo, periodo });
      setResultado(res.data.resultado);
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'No se pudo ejecutar el informe';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setLoading(false);
    }
  }

  const informeOptions = informes.map(i => ({ label: `${i.id} — ${i.descripcion ?? ''}`, value: i.id }));

  return (
    <div className="page-informes">
      <Toast ref={toast} />
      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-table-list" /> Informes Personalizados</h2>
      </div>

      <div className="informe-filtro">
        <div className="form-field informe-toolbar-extra">
          <label>Informe</label>
          <Dropdown value={informeId} options={informeOptions} onChange={e => setInformeId(e.value)} placeholder="Seleccionar informe" filter showClear style={{ width: '280px' }} />
        </div>
        <div className="form-field">
          <label>Legajo</label>
          <FiltroTexto value={legajo} onChange={e => setLegajo(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Período</label>
          <PeriodoSelect value={periodo} onChange={e => setPeriodo(e.value || '')} placeholder="" style={{ width: '220px' }} />
        </div>
        <Button label="Ejecutar" icon="fa-solid fa-play" size="small" onClick={ejecutar} loading={loading} />
      </div>

      <DataTable
        value={resultado.filas}
        loading={loading}
        paginator={resultado.filas.length > 20}
        rows={20}
        rowsPerPageOptions={[20, 50, 100]}
        size="small"
        stripedRows
        emptyMessage="Elegí un informe y presioná Ejecutar"
      >
        {resultado.columnas.map(c => (
          <Column key={c.campo} field={c.campo} header={c.descripcion} />
        ))}
      </DataTable>
    </div>
  );
}
