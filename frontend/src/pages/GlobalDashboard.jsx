import { useEffect, useState } from 'react';
import { Chart } from 'primereact/chart';
import { getDashboardGlobal } from '../api/dashboard';
import { formatMonto } from './dashboardUtils';
import './DashboardShared.css';

const COLOR_ACTIVOS = '#2a78d6';
const COLOR_INACTIVOS = '#c3c2b7';

// Estado 1: todavía no hay empresa elegida → panorama de todo el sistema
// (todas las empresas, todos los módulos con datos).
export default function GlobalDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getDashboardGlobal()
      .then(res => setData(res.data.resultado))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

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
        <p>No se pudieron cargar las estadísticas del sistema.</p>
      </div>
    );
  }

  const { empresas, totales, empleadosPorEmpresa, masaSalarialPorEmpresa } = data;

  const empleadosChart = {
    labels: empleadosPorEmpresa.map(e => e.razonSocial),
    datasets: [
      { label: 'Activos', backgroundColor: COLOR_ACTIVOS, data: empleadosPorEmpresa.map(e => e.activos), borderRadius: 3, maxBarThickness: 16 },
      { label: 'Inactivos', backgroundColor: COLOR_INACTIVOS, data: empleadosPorEmpresa.map(e => e.inactivos), borderRadius: 3, maxBarThickness: 16 },
    ],
  };

  const empleadosOptions = {
    indexAxis: 'y',
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 }, color: '#64748b' } },
      tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw}` } },
    },
    scales: {
      x: { beginAtZero: true, ticks: { precision: 0, color: '#64748b', font: { size: 11 } }, grid: { color: '#e2e8f0' } },
      y: { grid: { display: false }, ticks: { color: '#374151', font: { size: 11 }, autoSkip: false } },
    },
  };

  // Barras horizontales: la altura fija no alcanza para muchas categorías —
  // Chart.js saltea etiquetas (y sus barras) si no entran, así que se calcula
  // según la cantidad de filas en vez de dejarla fija.
  const empleadosChartHeight = Math.max(200, empleadosPorEmpresa.length * 46 + 50);
  const masaSalarialChartHeight = Math.max(200, masaSalarialPorEmpresa.length * 32 + 40);

  const masaSalarialChart = {
    labels: masaSalarialPorEmpresa.map(e => e.razonSocial),
    datasets: [{ data: masaSalarialPorEmpresa.map(e => e.neto), backgroundColor: COLOR_ACTIVOS, borderRadius: 3, maxBarThickness: 16 }],
  };

  const masaSalarialOptions = {
    indexAxis: 'y',
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => formatMonto(ctx.raw) } },
    },
    scales: {
      x: { beginAtZero: true, ticks: { color: '#64748b', font: { size: 11 }, callback: v => formatMonto(v) }, grid: { color: '#e2e8f0' } },
      y: { grid: { display: false }, ticks: { color: '#374151', font: { size: 11 }, autoSkip: false } },
    },
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <i className="fa-solid fa-building-columns dashboard-header-icon" />
        <div>
          <h2 className="dashboard-title">Sistema Integrado de Gestión</h2>
          <p className="dashboard-subtitle">Resumen general de todas las empresas</p>
        </div>
      </div>

      <div className="dashboard-kpis">
        <div className="kpi-card">
          <i className="fa-solid fa-building kpi-icon" />
          <div className="kpi-body">
            <span className="kpi-value">{empresas}</span>
            <span className="kpi-label">Empresas registradas</span>
          </div>
        </div>
        <div className="kpi-card">
          <i className="fa-solid fa-users kpi-icon" />
          <div className="kpi-body">
            <span className="kpi-value">{totales.activos}</span>
            <span className="kpi-label">Empleados activos (todas las empresas)</span>
          </div>
        </div>
        <div className="kpi-card">
          <i className="fa-solid fa-user-slash kpi-icon kpi-icon-muted" />
          <div className="kpi-body">
            <span className="kpi-value">{totales.inactivos}</span>
            <span className="kpi-label">Empleados inactivos (todas las empresas)</span>
          </div>
        </div>
      </div>

      <div className="dashboard-charts">
        <div className="chart-card">
          <h3 className="chart-title">Empleados por empresa</h3>
          {empleadosPorEmpresa.length ? (
            <div className="chart-wrap" style={{ height: empleadosChartHeight }}>
              <Chart type="bar" data={empleadosChart} options={empleadosOptions} />
            </div>
          ) : (
            <p className="chart-empty">Todavía no hay empresas cargadas.</p>
          )}
        </div>
        <div className="chart-card">
          <h3 className="chart-title">Neto liquidado, último período por empresa</h3>
          {masaSalarialPorEmpresa.length ? (
            <div className="chart-wrap" style={{ height: masaSalarialChartHeight }}>
              <Chart type="bar" data={masaSalarialChart} options={masaSalarialOptions} />
            </div>
          ) : (
            <p className="chart-empty">Todavía no hay recibos liquidados en el sistema.</p>
          )}
        </div>
      </div>
    </div>
  );
}
