import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import * as api from '../../api/grupos';
import './PermisosPage.css';

const MODULO_LABELS = { sueldos: 'Sueldos', configuracion: 'Configuración', seguridad: 'Seguridad' };

export default function PermisosPage() {
  const [grupos, setGrupos] = useState([]);
  const [grupoId, setGrupoId] = useState(null);
  const [permisos, setPermisos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useRef(null);

  useEffect(() => {
    api.getGrupos()
      .then(res => setGrupos(res.data.resultado))
      .catch(() => toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los grupos' }));
  }, []);

  useEffect(() => {
    if (!grupoId) { setPermisos([]); return; }
    setLoading(true);
    api.getGrupoPermisos(grupoId)
      .then(res => setPermisos(res.data.resultado))
      .catch(() => toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los permisos' }))
      .finally(() => setLoading(false));
  }, [grupoId]);

  function toggle(modulo, accion, value) {
    setPermisos(prev => prev.map(p => p.modulo === modulo ? { ...p, [accion]: value } : p));
  }

  async function handleGuardar() {
    setSaving(true);
    try {
      await api.setGrupoPermisos(grupoId, permisos);
      toast.current.show({ severity: 'success', summary: 'OK', detail: 'Permisos actualizados' });
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron guardar los permisos' });
    } finally {
      setSaving(false);
    }
  }

  const checkboxTemplate = (accion) => (row) => (
    <Checkbox checked={row[accion]} onChange={e => toggle(row.modulo, accion, e.checked)} />
  );

  return (
    <div className="page-permisos">
      <Toast ref={toast} />
      <h2 className="page-title"><i className="fa-solid fa-key" /> Permisos</h2>

      <div className="permisos-toolbar">
        <div className="form-field">
          <label>Grupo</label>
          <Dropdown
            value={grupoId}
            options={grupos.map(g => ({ label: g.nombre, value: g.id }))}
            onChange={e => setGrupoId(e.value)}
            placeholder="Seleccionar un grupo"
            showClear
            style={{ width: '280px' }}
          />
        </div>
      </div>

      {grupoId ? (
        <>
          <DataTable value={permisos} loading={loading} size="small" stripedRows>
            <Column body={row => MODULO_LABELS[row.modulo] ?? row.modulo} header="Módulo" />
            <Column body={checkboxTemplate('ver')} header="Ver" alignHeader="center" style={{ width: '90px', textAlign: 'center' }} />
            <Column body={checkboxTemplate('crear')} header="Crear" alignHeader="center" style={{ width: '90px', textAlign: 'center' }} />
            <Column body={checkboxTemplate('editar')} header="Editar" alignHeader="center" style={{ width: '90px', textAlign: 'center' }} />
            <Column body={checkboxTemplate('eliminar')} header="Eliminar" alignHeader="center" style={{ width: '90px', textAlign: 'center' }} />
          </DataTable>
          <div className="sub-form-actions">
            <Button label="Guardar" icon="fa-solid fa-check" onClick={handleGuardar} loading={saving} />
          </div>
        </>
      ) : (
        <p className="tab-empty-msg"><i className="fa-solid fa-circle-info" /> Elegí un grupo para ver y editar sus permisos.</p>
      )}
    </div>
  );
}
