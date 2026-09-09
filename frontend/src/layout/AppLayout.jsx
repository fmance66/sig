import { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Menubar } from 'primereact/menubar';
import { MODULES, ADMIN_MODULES } from './modules';
import AppHeader from './AppHeader';
import { useEmpresa } from '../context/EmpresaContext';
import { useAuth } from '../context/AuthContext';
import './AppLayout.css';

const ALL_MODULES = [...MODULES, ...ADMIN_MODULES];

// Módulos de nivel superior que tienen un permiso asociado (ver constants/modulos.js
// en el backend). 'ayuda'/'iva' no gatean nada — sin datos sensibles.
const PERMISO_MODULOS = ['sueldos', 'configuracion', 'contabilidad'];

export default function AppLayout() {
  const [activeModuleId, setActiveModuleId] = useState(null);
  const navigate = useNavigate();
  const { empresa } = useEmpresa();
  const { hasPermiso } = useAuth();

  const activeModule = ALL_MODULES.find(m => m.id === activeModuleId);

  function puedeVer(mod) {
    return !PERMISO_MODULOS.includes(mod.id) || hasPermiso(mod.id, 'ver');
  }

  // Cambiar (o cerrar) la empresa deja atrás el módulo que estuviera activo —
  // si no, al elegir otra empresa se sigue viendo Sueldos en vez del panel
  // general de esa empresa.
  const empresaAnterior = useRef(empresa?.id);
  useEffect(() => {
    if (empresaAnterior.current === empresa?.id) return;
    empresaAnterior.current = empresa?.id;
    setActiveModuleId(null);
    navigate('/', { state: { moduleId: null } });
  }, [empresa?.id]);

  function handleHomeClick() {
    setActiveModuleId(null);
    navigate('/');
  }

  function handleModuleClick(moduleId) {
    const newId = activeModuleId === moduleId ? null : moduleId;
    setActiveModuleId(newId);
    const mod = ALL_MODULES.find(m => m.id === newId);
    navigate(mod?.path ?? '/', { state: { moduleId: newId } });
  }

  function buildMenuItems(items) {
    return items
      .filter(item => !item.permisoModulo || hasPermiso(item.permisoModulo, 'ver'))
      .map(item => ({
        ...item,
        items: item.items?.length ? buildMenuItems(item.items) : undefined,
        command: item.items?.length ? undefined : () => item.path && navigate(item.path),
      }));
  }

  function ModuleButton({ mod }) {
    const isActive = activeModuleId === mod.id;
    return (
      <button
        className={`module-btn${isActive ? ' active' : ''}`}
        onClick={() => handleModuleClick(mod.id)}
        title={mod.label}
      >
        <i className={`${mod.icon} module-icon`} />
        <span className="module-label">{mod.label}</span>
      </button>
    );
  }

  return (
    <div className="app-root">
      <AppHeader />

      <div className="app-body">
        <aside className="app-sidebar">
          <nav className="sidebar-nav">

            <button className="sidebar-home-btn" onClick={handleHomeClick}>
              <i className="fa-solid fa-house sidebar-home-icon" />
              <span className="sidebar-home-label">Inicio</span>
            </button>

            {empresa && (
              <div className="nav-group">
                {MODULES.filter(puedeVer).map(mod => <ModuleButton key={mod.id} mod={mod} />)}
              </div>
            )}
            <div className="nav-spacer" />
            <div className="nav-group nav-group-admin">
              {ADMIN_MODULES.filter(puedeVer).map(mod => <ModuleButton key={mod.id} mod={mod} />)}
            </div>
          </nav>
        </aside>

        <div className="app-main">
          {activeModule?.menu?.length > 0 && (
            <div className="app-menubar">
              <Menubar model={buildMenuItems(activeModule.menu)} />
            </div>
          )}

          <main className="app-content">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
