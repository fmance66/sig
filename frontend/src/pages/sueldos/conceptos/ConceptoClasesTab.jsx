import { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import * as api from '../../../api/clasesConcepto';

export default function ConceptoClasesTab({ clase, onChange, toast }) {
  const [clases, setClases] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [loadingGrupos, setLoadingGrupos] = useState(false);

  useEffect(() => {
    api.getClasesConcepto()
      .then(res => setClases(res.data.resultado))
      .catch(() => toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las clases' }));
  }, []);

  useEffect(() => {
    if (!clase) { setGrupos([]); return; }
    setLoadingGrupos(true);
    api.getGruposDeClase(clase)
      .then(res => setGrupos(res.data.resultado))
      .catch(() => toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los grupos de la clase' }))
      .finally(() => setLoadingGrupos(false));
  }, [clase]);

  return (
    <div className="sub-tab">
      <div className="form-grid">
        <div className="form-field">
          <label>Clase</label>
          <Dropdown
            value={clase}
            options={clases.map(c => ({ label: `${c.id} - ${c.descripcion ?? ''}`, value: c.id }))}
            onChange={e => onChange(e.value)}
            placeholder="Seleccionar clase..."
            filter
            showClear
          />
        </div>
      </div>

      <div className="form-section-title">Grupos de la Clase</div>
      <DataTable value={grupos} loading={loadingGrupos} emptyMessage={clase ? 'Esta clase no tiene grupos asignados' : 'Seleccioná una clase para ver sus grupos'} size="small" stripedRows>
        <Column field="grupo" header="Grupo" style={{ width: '160px' }} />
        <Column field="descripcion" header="Descripción" />
        <Column field="orden" header="Orden" style={{ width: '100px' }} />
      </DataTable>
    </div>
  );
}
