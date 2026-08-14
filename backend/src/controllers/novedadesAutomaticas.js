const model = require('../models/novedadesAutomaticas');

async function listEmpleados(req, res) {
  try {
    const { legajo, convenio, grupo, categoria, estado, provincia } = req.query;
    const data = await model.listEmpleadosCandidatos({ legajo, convenio, grupo, categoria, estado, provincia });
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener empleados candidatos' });
  }
}

async function generar(req, res) {
  try {
    const { tipoNovedad, fecha, value, empleados } = req.body;
    if (!tipoNovedad || !fecha || !Array.isArray(empleados) || !empleados.length) {
      return res.status(400).json({ estado: 'error', mensaje: 'tipoNovedad, fecha y empleados[] son requeridos' });
    }
    const resumen = await model.generar({ tipoNovedad, fecha, value, empleados });
    res.json({ estado: 'ok', resultado: resumen });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al generar novedades' });
  }
}

module.exports = { listEmpleados, generar };
