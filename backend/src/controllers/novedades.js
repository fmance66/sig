const model = require('../models/novedades');

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
    const { empleado, tipo_novedad, fecha } = req.body;
    if (!empleado || !tipo_novedad || !fecha) {
      return res.status(400).json({ estado: 'error', mensaje: 'empleado, tipo_novedad y fecha son requeridos' });
    }
    const data = await model.create(empleado, req.body);
    res.status(201).json({ estado: 'ok', data });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const { empleado, tipo_novedad, fecha } = req.params;
    const ok = await model.remove(empleado, tipo_novedad, fecha);
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Novedad no encontrada' });
    res.json({ estado: 'ok', mensaje: 'Novedad eliminada' });
  } catch (e) { next(e); }
}

module.exports = { list, create, remove };
