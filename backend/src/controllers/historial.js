const model = require('../models/historial');

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
    const { empleado, campo, fecha_desde } = req.body;
    if (!empleado || !campo || !fecha_desde) {
      return res.status(400).json({ estado: 'error', mensaje: 'empleado, campo y fecha_desde son requeridos' });
    }
    const data = await model.create(empleado, req.body);
    res.status(201).json({ estado: 'ok', data });
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

module.exports = { list, create, remove };
