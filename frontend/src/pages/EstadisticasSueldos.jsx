import { Chart } from 'primereact/chart';
import { formatMonto } from './dashboardUtils';

// Paleta categórica validada (contraste + CVD) para las 2 series de masa salarial.
const COLOR_NETO = '#2a78d6';
const COLOR_BRUTO = '#eb6834';

// KPIs + gráficos de un único módulo Sueldos (empleados, masa salarial, convenios).
// Recibe el `resultado` de GET /api/dashboard?empresa= — lo consumen tanto
// EmpresaDashboard (panel de la empresa) como SueldosDashboard (dentro del módulo).
export default function EstadisticasSueldos({ data }) {
  const { empleados, empleadosPorConvenio, masaSalarial, ultimoPeriodo } = data;

  const masaSalarialChart = {
    labels: masaSalarial.map(m => m.periodo),
    datasets: [
      { label: 'Neto', backgroundColor: COLOR_NETO, data: masaSalarial.map(m => m.neto), borderRadius: 3, maxBarThickness: 28 },
      { label: 'Bruto', backgroundColor: COLOR_BRUTO, data: masaSalarial.map(m => m.bruto), borderRadius: 3, maxBarThickness: 28 },
    ],
  };

  const masaSalarialOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 }, color: '#64748b' } },
      tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${formatMonto(ctx.raw)}` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
      y: { grid: { color: '#e2e8f0' }, ticks: { color: '#64748b', font: { size: 11 }, callback: v => formatMonto(v) } },
    },
  };

  const convenioChart = {
    labels: empleadosPorConvenio.map(c => c.convenio),
    datasets: [{ data: empleadosPorConvenio.map(c => c.cantidad), backgroundColor: COLOR_NETO, borderRadius: 3, maxBarThickness: 18 }],
  };

  const convenioOptions = {
    indexAxis: 'y',
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => `${ctx.raw} empleado${ctx.raw === 1 ? '' : 's'}` } },
    },
    scales: {
      x: { beginAtZero: true, ticks: { precision: 0, color: '#64748b', font: { size: 11 } }, grid: { color: '#e2e8f0' } },
      y: { grid: { display: false }, ticks: { color: '#374151', font: { size: 11 }, autoSkip: false } },
    },
  };

  // Altura fija no alcanza cuando hay varios convenios — Chart.js saltea
  // etiquetas (y sus barras) si no entran, así que se calcula según la cantidad de filas.
  const convenioChartHeight = Math.max(180, empleadosPorConvenio.length * 32 + 40);

  return (
    <>
      <div className="dashboard-kpis">
        <div className="kpi-card">
          <i className="fa-solid fa-users kpi-icon" />
          <div className="kpi-body">
            <span className="kpi-value">{empleados.activos}</span>
            <span className="kpi-label">Empleados activos</span>
          </div>
        </div>
        <div className="kpi-card">
          <i className="fa-solid fa-user-slash kpi-icon kpi-icon-muted" />
          <div className="kpi-body">
            <span className="kpi-value">{empleados.inactivos}</span>
            <span className="kpi-label">Empleados inactivos</span>
          </div>
        </div>
        <div className="kpi-card">
          <i className="fa-solid fa-file-invoice-dollar kpi-icon" />
          <div className="kpi-body">
            <span className="kpi-value">{ultimoPeriodo ? ultimoPeriodo.recibos : '—'}</span>
            <span className="kpi-label">
              Recibos último período{ultimoPeriodo ? ` (${ultimoPeriodo.periodo})` : ''}
            </span>
          </div>
        </div>
        <div className="kpi-card">
          <i className="fa-solid fa-sack-dollar kpi-icon" />
          <div className="kpi-body">
            <span className="kpi-value">{ultimoPeriodo ? formatMonto(ultimoPeriodo.neto) : '—'}</span>
            <span className="kpi-label">Neto liquidado último período</span>
          </div>
        </div>
      </div>

      <div className="dashboard-charts">
        <div className="chart-card">
          <h3 className="chart-title">Masa salarial por período</h3>
          {masaSalarial.length ? (
            <div className="chart-wrap">
              <Chart type="bar" data={masaSalarialChart} options={masaSalarialOptions} />
            </div>
          ) : (
            <p className="chart-empty">Todavía no hay recibos liquidados para esta empresa.</p>
          )}
        </div>
        <div className="chart-card">
          <h3 className="chart-title">Empleados activos por convenio</h3>
          {empleadosPorConvenio.length ? (
            <div className="chart-wrap" style={{ height: convenioChartHeight }}>
              <Chart type="bar" data={convenioChart} options={convenioOptions} />
            </div>
          ) : (
            <p className="chart-empty">No hay empleados activos cargados.</p>
          )}
        </div>
      </div>
    </>
  );
}
