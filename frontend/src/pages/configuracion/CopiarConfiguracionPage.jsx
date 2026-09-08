import { useState, useEffect, useRef } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import * as api from '../../api/empresas';
import BotonVolver from '../../components/BotonVolver';
import './EmpresasPage.css';

// Copia conceptos (fórmulas, aportes) y diseño de recibo/libro de una empresa a otra —
// para que una empresa nueva no arranque con todo vacío (ver memoria
// project_multiempresa_filtro_faltante: esas tablas son por-empresa, el resto de
// catálogos ya es global y no hace falta clonarlo).
export default function ClonarConfiguracionPage() {
  const [empresas, setEmpresas] = useState([]);
  const [origenId, setOrigenId] = useState(null);
  const [destinoId, setDestinoId] = useState(null);
  const [tieneConfig, setTieneConfig] = useState(null);
  const [checking, setChecking] = useState(false);
  const [clonando, setClonando] = useState(false);
  const [modoDialogVisible, setModoDialogVisible] = useState(false);
  const toast = useRef(null);

  useEffect(() => {
    api.getEmpresas().then(res => setEmpresas(res.data.resultado)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!destinoId) { setTieneConfig(null); return; }
    setChecking(true);
    api.tieneConfiguracion(destinoId)
      .then(res => setTieneConfig(res.data.resultado.tieneConfiguracion))
      .catch(() => setTieneConfig(null))
      .finally(() => setChecking(false));
  }, [destinoId]);

  const origenOptions = empresas.filter(e => e.id !== destinoId).map(e => ({ label: e.razon_social, value: e.id }));
  const destinoOptions = empresas.filter(e => e.id !== origenId).map(e => ({ label: e.razon_social, value: e.id }));

  function handleClonarClick() {
    if (!origenId || !destinoId) {
      toast.current.show({ severity: 'warn', summary: 'Atención', detail: 'Elegí la empresa de origen y la de destino' });
      return;
    }
    if (tieneConfig) {
      setModoDialogVisible(true);
    } else {
      ejecutarClon('reemplazar');
    }
  }

  async function ejecutarClon(modo) {
    setModoDialogVisible(false);
    setClonando(true);
    try {
      await api.clonarConfiguracion(destinoId, origenId, modo);
      toast.current.show({ severity: 'success', summary: 'OK', detail: 'Configuración clonada' });
      setTieneConfig(true);
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'No se pudo clonar la configuración';
      toast.current.show({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      setClonando(false);
    }
  }

  return (
    <div className="page-empresas">
      <Toast ref={toast} />

      <div className="page-header-row">
        <BotonVolver />
        <h2 className="page-title"><i className="fa-solid fa-copy" /> Clonar Configuración</h2>
      </div>

      <p className="clon-config-intro">
        Copia los conceptos (fórmulas, aportes) y el diseño de recibo/libro de una empresa hacia otra.
        No copia empleados, recibos ni ningún otro dato transaccional.
      </p>

      <div className="form-grid">
        <div className="form-field">
          <label>Empresa origen</label>
          <Dropdown
            value={origenId}
            options={origenOptions}
            onChange={e => setOrigenId(e.value)}
            placeholder="Seleccionar empresa de origen"
            filter
            showClear
            style={{ width: '320px' }}
          />
        </div>
        <div className="form-field">
          <label>Empresa destino</label>
          <Dropdown
            value={destinoId}
            options={destinoOptions}
            onChange={e => setDestinoId(e.value)}
            placeholder="Seleccionar empresa de destino"
            filter
            showClear
            style={{ width: '320px' }}
          />
        </div>
      </div>

      {checking ? (
        <p className="clon-config-status">Verificando configuración actual de la empresa destino…</p>
      ) : tieneConfig && (
        <p className="clon-config-status clon-config-status--warn">
          <i className="fa-solid fa-triangle-exclamation" /> La empresa destino ya tiene configuración cargada.
        </p>
      )}

      <div className="clon-config-actions">
        <Button label="Clonar configuración" icon="fa-solid fa-copy" onClick={handleClonarClick} loading={clonando} disabled={checking} />
      </div>

      <Dialog
        visible={modoDialogVisible}
        onHide={() => setModoDialogVisible(false)}
        header="Ya hay configuración cargada"
        style={{ width: '460px' }}
        modal
        draggable={false}
        resizable={false}
      >
        <p>La empresa destino ya tiene conceptos y/o diseños de recibo cargados. ¿Cómo querés proceder?</p>
        <ul className="clon-config-modo-lista">
          <li><strong>Reemplazar:</strong> borra la configuración actual del destino y la reemplaza por la del origen.</li>
          <li><strong>Combinar:</strong> agrega solo lo que falte, sin tocar lo que ya está cargado.</li>
        </ul>
        <div className="dialog-footer-btns mt-2">
          <Button label="Cancelar" icon="fa-solid fa-xmark" className="p-button-text" onClick={() => setModoDialogVisible(false)} disabled={clonando} />
          <Button label="Combinar" icon="fa-solid fa-object-ungroup" className="p-button-outlined" onClick={() => ejecutarClon('combinar')} loading={clonando} />
          <Button label="Reemplazar" icon="fa-solid fa-triangle-exclamation" className="p-button-danger" onClick={() => ejecutarClon('reemplazar')} loading={clonando} />
        </div>
      </Dialog>
    </div>
  );
}
