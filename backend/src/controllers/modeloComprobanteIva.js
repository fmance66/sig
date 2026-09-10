const model = require('../models/modeloComprobanteIva');

async function list(req, res) {
  try {
    if (!req.query.empresa) return res.status(400).json({ estado: 'error', mensaje: 'empresa es requerida' });
    const data = await model.list(req.query.empresa);
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener modelos de comprobante' });
  }
}

async function getOne(req, res) {
  try {
    const data = await model.getById(req.params.id, req.params.empresa);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Modelo de comprobante no encontrado' });
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener el modelo de comprobante' });
  }
}

async function create(req, res) {
  try {
    if (!req.body.id) return res.status(400).json({ estado: 'error', mensaje: 'id es requerido' });
    if (!req.body.empresa) return res.status(400).json({ estado: 'error', mensaje: 'empresa es requerida' });
    const data = await model.create(req.body);
    res.status(201).json({ estado: 'ok', resultado: data });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ estado: 'error', mensaje: 'Ya existe un modelo de comprobante con ese código' });
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al crear el modelo de comprobante' });
  }
}

async function update(req, res) {
  try {
    const data = await model.update(req.params.id, req.params.empresa, req.body);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Modelo de comprobante no encontrado' });
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al actualizar el modelo de comprobante' });
  }
}

async function remove(req, res) {
  try {
    const ok = await model.remove(req.params.id, req.params.empresa);
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Modelo de comprobante no encontrado' });
    res.json({ estado: 'ok', mensaje: 'Modelo de comprobante eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al eliminar el modelo de comprobante' });
  }
}

async function getImpuestos(req, res) {
  try {
    const data = await model.getImpuestos(req.params.id, req.params.empresa);
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener los impuestos del modelo de comprobante' });
  }
}

async function setImpuestos(req, res) {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const data = await model.setImpuestos(req.params.id, req.params.empresa, items);
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al guardar los impuestos del modelo de comprobante' });
  }
}

module.exports = { list, getOne, create, update, remove, getImpuestos, setImpuestos };
