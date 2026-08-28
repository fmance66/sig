import { useEffect, useState } from 'react';
import { getDashboard } from '../api/dashboard';
import EstadisticasSueldos from './EstadisticasSueldos';
import './DashboardShared.css';

// Estado 3: módulo Sueldos elegido → estadísticas acotadas a este módulo.
export default function SueldosDashboard({ empresa }) {
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
        <p>No se pudieron cargar las estadísticas del módulo.</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <i className="fa-solid fa-briefcase dashboard-header-icon" />
        <div>
          <h2 className="dashboard-title">Sueldos</h2>
          <p className="dashboard-subtitle">{empresa.razon_social}</p>
        </div>
      </div>

      <EstadisticasSueldos data={data} />
    </div>
  );
}
