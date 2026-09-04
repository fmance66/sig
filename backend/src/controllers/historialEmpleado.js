const model = require('../models/historialEmpleado');

async function list(req, res, next) {
  try {
    const { empleado, campo, fechaDesde, fechaHasta, empresa } = req.query;
    const data = await model.list({ empleado, campo, fechaDesde, fechaHasta, empresa });
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const { empleado, campo, fecha_desde } = req.body;
    if (!empleado || !campo || !fecha_desde) {
      return res.status(400).json({ estado: 'error', mensaje: 'empleado, campo y fecha_desde son requeridos' });
    }
    const data = await model.create(empleado, req.body);
    res.status(201).json({ estado: 'ok', data });
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const { empleado, campo, fecha_desde } = req.params;
    const data = await model.update(empleado, campo, fecha_desde, req.body);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Registro de historial no encontrado' });
    res.json({ estado: 'ok', data });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const { empleado, campo, fecha_desde } = req.params;
    const ok = await model.remove(empleado, campo, fecha_desde);
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Registro de historial no encontrado' });
    res.json({ estado: 'ok', mensaje: 'Registro eliminado' });
  } catch (e) { next(e); }
}

async function removeMasivo(req, res, next) {
  try {
    const { empleado, campo, fechaDesde, empresa } = req.body;
    const cantidad = await model.removeMasivo({ empleado, campo, fechaDesde, empresa });
    res.json({ estado: 'ok', mensaje: `${cantidad} registro(s) eliminado(s)`, resultado: { cantidad } });
  } catch (e) { next(e); }
}

module.exports = { list, create, update, remove, removeMasivo };
