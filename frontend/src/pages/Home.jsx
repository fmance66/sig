import { useLocation } from 'react-router-dom';
import { useEmpresa } from '../context/EmpresaContext';
import { MODULES, ADMIN_MODULES } from '../layout/modules';
import './Home.css';

const ALL_MODULES = [...MODULES, ...ADMIN_MODULES];

function UnderConstruction({ mod }) {
  return (
    <div className="under-construction">
      <div className="uc-icon-wrap">
        <i className="fa-solid fa-screwdriver-wrench uc-icon-bg" />
        <i className={`${mod.icon} uc-icon-front`} />
      </div>
      <h2 className="uc-title">{mod.label}</h2>
      <p className="uc-subtitle">Módulo en desarrollo</p>
      <p className="uc-desc">Estamos trabajando en este módulo. Próximamente disponible.</p>
    </div>
  );
}

export default function Home() {
  const { empresa } = useEmpresa();
  const location = useLocation();
  const moduleId = location.state?.moduleId;

  if (!empresa) {
    return (
      <div className="app-welcome">
        <i className="fa-solid fa-building-circle-exclamation" />
        <p>Seleccioná una empresa y luego un módulo del panel izquierdo para comenzar.</p>
      </div>
    );
  }

  if (!moduleId) {
    return (
      <div className="app-welcome">
        <i className="fa-solid fa-hand-pointer" />
        <p>Seleccioná un módulo del panel izquierdo para comenzar.</p>
      </div>
    );
  }

  const mod = ALL_MODULES.find(m => m.id === moduleId);

  // Módulos sin contenido aún → pantalla de construcción
  if (!mod || mod.menu.length === 0) {
    return <UnderConstruction mod={mod || { icon: 'fa-solid fa-cube', label: moduleId }} />;
  }

  // Módulos con menú (sueldos, configuracion) → area en blanco esperando navegación
  return null;
}
