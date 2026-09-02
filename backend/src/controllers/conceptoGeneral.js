const model = require('../models/conceptoGeneral');

async function list(req, res, next) {
  try {
    const { empresa } = req.query;
    if (!empresa) return res.status(400).json({ estado: 'error', mensaje: 'empresa es requerida' });
    const data = await model.list(Number(empresa));
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const { concepto, empresa } = req.body;
    if (!concepto) return res.status(400).json({ estado: 'error', mensaje: 'concepto es requerido' });
    if (!empresa) return res.status(400).json({ estado: 'error', mensaje: 'empresa es requerida' });
    const data = await model.create(Number(empresa), req.body);
    res.status(201).json({ estado: 'ok', data });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const { empresa, concepto, liquidacion, recibo } = req.params;
    const ok = await model.remove(Number(empresa), concepto, liquidacion, Number(recibo));
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Concepto no encontrado' });
    res.json({ estado: 'ok', mensaje: 'Concepto eliminado' });
  } catch (e) { next(e); }
}

module.exports = { list, create, remove };
