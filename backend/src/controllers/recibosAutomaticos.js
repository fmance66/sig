const model = require('../models/recibosAutomaticos');

async function listEmpleados(req, res) {
  try {
    const { legajo, convenio, grupo, categoria, estado, provincia, ingresoDesde, ingresoHasta, empresa } = req.query;
    const data = await model.listEmpleadosCandidatos({ legajo, convenio, grupo, categoria, estado, provincia, ingresoDesde, ingresoHasta, empresa });
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener empleados candidatos' });
  }
}

async function generar(req, res) {
  try {
    const { periodo, empleados, conceptosIndividuales, saldoCero } = req.body;
    if (!periodo || !Array.isArray(empleados) || !empleados.length) {
      return res.status(400).json({ estado: 'error', mensaje: 'periodo y empleados[] son requeridos' });
    }
    const resumen = await model.generar({ periodo, empleados, conceptosIndividuales, saldoCero });
    res.json({ estado: 'ok', resultado: resumen });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ estado: 'error', mensaje: err.message || 'Error al generar recibos' });
  }
}

module.exports = { listEmpleados, generar };
