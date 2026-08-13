const model = require('../models/fila');

async function list(req, res, next) {
  try {
    const data = await model.listByTabla(req.params.id);
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const data = await model.create(req.params.id, req.body);
    res.status(201).json({ estado: 'ok', data });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const ok = await model.remove(req.params.id, Number(req.params.fila));
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Fila no encontrada' });
    res.json({ estado: 'ok', mensaje: 'Fila eliminada' });
  } catch (e) { next(e); }
}

module.exports = { list, create, remove };
