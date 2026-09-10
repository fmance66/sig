const Dashboard = require('../models/dashboard');

async function resumen(req, res) {
  try {
    const empresa = Number(req.query.empresa);
    if (!empresa) return res.status(400).json({ estado: 'error', mensaje: 'empresa es requerida' });

    const [empleados, empleadosPorConvenio, masaSalarial, ultimoPeriodo] = await Promise.all([
      Dashboard.getEmpleadosResumen(empresa),
      Dashboard.getEmpleadosPorConvenio(empresa),
      Dashboard.getMasaSalarialPorPeriodo(empresa),
      Dashboard.getUltimoPeriodo(empresa),
    ]);

    res.json({ estado: 'ok', resultado: { empleados, empleadosPorConvenio, masaSalarial, ultimoPeriodo } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener estadísticas' });
  }
}

async function global(req, res) {
  try {
    const [empleadosPorEmpresa, masaSalarialPorEmpresa] = await Promise.all([
      Dashboard.getEmpleadosPorEmpresa(),
      Dashboard.getUltimoPeriodoPorEmpresa(),
    ]);

    const totales = empleadosPorEmpresa.reduce(
      (acc, e) => ({ activos: acc.activos + e.activos, inactivos: acc.inactivos + e.inactivos }),
      { activos: 0, inactivos: 0 }
    );

    res.json({
      estado: 'ok',
      resultado: {
        empresas: empleadosPorEmpresa.length,
        totales,
        empleadosPorEmpresa,
        masaSalarialPorEmpresa,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener estadísticas globales' });
  }
}

async function resumenContabilidad(req, res) {
  try {
    const empresa = Number(req.query.empresa);
    if (!empresa) return res.status(400).json({ estado: 'error', mensaje: 'empresa es requerida' });

    const resultado = await Dashboard.getResumenContabilidad(empresa);
    res.json({ estado: 'ok', resultado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener estadísticas de contabilidad' });
  }
}

async function resumenIva(req, res) {
  try {
    const empresa = Number(req.query.empresa);
    if (!empresa) return res.status(400).json({ estado: 'error', mensaje: 'empresa es requerida' });

    const resultado = await Dashboard.getResumenIva(empresa);
    res.json({ estado: 'ok', resultado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener estadísticas de I.V.A.' });
  }
}

module.exports = { resumen, global, resumenContabilidad, resumenIva };
