import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { useEmpresa } from '../context/EmpresaContext';
import { useAuth } from '../context/AuthContext';
import { getEmpresas, getLogoUrl } from '../api/empresas';
import mainItLogo from '../assets/mainit-logo.svg';
import './AppHeader.css';

export default function AppHeader() {
  const { empresa, setEmpresa } = useEmpresa();
  const { usuario, logout } = useAuth();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);

  async function openDialog() {
    setDialogVisible(true);
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

  function seleccionarEmpresa(e) {
    setEmpresa(e);
    setDialogVisible(false);
  }

  function cerrarEmpresa() {
    setEmpresa(null);
  }

  return (
    <>
      <header className="app-header">
        {/* Izquierda: logo + nombre sistema */}
        <div className="header-brand">
          <img src={mainItLogo} alt="MAIN IT" className="header-logo" />
          <div className="header-brand-text">
            <span className="header-brand-name">MAIN IT</span>
            <span className="header-brand-sub">Sistemas</span>
          </div>
          <span className="header-system-name">Sistema Integrado de Gestión</span>
        </div>

        <div className="header-center" />

        {/* Derecha: empresa activa */}
        <div className="header-empresa">
          {empresa ? (
            <>
              <img
                key={empresa.id}
                className="header-empresa-logo"
                src={getLogoUrl(empresa.id)}
                alt=""
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <div className="header-empresa-info">
                <span className="header-empresa-nombre">{empresa.razon_social}</span>
                {empresa.cuit && <span className="header-empresa-cuit">{empresa.cuit}</span>}
              </div>
              <button className="header-empresa-btn" onClick={openDialog} title="Cambiar empresa">
                <i className="fa-solid fa-right-left" />
              </button>
              <button className="header-empresa-btn" onClick={cerrarEmpresa} title="Cerrar empresa">
                <i className="fa-solid fa-power-off" />
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

        {/* Usuario logueado */}
        {usuario && (
          <div className="header-usuario">
            <i className="fa-solid fa-circle-user header-usuario-icon" />
            <span className="header-usuario-nombre">{usuario.nombre}</span>
            <button className="header-empresa-btn" onClick={logout} title="Cerrar sesión">
              <i className="fa-solid fa-right-from-bracket" />
            </button>
          </div>
        )}
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
