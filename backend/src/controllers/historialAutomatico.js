const model = require('../models/historialAutomatico');

async function listEmpleados(req, res) {
  try {
    const { legajo, convenio, grupo, categoria, estado, provincia, empresa } = req.query;
    const data = await model.listEmpleadosCandidatos({ legajo, convenio, grupo, categoria, estado, provincia, empresa });
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener empleados candidatos' });
  }
}

async function generar(req, res) {
  try {
    const { campo, fechaDesde, fechaHasta, valor, empleados } = req.body;
    if (!campo || !fechaDesde || !Array.isArray(empleados) || !empleados.length) {
      return res.status(400).json({ estado: 'error', mensaje: 'campo, fechaDesde y empleados[] son requeridos' });
    }
    const resumen = await model.generar({ campo, fechaDesde, fechaHasta, valor, empleados });
    res.json({ estado: 'ok', resultado: resumen });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al generar historiales' });
  }
}

module.exports = { listEmpleados, generar };
