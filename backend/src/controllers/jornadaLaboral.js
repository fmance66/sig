const model = require('../models/jornadaLaboral');

async function list(req, res, next) {
  try {
    const data = await model.list({ empresa: req.query.empresa });
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (e) { next(e); }
}

async function getOne(req, res, next) {
  try {
    const data = await model.getByEmpleado(req.params.empleado);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Jornada laboral no encontrada' });
    res.json({ estado: 'ok', resultado: data });
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const { empleado } = req.body;
    if (!empleado) return res.status(400).json({ estado: 'error', mensaje: 'empleado es requerido' });
    const data = await model.create(empleado, req.body);
    res.status(201).json({ estado: 'ok', resultado: data });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ estado: 'error', mensaje: 'Ya existe una jornada laboral para ese empleado' });
    next(e);
  }
}

async function update(req, res, next) {
  try {
    const data = await model.update(req.params.empleado, req.body);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Jornada laboral no encontrada' });
    res.json({ estado: 'ok', resultado: data });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const ok = await model.remove(req.params.empleado);
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Jornada laboral no encontrada' });
    res.json({ estado: 'ok', mensaje: 'Jornada laboral eliminada' });
  } catch (e) { next(e); }
}

module.exports = { list, getOne, create, update, remove };
