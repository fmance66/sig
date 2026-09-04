const model = require('../models/novedades');

async function list(req, res, next) {
  try {
    const { empleado, tipoNovedad, fecha, empresa } = req.query;
    const data = await model.list({ empleado, tipoNovedad, fecha, empresa });
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

async function update(req, res, next) {
  try {
    const { empleado, tipo_novedad, fecha } = req.params;
    const data = await model.update(empleado, tipo_novedad, fecha, req.body.value);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Novedad no encontrada' });
    res.json({ estado: 'ok', data });
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

async function removeMasivo(req, res, next) {
  try {
    const { empleado, tipoNovedad, fecha, empresa } = req.body;
    const cantidad = await model.removeMasivo({ empleado, tipoNovedad, fecha, empresa });
    res.json({ estado: 'ok', mensaje: `${cantidad} novedad(es) eliminada(s)`, resultado: { cantidad } });
  } catch (e) { next(e); }
}

async function matrizGet(req, res, next) {
  try {
    const { fecha, empleado, tipoNovedad, empresa } = req.query;
    if (!fecha) return res.status(400).json({ estado: 'error', mensaje: 'fecha es requerida' });
    const data = await model.matrizGet(fecha, { empleado, tipoNovedad, empresa });
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (e) { next(e); }
}

async function matrizSave(req, res, next) {
  try {
    const { fecha, filas } = req.body;
    if (!fecha || !Array.isArray(filas)) {
      return res.status(400).json({ estado: 'error', mensaje: 'fecha y filas[] son requeridos' });
    }
    const guardados = await model.matrizSave(fecha, filas);
    res.json({ estado: 'ok', resultado: { guardados } });
  } catch (e) { next(e); }
}

module.exports = { list, create, update, remove, removeMasivo, matrizGet, matrizSave };
