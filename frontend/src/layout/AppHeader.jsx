import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { useEmpresa } from '../context/EmpresaContext';
import { getEmpresas } from '../api/empresas';
import './AppHeader.css';

export default function AppHeader() {
  const { empresa, setEmpresa } = useEmpresa();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);

  async function openDialog() {
    setDialogVisible(true);
    if (empresas.length === 0) {
      setLoading(true);
      try {
        const res = await getEmpresas();
        setEmpresas(res.data.resultado);
      } catch {
        // silencioso — la lista quedará vacía
      } finally {
        setLoading(false);
      }
    }
  }

  function seleccionarEmpresa(e) {
    setEmpresa(e);
    setDialogVisible(false);
  }

  return (
    <>
      <header className="app-header">
        {/* Izquierda: logo + nombre sistema */}
        <div className="header-brand">
          <i className="fa-solid fa-building-columns header-logo" />
          <div className="header-brand-text">
            <span className="header-brand-name">MAIN IT</span>
            <span className="header-brand-sub">Sistemas</span>
          </div>
        </div>

        {/* Centro: nombre del sistema */}
        <div className="header-center">
          <span className="header-system-name">Sistema Integrado de Gestión</span>
        </div>

        {/* Derecha: empresa activa */}
        <div className="header-empresa">
          {empresa ? (
            <>
              <div className="header-empresa-info">
                <span className="header-empresa-nombre">{empresa.razon_social}</span>
                {empresa.cuit && <span className="header-empresa-cuit">{empresa.cuit}</span>}
              </div>
              <button className="header-empresa-btn" onClick={openDialog} title="Cambiar empresa">
                <i className="fa-solid fa-right-left" />
              </button>
            </>
          ) : (
            <Button
              label="Seleccionar empresa"
              icon="fa-solid fa-building"
              className="p-button-sm p-button-outlined header-empresa-btn-select"
              onClick={openDialog}
            />
          )}
        </div>
      </header>

      <Dialog
        header="Seleccionar empresa"
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        style={{ width: '480px' }}
        modal
        dismissableMask
      >
        {loading ? (
          <div className="empresa-dialog-loading">
            <i className="fa-solid fa-spinner fa-spin" />
            <span>Cargando empresas...</span>
          </div>
        ) : (
          <ul className="empresa-list">
            {empresas.map(e => (
              <li
                key={e.id}
                className={`empresa-item${empresa?.id === e.id ? ' selected' : ''}`}
                onClick={() => seleccionarEmpresa(e)}
              >
                <i className="fa-solid fa-building empresa-item-icon" />
                <div className="empresa-item-info">
                  <span className="empresa-item-nombre">{e.razon_social}</span>
                  {e.cuit && <span className="empresa-item-cuit">CUIT {e.cuit}</span>}
                </div>
                {empresa?.id === e.id && (
                  <i className="fa-solid fa-check empresa-item-check" />
                )}
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </>
  );
}
