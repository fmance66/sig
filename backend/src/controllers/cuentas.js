const model = require('../models/cuentas');

async function list(req, res) {
  try {
    if (!req.query.empresa) return res.status(400).json({ estado: 'error', mensaje: 'empresa es requerida' });
    const data = await model.list(req.query.empresa);
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener cuentas' });
  }
}

async function arbol(req, res) {
  try {
    if (!req.query.empresa) return res.status(400).json({ estado: 'error', mensaje: 'empresa es requerida' });
    const data = await model.arbol(req.query.empresa);
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al armar el plan de cuentas' });
  }
}

async function getOne(req, res) {
  try {
    const data = await model.getById(req.params.id, req.params.empresa);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Cuenta no encontrada' });
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener la cuenta' });
  }
}

async function create(req, res) {
  try {
    if (!req.body.id) return res.status(400).json({ estado: 'error', mensaje: 'id es requerido' });
    if (!req.body.empresa) return res.status(400).json({ estado: 'error', mensaje: 'empresa es requerida' });
    const data = await model.create(req.body);
    res.status(201).json({ estado: 'ok', resultado: data });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ estado: 'error', mensaje: 'Ya existe una cuenta con ese código' });
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al crear la cuenta' });
  }
}

async function update(req, res) {
  try {
    const data = await model.update(req.params.id, req.params.empresa, req.body);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Cuenta no encontrada' });
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al actualizar la cuenta' });
  }
}

async function remove(req, res) {
  try {
    const ok = await model.remove(req.params.id, req.params.empresa);
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Cuenta no encontrada' });
    res.json({ estado: 'ok', mensaje: 'Cuenta eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al eliminar la cuenta' });
  }
}

async function getCentrosCosto(req, res) {
  try {
    const data = await model.getCentrosCosto(req.params.id, req.params.empresa);
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener los centros de costo de la cuenta' });
  }
}

async function setCentrosCosto(req, res) {
  try {
    const items = Array.isArray(req.body) ? req.body : [];
    const data = await model.setCentrosCosto(req.params.id, req.params.empresa, items);
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al guardar los centros de costo de la cuenta' });
  }
}

module.exports = { list, arbol, getOne, create, update, remove, getCentrosCosto, setCentrosCosto };
