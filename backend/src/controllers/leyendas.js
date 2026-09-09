const model = require('../models/leyendas');

async function list(req, res) {
  try {
    if (!req.query.empresa) return res.status(400).json({ estado: 'error', mensaje: 'empresa es requerida' });
    const data = await model.list(req.query.empresa);
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener leyendas' });
  }
}

async function getOne(req, res) {
  try {
    const data = await model.getById(req.params.id, req.params.empresa);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Leyenda no encontrada' });
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener la leyenda' });
  }
}

async function create(req, res) {
  try {
    if (!req.body.empresa) return res.status(400).json({ estado: 'error', mensaje: 'empresa es requerida' });
    const data = await model.create(req.body);
    res.status(201).json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al crear la leyenda' });
  }
}

async function update(req, res) {
  try {
    const data = await model.update(req.params.id, req.params.empresa, req.body);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Leyenda no encontrada' });
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al actualizar la leyenda' });
  }
}

async function remove(req, res) {
  try {
    const ok = await model.remove(req.params.id, req.params.empresa);
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Leyenda no encontrada' });
    res.json({ estado: 'ok', mensaje: 'Leyenda eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al eliminar la leyenda' });
  }
}

module.exports = { list, getOne, create, update, remove };
