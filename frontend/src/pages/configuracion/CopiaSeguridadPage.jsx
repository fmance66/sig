import { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import * as api from '../../api/backup';
import BotonVolver from '../../components/BotonVolver';
import './CopiaSeguridadPage.css';

function timestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export default function CopiaSeguridadPage() {
  const [generando, setGenerando] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [confirmado, setConfirmado] = useState(false);
  const [restaurando, setRestaurando] = useState(false);
  const fileInputRef = useRef(null);
  const toast = useRef(null);

  async function handleGenerar() {
    setGenerando(true);
    try {
      const res = await fetch(api.getGenerarUrl());
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.mensaje || 'Error al generar la copia de seguridad');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sueldos_backup_${timestamp()}.sql`;
      a.click();
      URL.revokeObjectURL(url);
      toast.current.show({ severity: 'success', summary: 'OK', detail: 'Copia de seguridad generada' });
    } catch (err) {
      toast.current.show({ severity: 'error', summary: 'Error', detail: err.message });
    } finally {
      setGenerando(false);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setArchivo(file);
    setConfirmado(false);
  }

  function handleRestaurarClick() {
    confirmDialog({
      message: `Esto reemplaza TODOS los datos actuales de la base por el contenido de "${archivo.name}". La acción no se puede deshacer. ¿Confirma?`,
      header: 'Confirmar restauración',
      icon: 'fa-solid fa-triangle-exclamation',
      acceptLabel: 'Restaurar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: restaurar,
    });
  }

  async function restaurar() {
    setRestaurando(true);
    try {
      const contenido = await archivo.text();
      await api.restaurar(contenido);
      toast.current.show({ severity: 'success', summary: 'OK', detail: 'Base de datos restaurada' });
      setArchivo(null);
      setConfirmado(false);
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'No se pudo restaurar la copia de seguridad';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setRestaurando(false);
    }
  }

  return (
    <div className="page-backup">
      <Toast ref={toast} />
      <ConfirmDialog />
      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-database" /> Copia de Seguridad</h2>
      </div>

      <div className="backup-card">
        <h3 className="backup-card-title"><i className="fa-solid fa-download" /> Generar copia de seguridad</h3>
        <p className="backup-card-desc">Descarga un archivo .sql con el contenido completo de la base de datos.</p>
        <Button label="Generar y descargar" icon="fa-solid fa-download" onClick={handleGenerar} loading={generando} />
      </div>

      <div className="backup-card backup-card--danger">
        <h3 className="backup-card-title"><i className="fa-solid fa-upload" /> Restaurar copia de seguridad</h3>
        <p className="backup-card-desc">
          <i className="fa-solid fa-triangle-exclamation warning-icon" /> Reemplaza todos los datos actuales de la base por los del archivo elegido. Esta acción no se puede deshacer.
        </p>

        <div className="backup-restaurar-file">
          <Button
            label={archivo ? 'Cambiar archivo' : 'Elegir archivo .sql'}
            icon="fa-solid fa-file-arrow-up"
            className="p-button-outlined"
            onClick={() => fileInputRef.current?.click()}
            disabled={restaurando}
          />
          {archivo && <span className="backup-file-name">{archivo.name}</span>}
          <input ref={fileInputRef} type="file" accept=".sql" style={{ display: 'none' }} onChange={handleFileChange} />
        </div>

        {archivo && (
          <>
            <div className="form-field form-field--checkbox">
              <Checkbox inputId="confirmaRestauracion" checked={confirmado} onChange={e => setConfirmado(e.checked)} />
              <label htmlFor="confirmaRestauracion">Entiendo que esta acción reemplaza todos los datos actuales de la base</label>
            </div>
            <Button
              label="Restaurar"
              icon="fa-solid fa-triangle-exclamation"
              className="p-button-danger"
              onClick={handleRestaurarClick}
              loading={restaurando}
              disabled={!confirmado}
            />
          </>
        )}
      </div>

      <div className="backup-card backup-card--disabled">
        <h3 className="backup-card-title"><i className="fa-solid fa-cloud-arrow-up" /> Copia de seguridad en la nube <span className="backup-badge">En desarrollo</span></h3>
        <p className="backup-card-desc">Copia automática a un almacenamiento externo. A definir el proveedor.</p>
      </div>

      <div className="backup-card backup-card--disabled">
        <h3 className="backup-card-title"><i className="fa-solid fa-clock" /> Programar copia de seguridad <span className="backup-badge">En desarrollo</span></h3>
        <p className="backup-card-desc">Copias periódicas automáticas (diarias/semanales) sin intervención manual.</p>
      </div>
    </div>
  );
}
