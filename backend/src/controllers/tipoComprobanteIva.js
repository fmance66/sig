const model = require('../models/tipoComprobanteIva');

async function list(req, res) {
  try {
    if (!req.query.empresa) return res.status(400).json({ estado: 'error', mensaje: 'empresa es requerida' });
    const data = await model.list(req.query.empresa);
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener tipos de comprobante' });
  }
}

async function getOne(req, res) {
  try {
    const data = await model.getById(req.params.id, req.params.empresa);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Tipo de comprobante no encontrado' });
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener el tipo de comprobante' });
  }
}

async function create(req, res) {
  try {
    if (!req.body.id) return res.status(400).json({ estado: 'error', mensaje: 'id es requerido' });
    if (!req.body.empresa) return res.status(400).json({ estado: 'error', mensaje: 'empresa es requerida' });
    const data = await model.create(req.body);
    res.status(201).json({ estado: 'ok', resultado: data });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ estado: 'error', mensaje: 'Ya existe un tipo de comprobante con ese código' });
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al crear el tipo de comprobante' });
  }
}

async function update(req, res) {
  try {
    const data = await model.update(req.params.id, req.params.empresa, req.body);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Tipo de comprobante no encontrado' });
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al actualizar el tipo de comprobante' });
  }
}

async function remove(req, res) {
  try {
    const ok = await model.remove(req.params.id, req.params.empresa);
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Tipo de comprobante no encontrado' });
    res.json({ estado: 'ok', mensaje: 'Tipo de comprobante eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al eliminar el tipo de comprobante' });
  }
}

async function getLetras(req, res) {
  try {
    const data = await model.getLetras(req.params.id, req.params.empresa);
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener las letras del tipo de comprobante' });
  }
}

async function setLetras(req, res) {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const data = await model.setLetras(req.params.id, req.params.empresa, items);
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al guardar las letras del tipo de comprobante' });
  }
}

module.exports = { list, getOne, create, update, remove, getLetras, setLetras };
