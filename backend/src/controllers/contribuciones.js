const model = require('../models/contribuciones');

async function list(req, res) {
  try {
    const { periodo, legajo, empresa, convenio, categoria, grupo, estado, columna } = req.query;
    const data = await model.list({ periodo, legajo, empresa, convenio, categoria, grupo, estado, columna });
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener el listado' });
  }
}

async function detalle(req, res) {
  try {
    const { periodo, empleado, numero } = req.params;
    const data = await model.detalle(periodo, empleado, numero, req.query.columna);
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener el detalle' });
  }
}

module.exports = { list, detalle };
