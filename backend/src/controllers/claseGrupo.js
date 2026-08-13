const model = require('../models/claseGrupo');

async function list(req, res, next) {
  try {
    const data = await model.listByClase(req.params.id);
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    if (!req.body.grupo) return res.status(400).json({ estado: 'error', mensaje: 'grupo es requerido' });
    const data = await model.create(req.params.id, req.body);
    res.status(201).json({ estado: 'ok', data });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ estado: 'error', mensaje: 'Ese grupo ya está asignado a la clase' });
    next(e);
  }
}

async function remove(req, res, next) {
  try {
    const ok = await model.remove(req.params.id, req.params.grupo);
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Grupo no encontrado en la clase' });
    res.json({ estado: 'ok', mensaje: 'Grupo eliminado de la clase' });
  } catch (e) { next(e); }
}

module.exports = { list, create, remove };
