import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import * as api from '../../api/sesiones';
import './SesionesPage.css';

const fechaTemplate = v => v ? new Date(v).toLocaleString('es-AR') : '—';

export default function SesionesPage() {
  const [sesiones, setSesiones] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useRef(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getSesiones();
      setSesiones(res.data.resultado);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las sesiones' });
    } finally {
      setLoading(false);
    }
  }

  function handleRevocar(row) {
    confirmDialog({
      message: `¿Cerrar la sesión de "${row.usuario ?? 'usuario desconocido'}"?`,
      header: 'Confirmar revocación',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Revocar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.deleteSesion(row.sid);
          toast.current.show({ severity: 'success', summary: 'OK', detail: 'Sesión revocada' });
          load();
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo revocar la sesión' });
        }
      },
    });
  }

  const usuarioTemplate = row => (
    <>
      {row.nombre ?? row.usuario ?? '—'}{' '}
      {row.propia && <Tag value="Esta sesión" severity="info" className="sesion-propia-tag" />}
    </>
  );

  const accionesTemplate = row => (
    <div className="acciones-col">
      <Button
        icon="fa-solid fa-right-from-bracket"
        className="p-button-text p-button-sm p-button-danger"
        tooltip="Revocar sesión"
        tooltipOptions={{ position: 'top' }}
        disabled={row.propia}
        onClick={() => handleRevocar(row)}
      />
    </div>
  );

  return (
    <div className="page-sesiones">
      <Toast ref={toast} />
      <ConfirmDialog />

      <h2 className="page-title"><i className="fa-solid fa-clock-rotate-left" /> Sesiones activas</h2>

      <DataTable
        value={sesiones}
        loading={loading}
        size="small"
        stripedRows
        emptyMessage="No hay sesiones activas"
        paginatorRight={<span className="total-registros">Total: {sesiones.length} registros</span>}
      >
        <Column body={usuarioTemplate} header="Usuario" />
        <Column body={row => fechaTemplate(row.expire)} header="Expira" style={{ width: '200px' }} />
        <Column body={accionesTemplate} header="Acciones" alignHeader="center" style={{ width: '100px', textAlign: 'center' }} />
      </DataTable>
    </div>
  );
}
