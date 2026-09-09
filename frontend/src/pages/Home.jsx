import { useLocation } from 'react-router-dom';
import { useEmpresa } from '../context/EmpresaContext';
import { MODULES, ADMIN_MODULES } from '../layout/modules';
import GlobalDashboard from './GlobalDashboard';
import EmpresaDashboard from './EmpresaDashboard';
import SueldosDashboard from './SueldosDashboard';
import ContabilidadDashboard from './ContabilidadDashboard';
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

  // Estado 1: sin empresa elegida → panorama de todo el sistema.
  if (!empresa) {
    return <GlobalDashboard />;
  }

  const mod = moduleId ? ALL_MODULES.find(m => m.id === moduleId) : null;

  // Módulo elegido pero sin contenido construido aún → pantalla de construcción.
  if (mod && mod.menu.length === 0) {
    return <UnderConstruction mod={mod} />;
  }

  // Estado 3: módulo Sueldos elegido → estadísticas acotadas a ese módulo.
  if (moduleId === 'sueldos') {
    return <SueldosDashboard empresa={empresa} />;
  }

  // Estado 3: módulo Contabilidad elegido → estadísticas acotadas a ese módulo.
  if (moduleId === 'contabilidad') {
    return <ContabilidadDashboard empresa={empresa} />;
  }

  // Estado 2: empresa elegida, sin módulo (o un módulo con menú propio pero
  // sin pantalla puntual todavía, ej. configuración) → panorama de la empresa.
  return <EmpresaDashboard empresa={empresa} />;
}
