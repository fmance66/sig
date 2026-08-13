const model = require('../models/conceptoGeneral');

async function list(req, res, next) {
  try {
    const data = await model.list();
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const { concepto } = req.body;
    if (!concepto) return res.status(400).json({ estado: 'error', mensaje: 'concepto es requerido' });
    const data = await model.create(req.body);
    res.status(201).json({ estado: 'ok', data });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const { concepto, liquidacion, recibo } = req.params;
    const ok = await model.remove(concepto, liquidacion, Number(recibo));
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Concepto no encontrado' });
    res.json({ estado: 'ok', mensaje: 'Concepto eliminado' });
  } catch (e) { next(e); }
}

module.exports = { list, create, remove };
