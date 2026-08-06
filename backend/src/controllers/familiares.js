const model = require('../models/familiares');

async function list(req, res, next) {
  try {
    const { empleado } = req.query;
    if (!empleado) return res.status(400).json({ estado: 'error', mensaje: 'empleado es requerido' });
    const data = await model.listByEmpleado(empleado);
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    if (!req.body.empleado) return res.status(400).json({ estado: 'error', mensaje: 'empleado es requerido' });
    const data = await model.create(req.body.empleado, req.body);
    res.status(201).json({ estado: 'ok', data });
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const data = await model.update(req.params.empleado, req.params.id, req.body);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Familiar no encontrado' });
    res.json({ estado: 'ok', resultado: data });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const ok = await model.remove(req.params.empleado, req.params.id);
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Familiar no encontrado' });
    res.json({ estado: 'ok', mensaje: 'Familiar eliminado' });
  } catch (e) { next(e); }
}

module.exports = { list, create, update, remove };
