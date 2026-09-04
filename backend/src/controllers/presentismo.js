const model = require('../models/presentismo');

async function list(req, res, next) {
  try {
    const { empleado, fechaDesde, fechaHasta, tipo, empresa } = req.query;
    const data = await model.list({ empleado, fechaDesde, fechaHasta, tipo, empresa });
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const { empleado, fecha, hora } = req.body;
    if (!empleado || !fecha || !hora) {
      return res.status(400).json({ estado: 'error', mensaje: 'empleado, fecha y hora son requeridos' });
    }
    const data = await model.create(empleado, req.body);
    res.status(201).json({ estado: 'ok', data });
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const { empleado, fecha, hora } = req.params;
    const data = await model.update(empleado, fecha, hora, req.body);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Registro de presentismo no encontrado' });
    res.json({ estado: 'ok', data });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const { empleado, fecha, hora } = req.params;
    const ok = await model.remove(empleado, fecha, hora);
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Registro de presentismo no encontrado' });
    res.json({ estado: 'ok', mensaje: 'Registro eliminado' });
  } catch (e) { next(e); }
}

module.exports = { list, create, update, remove };
