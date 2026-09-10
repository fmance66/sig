import { useEffect, useState } from 'react';
import { Chart } from 'primereact/chart';
import { getDashboardIva } from '../api/dashboard';
import './DashboardShared.css';

const COLOR_COMPRA = '#eb6834';
const COLOR_VENTA = '#2a78d6';

// Estado 3: módulo I.V.A. elegido → estadísticas acotadas a este módulo.
// `data` = getResumenIva (backend/src/models/dashboard.js): {periodoActual,
// comprobantesPorModulo:[{modulo,cantidad,total}], personasPorModulo:[{modulo,cantidad}]}.
export default function IvaDashboard({ empresa }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    getDashboardIva(empresa.id)
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

  // Forma real del backend: comprobantesPorModulo/personasPorModulo son arrays
  // [{modulo:'COMPRA'|'VENTA', cantidad, total?}], no un objeto {compra,venta}.
  const cantidadPorModulo = (lista, modulo) => lista?.find(r => r.modulo === modulo)?.cantidad ?? 0;
  const comprobantesCompra = cantidadPorModulo(data.comprobantesPorModulo, 'COMPRA');
  const comprobantesVenta = cantidadPorModulo(data.comprobantesPorModulo, 'VENTA');
  const proveedores = cantidadPorModulo(data.personasPorModulo, 'COMPRA');
  const clientes = cantidadPorModulo(data.personasPorModulo, 'VENTA');

  const comprobantesPorModulo = [
    { modulo: 'Compra', cantidad: comprobantesCompra, color: COLOR_COMPRA },
    { modulo: 'Venta', cantidad: comprobantesVenta, color: COLOR_VENTA },
  ];

  const moduloChart = {
    labels: comprobantesPorModulo.map(m => m.modulo),
    datasets: [{
      data: comprobantesPorModulo.map(m => m.cantidad),
      backgroundColor: comprobantesPorModulo.map(m => m.color),
      borderRadius: 3,
      maxBarThickness: 28,
    }],
  };

  const moduloOptions = {
    indexAxis: 'y',
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => `${ctx.raw} comprobante${ctx.raw === 1 ? '' : 's'}` } },
    },
    scales: {
      x: { beginAtZero: true, ticks: { precision: 0, color: '#64748b', font: { size: 11 } }, grid: { color: '#e2e8f0' } },
      y: { grid: { display: false }, ticks: { color: '#374151', font: { size: 11 } } },
    },
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <i className="fa-solid fa-percent dashboard-header-icon" />
        <div>
          <h2 className="dashboard-title">I.V.A.</h2>
          <p className="dashboard-subtitle">{empresa.razon_social}</p>
        </div>
      </div>

      <div className="dashboard-kpis">
        <div className="kpi-card">
          <i className="fa-solid fa-file-invoice kpi-icon" />
          <div className="kpi-body">
            <span className="kpi-value">{comprobantesCompra}</span>
            <span className="kpi-label">Comprobantes de compra</span>
          </div>
        </div>
        <div className="kpi-card">
          <i className="fa-solid fa-file-invoice-dollar kpi-icon" />
          <div className="kpi-body">
            <span className="kpi-value">{comprobantesVenta}</span>
            <span className="kpi-label">Comprobantes de venta</span>
          </div>
        </div>
        <div className="kpi-card">
          <i className="fa-solid fa-truck-field kpi-icon" />
          <div className="kpi-body">
            <span className="kpi-value">{proveedores}</span>
            <span className="kpi-label">Proveedores</span>
          </div>
        </div>
        <div className="kpi-card">
          <i className="fa-solid fa-address-card kpi-icon kpi-icon-muted" />
          <div className="kpi-body">
            <span className="kpi-value">{clientes}</span>
            <span className="kpi-label">Clientes</span>
          </div>
        </div>
      </div>

      <div className="dashboard-charts">
        <div className="chart-card">
          <h3 className="chart-title">Comprobantes por módulo (período activo)</h3>
          {comprobantesPorModulo.some(m => m.cantidad > 0) ? (
            <div className="chart-wrap">
              <Chart type="bar" data={moduloChart} options={moduloOptions} />
            </div>
          ) : (
            <p className="chart-empty">Todavía no hay comprobantes cargados para esta empresa.</p>
          )}
        </div>
      </div>
    </div>
  );
}
