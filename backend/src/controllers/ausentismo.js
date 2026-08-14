const model = require('../models/ausentismo');

async function list(req, res, next) {
  try {
    const { empleado, motivo, fechaDesde, fechaHasta } = req.query;
    const data = await model.list({ empleado, motivo, fechaDesde, fechaHasta });
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const { empleado, motivo, fecha_desde } = req.body;
    if (!empleado || !motivo || !fecha_desde) {
      return res.status(400).json({ estado: 'error', mensaje: 'empleado, motivo y fecha_desde son requeridos' });
    }
    const data = await model.create(empleado, req.body);
    res.status(201).json({ estado: 'ok', data });
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const { empleado, motivo, fecha_desde } = req.params;
    const data = await model.update(empleado, motivo, fecha_desde, req.body);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Registro de ausentismo no encontrado' });
    res.json({ estado: 'ok', data });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const { empleado, motivo, fecha_desde } = req.params;
    const ok = await model.remove(empleado, motivo, fecha_desde);
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Registro de ausentismo no encontrado' });
    res.json({ estado: 'ok', mensaje: 'Registro eliminado' });
  } catch (e) { next(e); }
}

module.exports = { list, create, update, remove };
