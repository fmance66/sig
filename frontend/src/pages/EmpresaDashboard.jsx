import { useEffect, useState } from 'react';
import { Chart } from 'primereact/chart';
import { getDashboard, getDashboardContabilidad, getDashboardIva } from '../api/dashboard';
import { MODULES } from '../layout/modules';
import { formatMonto } from './dashboardUtils';
import './DashboardShared.css';

const COLOR_NETO = '#2a78d6';
const COLOR_BRUTO = '#eb6834';
const COLOR_PATRIMONIAL = '#2a78d6';
const COLOR_RESULTADO = '#eb6834';
const NATURALEZA_COLOR = { PATRIMONIAL: COLOR_PATRIMONIAL, RESULTADO: COLOR_RESULTADO };
const COLOR_COMPRA = '#eb6834';
const COLOR_VENTA = '#2a78d6';

// Estado 2: empresa elegida, todavía sin módulo → panorama general de la
// empresa: franja de módulos con un resumen parejo de cada uno, y debajo un
// gráfico representativo por módulo (Sueldos, Contabilidad, I.V.A.) — mismo
// peso visual para los tres. El resto del detalle vive en el dashboard
// propio de cada módulo (SueldosDashboard/ContabilidadDashboard/IvaDashboard),
// al seleccionarlo.
export default function EmpresaDashboard({ empresa }) {
  const [data, setData] = useState(null);
  const [contabilidad, setContabilidad] = useState(null);
  const [iva, setIva] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    Promise.all([
      getDashboard(empresa.id),
      getDashboardContabilidad(empresa.id),
      getDashboardIva(empresa.id),
    ])
      .then(([sueldos, cnt, ivaRes]) => {
        setData(sueldos.data.resultado);
        setContabilidad(cnt.data.resultado);
        setIva(ivaRes.data.resultado);
      })
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

  // Cada módulo tiene su propia forma de resumen (ver getDashboard/
  // getDashboardContabilidad/getDashboardIva en backend/src/models/dashboard.js).
  const moduloInfo = (mod) => {
    if (mod.id === 'sueldos') {
      return `${data.empleados.activos} activos`
        + (data.ultimoPeriodo ? ` · último período ${data.ultimoPeriodo.periodo}` : ' · sin liquidar');
    }
    if (mod.id === 'contabilidad' && contabilidad) {
      return `${contabilidad.cuentas.total} cuenta${contabilidad.cuentas.total === 1 ? '' : 's'}`
        + ` · ${contabilidad.ejercicios} ejercicio${contabilidad.ejercicios === 1 ? '' : 's'}`;
    }
    if (mod.id === 'iva' && iva) {
      const comprobantes = (iva.comprobantesPorModulo || []).reduce((acc, m) => acc + m.cantidad, 0);
      return iva.periodoActual
        ? `${comprobantes} comprobante${comprobantes === 1 ? '' : 's'} · período ${iva.periodoActual}`
        : 'sin comprobantes';
    }
    return null;
  };

  // Un módulo construido pero sin ningún dato cargado para esta empresa no
  // aporta nada a este panorama — se oculta en vez de mostrar "0" de todo.
  const hayActividad = (mod) => {
    if (mod.id === 'sueldos') return data.masaSalarial.length > 0;
    if (mod.id === 'contabilidad') return contabilidad?.cuentasPorNaturaleza.length > 0;
    if (mod.id === 'iva') return comprobantesPorModuloIva.some(m => m.cantidad > 0);
    return true;
  };

  const masaSalarialChart = {
    labels: data.masaSalarial.map(m => m.periodo),
    datasets: [
      { label: 'Neto', backgroundColor: COLOR_NETO, data: data.masaSalarial.map(m => m.neto), borderRadius: 3, maxBarThickness: 28 },
      { label: 'Bruto', backgroundColor: COLOR_BRUTO, data: data.masaSalarial.map(m => m.bruto), borderRadius: 3, maxBarThickness: 28 },
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

  const naturalezaChart = contabilidad && {
    labels: contabilidad.cuentasPorNaturaleza.map(n => n.naturaleza),
    datasets: [{
      data: contabilidad.cuentasPorNaturaleza.map(n => n.cantidad),
      backgroundColor: contabilidad.cuentasPorNaturaleza.map(n => NATURALEZA_COLOR[n.naturaleza] || '#94a3b8'),
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

  const cantidadPorModuloIva = (modulo) => iva?.comprobantesPorModulo?.find(r => r.modulo === modulo)?.cantidad ?? 0;
  const comprobantesPorModuloIva = [
    { modulo: 'Compra', cantidad: cantidadPorModuloIva('COMPRA'), color: COLOR_COMPRA },
    { modulo: 'Venta', cantidad: cantidadPorModuloIva('VENTA'), color: COLOR_VENTA },
  ];

  const moduloIvaChart = {
    labels: comprobantesPorModuloIva.map(m => m.modulo),
    datasets: [{
      data: comprobantesPorModuloIva.map(m => m.cantidad),
      backgroundColor: comprobantesPorModuloIva.map(m => m.color),
      borderRadius: 3,
      maxBarThickness: 28,
    }],
  };

  const moduloIvaOptions = {
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
        <i className="fa-solid fa-building dashboard-header-icon" />
        <div>
          <h2 className="dashboard-title">{empresa.razon_social}</h2>
          <p className="dashboard-subtitle">Resumen general de la empresa</p>
        </div>
      </div>

      <div className="modulos-strip">
        {MODULES.filter(mod => mod.menu.length === 0 || hayActividad(mod)).map(mod => {
          const construido = mod.menu.length > 0;
          const info = construido ? moduloInfo(mod) : null;
          return (
            <div key={mod.id} className={`modulo-strip-card${construido ? '' : ' disabled'}`}>
              <i className={`${mod.icon} modulo-strip-icon`} />
              <div className="modulo-strip-body">
                <span className="modulo-strip-name">{mod.label}</span>
                {info ? (
                  <span className="modulo-strip-info">{info}</span>
                ) : (
                  <span className="modulo-strip-badge">En desarrollo</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(data.masaSalarial.length > 0 || contabilidad?.cuentasPorNaturaleza.length > 0 || comprobantesPorModuloIva.some(m => m.cantidad > 0)) && (
        <div className="dashboard-charts">
          {data.masaSalarial.length > 0 && (
            <div className="chart-card">
              <h3 className="chart-title">Sueldos · Masa salarial por período</h3>
              <div className="chart-wrap">
                <Chart type="bar" data={masaSalarialChart} options={masaSalarialOptions} />
              </div>
            </div>
          )}
          {contabilidad?.cuentasPorNaturaleza.length > 0 && (
            <div className="chart-card">
              <h3 className="chart-title">Contabilidad · Cuentas por naturaleza</h3>
              <div className="chart-wrap">
                <Chart type="bar" data={naturalezaChart} options={naturalezaOptions} />
              </div>
            </div>
          )}
          {comprobantesPorModuloIva.some(m => m.cantidad > 0) && (
            <div className="chart-card">
              <h3 className="chart-title">I.V.A. · Comprobantes por módulo (período activo)</h3>
              <div className="chart-wrap">
                <Chart type="bar" data={moduloIvaChart} options={moduloIvaOptions} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
