import { useEffect, useState } from 'react';
import { getDashboard } from '../api/dashboard';
import { MODULES } from '../layout/modules';
import EstadisticasSueldos from './EstadisticasSueldos';
import './DashboardShared.css';

// Estado 2: empresa elegida, todavía sin módulo → panorama general de la
// empresa (franja de módulos + estadísticas del único módulo con datos hoy).
export default function EmpresaDashboard({ empresa }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    getDashboard(empresa.id)
      .then(res => setData(res.data.resultado))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [empresa?.id]);

  if (loading) {
    return (
      <div className="dashboard-status">
        <i className="fa-solid fa-spinner fa-spin" />
        <p>Cargando estadísticas...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="dashboard-status">
        <i className="fa-solid fa-triangle-exclamation" />
        <p>No se pudieron cargar las estadísticas de la empresa.</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <i className="fa-solid fa-building dashboard-header-icon" />
        <div>
          <h2 className="dashboard-title">{empresa.razon_social}</h2>
          <p className="dashboard-subtitle">Resumen general de la empresa</p>
        </div>
      </div>

      <div className="modulos-strip">
        {MODULES.map(mod => {
          const construido = mod.menu.length > 0;
          return (
            <div key={mod.id} className={`modulo-strip-card${construido ? '' : ' disabled'}`}>
              <i className={`${mod.icon} modulo-strip-icon`} />
              <div className="modulo-strip-body">
                <span className="modulo-strip-name">{mod.label}</span>
                {construido ? (
                  <span className="modulo-strip-info">
                    {data.empleados.activos} activos
                    {data.ultimoPeriodo ? ` · último período ${data.ultimoPeriodo.periodo}` : ' · sin liquidar'}
                  </span>
                ) : (
                  <span className="modulo-strip-badge">En desarrollo</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <EstadisticasSueldos data={data} />
    </div>
  );
}
