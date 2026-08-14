const model = require('../models/informePersonalizado');

async function list(req, res, next) {
  try {
    const data = await model.list();
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (e) { next(e); }
}

async function getOne(req, res, next) {
  try {
    const data = await model.getById(req.params.id);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Informe no encontrado' });
    res.json({ estado: 'ok', resultado: data });
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    if (!req.body.id) return res.status(400).json({ estado: 'error', mensaje: 'id es requerido' });
    if (!req.body.tabla) return res.status(400).json({ estado: 'error', mensaje: 'tabla es requerida' });
    const data = await model.create(req.body);
    res.status(201).json({ estado: 'ok', resultado: data });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ estado: 'error', mensaje: 'Ya existe un informe con ese id' });
    if (e.status) return res.status(e.status).json({ estado: 'error', mensaje: e.message });
    next(e);
  }
}

async function update(req, res, next) {
  try {
    const data = await model.update(req.params.id, req.body);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Informe no encontrado' });
    res.json({ estado: 'ok', resultado: data });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const ok = await model.remove(req.params.id);
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Informe no encontrado' });
    res.json({ estado: 'ok', mensaje: 'Informe eliminado' });
  } catch (e) { next(e); }
}

async function listCampos(req, res, next) {
  try {
    const data = await model.listCampos(req.params.id);
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (e) { next(e); }
}

async function addCampo(req, res, next) {
  try {
    if (!req.body.campo_clave) return res.status(400).json({ estado: 'error', mensaje: 'campo_clave es requerido' });
    const data = await model.addCampo(req.params.id, req.body);
    res.status(201).json({ estado: 'ok', resultado: data });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ estado: 'error', mensaje: e.message });
    next(e);
  }
}

async function removeCampo(req, res, next) {
  try {
    const ok = await model.removeCampo(req.params.id, req.params.campo);
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Campo no encontrado' });
    res.json({ estado: 'ok', mensaje: 'Campo eliminado' });
  } catch (e) { next(e); }
}

async function camposDisponibles(req, res, next) {
  try {
    const tabla = model.camposDeTabla(req.query.tabla);
    if (!tabla) return res.json({ estado: 'ok', resultado: [] });
    const resultado = Object.entries(tabla.campos).map(([clave, def]) => ({ clave, label: def.label, tipo: def.tipo }));
    res.json({ estado: 'ok', resultado });
  } catch (e) { next(e); }
}

async function ejecutar(req, res, next) {
  try {
    const data = await model.ejecutar(req.params.id, req.query);
    res.json({ estado: 'ok', resultado: data });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ estado: 'error', mensaje: e.message });
    next(e);
  }
}

module.exports = { list, getOne, create, update, remove, listCampos, addCampo, removeCampo, camposDisponibles, ejecutar };
