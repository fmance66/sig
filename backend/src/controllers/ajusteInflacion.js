const model = require('../models/ajusteInflacion');

function filtrosFromBody(body) {
  return {
    fechaCierre: body.fechaCierre,
    fechaDesde: body.fechaDesde,
    fechaHasta: body.fechaHasta,
    tiposExcluir: body.tiposExcluir,
    cuentas: body.cuentas,
  };
}

async function preview(req, res) {
  try {
    const { empresa, ejercicio } = req.body;
    if (!empresa) return res.status(400).json({ estado: 'error', mensaje: 'empresa es requerida' });
    if (!ejercicio) return res.status(400).json({ estado: 'error', mensaje: 'ejercicio es requerido' });
    const data = await model.calcular(empresa, ejercicio, filtrosFromBody(req.body));
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ estado: 'error', mensaje: err.message });
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al calcular el ajuste por inflación' });
  }
}

async function generar(req, res) {
  try {
    const { empresa, ejercicio, cuentaContrapartida, fecha, leyenda } = req.body;
    if (!empresa) return res.status(400).json({ estado: 'error', mensaje: 'empresa es requerida' });
    if (!ejercicio) return res.status(400).json({ estado: 'error', mensaje: 'ejercicio es requerido' });
    const data = await model.generar(empresa, ejercicio, filtrosFromBody(req.body), { cuentaContrapartida, fecha, leyenda });
    res.status(201).json({ estado: 'ok', resultado: data });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ estado: 'error', mensaje: err.message });
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al generar el asiento de ajuste por inflación' });
  }
}

module.exports = { preview, generar };
