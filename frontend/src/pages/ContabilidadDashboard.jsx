import { useEffect, useState } from 'react';
import { Chart } from 'primereact/chart';
import { getDashboardContabilidad } from '../api/dashboard';
import './DashboardShared.css';

const COLOR_PATRIMONIAL = '#2a78d6';
const COLOR_RESULTADO = '#eb6834';
const COLOR_MAP = { PATRIMONIAL: COLOR_PATRIMONIAL, RESULTADO: COLOR_RESULTADO };

// Estado 3: módulo Contabilidad elegido → estadísticas acotadas a este módulo.
export default function ContabilidadDashboard({ empresa }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    getDashboardContabilidad(empresa.id)
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

  const naturalezaChart = {
    labels: data.cuentasPorNaturaleza.map(n => n.naturaleza),
    datasets: [{
      data: data.cuentasPorNaturaleza.map(n => n.cantidad),
      backgroundColor: data.cuentasPorNaturaleza.map(n => COLOR_MAP[n.naturaleza] || '#94a3b8'),
      borderRadius: 3,
      maxBarThickness: 28,
    }],
  };

  const naturalezaOptions = {
    indexAxis: 'y',
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => `${ctx.raw} cuenta${ctx.raw === 1 ? '' : 's'}` } },
    },
    scales: {
      x: { beginAtZero: true, ticks: { precision: 0, color: '#64748b', font: { size: 11 } }, grid: { color: '#e2e8f0' } },
      y: { grid: { display: false }, ticks: { color: '#374151', font: { size: 11 } } },
    },
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <i className="fa-solid fa-book-open dashboard-header-icon" />
        <div>
          <h2 className="dashboard-title">Contabilidad</h2>
          <p className="dashboard-subtitle">{empresa.razon_social}</p>
        </div>
      </div>

      <div className="dashboard-kpis">
        <div className="kpi-card">
          <i className="fa-solid fa-sitemap kpi-icon" />
          <div className="kpi-body">
            <span className="kpi-value">{data.cuentas.total}</span>
            <span className="kpi-label">Cuentas del plan</span>
          </div>
        </div>
        <div className="kpi-card">
          <i className="fa-solid fa-check kpi-icon" />
          <div className="kpi-body">
            <span className="kpi-value">{data.cuentas.imputables}</span>
            <span className="kpi-label">Cuentas imputables</span>
          </div>
        </div>
        <div className="kpi-card">
          <i className="fa-solid fa-table-cells kpi-icon" />
          <div className="kpi-body">
            <span className="kpi-value">{data.ejercicios}</span>
            <span className="kpi-label">Ejercicios cargados</span>
          </div>
        </div>
        <div className="kpi-card">
          <i className="fa-solid fa-layer-group kpi-icon kpi-icon-muted" />
          <div className="kpi-body">
            <span className="kpi-value">{data.centrosCosto}</span>
            <span className="kpi-label">Centros de costo</span>
          </div>
        </div>
      </div>

      <div className="dashboard-charts">
        <div className="chart-card">
          <h3 className="chart-title">Cuentas por naturaleza</h3>
          {data.cuentasPorNaturaleza.length ? (
            <div className="chart-wrap">
              <Chart type="bar" data={naturalezaChart} options={naturalezaOptions} />
            </div>
          ) : (
            <p className="chart-empty">Todavía no hay cuentas cargadas para esta empresa.</p>
          )}
        </div>
      </div>
    </div>
  );
}
